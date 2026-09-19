import { useEffect, useState } from "react";

// Subscription state. Phase 1 keeps a local flag so the paywall + Pro gating
// can be built and demoed; Phase 3 swaps getTier/subscribe for RevenueCat
// entitlements (Apple IAP / Google Play Billing) with the same surface.

export type Tier = "free" | "pro";

export interface Plan {
  id: "monthly" | "yearly";
  label: string;
  price: string;
  cadence: string;
  note?: string;
}

// These map to the App Store / Play products you'll create in RevenueCat.
export const PLANS: Plan[] = [
  { id: "yearly", label: "Yearly", price: "$59.99", cadence: "/year", note: "Best value — 2 months free" },
  { id: "monthly", label: "Monthly", price: "$7.99", cadence: "/month" },
];

const KEY = "coparent.tier";
const EVT = "coparent:tierchange";

export function getTier(): Tier {
  try {
    return localStorage.getItem(KEY) === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}

export function setTier(t: Tier) {
  localStorage.setItem(KEY, t);
  window.dispatchEvent(new Event(EVT));
}

export function useTier(): Tier {
  const [tier, setT] = useState<Tier>(getTier);
  useEffect(() => {
    const h = () => setT(getTier());
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  return tier;
}
