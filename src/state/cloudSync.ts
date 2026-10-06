import type { AppState, LoanerTray } from "../types";
import { firebase, setCloudStatus } from "../lib/cloud";

// Live sync between the local store and Firestore. The shape is simple and
// honest: every entity is a document under users/{uid}/<collection>/<id>,
// one listener per collection streams other devices' changes in, and a
// debounced differ pushes only what actually changed here. Firestore's
// offline cache keeps everything working in an OR dead zone; queued writes
// flush when the network returns. Last write wins, which is the right
// tradeoff for a personal library with occasional sharing.

export const SYNCED_KEYS = [
  "facilities", "locations", "surgeons", "cards", "loaners", "cases",
  "onCallPositions", "onCallPeople", "onCallShifts", "carts",
  "repLocations", "repStock",
] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];
type Item = { id: string } & Record<string, unknown>;

// ---- Pure helpers (unit-tested) --------------------------------------------

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
    if (lastKnown.get(it.id) !== JSON.stringify(it)) changed.push(it);
  }
  const removedIds = [...lastKnown.keys()].filter((id) => !seen.has(id));
  return { changed, removedIds };
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

      // Bootstrap: read what the cloud has.
      const snaps = await Promise.all(SYNCED_KEYS.map((k) => fs.getDocs(colRef(k))));
      const setupsSnap = await fs.getDoc(setupsRef);
      if (sync.stopped) return;
      const cloudCount = snaps.reduce((n, s) => n + s.size, 0);

      if (cloudCount === 0 && !setupsSnap.exists()) {
        // First device on this account: the local library seeds the cloud.
        await pushAll(sync, fs, db);
      } else {
        // The cloud is the source of truth: apply it locally.
        const patch: Partial<AppState> = {};
        const local = hooks.getState();
        SYNCED_KEYS.forEach((key, i) => {
          const docs = snaps[i].docs.map((d) => d.data() as Item);
          for (const d of snaps[i].docs) sync.lastKnown[key].set(d.id, JSON.stringify(d.data()));
          let items = fromDocs(docs);
          if (key === "loaners") items = mergeLoanerPhotos(items as unknown as LoanerTray[], local.loaners) as unknown as Item[];
          (patch as Record<string, unknown>)[key] = items;
        });
        if (setupsSnap.exists()) {
          const json = (setupsSnap.data() as { json?: string }).json ?? "{}";
          sync.lastSetupsJson = json;
          try { patch.setups = JSON.parse(json); } catch { /* keep local */ }
        }
        hooks.applyRemote(patch);
      }

      // Live listeners: other devices' edits land here within a second.
      for (const key of SYNCED_KEYS) {
        const stop = fs.onSnapshot(colRef(key), (snap) => {
          if (sync.stopped) return;
          sync.lastKnown[key] = new Map(snap.docs.map((d) => [d.id, JSON.stringify(d.data())]));
          let items = fromDocs(snap.docs.map((d) => d.data() as Item));
          const current = sync.hooks.getState()[key] as unknown as Item[];
          if (key === "loaners") {
            items = mergeLoanerPhotos(items as unknown as LoanerTray[], current as unknown as LoanerTray[]) as unknown as Item[];
          }
          if (JSON.stringify(items) !== JSON.stringify(current)) {
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
      // Catch anything that changed locally while bootstrapping.
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
    const commit = async () => { if (ops > 0) { await batch.commit(); batch = fs.writeBatch(db); ops = 0; } };
    const op = async (fn: (b: ReturnType<typeof fs.writeBatch>) => void) => {
      fn(batch);
      if (++ops >= 400) await commit();
    };

    for (const key of SYNCED_KEYS) {
      const desired = prepareForCloud(key, state[key] as unknown as Item[]);
      const { changed, removedIds } = diffDocs(sync.lastKnown[key], desired);
      for (const it of changed) {
        await op((b) => b.set(fs.doc(db, "users", sync.uid, key, it.id), it));
        sync.lastKnown[key].set(it.id, JSON.stringify(it));
      }
      for (const id of removedIds) {
        await op((b) => b.delete(fs.doc(db, "users", sync.uid, key, id)));
        sync.lastKnown[key].delete(id);
      }
    }
    const setupsJson = JSON.stringify(state.setups ?? {});
    if (setupsJson !== sync.lastSetupsJson) {
      await op((b) => b.set(fs.doc(db, "users", sync.uid, "meta", "setups"), { json: setupsJson }));
      sync.lastSetupsJson = setupsJson;
    }
    await commit();
    setCloudStatus({ state: "live", lastSyncAt: new Date().toISOString() });
  } catch (e) {
    setCloudStatus({ state: "error", message: e instanceof Error ? e.message : "Sync push failed." });
  }
}

async function pushAll(sync: ActiveSync, fs: typeof import("firebase/firestore"), db: import("firebase/firestore").Firestore) {
  const state = sync.hooks.getState();
  let batch = fs.writeBatch(db);
  let ops = 0;
  for (const key of SYNCED_KEYS) {
    for (const it of prepareForCloud(key, state[key] as unknown as Item[])) {
      batch.set(fs.doc(db, "users", sync.uid, key, it.id), it);
      sync.lastKnown[key].set(it.id, JSON.stringify(it));
      if (++ops >= 400) { await batch.commit(); batch = fs.writeBatch(db); ops = 0; }
    }
  }
  const setupsJson = JSON.stringify(state.setups ?? {});
  batch.set(fs.doc(db, "users", sync.uid, "meta", "setups"), { json: setupsJson });
  sync.lastSetupsJson = setupsJson;
  await batch.commit();
}
