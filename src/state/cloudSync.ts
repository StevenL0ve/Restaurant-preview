import type { AppState, LoanerTray } from "../types";
import { firebase, setCloudStatus } from "../lib/cloud";

// Live sync between the local store and Firestore. The shape is simple and
// honest: every entity is a document under users/{uid}/<collection>/<id>,
// one listener per collection streams other devices' changes in, and a
// debounced differ pushes only what actually changed here. Firestore's
// offline cache keeps everything working in an OR dead zone; queued writes
// flush when the network returns. Last write wins, which is the right
// tradeoff for a personal library with occasional sharing.
//
// Bootstrap is deliberately non-destructive:
//  • Empty cloud + this device's own library → the library seeds the cloud.
//  • Cloud has data + this device has data → union by id: the cloud's docs
//    win where ids match, device-only items are kept and pushed up.
//  • A device whose library last synced to a DIFFERENT account never seeds
//    or merges into the new one (no cross-account leakage): the new
//    account's cloud contents, even empty, replace the view.

export const SYNCED_KEYS = [
  "facilities", "locations", "surgeons", "cards", "loaners", "cases",
  "onCallPositions", "onCallPeople", "onCallShifts", "carts",
  "repLocations", "repStock", "dayNotes", "staff",
] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];
type Item = { id: string } & Record<string, unknown>;

// ---- Pure helpers (unit-tested) --------------------------------------------

/** JSON with recursively sorted object keys, so a doc read back from
 *  Firestore (which orders map keys) compares equal to the local object. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const keys = Object.keys(v as object).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`).join(",")}}`;
}

/** Array position travels as `_ord` so every device shows the same order. */
export function withOrd(items: Item[]): Item[] {
  return items.map((it, i) => ({ ...it, _ord: i }));
}

/** Rebuild the ordered array from unordered docs; `_ord` stays in the doc. */
export function fromDocs(docs: Item[]): Item[] {
  return [...docs]
    .sort((a, b) => ((a._ord as number) ?? 0) - ((b._ord as number) ?? 0))
    .map(({ _ord, ...rest }) => rest as Item);
}

/** What changed between the cloud's last-known docs and the desired docs. */
export function diffDocs(
  lastKnown: Map<string, string>,
  desired: Item[],
): { changed: Item[]; removedIds: string[] } {
  const changed: Item[] = [];
  const seen = new Set<string>();
  for (const it of desired) {
    seen.add(it.id);
    if (lastKnown.get(it.id) !== stableStringify(it)) changed.push(it);
  }
  const removedIds = [...lastKnown.keys()].filter((id) => !seen.has(id));
  return { changed, removedIds };
}

/** Cloud docs win where ids collide; device-only items survive (appended). */
export function unionById<T extends { id: string }>(cloud: T[], local: T[]): T[] {
  const cloudIds = new Set(cloud.map((c) => c.id));
  return [...cloud, ...local.filter((l) => !cloudIds.has(l.id))];
}

/** Tray layer photos stay on the device that took them (they're big; the
 *  cloud keeps every other field). Stripped on the way up... */
export function stripLoanerPhotos(l: LoanerTray): LoanerTray {
  return { ...l, sets: l.sets.map((s) => ({ ...s, photos: [] })) };
}

/** ...and restored from the local copy on the way down. */
export function mergeLoanerPhotos(remote: LoanerTray[], local: LoanerTray[]): LoanerTray[] {
  const localById = new Map(local.map((l) => [l.id, l]));
  return remote.map((r) => {
    const mine = localById.get(r.id);
    if (!mine) return r;
    return {
      ...r,
      sets: r.sets.map((s) => {
        const localSet = mine.sets.find((x) => x.id === s.id);
        return s.photos.length === 0 && localSet?.photos.length ? { ...s, photos: localSet.photos } : s;
      }),
    };
  });
}

// Which account this device's local library last synced with. Guards the
// shared-device case: user A signs out, user B signs in; A's local data must
// never seed or merge into B's account.
const SYNCED_UID_KEY = "orsync.synceduid.v1";
export function getSyncedUid(): string | null {
  try { return localStorage.getItem(SYNCED_UID_KEY); } catch { return null; }
}
function setSyncedUid(uid: string) {
  try { localStorage.setItem(SYNCED_UID_KEY, uid); } catch { /* private mode */ }
}

// ---- The engine -------------------------------------------------------------

interface SyncHooks {
  getState: () => AppState;
  applyRemote: (patch: Partial<AppState>) => void;
}

