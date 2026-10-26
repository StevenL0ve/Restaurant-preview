import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL, facilityPricingMailto, repLinkMailto, supportMailto } from "./contact";

const body = (href: string) => decodeURIComponent(new URL(href).searchParams.get("body") ?? "");

describe("contact drafts", () => {
  it("go to the ORSync address", () => {
    for (const h of [supportMailto(), facilityPricingMailto(), repLinkMailto()]) {
      expect(h.startsWith(`mailto:${CONTACT_EMAIL}?subject=`)).toBe(true);
    }
  });

  it("facility pricing asks for everything needed to invoice, marked to fill in", () => {
    const b = body(facilityPricingMailto({ email: "pat@mercy.org", name: "Pat Lee", facility: "Mercy General OR" }));
    for (const s of ["operating rooms", "Billing contact", "Purchase order", "Tax-exempt", "First admin"]) expect(b).toContain(s);
    expect(b).toContain("▶ Name: Pat Lee");
    expect(b).toContain("▶ Work email: pat@mercy.org");
    expect(b).toContain("[ fill in ]");
    expect(b).toContain("Account: pat@mercy.org");
  });

  it("help draft carries the account and version, not a password", () => {
    const b = body(supportMailto({ email: "pat@mercy.org", facility: "Mercy General OR" }));
    expect(b).toContain("Facility: Mercy General OR");
    expect(b).toMatch(/ORSync \d+\.\d+\.\d+/);
    expect(b.toLowerCase()).not.toContain("password");
  });
});
