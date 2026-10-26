import { Capacitor } from "@capacitor/core";
import { APP_VERSION } from "../version";

// One address for help, facility pricing, and rep links (App Review needs a
// way to reach the developer from inside the app). The buttons open a
// ready-to-send draft in the phone's mail app. Plain-text email can't
// highlight, so the parts to fill in are marked ▶ with a [ fill in ] blank.
export const CONTACT_EMAIL = "admin@ourgymapp.com";

export interface ContactContext {
  email?: string | null;
  name?: string | null;
  facility?: string | null;
}

const BLANK = "[ fill in ]";

function platformLabel(): string {
  const p = Capacitor.getPlatform();
  return p === "ios" ? "iPhone/iPad app" : p === "android" ? "Android app" : "web";
}

function footer(ctx: ContactContext): string {
  return [
    "— For ORSync (please leave this) —",
    `Account: ${ctx.email || "not signed in"}`,
    ...(ctx.facility ? [`Facility: ${ctx.facility}`] : []),
    `ORSync ${APP_VERSION}, ${platformLabel()}`,
  ].join("\n");
}

function mailto(subject: string, body: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function supportMailto(ctx: ContactContext = {}): string {
  return mailto("ORSync help", [
    "Hi ORSync,",
    "",
    `▶ What do you need help with? ${BLANK}`,
    "",
    `▶ What were you doing when it happened? ${BLANK}`,
    "",
    "▶ A screenshot helps if you have one (attach it to this email).",
    "",
    footer(ctx),
  ].join("\n"));
}

export function facilityPricingMailto(ctx: ContactContext = {}): string {
  const line = (label: string) => `▶ ${label}: ${BLANK}`;
  return mailto("ORSync facility pricing request", [
    "Hi ORSync,",
    "",
    "We'd like pricing for an ORSync facility account. Our details are below.",
    "",
    "FACILITY",
    line("Hospital or surgery center name"),
    line("Street address, city, state, ZIP"),
    line("Number of operating rooms"),
    line("About how many OR staff will use ORSync"),
    "",
    "MAIN CONTACT (manages the account)",
    `▶ Name: ${ctx.name || BLANK}`,
    line("Title / role"),
    `▶ Work email: ${ctx.email || BLANK}`,
    line("Phone"),
    "",
    "BILLING (for the invoice)",
    line("Billing contact name and email"),
    line("Billing address, if different from above"),
    line("Purchase order (PO) number, if your facility needs one"),
    line("Tax-exempt? (yes / no; attach the certificate if yes)"),
    line("Bill monthly or annually"),
    "",
    "SETUP",
    line("Facility name staff will type to join"),
    line("First admin(s): name and the email they sign in to ORSync with"),
    line("When would you like to start"),
    line("Anything else we should know"),
    "",
    footer(ctx),
  ].join("\n"));
}

export function repLinkMailto(ctx: ContactContext = {}): string {
  const line = (label: string) => `▶ ${label}: ${BLANK}`;
  return mailto("ORSync vendor rep link", [
    "Hi ORSync,",
    "",
    "I'm a vendor rep and would like pricing for linking to a facility.",
    "",
    `▶ Name: ${ctx.name || BLANK}`,
    line("Company"),
    line("Facilities I cover"),
    line("Phone"),
    "",
    footer(ctx),
  ].join("\n"));
}
