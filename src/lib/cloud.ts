import { CLOUD_CONFIG } from "../cloudConfig";

// ORSync Cloud: thin, lazy wrapper around Firebase. Everything is loaded on
// demand so that with the cloud off (no config) the Firebase SDK never even
// enters the bundle the user downloads at startup.

export function cloudEnabled(): boolean {
  return CLOUD_CONFIG !== null;
}

// ---- Lazy singletons --------------------------------------------------------

type FirebaseBits = {
  auth: import("firebase/auth").Auth;
  db: import("firebase/firestore").Firestore;
};

let bits: Promise<FirebaseBits> | null = null;

export function firebase(): Promise<FirebaseBits> {
  if (!CLOUD_CONFIG) return Promise.reject(new Error("Cloud is not configured."));
  if (!bits) {
    bits = (async () => {
      const { initializeApp } = await import("firebase/app");
      const { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } = await import("firebase/auth");
      const { initializeFirestore, persistentLocalCache, persistentSingleTabManager } = await import("firebase/firestore");
      const app = initializeApp(CLOUD_CONFIG!);
      // indexedDB persistence works in Capacitor's WKWebView and the browser.
      const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
      // Offline-first: Firestore keeps a local cache so the OR's dead-zone
      // wifi never blocks reads, and writes queue until the network returns.
      const db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
        // Our domain objects use optional fields heavily; Firestore should
        // just drop the undefined ones instead of rejecting the write.
        ignoreUndefinedProperties: true,
      });
      return { auth, db };
    })();
  }
  return bits;
}

// ---- Sync status, for the Settings screen ----------------------------------

export type CloudStatus =
  | { state: "off" }
  | { state: "signed-out" }
  | { state: "connecting" }
  | { state: "live"; lastSyncAt: string }
  | { state: "error"; message: string };

let status: CloudStatus = { state: cloudEnabled() ? "signed-out" : "off" };
const listeners = new Set<(s: CloudStatus) => void>();

export function setCloudStatus(s: CloudStatus) {
  status = s;
  for (const l of listeners) l(s);
}
export function getCloudStatus(): CloudStatus {
  return status;
}
export function onCloudStatus(fn: (s: CloudStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Friendly text for Firebase auth error codes. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "No account with that email. Create one first.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Enter a valid email.",
    "auth/network-request-failed": "No connection. Try again when you're back online.",
    "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
  };
  return map[code] ?? (e instanceof Error ? e.message : "Something went wrong. Try again.");
}
