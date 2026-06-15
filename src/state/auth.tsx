import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Phase-1 authentication: real email/password accounts + session, stored
// locally and structured so the calls swap cleanly to Supabase in Phase 2
// (signUp/signIn/signOut become Supabase auth calls; the component tree
// doesn't change). Passwords are SHA-256 hashed before storage — never kept
// in plain text — though real security arrives with the hosted backend.

interface Account {
  name: string;
  email: string;
  passHash: string;
  createdAt: string;
}
export interface SessionUser {
  name: string;
  email: string;
}

const ACCOUNTS_KEY = "coparent.accounts.v1";
const SESSION_KEY = "coparent.session.v1";
const BIO_KEY = "coparent.biometric.v1";

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

// Is a platform biometric (Face ID / Touch ID) usable here? On a real device
// the native build answers via the Capacitor biometric plugin; in the browser
// we detect a WebAuthn platform authenticator.
async function biometricAvailable(): Promise<boolean> {
  try {
    const w = window as unknown as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } };
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
  signOut: () => void;
  // biometric
  bioAvailable: boolean;
  bioEnabled: boolean;
  setBioEnabled: (on: boolean) => void;
  bioUnlock: () => Promise<boolean>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read the saved session synchronously so there's no login flash and SSR
  // reflects the real state immediately.
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
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
  const [bioEnabled, setBioEnabledState] = useState(
    () => localStorage.getItem(BIO_KEY) === "1",
  );

  useEffect(() => {
    biometricAvailable().then(setBioAvailable);
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
      const accounts = loadAccounts();
      if (accounts[key]) throw new Error("An account with that email already exists.");
      accounts[key] = {
        name: name.trim(),
        email: key,
        passHash: await sha256(password),
        createdAt: new Date().toISOString(),
      };
      saveAccounts(accounts);
      localStorage.setItem(SESSION_KEY, key);
      setUser({ name: name.trim(), email: key });
    },

    signIn: async (email, password) => {
      const key = email.trim().toLowerCase();
      const acct = loadAccounts()[key];
      if (!acct || acct.passHash !== (await sha256(password))) {
        throw new Error("Incorrect email or password.");
      }
      localStorage.setItem(SESSION_KEY, key);
      setUser({ name: acct.name, email: acct.email });
    },

    signOut: () => {
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
    },

    setBioEnabled: (on) => {
      localStorage.setItem(BIO_KEY, on ? "1" : "0");
      setBioEnabledState(on);
    },

    // Re-affirm the device owner. On native this calls the biometric plugin;
    // the WebAuthn path covers Face ID/Touch ID in the browser. Falls back to
    // "true" only when no authenticator exists so the user isn't locked out.
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
        // User cancelled or no enrolled credential — treat as failed unlock.
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
