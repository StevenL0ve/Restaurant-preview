import { isOrsyncOwner } from "./owner";
import type { AppState } from "../types";

// ORSync pricing tiers — scaffolded now, switched on at App Store launch.
//
// While BETA_UNLOCKED is true (TestFlight), every feature is free and no gate
// fires: beta is for building love, not converting it. At launch we flip it to
// false and swap `hasPro` to a RevenueCat/StoreKit entitlement check — the
// gates and paywall below don't change.

export const BETA_UNLOCKED = true;

export const PRICE_MONTHLY = "$4.99";
export const PRICE_ANNUAL = "$39.99";
export const ANNUAL_SAVINGS = "33%";

// Free tier: enough to get hooked, not enough for a traveler's real library.
export const FREE_CARD_LIMIT = 10;
export const FREE_FACILITY_LIMIT = 1;

const PRO_KEY = "orsync.pro.v1";

/** Local entitlement placeholder — becomes a store-subscription check at launch. */
export function hasPro(): boolean {
  return BETA_UNLOCKED || localStorage.getItem(PRO_KEY) === "1";
}

/** Off-device storage for a PERSONAL library (your cards in ORSync Cloud,
 *  on every device you sign in to). Never free, beta included: storage
 *  costs real money per person. A facility's package covers its members'
 *  shared library instead; see the store's sync gate. */
export function hasPersonalCloud(email?: string | null): boolean {
  if (isOrsyncOwner(email ?? sessionEmail())) return true;
  try { return localStorage.getItem(PRO_KEY) === "1"; } catch { return false; }
}

function sessionEmail(): string | null {
  try {
    const raw = localStorage.getItem("orsync.cloudsession.v1");
    return raw ? (JSON.parse(raw) as { email?: string }).email ?? null : null;
  } catch {
    return null;
  }
}

export const FACILITY_PRICE_MONTHLY = "$199";
export const FACILITY_PRICE_ANNUAL = "$1,990";
export const FACILITY_SEATS = 30;
export const REP_PRICE_MONTHLY = "$29";

export const FREE_PERKS = [
  "Preference cards, stored on this phone",
  "Share cards as files or text; print with QR codes",
  "Your case log",
  "Join a facility that has ORSync (its package covers your shared library)",
] as const;

export const FACILITY_PERKS = [
  "One shared library for the whole OR, in ORSync Cloud",
  "Members' shared cards, carts, QC, on-call, loaners, and catalog stored off-device and synced live",
  "Admins approve who joins, remove anyone, and rotate the password",
  "Email support",
] as const;
// Facility and rep links are sold directly (email for pricing), not in the app.

/** Scaffold "purchase": records the entitlement locally. Real IAP replaces this. */
export function grantProLocally(): void {
  localStorage.setItem(PRO_KEY, "1");
}

export type Gate =
  | { allowed: true }
  | { allowed: false; reason: string };

export function gateNewCard(state: AppState): Gate {
  if (hasPro() || state.cards.length < FREE_CARD_LIMIT) return { allowed: true };
  return {
    allowed: false,
    reason: `The free plan holds ${FREE_CARD_LIMIT} cards. Go Pro for an unlimited library.`,
  };
}

export function gateNewFacility(state: AppState): Gate {
  if (hasPro() || state.facilities.length < FREE_FACILITY_LIMIT) return { allowed: true };
  return {
    allowed: false,
    reason: `The free plan covers ${FREE_FACILITY_LIMIT} facility. Go Pro to organize every hospital you work at.`,
  };
}

export const PRO_PERKS = [
  "Your personal library in ORSync Cloud: backed up, on every device you sign in to",
  "Unlimited preference cards",
  "Unlimited facilities & location sets",
  "Loaner-tray tracking with deadlines",
  "Bulk CSV import (Genesis / SIS exports)",
  "Share cards & export your whole library",
  "Face ID lock",
] as const;
