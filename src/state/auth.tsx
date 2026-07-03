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

import { type Role } from "../lib/roles";
import { type Venue } from "../types";

interface Account {
  name: string;
  email: string;
  passHash: string;
  createdAt: string;
  role?: Role;
  venues?: Venue[]; // staff only — which sections they work
}
export interface SessionUser {
  name: string;
  email: string;
  role: Role;
  venues: Venue[]; // staff venue assignments (owners/IT span all venues)
  isAdmin: boolean; // any staff/owner/IT role
}

// Provisioned logins — the family owners (full admin across every venue),
// one shared staff login per section, plus IT support. These are created on
// first launch with an initial password (rotate it in Settings → Change
// password). New sign-ups are always plain members; roles only come from
// this directory. With a hosted backend this becomes a server-managed role
// table and the UI gates stay identical.
export const STAFF_DIRECTORY: { email: string; name: string; role: Role; venues?: Venue[] }[] = [
  { email: "bkborngaraised@gmail.com", name: "Steven", role: "it" },
  // The family — owner accounts reach every venue. Placeholder names/emails
  // until the real ones are provided.
  { email: "owner-mom@thecommongroundprojects.com", name: "Mom", role: "owner" },
  { email: "owner-son@thecommongroundprojects.com", name: "Son", role: "owner" },
  { email: "owner-daughter@thecommongroundprojects.com", name: "Daughter", role: "owner" },
  { email: "owner-soninlaw@thecommongroundprojects.com", name: "Son-in-law", role: "owner" },
  // Shared per-section staff logins. Staff who work multiple sections can be
  // given several venues here (e.g. venues: ["cafe", "restaurant"]).
  { email: "cafe@thecommongroundprojects.com", name: "Common Grounds Café", role: "staff", venues: ["cafe"] },
  { email: "figolive@thecommongroundprojects.com", name: "By the Fig & the Olive", role: "staff", venues: ["restaurant"] },
  { email: "yoga@thecommongroundprojects.com", name: "The Studio", role: "staff", venues: ["yoga"] },
  { email: "zenden@thecommongroundprojects.com", name: "The Zen Den", role: "staff", venues: ["zenden"] },
  { email: "massage@thecommongroundprojects.com", name: "CGP Massage", role: "staff", venues: ["massage"] },
];

// Initial passwords for the provisioned logins. Documented in the README;
// owners should rotate them from Settings on first sign-in.
const INITIAL_PASSWORDS: Record<string, string> = {
  "bkborngaraised@gmail.com": "CGP-IT-2026!",
  "owner-mom@thecommongroundprojects.com": "CGP-Owner-2026!",
  "owner-son@thecommongroundprojects.com": "CGP-Owner-2026!",
  "owner-daughter@thecommongroundprojects.com": "CGP-Owner-2026!",
  "owner-soninlaw@thecommongroundprojects.com": "CGP-Owner-2026!",
  "cafe@thecommongroundprojects.com": "CGP-Cafe-2026!",
  "figolive@thecommongroundprojects.com": "CGP-FigOlive-2026!",
  "yoga@thecommongroundprojects.com": "CGP-Studio-2026!",
  "zenden@thecommongroundprojects.com": "CGP-ZenDen-2026!",
  "massage@thecommongroundprojects.com": "CGP-Massage-2026!",
};

function roleOf(acct: Account): Role {
  return acct.role ?? "member";
}
function sessionOf(acct: Account): SessionUser {
  const role = roleOf(acct);
  return { name: acct.name, email: acct.email, role, venues: acct.venues ?? [], isAdmin: role !== "member" };
}