interface ActiveSync {
  uid: string;
  hooks: SyncHooks;
  lastKnown: Record<string, Map<string, string>>;
  lastSetupsJson: string | null;
  stops: (() => void)[];
  pushTimer: ReturnType<typeof setTimeout> | null;
  stopped: boolean;
  ready: boolean; // bootstrap finished; pushes allowed
}

let active: ActiveSync | null = null;

function prepareForCloud(key: SyncedKey, items: Item[]): Item[] {
  const cleaned = key === "loaners" ? (items as unknown as LoanerTray[]).map(stripLoanerPhotos) : items;
  return withOrd(cleaned as unknown as Item[]);
}

export function startCloudSync(uid: string, hooks: SyncHooks): () => void {
  stopCloudSync();
  const sync: ActiveSync = {
    uid, hooks,
    lastKnown: Object.fromEntries(SYNCED_KEYS.map((k) => [k, new Map()])),
    lastSetupsJson: null,
    stops: [], pushTimer: null, stopped: false, ready: false,
  };
  active = sync;
  setCloudStatus({ state: "connecting" });

  void (async () => {
    try {
      const { db } = await firebase();
      const fs = await import("firebase/firestore");
      if (sync.stopped) return;
      const colRef = (key: string) => fs.collection(db, "users", uid, key);
      const setupsRef = fs.doc(db, "users", uid, "meta", "setups");

      // Bootstrap: read what the cloud has. "Empty" is judged by entity
      // docs only, never by the meta doc.
      const snaps = await Promise.all(SYNCED_KEYS.map((k) => fs.getDocs(colRef(k))));
      const setupsSnap = await fs.getDoc(setupsRef);
      if (sync.stopped) return;
      const entityCount = snaps.reduce((n, s) => n + s.size, 0);
      const prevUid = getSyncedUid();
      const localIsForeign = prevUid !== null && prevUid !== uid;
      const local = hooks.getState();

      if (entityCount === 0 && !localIsForeign) {
        // First device on this account: the local library seeds the cloud.
        await pushAll(sync, fs, db);
      } else {
        const patch: Partial<AppState> = {};
        SYNCED_KEYS.forEach((key, i) => {
          const docs = snaps[i].docs.map((d) => d.data() as Item);
          for (const d of snaps[i].docs) sync.lastKnown[key].set(d.id, stableStringify(d.data()));
          let items = fromDocs(docs);
          if (key === "loaners") items = mergeLoanerPhotos(items as unknown as LoanerTray[], local.loaners) as unknown as Item[];
          if (!localIsForeign) {
            // Same owner on both sides: nothing local is thrown away.
            items = unionById(items, local[key] as unknown as Item[]);
          }
          (patch as Record<string, unknown>)[key] = items;
        });
        const cloudSetups = setupsSnap.exists()
          ? (() => { try { return JSON.parse((setupsSnap.data() as { json?: string }).json ?? "{}"); } catch { return {}; } })()
          : {};
        patch.setups = localIsForeign ? cloudSetups : { ...local.setups, ...cloudSetups };
        sync.lastSetupsJson = setupsSnap.exists() ? (setupsSnap.data() as { json?: string }).json ?? "{}" : null;
        hooks.applyRemote(patch);
      }
      setSyncedUid(uid);

      // Live listeners: other devices' edits land here within a second.
      for (const key of SYNCED_KEYS) {
        const stop = fs.onSnapshot(colRef(key), (snap) => {
          if (sync.stopped) return;
          sync.lastKnown[key] = new Map(snap.docs.map((d) => [d.id, stableStringify(d.data())]));
          let items = fromDocs(snap.docs.map((d) => d.data() as Item));
          const current = sync.hooks.getState()[key] as unknown as Item[];
          if (key === "loaners") {
            items = mergeLoanerPhotos(items as unknown as LoanerTray[], current as unknown as LoanerTray[]) as unknown as Item[];
          }
          if (stableStringify(items) !== stableStringify(current)) {
            sync.hooks.applyRemote({ [key]: items } as Partial<AppState>);
          }
          setCloudStatus({ state: "live", lastSyncAt: new Date().toISOString() });
        }, (err) => setCloudStatus({ state: "error", message: err.message }));
        sync.stops.push(stop);
      }
      const stopSetups = fs.onSnapshot(setupsRef, (snap) => {
        if (sync.stopped || !snap.exists()) return;
        const json = (snap.data() as { json?: string }).json ?? "{}";
        if (json === sync.lastSetupsJson) return;
        sync.lastSetupsJson = json;
        try { sync.hooks.applyRemote({ setups: JSON.parse(json) }); } catch { /* ignore bad doc */ }
      });
      sync.stops.push(stopSetups);

      sync.ready = true;
      setCloudStatus({ state: "live", lastSyncAt: new Date().toISOString() });
      // Push anything the union kept that the cloud doesn't have yet, plus
      // whatever changed locally while bootstrapping.
      schedulePush();
    } catch (e) {
      setCloudStatus({ state: "error", message: e instanceof Error ? e.message : "Sync failed to start." });
    }
  })();

  return stopCloudSync;
}

