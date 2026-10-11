import { describe, it, expect } from "vitest";
import { CASH_APP_TAG, cashAppUrl } from "./payments";

describe("cash app payment links", () => {
  it("links to the CGP cashtag", () => {
    expect(cashAppUrl()).toBe("https://cash.app/$commongroundprojects");
    expect(CASH_APP_TAG.startsWith("$")).toBe(true);
  });
  it("prefills the exact total to the cent", () => {
    expect(cashAppUrl(12.5)).toBe("https://cash.app/$commongroundprojects/12.50");
    expect(cashAppUrl(7)).toBe("https://cash.app/$commongroundprojects/7.00");
  });
  it("omits the amount when nothing is due", () => {
    expect(cashAppUrl(0)).toBe("https://cash.app/$commongroundprojects");
  });
});
