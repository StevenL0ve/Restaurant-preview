// Facility workspaces: one shared library per hospital OR, joined with the
// facility's name and password. There's no server to check a password
// against (Firebase's free tier has no server code), so the password is
// never stored anywhere. Instead the app derives a long secret key from
// name + password on the device, and that key IS the workspace's address in
// the cloud. The security rules let signed-in users read a workspace only by
// its exact address and never list them, so knowing the password is the
// only way in. Deriving the key is deliberately slow (PBKDF2, 150k rounds)
// so guessing passwords one query at a time is impractical.

export interface JoinedWorkspace {
  key: string; // the derived address
  name: string; // display name, as typed
}

const KEY = "orsync.workspace.v1";
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

/** The workspace address for a facility name + password. Same inputs, same
 *  address, on every device; nothing about the password survives it. */
export async function deriveWorkspaceKey(name: string, password: string): Promise<string> {
  const s = await subtle();
  const enc = new TextEncoder();
  const base = await s.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await s.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(`orsync-workspace:${normalizeFacilityName(name)}`), iterations: ITERATIONS },
    base,
    256,
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const listeners = new Set<() => void>();
export function onWorkspaceChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getWorkspace(): JoinedWorkspace | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as JoinedWorkspace;
    return w && typeof w.key === "string" && w.key.length === 64 ? w : null;
  } catch {
    return null;
  }
}

export function setWorkspace(w: JoinedWorkspace | null): void {
  try {
    if (w) localStorage.setItem(KEY, JSON.stringify(w));
    else localStorage.removeItem(KEY);
  } catch { /* private mode */ }
  for (const fn of listeners) fn();
}

/** Where a device's synced library lives: the person's own cloud copy, or
 *  the facility workspace once joined. */
export function syncRootId(uid: string, ws: JoinedWorkspace | null): string {
  return ws ? `ws:${ws.key}` : uid;
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
