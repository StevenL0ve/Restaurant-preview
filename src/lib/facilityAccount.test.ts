import { beforeEach, describe, expect, it } from "vitest";
import { getFacilities, getWorkspace, setWorkspace, switchFacilityAccount } from "./workspace";

const keesler = { id: "k".repeat(64), name: "Mercy General OR", role: "member" as const };

describe("facilities follow the account, not the phone", () => {
  beforeEach(() => localStorage.clear());

  it("a new account on the same phone starts with no facility", () => {
    switchFacilityAccount("alice");
    setWorkspace(keesler);
    const left = switchFacilityAccount("bob");
    expect(left?.id).toBe(keesler.id);
    expect(getWorkspace()).toBeNull();
    expect(getFacilities()).toEqual([]);
  });

  it("the first account gets its facility back when it signs in again", () => {
    switchFacilityAccount("alice");
    setWorkspace(keesler);
    switchFacilityAccount(null); // signed out
    expect(getWorkspace()).toBeNull();
    switchFacilityAccount("bob");
    expect(getWorkspace()).toBeNull();
    switchFacilityAccount("alice");
    expect(getWorkspace()?.id).toBe(keesler.id);
    expect(getFacilities().map((f) => f.id)).toEqual([keesler.id]);
  });

  it("a list saved before accounts were tracked isn't inherited", () => {
    setWorkspace(keesler); // no owner recorded
    switchFacilityAccount("bob");
    expect(getWorkspace()).toBeNull();
    expect(getFacilities()).toEqual([]);
  });

  it("the same account staying signed in keeps its facility", () => {
    switchFacilityAccount("alice");
    setWorkspace(keesler);
    expect(switchFacilityAccount("alice")).toBeNull();
    expect(getWorkspace()?.id).toBe(keesler.id);
  });
});
