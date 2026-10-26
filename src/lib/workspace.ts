// Facility workspaces: one shared library per hospital OR, joined with the
// facility's name and password.
//
// How access works (no server code; Firestore security rules do the work):
//  • The facility's cloud address is derived from its NAME only, so an
//    admin can change the password without moving any data.
//  • The password never leaves the device as-is. The app derives a slow
//    PBKDF2 "proof" from name + password; the facility keeps the current
//    proof in a private doc only admins can read, and the rules compare a
//    joiner's proof against it. Wrong password: the join is refused.
//  • Membership is a per-person record with a status. Everything in the
//    facility's library is readable and writable ONLY by active members.
//    An admin blocking someone flips that status (and remembers their
//    email), and their device is shut out immediately, password or not.

/** admin: runs the facility. member: OR staff, full shared library.
 *  rep: a vendor rep, linked for set-request tracking only. */
export type MemberRole = "admin" | "member" | "rep";

export interface JoinedWorkspace {
  /** The facility's cloud address (SHA-256 of its normalized name). */
  id: string;
  /** Display name, as typed. */
  name: string;
  /** Your membership role at the facility, as last seen. */
  role?: MemberRole;
  /** Asked to join; an admin hasn't approved yet. Not synced until then. */
  pending?: boolean;
  /** The facility changed its password: enter the new one by this ISO time. */
  rekeyBy?: string;
}

const ACTIVE_KEY = "orsync.workspace.v2";
const LIST_KEY = "orsync.facilities.v2";
const LEGACY_KEY = "orsync.workspace.v1";
const ITERATIONS = 150_000;

export function normalizeFacilityName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function subtle(): Promise<SubtleCrypto> {
  const c = globalThis.crypto?.subtle;
  if (c) return c;
  // Test runtimes without WebCrypto on the global (older jsdom).
  const { webcrypto } = await import("node:crypto");
  return (webcrypto as unknown as Crypto).subtle;
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The facility's cloud address: the same on every device for the same
 *  name, whatever the spacing or capitalization. */
export async function facilityId(name: string): Promise<string> {
  const s = await subtle();
  return hex(await s.digest("SHA-256", new TextEncoder().encode(`orsync-facility:${normalizeFacilityName(name)}`)));
}

/** The password proof for a facility: PBKDF2 over name + password, slow by
 *  design (150k rounds) so guessing passwords is impractical. Nothing about
 *  the password itself survives it. */
export async function deriveFacilityProof(name: string, password: string): Promise<string> {
  const s = await subtle();
  const enc = new TextEncoder();
  const base = await s.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await s.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(`orsync-workspace:${normalizeFacilityName(name)}`), iterations: ITERATIONS },
    base,
    256,
  );
  return hex(bits);
}

/** @deprecated Older name for the proof; kept for existing tests/imports. */
export const deriveWorkspaceKey = deriveFacilityProof;

const listeners = new Set<() => void>();
export function onWorkspaceChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function notify() { for (const fn of listeners) fn(); }

function valid(w: unknown): w is JoinedWorkspace {
  const x = w as JoinedWorkspace;
  return !!x && typeof x.id === "string" && x.id.length === 64 && typeof x.name === "string";
}

/** The facility this device is synced with right now, if any. */
export function getWorkspace(): JoinedWorkspace | null {
  try {
    // The first-generation address scheme (name + password) is retired;
    // anything joined under it has to be joined again.
    localStorage.removeItem(LEGACY_KEY);
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw);
    return valid(w) ? w : null;
  } catch {
    return null;
  }
}

export function setWorkspace(w: JoinedWorkspace | null): void {
  try {
    if (w) {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(w));
      rememberFacility(w);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch { /* private mode */ }
  notify();
}

/** Every facility this device has joined (people work at, or travel to,
 *  more than one). One is active at a time; the rest are a tap away. */
export function getFacilities(): JoinedWorkspace[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    return Array.isArray(list) ? list.filter(valid) : [];
  } catch {
    return [];
  }
}

