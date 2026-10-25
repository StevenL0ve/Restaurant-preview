import type { AppState, LoanerTray, PrefCard, CardItem, CatalogItem } from "../types";
import { firebase, setCloudStatus } from "../lib/cloud";
import { deriveFacilityProof, facilityId, isForeignRoot, syncRootId, type JoinedWorkspace, type MemberRole } from "../lib/workspace";

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
  "repLocations", "repStock", "dayNotes", "staff", "catalog", "changeLog",
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

/** Card photos (item shots, Mayo stand, back table) follow the same rule as
 *  tray photos: stripped on the way up, restored from local on the way down. */
export function stripCardPhotos(c: PrefCard): PrefCard {
  const strip = (arr: CardItem[]) => arr.map((it) => (it.photo ? { ...it, photo: undefined } : it));
  return {
    ...c,
    mayoPhoto: undefined,
    backTablePhoto: undefined,
    instruments: strip(c.instruments),
    sutures: strip(c.sutures),
    supplies: strip(c.supplies),
    medications: strip(c.medications),
    equipment: strip(c.equipment),
  };
}

export function mergeCardPhotos(remote: PrefCard[], local: PrefCard[]): PrefCard[] {
  const localById = new Map(local.map((c) => [c.id, c]));
  const mergeArr = (r: CardItem[], l?: CardItem[]) =>
    r.map((it) => {
      const mine = l?.find((x) => x.id === it.id);
      return !it.photo && mine?.photo ? { ...it, photo: mine.photo } : it;
    });
  return remote.map((r) => {
    const mine = localById.get(r.id);
    if (!mine) return r;
    return {
      ...r,
      mayoPhoto: r.mayoPhoto ?? mine.mayoPhoto,
      backTablePhoto: r.backTablePhoto ?? mine.backTablePhoto,
      instruments: mergeArr(r.instruments, mine.instruments),
      sutures: mergeArr(r.sutures, mine.sutures),
      supplies: mergeArr(r.supplies, mine.supplies),
      medications: mergeArr(r.medications, mine.medications),
      equipment: mergeArr(r.equipment, mine.equipment),
    };
  });
}

export function stripCatalogPhotos(c: CatalogItem): CatalogItem {
  return c.photo ? { ...c, photo: undefined } : c;
}

