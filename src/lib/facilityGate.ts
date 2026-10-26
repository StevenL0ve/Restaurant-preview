import { useEffect, useState } from "react";
import { getWorkspace, onWorkspaceChange } from "./workspace";

// What a person gets on their own vs. with a facility. Alone, ORSync is a
// preference-card app: make cards, share them, keep a case log. The parts
// that only make sense when a whole OR is on it (case carts and QC, the
// on-call board, loaner trays, the supply catalog) open up once the device
// is synced with a facility. A demo mode lets someone try those screens
// with the sample data on their device, nothing synced.

export const GATED_PREFIXES = ["/carts", "/on-call", "/loaners", "/catalog", "/spd"];

export function isGatedPath(path: string): boolean {
  return GATED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

const DEMO_KEY = "orsync.demo.v1";
const listeners = new Set<() => void>();

export function isDemo(): boolean {
  try { return localStorage.getItem(DEMO_KEY) === "1"; } catch { return false; }
}
export function setDemo(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEMO_KEY, "1");
    else localStorage.removeItem(DEMO_KEY);
  } catch { /* private mode */ }
  for (const fn of listeners) fn();
}

export interface FacilityAccess {
  /** Synced with a facility: the full app. */
  joined: boolean;
  /** Linked as a vendor rep: set requests only. */
  rep: boolean;
  /** Trying the facility screens with sample data, nothing synced. */
  demo: boolean;
  /** joined || demo */
  open: boolean;
}

export function useFacilityAccess(): FacilityAccess {
  const read = (): FacilityAccess => {
    const ws = getWorkspace();
    const joined = !!ws;
    const rep = ws?.role === "rep";
    const demo = !joined && isDemo();
    return { joined, rep, demo, open: joined || demo };
  };
  const [a, setA] = useState(read);
  useEffect(() => {
    const fn = () => setA(read());
    listeners.add(fn);
    const off = onWorkspaceChange(fn);
    return () => { listeners.delete(fn); off(); };
  }, []);
  return a;
}

// Where to send people. The store links fill in once the listings are live;
// until then the gate page says "coming soon" instead of a dead link.
export const SALES_EMAIL = "bkborngaraised@gmail.com";
export const APP_STORE_URL = "";
export const PLAY_STORE_URL = "";
