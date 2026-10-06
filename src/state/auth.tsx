import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cloudEnabled, firebase, authErrorMessage } from "../lib/cloud";

// Lightweight, optional accounts. ORSync is a *personal* tool, so the whole
// point is that you never need anyone's permission to use it — there's a
// one-tap "use without an account" path that goes straight to your library.
//
// An optional local account adds a Face ID lock for the patient-adjacent notes
// people keep here, and is structured so the calls swap cleanly to a hosted
// backend later (signUp/signIn become server calls; the tree doesn't change).
// Passwords are SHA-256 hashed before storage — never kept in plain text.

interface Account {
  name: string;
  email: string;
  passHash: string;
  createdAt: string;
}
export interface SessionUser {
  name: string;
  email: string;
  guest?: boolean;
  /** Set when signed in to ORSync Cloud: the account whose library syncs live. */
  uid?: string;
}

const ACCOUNTS_KEY = "orsync.accounts.v1";
const SESSION_KEY = "orsync.session.v1";
const CLOUD_SESSION_KEY = "orsync.cloudsession.v1";
const BIO_KEY = "orsync.biometric.v1";
const GUEST_KEY = "orsync.guest.v1";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadAccounts(): Record<string, Account> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveAccounts(a: Record<string, Account>) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
}

async function biometricAvailable(): Promise<boolean> {
  try {
    const w = window as unknown as {
      PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> };
    };
    if (w.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await w.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    /* not available */
  }
  return false;
}

interface AuthContext {
  user: SessionUser | null;
  ready: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => void;
  // biometric
  bioAvailable: boolean;
  bioEnabled: boolean;
  setBioEnabled: (on: boolean) => void;
  bioUnlock: () => Promise<boolean>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read any saved session synchronously so there's no login flash.
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
      if (localStorage.getItem(GUEST_KEY) === "1") return { name: "You", email: "", guest: true };
      // A cached cloud session paints instantly; Firebase reconciles it below.
      const cloud = localStorage.getItem(CLOUD_SESSION_KEY);
      if (cloudEnabled() && cloud) return JSON.parse(cloud) as SessionUser;
      const email = localStorage.getItem(SESSION_KEY);
      if (email) {
        const acct = loadAccounts()[email];
        if (acct) return { name: acct.name, email: acct.email };
      }
    } catch {
      /* no session */
    }
    return null;
  });
  const ready = true;
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabledState] = useState(() => localStorage.getItem(BIO_KEY) === "1");

  useEffect(() => {
    biometricAvailable().then(setBioAvailable);
  }, []);

  // With the cloud on, Firebase owns the session: reconcile the cached copy
  // (sign-outs elsewhere, profile changes) once its persistence hydrates.
  useEffect(() => {
    if (!cloudEnabled()) return;
    let stop: (() => void) | undefined;
    void (async () => {
      try {
        const { auth } = await firebase();
        const { onAuthStateChanged } = await import("firebase/auth");
        stop = onAuthStateChanged(auth, (fbUser) => {
          if (localStorage.getItem(GUEST_KEY) === "1") return; // guest is local-only
          if (fbUser) {
            const u: SessionUser = {
              name: fbUser.displayName || fbUser.email || "You",
              email: fbUser.email ?? "",
              uid: fbUser.uid,
            };
            localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(u));
            setUser((prev) => (prev && prev.uid === u.uid && prev.name === u.name ? prev : u));
          } else {
            localStorage.removeItem(CLOUD_SESSION_KEY);
            setUser((prev) => (prev?.uid ? null : prev));
          }
        });
      } catch {
        /* cloud unreachable: cached session keeps working offline */
      }
    })();
    return () => stop?.();
  }, []);

  const value: AuthContext = {
    user,
    ready,
    bioAvailable,
    bioEnabled,

    signUp: async (name, email, password) => {
      const key = email.trim().toLowerCase();
      if (!name.trim()) throw new Error("Please enter your name.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) throw new Error("Enter a valid email.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (cloudEnabled()) {
        try {
          const { auth } = await firebase();
          const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
          const cred = await createUserWithEmailAndPassword(auth, key, password);
          await updateProfile(cred.user, { displayName: name.trim() }).catch(() => undefined);
          const u: SessionUser = { name: name.trim(), email: key, uid: cred.user.uid };
          localStorage.removeItem(GUEST_KEY);
          localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(u));
          setUser(u);
          return;
        } catch (e) {
          throw new Error(authErrorMessage(e));
        }
      }
      const accounts = loadAccounts();
      if (accounts[key]) throw new Error("An account with that email already exists.");
      accounts[key] = {
        name: name.trim(),
        email: key,
        passHash: await sha256(password),
        createdAt: new Date().toISOString(),
      };
      saveAccounts(accounts);
      localStorage.removeItem(GUEST_KEY);
      localStorage.setItem(SESSION_KEY, key);
      setUser({ name: name.trim(), email: key });
    },

    signIn: async (email, password) => {
      const key = email.trim().toLowerCase();
      if (cloudEnabled()) {
        try {
          const { auth } = await firebase();
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          const cred = await signInWithEmailAndPassword(auth, key, password);
          const u: SessionUser = {
            name: cred.user.displayName || key,
            email: key,
            uid: cred.user.uid,
          };
          localStorage.removeItem(GUEST_KEY);
          localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(u));
          setUser(u);
          return;
        } catch (e) {
          throw new Error(authErrorMessage(e));
        }
      }
      const acct = loadAccounts()[key];
      if (!acct || acct.passHash !== (await sha256(password))) {
        throw new Error("Incorrect email or password.");
      }
      localStorage.removeItem(GUEST_KEY);
      localStorage.setItem(SESSION_KEY, key);
      setUser({ name: acct.name, email: acct.email });
    },

    continueAsGuest: () => {
      localStorage.setItem(GUEST_KEY, "1");
      setUser({ name: "You", email: "", guest: true });
    },

    signOut: () => {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(GUEST_KEY);
      localStorage.removeItem(CLOUD_SESSION_KEY);
      if (cloudEnabled()) {
        void firebase().then(async ({ auth }) => {
          const { signOut: fbSignOut } = await import("firebase/auth");
          await fbSignOut(auth);
        }).catch(() => undefined);
      }
      setUser(null);
    },

    setBioEnabled: (on) => {
      localStorage.setItem(BIO_KEY, on ? "1" : "0");
      setBioEnabledState(on);
    },

    bioUnlock: async () => {
      if (!(await biometricAvailable())) return true;
      try {
        const cred = await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            timeout: 60000,
            userVerification: "required",
            rpId: location.hostname,
            allowCredentials: [],
          },
        });
        return !!cred;
      } catch {
        return false;
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
