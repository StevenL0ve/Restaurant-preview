import { describe, it, expect } from "vitest";
import { deriveWorkspaceKey, facilityId, isForeignRoot, normalizeFacilityName, syncRootId } from "./workspace";

describe("facility addresses", () => {
  it("the address comes from the name alone, so a password change never moves the data", async () => {
    const a = await facilityId("Mercy General OR");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await facilityId("  mercy   general or ")).toBe(a);
    expect(await facilityId("Mercy General OR")).not.toBe(a);
  });

  it("the address never reveals the proof (different derivations)", async () => {
    expect(await facilityId("Mercy General OR")).not.toBe(await deriveWorkspaceKey("Mercy General OR", "mercygeneral1"));
  });
});

describe("facility password proofs", () => {
  it("derives the same 64-hex proof on every device for the same name + password", async () => {
    const a = await deriveWorkspaceKey("Mercy General OR", "mercygeneral1");
    const b = await deriveWorkspaceKey("  mercy   general or ", "mercygeneral1"); // spacing/case of the NAME don't matter
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).toBe(a);
  });

  it("a different password or facility is a different address", async () => {
    const base = await deriveWorkspaceKey("Mercy General OR", "mercygeneral1");
    expect(await deriveWorkspaceKey("Mercy General OR", "Mercygeneral1")).not.toBe(base); // password is case-sensitive
    expect(await deriveWorkspaceKey("St. Luke's OR", "mercygeneral1")).not.toBe(base);
  });

  it("normalizes facility names", () => {
    expect(normalizeFacilityName("  Mercy   General  OR ")).toBe("mercy general or");
  });
});

describe("sync root switching", () => {
  const uid = "uid-steven";
  const ws = { id: "a".repeat(64), name: "Mercy General OR" };

  it("roots at the user, or at the facility once joined", () => {
    expect(syncRootId(uid, null)).toBe(uid);
    expect(syncRootId(uid, ws)).toBe("ws:" + "a".repeat(64));
  });

  it("joining a facility from your own library keeps (and shares) what's on the device", () => {
    expect(isForeignRoot(uid, syncRootId(uid, ws), uid)).toBe(false);
    expect(isForeignRoot(null, syncRootId(uid, ws), uid)).toBe(false); // fresh install
  });

  it("switching accounts, facilities, or leaving a facility treats local data as the old root's", () => {
    expect(isForeignRoot("uid-other", uid, uid)).toBe(true); // shared device, different person
    expect(isForeignRoot("ws:" + "a".repeat(64), "ws:" + "b".repeat(64), uid)).toBe(true); // facility A -> B
    expect(isForeignRoot("ws:" + "a".repeat(64), uid, uid)).toBe(true); // leave -> personal copy comes back
    expect(isForeignRoot(uid, uid, uid)).toBe(false);
  });
});
