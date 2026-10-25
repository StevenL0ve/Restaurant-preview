import { describe, it, expect } from "vitest";
import { facilityJoinAppLink, facilityJoinLink, WEB_APP_URL } from "./links";

describe("facility join links", () => {
  it("carry the facility and password in the hash, URL-safe", () => {
    const l = facilityJoinLink("Mercy General OR", "mercy or&general");
    expect(l.startsWith(WEB_APP_URL + "/#/join?")).toBe(true);
    expect(l).toContain("f=Mercy%20General%20OR");
    expect(l).toContain("p=mercy%20or%26general");
    expect(facilityJoinAppLink("Mercy General OR", "x")).toBe("orsync://join?f=Mercy%20General%20OR&p=x");
  });
});
