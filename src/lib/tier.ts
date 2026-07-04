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
  "Unlimited preference cards",
  "Unlimited facilities & location sets",
  "Loaner-tray tracking with deadlines",
  "Bulk CSV import (Genesis / SIS exports)",
  "Share cards & export your whole library",
  "Face ID lock",
] as const;
