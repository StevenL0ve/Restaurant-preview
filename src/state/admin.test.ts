import { describe, it, expect } from "vitest";
import { STAFF_DIRECTORY } from "./auth";
import { postableVenues, ROLE_LABEL } from "../lib/roles";

describe("staff directory", () => {
  it("provisions the family owners, one staff login per section, and IT", () => {
    const byRole = (r: string) => STAFF_DIRECTORY.filter((s) => s.role === r);
    expect(byRole("it")).toHaveLength(1);
    expect(byRole("owner")).toHaveLength(4); // mom, son, daughter, son-in-law
    expect(byRole("staff")).toHaveLength(5); // one per section
  });
  it("includes the IT support login", () => {
    expect(STAFF_DIRECTORY.find((s) => s.role === "it")?.email).toBe("bkborngaraised@gmail.com");
  });
  it("labels every role", () => {
    for (const s of STAFF_DIRECTORY) expect(ROLE_LABEL[s.role]).toBeTruthy();
  });
  it("every staff login is assigned at least one venue", () => {
    for (const s of STAFF_DIRECTORY.filter((x) => x.role === "staff")) {
      expect(s.venues && s.venues.length).toBeGreaterThan(0);
    }
  });
  it("owners and IT carry no venue list — they span all venues", () => {
    for (const s of STAFF_DIRECTORY.filter((x) => x.role === "owner" || x.role === "it")) {
      expect(s.venues).toBeUndefined();
    }
  });
});

describe("postableVenues", () => {
  it("members cannot post anywhere", () => {
    expect(postableVenues("member")).toEqual([]);
    expect(postableVenues(undefined)).toEqual([]);
  });
  it("staff post only for their assigned sections", () => {
    expect(postableVenues("staff", ["cafe"])).toEqual(["cafe"]);
    expect(postableVenues("staff", ["cafe", "restaurant"])).toEqual(["cafe", "restaurant"]);
    expect(postableVenues("staff", [])).toEqual([]);
    expect(postableVenues("staff")).toEqual([]);
  });
  it("owners post anywhere — the family runs every section", () => {
    expect(postableVenues("owner")).toHaveLength(5);
  });
  it("IT posts anywhere", () => {
    expect(postableVenues("it")).toHaveLength(5);
  });
});
