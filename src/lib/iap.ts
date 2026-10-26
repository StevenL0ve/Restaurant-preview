import { Capacitor } from "@capacitor/core";

// Individual Pro through the App Store and Google Play (Apple's and Google's
// rules require their own billing for subscriptions sold inside the app).
// RevenueCat sits in front of both stores: one SDK, one Pro entitlement,
// and the ORSync account id as the RevenueCat user, so a subscription
// follows the person to any phone they sign in on.
//
// Fill in the two public SDK keys from RevenueCat (Project settings → API
// keys → Apple App Store / Google Play). Until they're set, the Plans page
// says subscriptions are coming soon instead of showing buy buttons.
export const REVENUECAT_IOS_KEY = "appl_jVtTdtPoBRVXEnXXdcsBqnDvkJU";
export const REVENUECAT_ANDROID_KEY = "";
export const PRO_ENTITLEMENT = "orsync_pro"; // lookup key of the "ORSync Pro" entitlement

const CACHE_KEY = "orsync.pro.v1"; // same flag hasPersonalCloud() reads

export function iapPlatform(): "ios" | "android" | null {
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : null;
}

export function iapReady(): boolean {
  const p = iapPlatform();
  return (p === "ios" && !!REVENUECAT_IOS_KEY) || (p === "android" && !!REVENUECAT_ANDROID_KEY);
}

async function sdk() {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  return Purchases;
}

let configuredFor: string | null = null;

function setCached(active: boolean) {
  try {
    if (active) localStorage.setItem(CACHE_KEY, "1");
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* private mode */ }
}

type Info = { entitlements: { active: Record<string, unknown> } };
const isPro = (info: Info) => !!info.entitlements.active[PRO_ENTITLEMENT];

/** Configure the store SDK for this account and refresh the Pro flag.
 *  Safe to call on every launch; no-ops on the web or without keys. */
export async function initIap(uid: string | null | undefined): Promise<boolean> {
  if (!iapReady() || !uid) return false;
  const Purchases = await sdk();
  if (configuredFor === null) {
    const apiKey = iapPlatform() === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    await Purchases.configure({ apiKey, appUserID: uid });
    await Purchases.addCustomerInfoUpdateListener((info) => setCached(isPro(info as unknown as Info)));
  } else if (configuredFor !== uid) {
    await Purchases.logIn({ appUserID: uid });
  }
  configuredFor = uid;
  const { customerInfo } = await Purchases.getCustomerInfo();
  const pro = isPro(customerInfo as unknown as Info);
  setCached(pro);
  return pro;
}

export interface ProPackage {
  id: string;
  title: string; // "Monthly" / "Annual"
  price: string; // localized, from the store: "$4.99"
  period: "month" | "year" | "other";
  raw: unknown;
}

/** The Pro packages from the current offering, with store-localized prices. */
export async function proPackages(): Promise<ProPackage[]> {
  if (!iapReady()) return [];
  const Purchases = await sdk();
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  return pkgs.map((p) => {
    const t = String(p.packageType ?? "");
    const period = t === "MONTHLY" ? "month" : t === "ANNUAL" ? "year" : "other";
    return {
      id: p.identifier,
      title: period === "month" ? "Monthly" : period === "year" ? "Annual" : p.product.title,
      price: p.product.priceString,
      period,
      raw: p,
    };
  });
}

/** Buy a package. Resolves true when Pro is active afterwards; false if the
 *  person cancelled the store sheet. */
export async function buyPro(pkg: ProPackage): Promise<boolean> {
  const Purchases = await sdk();
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg.raw as never });
    const pro = isPro(customerInfo as unknown as Info);
    setCached(pro);
    return pro;
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return false;
    throw e;
  }
}

/** "Restore purchases" (required by Apple): re-link a subscription bought
 *  earlier, on another phone, or before reinstalling. */
export async function restorePro(): Promise<boolean> {
  const Purchases = await sdk();
  const { customerInfo } = await Purchases.restorePurchases();
  const pro = isPro(customerInfo as unknown as Info);
  setCached(pro);
  return pro;
}

/** Where people manage or cancel: the store's own subscription settings. */
export function manageSubscriptionsUrl(): string {
  return iapPlatform() === "android"
    ? "https://play.google.com/store/account/subscriptions?package=com.stevennelson.orsync"
    : "https://apps.apple.com/account/subscriptions";
}
