import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// Local accounts + session for the preview build. Passwords are SHA-256 hashed
// before storage — never kept in plain text. The signUp/signIn/signOut shape is
// deliberately backend-agnostic so it swaps to a hosted auth provider later
// without touching the component tree.

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

const ACCOUNTS_KEY = "mycellar.accounts.v1";
const SESSION_KEY = "mycellar.session.v1";

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

interface AuthContext {
  user: SessionUser | null;
  ready: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  // A no-friction way to explore the app without making an account.
  continueAsGuest: () => void;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read the saved session synchronously so there's no sign-in flash.
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
      const email = localStorage.getItem(SESSION_KEY);
      if (email === "guest") return { name: "Guest", email: "guest" };
      if (email) {
        const acct = loadAccounts()[email];
        if (acct) return { name: acct.name, email: acct.email };
      }
    } catch {
      /* no session */
    }
    return null;
  });

  const value: AuthContext = {
    user,
    ready: true,

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

    continueAsGuest: () => {
      localStorage.setItem(SESSION_KEY, "guest");
      setUser({ name: "Guest", email: "guest" });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