export function stopCloudSync() {
  if (!active) return;
  active.stopped = true;
  if (active.pushTimer) clearTimeout(active.pushTimer);
  for (const stop of active.stops) stop();
  active = null;
}

/** Called after every local state change; cheap no-op until sync is live. */
export function schedulePush() {
  const sync = active;
  if (!sync || !sync.ready || sync.stopped) return;
  if (sync.pushTimer) clearTimeout(sync.pushTimer);
  sync.pushTimer = setTimeout(() => { void pushNow(sync); }, 700);
}

async function pushNow(sync: ActiveSync) {
  if (sync.stopped) return;
  try {
    const { db } = await firebase();
    const fs = await import("firebase/firestore");
    const state = sync.hooks.getState();

    let batch = fs.writeBatch(db);
    let ops = 0;
    // lastKnown is only updated after a commit resolves, so a failed commit
    // leaves the diff intact and the next push retries those docs.
    const applied: [SyncedKey | "setups", string, string | null][] = [];
    const commit = async () => { if (ops > 0) { await batch.commit(); batch = fs.writeBatch(db); ops = 0; } };
    const op = async (fn: (b: ReturnType<typeof fs.writeBatch>) => void) => {
      fn(batch);
      if (++ops >= 400) await commit();
    };

    let setupsJsonToRecord: string | null = null;
    for (const key of SYNCED_KEYS) {
      const desired = prepareForCloud(key, state[key] as unknown as Item[]);
      const { changed, removedIds } = diffDocs(sync.lastKnown[key], desired);
      for (const it of changed) {
        await op((b) => b.set(fs.doc(db, "users", sync.uid, key, it.id), it));
        applied.push([key, it.id, stableStringify(it)]);
      }
      for (const id of removedIds) {
        await op((b) => b.delete(fs.doc(db, "users", sync.uid, key, id)));
        applied.push([key, id, null]);
      }
    }
    const setupsJson = JSON.stringify(state.setups ?? {});
    if (setupsJson !== sync.lastSetupsJson) {
      await op((b) => b.set(fs.doc(db, "users", sync.uid, "meta", "setups"), { json: setupsJson }));
      setupsJsonToRecord = setupsJson;
    }
    await commit();

    for (const [key, id, json] of applied) {
      if (key === "setups") continue;
      if (json === null) sync.lastKnown[key].delete(id);
      else sync.lastKnown[key].set(id, json);
    }
    if (setupsJsonToRecord !== null) sync.lastSetupsJson = setupsJsonToRecord;
    setCloudStatus({ state: "live", lastSyncAt: new Date().toISOString() });
  } catch (e) {
    setCloudStatus({ state: "error", message: e instanceof Error ? e.message : "Sync push failed." });
    // Retry while the error stands: the diff is still intact.
    if (!sync.stopped) {
      if (sync.pushTimer) clearTimeout(sync.pushTimer);
      sync.pushTimer = setTimeout(() => { void pushNow(sync); }, 15000);
    }
  }
}

async function pushAll(sync: ActiveSync, fs: typeof import("firebase/firestore"), db: import("firebase/firestore").Firestore) {
  const state = sync.hooks.getState();
  let batch = fs.writeBatch(db);
  let ops = 0;
  const applied: [SyncedKey, string, string][] = [];
  for (const key of SYNCED_KEYS) {
    for (const it of prepareForCloud(key, state[key] as unknown as Item[])) {
      batch.set(fs.doc(db, "users", sync.uid, key, it.id), it);
      applied.push([key, it.id, stableStringify(it)]);
      if (++ops >= 400) { await batch.commit(); batch = fs.writeBatch(db); ops = 0; }
    }
  }
  const setupsJson = JSON.stringify(state.setups ?? {});
  batch.set(fs.doc(db, "users", sync.uid, "meta", "setups"), { json: setupsJson });
  await batch.commit();
  for (const [key, id, json] of applied) sync.lastKnown[key].set(id, json);
  sync.lastSetupsJson = setupsJson;
}