export function rememberFacility(w: JoinedWorkspace): void {
  try {
    const rest = getFacilities().filter((f) => f.id !== w.id);
    localStorage.setItem(LIST_KEY, JSON.stringify([w, ...rest]));
  } catch { /* private mode */ }
  notify();
}

export function getPendingFacilities(): JoinedWorkspace[] {
  return getFacilities().filter((f) => f.pending);
}

export function forgetFacility(id: string): void {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(getFacilities().filter((f) => f.id !== id)));
    const active = getWorkspace();
    if (active?.id === id) localStorage.removeItem(ACTIVE_KEY);
  } catch { /* private mode */ }
  notify();
}

// A one-line notice for the Settings screen when a facility shut this
// device out (an admin blocked the account, or the facility was removed).
const NOTICE_KEY = "orsync.facilitynotice.v1";

// Joined facilities belong to the account that joined them, not to the
// phone. Signing in as someone else starts with no facility (they must
// enter its name and password); the first account's list is set aside and
// comes back when it signs in again. Lists saved before this existed have
// no known owner and are dropped, so nobody inherits a facility.
const OWNER_KEY = "orsync.facilities.owner.v1";
const BY_ACCOUNT_KEY = "orsync.facilities.byAccount.v1";
type Stash = { active: string | null; list: string | null; notice: string | null };

/** Point this device's facility list at `account` (a uid, or null when
 *  signed out / a guest). Returns the facility that was active before if
 *  the list changed hands, so the caller can clear its data off the device.
 *  Doesn't notify listeners (it runs during render); call
 *  announceWorkspaceChange() afterwards. */
export function switchFacilityAccount(account: string | null): JoinedWorkspace | null {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    const before = getWorkspace();
    if (owner === account && (owner !== null || (!before && getFacilities().length === 0))) return null;
    let map: Record<string, Stash> = {};
    try { map = JSON.parse(localStorage.getItem(BY_ACCOUNT_KEY) ?? "{}") ?? {}; } catch { map = {}; }
    if (owner) {
      map[owner] = {
        active: localStorage.getItem(ACTIVE_KEY),
        list: localStorage.getItem(LIST_KEY),
        notice: localStorage.getItem(NOTICE_KEY),
      };
    }
    const next = account ? map[account] : undefined;
    if (account) delete map[account];
    for (const [k, v] of [[ACTIVE_KEY, next?.active], [LIST_KEY, next?.list], [NOTICE_KEY, next?.notice]] as const) {
      if (v) localStorage.setItem(k, v); else localStorage.removeItem(k);
    }
    localStorage.setItem(BY_ACCOUNT_KEY, JSON.stringify(map));
    if (account) localStorage.setItem(OWNER_KEY, account); else localStorage.removeItem(OWNER_KEY);
    return before;
  } catch {
    return null;
  }
}

export function announceWorkspaceChange(): void { notify(); }
export function getFacilityNotice(): string | null {
  try { return localStorage.getItem(NOTICE_KEY); } catch { return null; }
}
export function setFacilityNotice(msg: string | null): void {
  try {
    if (msg) localStorage.setItem(NOTICE_KEY, msg);
    else localStorage.removeItem(NOTICE_KEY);
  } catch { /* private mode */ }
  notify();
}

/** Where a device's synced library lives: the person's own cloud copy, or
 *  the facility workspace once joined. */
export function syncRootId(uid: string, ws: JoinedWorkspace | null): string {
  return ws ? `ws:${ws.id}` : uid;
}

/** Should the local library be treated as someone else's when switching
 *  roots? Going from your own copy into a facility keeps it (that's how a
 *  library gets shared). Anything else that changes the root (a different
 *  account on a shared device, a different facility, leaving a facility)
 *  means what's on the device belongs to the previous root, and the new
 *  root's cloud copy replaces it. */
export function isForeignRoot(prevRoot: string | null, nextRoot: string, uid: string): boolean {
  if (prevRoot === null || prevRoot === nextRoot) return false;
  if (prevRoot === uid && nextRoot.startsWith("ws:")) return false;
  return true;
}