export function mergeCatalogPhotos(remote: CatalogItem[], local: CatalogItem[]): CatalogItem[] {
  const localById = new Map(local.map((c) => [c.id, c]));
  return remote.map((r) => (!r.photo && localById.get(r.id)?.photo ? { ...r, photo: localById.get(r.id)!.photo } : r));
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

// Which root (own account, or a facility workspace) this device's local
// library last synced with. Guards the shared-device case: user A signs out,
// user B signs in; A's local data must never seed or merge into B's account.
// Older installs stored the bare uid, which is still the personal root id.
const SYNCED_UID_KEY = "orsync.synceduid.v1";
export function getSyncedUid(): string | null {
  try { return localStorage.getItem(SYNCED_UID_KEY); } catch { return null; }
}
function setSyncedUid(rootId: string) {
  try { localStorage.setItem(SYNCED_UID_KEY, rootId); } catch { /* private mode */ }
}

export interface SyncTarget {
  uid: string;
  /** Joined facility, if any: shared data lives there instead of under the user. */
  workspace: JoinedWorkspace | null;
}

// ---- The engine -------------------------------------------------------------

interface SyncHooks {
  getState: () => AppState;
  applyRemote: (patch: Partial<AppState>) => void;
  /** The facility refused this account (blocked, removed, or gone). */
  onAccessLost?: (reason: AccessLostReason) => void;
}

export type AccessLostReason = "blocked" | "removed" | "gone";

interface ActiveSync {
  uid: string;
  /** Firestore path segments the shared collections hang off:
   *  ["users", uid] or ["workspaces", id, "data", "library"]. */
  root: string[];
  workspace: JoinedWorkspace | null;
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
  const cleaned = key === "loaners"
    ? (items as unknown as LoanerTray[]).map(stripLoanerPhotos)
    : key === "cards"
      ? ((items as unknown as PrefCard[]).map(stripCardPhotos) as unknown as Item[])
      : key === "catalog"
        ? ((items as unknown as CatalogItem[]).map(stripCatalogPhotos) as unknown as Item[])
        : items;
  return withOrd(cleaned as unknown as Item[]);
}

export function startCloudSync(target: SyncTarget, hooks: SyncHooks): () => void {
  stopCloudSync();
  const { uid, workspace } = target;
  const rootId = syncRootId(uid, workspace);
  const sync: ActiveSync = {
    uid,
    root: workspace ? workspaceRoot(workspace.id) : ["users", uid],
    workspace,
    hooks,
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
      // Shared data follows the root; a person's own setup checklists stay theirs.
      const [r0, ...rRest] = sync.root;
      // A vendor rep's link to a facility is for set requests only: the one
      // collection they can read, filtered to requests assigned to them.
      const repOnly = workspace?.role === "rep";
      const keys: readonly SyncedKey[] = repOnly ? ["loaners"] : SYNCED_KEYS;
      const colRef = (key: string) =>
        repOnly && key === "loaners"
          ? fs.query(fs.collection(db, r0, ...rRest, key), fs.where("repUid", "==", uid))
          : fs.collection(db, r0, ...rRest, key);
      const docRef = (key: string, id: string) => fs.doc(db, r0, ...rRest, key, id);
      const setupsRef = fs.doc(db, "users", uid, "meta", "setups");

      // At a facility, membership is checked up front so a blocked or removed
      // account is told so plainly instead of seeing a wall of sync errors.
      if (workspace) {
        const me = await fs.getDoc(fs.doc(db, "workspaces", workspace.id, "members", uid)).catch(() => null);
        if (sync.stopped) return;
        if (!me) { lostAccess(sync, "gone"); return; }
        if (!me.exists()) { lostAccess(sync, "removed"); return; }
        if ((me.data() as { status?: string }).status !== "active") { lostAccess(sync, "blocked"); return; }
      }

      // Bootstrap: read what the cloud has. "Empty" is judged by entity
      // docs only, never by the meta doc.
      const snaps = await Promise.all(keys.map((k) => fs.getDocs(colRef(k))));
      const setupsSnap = await fs.getDoc(setupsRef);
      if (sync.stopped) return;
      const entityCount = snaps.reduce((n, s) => n + s.size, 0);
      const localIsForeign = isForeignRoot(getSyncedUid(), rootId, uid);
      const local = hooks.getState();

      if (entityCount === 0 && !localIsForeign) {
        // First device on this account: the local library seeds the cloud.
        await pushAll(sync, fs, db, docRef);
      } else {
        const patch: Partial<AppState> = {};
        keys.forEach((key, i) => {
          const docs = snaps[i].docs.map((d) => d.data() as Item);
          for (const d of snaps[i].docs) sync.lastKnown[key].set(d.id, stableStringify(d.data()));
          let items = fromDocs(docs);
          if (key === "loaners") items = mergeLoanerPhotos(items as unknown as LoanerTray[], local.loaners) as unknown as Item[];
          if (key === "cards") items = mergeCardPhotos(items as unknown as PrefCard[], local.cards) as unknown as Item[];
          if (key === "catalog") items = mergeCatalogPhotos(items as unknown as CatalogItem[], local.catalog) as unknown as Item[];
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
      setSyncedUid(rootId);

      // Live listeners: other devices' edits land here within a second.
      for (const key of keys) {
        const stop = fs.onSnapshot(colRef(key), (snap) => {
          if (sync.stopped) return;
          sync.lastKnown[key] = new Map(snap.docs.map((d) => [d.id, stableStringify(d.data())]));
          let items = fromDocs(snap.docs.map((d) => d.data() as Item));
          let current = sync.hooks.getState()[key] as unknown as Item[];
          if (repOnly) {
            // Only the rep's own requests travel; anything else local stays as is.
            const mine = (x: Item) => (x as { repUid?: string }).repUid === uid;
            const others = current.filter((x) => !mine(x));
            current = current.filter(mine);
            items = [...items, ...others];
            current = [...current, ...others];
          }
          if (key === "loaners") {
            items = mergeLoanerPhotos(items as unknown as LoanerTray[], current as unknown as LoanerTray[]) as unknown as Item[];
          }
          if (key === "cards") {
            items = mergeCardPhotos(items as unknown as PrefCard[], current as unknown as PrefCard[]) as unknown as Item[];
          }
          if (key === "catalog") {
            items = mergeCatalogPhotos(items as unknown as CatalogItem[], current as unknown as CatalogItem[]) as unknown as Item[];
          }
          if (stableStringify(items) !== stableStringify(current)) {
            sync.hooks.applyRemote({ [key]: items } as Partial<AppState>);
          }
          setCloudStatus({ state: "live", lastSyncAt: new Date().toISOString() });
        }, (err) => {
          if (isDenied(err) && sync.workspace) lostAccess(sync, "blocked");
          else setCloudStatus({ state: "error", message: err.message });
        });
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
      if (isDenied(e) && sync.workspace) lostAccess(sync, "blocked");
      else setCloudStatus({ state: "error", message: e instanceof Error ? e.message : "Sync failed to start." });
    }
  })();

  return stopCloudSync;
}

function workspaceRoot(id: string): string[] {
  return ["workspaces", id, "data", "library"];
}

function isDenied(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? "";
  return /permission-denied|PERMISSION_DENIED/.test(code) || /insufficient permissions/i.test((e as Error)?.message ?? "");
}

function lostAccess(sync: ActiveSync, reason: AccessLostReason) {
  if (sync.stopped) return;
  stopCloudSync();
  setCloudStatus({ state: "error", message: "This facility no longer accepts this account." });
  sync.hooks.onAccessLost?.(reason);
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
    const repOnly = sync.workspace?.role === "rep";
    for (const key of (repOnly ? (["loaners"] as const) : SYNCED_KEYS)) {
      const source = repOnly
        ? (state[key] as unknown as Item[]).filter((x) => (x as { repUid?: string }).repUid === sync.uid)
        : (state[key] as unknown as Item[]);
      const desired = prepareForCloud(key, source);
      const { changed, removedIds } = diffDocs(sync.lastKnown[key], desired);
      for (const it of changed) {
        await op((b) => b.set(fs.doc(db, sync.root[0], ...sync.root.slice(1), key, it.id), it));
        applied.push([key, it.id, stableStringify(it)]);
      }
      for (const id of removedIds) {
        await op((b) => b.delete(fs.doc(db, sync.root[0], ...sync.root.slice(1), key, id)));
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
    if (isDenied(e) && sync.workspace) { lostAccess(sync, "blocked"); return; }
    setCloudStatus({ state: "error", message: e instanceof Error ? e.message : "Sync push failed." });
    // Retry while the error stands: the diff is still intact.
    if (!sync.stopped) {
      if (sync.pushTimer) clearTimeout(sync.pushTimer);
      sync.pushTimer = setTimeout(() => { void pushNow(sync); }, 15000);
    }
  }
}

async function pushAll(
  sync: ActiveSync,
  fs: typeof import("firebase/firestore"),
  db: import("firebase/firestore").Firestore,
  docRef: (key: string, id: string) => import("firebase/firestore").DocumentReference,
) {
  const state = sync.hooks.getState();
  let batch = fs.writeBatch(db);
  let ops = 0;
  const applied: [SyncedKey, string, string][] = [];
  const repOnly = sync.workspace?.role === "rep";
  for (const key of (repOnly ? (["loaners"] as const) : SYNCED_KEYS)) {
    const source = repOnly
      ? (state[key] as unknown as Item[]).filter((x) => (x as { repUid?: string }).repUid === sync.uid)
      : (state[key] as unknown as Item[]);
    for (const it of prepareForCloud(key, source)) {
      batch.set(docRef(key, it.id), it);
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


// ---- Facility workspaces -----------------------------------------------------
// See src/lib/workspace.ts for the access model and firestore.rules for
// what the server enforces.

export type JoinResult = "joined" | "pending" | "not-found" | "denied" | "exists";
export type MemberStatus = "pending" | "active" | "denied" | "blocked";

export interface FacilityMember {
  uid: string;
  name: string;
  email: string;
  phone?: string | null;
  position?: string | null;
  photo?: string | null;
  role: MemberRole;
  status: MemberStatus;
  joinedAt?: string;
  requestedAt?: string;
  /** Firestore Timestamp: deadline to enter a changed password. */
  rekeyBy?: { toDate: () => Date } | null;
}

export function rekeyByIso(m: FacilityMember | null | undefined): string | undefined {
  const t = m?.rekeyBy;
  if (!t || typeof t.toDate !== "function") return undefined;
  return t.toDate().toISOString();
}

export interface BlockedEntry {
  email: string;
  name?: string;
  blockedAt?: string;
}

type Me = { uid: string; name: string; email: string; phone?: string; position?: string; photo?: string; rep?: boolean };

function memberFields(m: Me) {
  return {
    uid: m.uid,
    name: m.name,
    email: m.email.trim().toLowerCase(),
    phone: m.phone ?? null,
    position: m.position ?? null,
    photo: m.photo ?? null,
  };
}

function isDeniedErr(e: unknown): boolean { return isDenied(e); }

/** Ask to join a facility by name + password. "pending": the password was
 *  right and the request now waits for a facility admin. "joined": already
 *  approved (or you're the creator). "not-found": no facility by that name.
 *  "denied": wrong password, or this account was denied or blocked. */
export async function joinFacility(name: string, password: string, me: Me): Promise<{ result: JoinResult; id: string; role?: MemberRole }> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const id = await facilityId(name);
  const ws = await fs.getDoc(fs.doc(db, "workspaces", id));
  if (!ws.exists()) return { result: "not-found", id };
  const memberRef = fs.doc(db, "workspaces", id, "members", me.uid);
  // Already a member (another device, or re-entering the password): just
  // confirm the record is still active.
  const existing = await fs.getDoc(memberRef).catch(() => null);
  if (existing?.exists()) {
    const d = existing.data() as FacilityMember;
    if (d.status === "active") {
      if (d.rekeyBy) {
        // The facility's password changed: entering the new one clears the
        // deadline (the rules check the proof). Wrong password: refused.
        const proof = await deriveFacilityProof(name, password);
        const now = new Date().toISOString();
        try {
          await fs.updateDoc(memberRef, { proof, rekeyBy: fs.deleteField(), rekeyedAt: now, updatedAt: now });
        } catch (e) {
          if (isDeniedErr(e)) return { result: "denied", id };
          throw e;
        }
        await fs.updateDoc(memberRef, { proof: fs.deleteField(), updatedAt: now }).catch(() => undefined);
      }
      return { result: "joined", id, role: d.role };
    }
    if (d.status === "pending") return { result: "pending", id };
    return { result: "denied", id };
  }
  const proof = await deriveFacilityProof(name, password);
  const creator = (ws.data() as { createdBy?: string }).createdBy === me.uid;
  const now = new Date().toISOString();
  try {
    await fs.setDoc(memberRef, creator
      ? { ...memberFields(me), role: "admin", status: "active", joinedAt: now, proof }
      : { ...memberFields(me), role: me.rep ? "rep" : "member", status: "pending", requestedAt: now, proof });
  } catch (e) {
    if (isDeniedErr(e)) return { result: "denied", id };
    throw e;
  }
  // The proof did its job; it doesn't need to sit in the member record.
  await fs.updateDoc(memberRef, { proof: fs.deleteField(), updatedAt: now }).catch(() => undefined);
  return creator ? { result: "joined", id, role: "admin" } : { result: "pending", id };
}

/** Admin: let a pending request in. */
export async function approveMember(id: string, uid: string, byUid: string): Promise<void> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const now = new Date().toISOString();
  await fs.updateDoc(fs.doc(db, "workspaces", id, "members", uid), { status: "active", joinedAt: now, approvedAt: now, approvedBy: byUid, updatedAt: now });
}

/** Admin: turn a request down. They can't ask again unless allowed back. */
export async function denyMember(id: string, uid: string, byUid: string): Promise<void> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const now = new Date().toISOString();
  await fs.updateDoc(fs.doc(db, "workspaces", id, "members", uid), { status: "denied", deniedAt: now, blockedBy: byUid, updatedAt: now });
}

/** Live list of people waiting to be approved (admins only). */
export function watchPendingMembers(id: string, cb: (members: FacilityMember[]) => void, onError?: (e: unknown) => void): () => void {
  let stop: (() => void) | null = null;
  let cancelled = false;
  void (async () => {
    try {
      const { db } = await firebase();
      const fs = await import("firebase/firestore");
      if (cancelled) return;
      const q = fs.query(fs.collection(db, "workspaces", id, "members"), fs.where("status", "==", "pending"));
      stop = fs.onSnapshot(q, (snap) => {
        cb(snap.docs.map((d) => ({ ...(d.data() as FacilityMember), uid: d.id })).sort((a, b) => (a.requestedAt ?? "").localeCompare(b.requestedAt ?? "")));
      }, (e) => onError?.(e));
    } catch (e) {
      onError?.(e);
    }
  })();
  return () => { cancelled = true; stop?.(); };
}

/** For each facility this device asked to join: has an admin decided? An
 *  approval makes it the active facility (if none is); a denial drops it
 *  with a notice. Called on app open and when the app comes back forward. */
export async function checkPendingFacilities(uid: string): Promise<void> {
  const { getPendingFacilities, rememberFacility, forgetFacility, getWorkspace, setWorkspace, setFacilityNotice } = await import("../lib/workspace");
  for (const f of getPendingFacilities()) {
    const m = await myMembership(f.id, uid).catch(() => null);
    if (!m) continue;
    if (m.status === "active") {
      const approved = { id: f.id, name: f.name, role: m.role, pending: false };
      rememberFacility(approved);
      setFacilityNotice(`You're in: an admin approved you at ${f.name}.`);
      if (!getWorkspace()) setWorkspace(approved);
    } else if (m.status === "denied" || m.status === "blocked") {
      forgetFacility(f.id);
      setFacilityNotice(`${f.name} turned down this account's request to join. Check with the charge desk or a facility admin.`);
    }
  }
}

/** First-time setup: create the facility at its name's address, with this
 *  person as its first admin. "exists" if someone already created it. */
export async function createFacility(name: string, password: string, me: Me): Promise<{ result: "created" | "exists"; id: string }> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const id = await facilityId(name);
  const ref = fs.doc(db, "workspaces", id);
  if ((await fs.getDoc(ref)).exists()) return { result: "exists", id };
  const now = new Date().toISOString();
  const proof = await deriveFacilityProof(name, password);
  await fs.setDoc(ref, { name: name.trim(), createdAt: now, createdBy: me.uid, v: 2 });
  await fs.setDoc(fs.doc(db, "workspaces", id, "private", "auth"), { proof, changedAt: now, changedBy: me.uid });
  const memberRef = fs.doc(db, "workspaces", id, "members", me.uid);
  await fs.setDoc(memberRef, { ...memberFields(me), role: "admin", status: "active", joinedAt: now, proof });
  await fs.updateDoc(memberRef, { proof: fs.deleteField(), updatedAt: now }).catch(() => undefined);
  return { result: "created", id };
}

/** Your own membership record at a facility, or null if none/unreadable. */
export async function myMembership(id: string, uid: string): Promise<FacilityMember | null> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const snap = await fs.getDoc(fs.doc(db, "workspaces", id, "members", uid)).catch(() => null);
  return snap?.exists() ? ({ ...(snap.data() as FacilityMember), uid: snap.id }) : null;
}

/** Everyone at the facility (admins and ORSync owners can read this). */
export async function listMembers(id: string): Promise<FacilityMember[]> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const snap = await fs.getDocs(fs.collection(db, "workspaces", id, "members"));
  return snap.docs
    .map((d) => ({ ...(d.data() as FacilityMember), uid: d.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listBlocked(id: string): Promise<BlockedEntry[]> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const snap = await fs.getDocs(fs.collection(db, "workspaces", id, "blocked"));
  return snap.docs.map((d) => ({ ...(d.data() as BlockedEntry), email: d.id }));
}

/** The facility's display name and whether it exists (for the owner console). */
export async function facilityInfo(id: string): Promise<{ name: string } | null> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const snap = await fs.getDoc(fs.doc(db, "workspaces", id));
  return snap.exists() ? { name: (snap.data() as { name: string }).name } : null;
}

/** How many people have joined (for the Settings card). */
export async function workspaceMemberCount(id: string): Promise<number> {
  return (await listMembers(id)).length;
}

/** Admin: shut an account out of the facility. Their device stops syncing
 *  on its next read or write, and the password alone won't get them back
 *  in; "Allow back" reverses it. */
export async function blockMember(id: string, m: { uid: string; email: string; name: string }, byUid: string): Promise<void> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const now = new Date().toISOString();
  const email = m.email.trim().toLowerCase();
  await fs.setDoc(fs.doc(db, "workspaces", id, "blocked", email), { email, name: m.name, blockedAt: now, blockedBy: byUid });
  await fs.updateDoc(fs.doc(db, "workspaces", id, "members", m.uid), { status: "blocked", blockedAt: now, blockedBy: byUid, updatedAt: now });
}

export async function allowMember(id: string, m: { uid?: string; email: string }): Promise<void> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const now = new Date().toISOString();
  const email = m.email.trim().toLowerCase();
  await fs.deleteDoc(fs.doc(db, "workspaces", id, "blocked", email)).catch(() => undefined);
  if (m.uid) {
    await fs.updateDoc(fs.doc(db, "workspaces", id, "members", m.uid), { status: "active", updatedAt: now }).catch(() => undefined);
  }
}

/** ORSync owner: make someone an admin at a facility, or take it back. */
export async function setMemberRole(id: string, uid: string, role: MemberRole): Promise<void> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  await fs.updateDoc(fs.doc(db, "workspaces", id, "members", uid), { role, updatedAt: new Date().toISOString() });
}