// Create any missing provisioned accounts (and keep their role, display name
// and venue assignments in sync with the directory) without ever touching an
// existing password.
async function ensureStaffAccounts(): Promise<void> {
  const accounts = loadAccounts();
  let changed = false;
  for (const staff of STAFF_DIRECTORY) {
    const existing = accounts[staff.email];
    if (!existing) {
      accounts[staff.email] = {
        name: staff.name,
        email: staff.email,
        passHash: await sha256(INITIAL_PASSWORDS[staff.email]),
        createdAt: new Date().toISOString(),
        role: staff.role,
        venues: staff.venues,
      };
      changed = true;
    } else {
      if (existing.role !== staff.role) {
        existing.role = staff.role;
        changed = true;
      }
      if (existing.name !== staff.name) {
        existing.name = staff.name;
        changed = true;
      }
      if (JSON.stringify(existing.venues ?? []) !== JSON.stringify(staff.venues ?? [])) {
        existing.venues = staff.venues;
        changed = true;
      }
    }
  }
  if (changed) saveAccounts(accounts);
}

// ---- Team management (IT/owner) ----
// Reads and writes the same local account store. Until the Phase-2 hosted
// backend, teammates added here exist on this device only; the directory
// logins above exist on every install.

export interface Teammate {
  name: string;
  email: string;
  role: Role;
  venues: Venue[];
  builtIn: boolean; // seeded from STAFF_DIRECTORY (synced on every launch)
}

export function listTeam(): Teammate[] {
  const accounts = loadAccounts();
  const directory = new Set(STAFF_DIRECTORY.map((s) => s.email));
  return Object.values(accounts)
    .filter((a) => roleOf(a) !== "member")
    .map((a) => ({
      name: a.name,
      email: a.email,
      role: roleOf(a),
      venues: a.venues ?? [],
      builtIn: directory.has(a.email),
    }))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
}

// Adds a teammate with a generated temporary password (returned once so it
// can be texted to them; they should rotate it in Settings).
export async function addTeammate(
  name: string,
  email: string,
  role: "owner" | "staff",
  venues: Venue[],
): Promise<string> {
  const key = email.trim().toLowerCase();
  if (!name.trim()) throw new Error("Please enter their name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) throw new Error("Enter a valid email.");
  if (role === "staff" && venues.length === 0) throw new Error("Pick at least one section they work.");
  const accounts = loadAccounts();
  if (accounts[key]) throw new Error("An account with that email already exists.");
  const temp = "CGP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  accounts[key] = {
    name: name.trim(),
    email: key,
    passHash: await sha256(temp),
    createdAt: new Date().toISOString(),
    role,
    venues: role === "staff" ? venues : undefined,
  };
  saveAccounts(accounts);
  return temp;
}

export function removeTeammate(email: string): void {
  const accounts = loadAccounts();
  const acct = accounts[email];
  if (!acct) return;
  if (STAFF_DIRECTORY.some((s) => s.email === email)) {
    throw new Error("Built-in logins can't be removed here.");
  }
  delete accounts[email];
  saveAccounts(accounts);
}

const ACCOUNTS_KEY = "cgp.accounts.v1";
const SESSION_KEY = "cgp.session.v1";
const BIO_KEY = "cgp.biometric.v1";

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
  changePassword: (current: string, next: string) => Promise<void>;
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
        if (acct) return sessionOf(acct);
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
    // Provision the owner/IT logins, then refresh the session's role in case
    // this device had an older account record.
    ensureStaffAccounts().then(() => {
      const email = localStorage.getItem(SESSION_KEY);
      const acct = email ? loadAccounts()[email] : undefined;
      if (acct) {
        setUser(sessionOf(acct));
      }
    });
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
      // New sign-ups are always members; roles come only from the directory.
      setUser({ name: name.trim(), email: key, role: "member", venues: [], isAdmin: false });
    },

    signIn: async (email, password) => {
      const key = email.trim().toLowerCase();
      const acct = loadAccounts()[key];
      if (!acct || acct.passHash !== (await sha256(password))) {
        throw new Error("Incorrect email or password.");
      }
      localStorage.setItem(SESSION_KEY, key);
      setUser(sessionOf(acct));
    },

    changePassword: async (current, next) => {
      if (!user) throw new Error("Sign in first.");
      if (next.length < 6) throw new Error("New password must be at least 6 characters.");
      const accounts = loadAccounts();
      const acct = accounts[user.email];
      if (!acct || acct.passHash !== (await sha256(current))) {
        throw new Error("Current password is incorrect.");
      }
      acct.passHash = await sha256(next);
      saveAccounts(accounts);
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
