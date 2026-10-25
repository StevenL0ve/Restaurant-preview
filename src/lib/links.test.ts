import { describe, it, expect } from "vitest";
import { facilityJoinAppLink, facilityJoinLink, WEB_APP_URL } from "./links";

describe("facility join links", () => {
  it("carry the facility and password in the hash, URL-safe", () => {
    const l = facilityJoinLink("Keesler AFB OR", "Keesler or&flight");
    expect(l.startsWith(WEB_APP_URL + "/#/join?")).toBe(true);
    expect(l).toContain("f=Keesler%20AFB%20OR");
    expect(l).toContain("p=Keesler%20or%26flight");
    expect(facilityJoinAppLink("Keesler AFB OR", "x")).toBe("orsync://join?f=Keesler%20AFB%20OR&p=x");
  });
});