export const REKEY_DAYS = 30;

/** Admin: change the facility password. The members the admin keeps stay
 *  connected and get 30 days to enter the new password (from the email
 *  the admin sends); the rest are removed now and would have to request
 *  again with the new password. */
export async function changeFacilityPassword(
  id: string, name: string, newPassword: string, byUid: string,
  keepUids: string[], removeUids: string[],
): Promise<void> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const now = new Date();
  const proof = await deriveFacilityProof(name, newPassword);
  await fs.setDoc(fs.doc(db, "workspaces", id, "private", "auth"), { proof, changedAt: now.toISOString(), changedBy: byUid });
  const deadline = fs.Timestamp.fromDate(new Date(now.getTime() + REKEY_DAYS * 86400000));
  let batch = fs.writeBatch(db);
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = fs.writeBatch(db); ops = 0; } };
  for (const uid of keepUids) {
    if (uid === byUid) continue; // the admin knows the password they just set
    batch.update(fs.doc(db, "workspaces", id, "members", uid), { rekeyBy: deadline, rekeyedAt: fs.deleteField(), updatedAt: now.toISOString() });
    if (++ops >= 400) await flush();
  }
  for (const uid of removeUids) {
    batch.delete(fs.doc(db, "workspaces", id, "members", uid));
    if (++ops >= 400) await flush();
  }
  await flush();
}

/** On open and when the app comes forward: pending requests decided? Is
 *  there a password re-key deadline on the active facility? */
export async function refreshFacilities(uid: string): Promise<void> {
  await checkPendingFacilities(uid);
  const { getWorkspace, setWorkspace } = await import("../lib/workspace");
  const ws = getWorkspace();
  if (!ws) return;
  const m = await myMembership(ws.id, uid).catch(() => null);
  if (!m) return;
  const rekeyBy = rekeyByIso(m);
  if ((rekeyBy ?? undefined) !== (ws.rekeyBy ?? undefined)) setWorkspace({ ...ws, rekeyBy });
}

/** Mirror a person's profile into the facility's member list. */
export async function writeWorkspaceMember(id: string, m: { uid: string; name: string; email: string; phone?: string; position?: string; photo?: string }): Promise<void> {
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  await fs.setDoc(
    fs.doc(db, "workspaces", id, "members", m.uid),
    { name: m.name, phone: m.phone ?? null, position: m.position ?? null, photo: m.photo ?? null, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}
