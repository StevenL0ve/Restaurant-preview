import { describe, it, expect } from "vitest";
import { STAFF_DIRECTORY } from "./auth";
import { postableVenues, ROLE_LABEL } from "../lib/roles";

describe("staff directory", () => {
  it("provisions one login per ownership category plus IT support", () => {
    const roles = STAFF_DIRECTORY.map((s) => s.role).sort();
    expect(roles).toEqual(["cafe", "it", "massage", "restaurant", "yoga", "zenden"]);
  });
  it("includes the IT support login", () => {
    expect(STAFF_DIRECTORY.find((s) => s.role === "it")?.email).toBe("bkborngaraised@gmail.com");
  });
  it("labels every role", () => {
    for (const s of STAFF_DIRECTORY) expect(ROLE_LABEL[s.role]).toBeTruthy();
  });
});

describe("postableVenues", () => {
  it("members cannot post anywhere", () => {
    expect(postableVenues("member")).toEqual([]);
    expect(postableVenues(undefined)).toEqual([]);
  });
  it("owners post only for their own business", () => {
    expect(postableVenues("cafe")).toEqual(["cafe"]);
    expect(postableVenues("yoga")).toEqual(["yoga"]);
  });
  it("IT posts anywhere", () => {
    expect(postableVenues("it")).toHaveLength(5);
  });
});
