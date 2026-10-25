import { describe, it, expect } from "vitest";
import { deriveWorkspaceKey, facilityId, isForeignRoot, normalizeFacilityName, syncRootId } from "./workspace";

describe("facility addresses", () => {
  it("the address comes from the name alone, so a password change never moves the data", async () => {
    const a = await facilityId("Keesler AFB OR");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await facilityId("  keesler   afb or ")).toBe(a);
    expect(await facilityId("Mercy General OR")).not.toBe(a);
  });

  it("the address never reveals the proof (different derivations)", async () => {
    expect(await facilityId("Keesler AFB OR")).not.toBe(await deriveWorkspaceKey("Keesler AFB OR", "Keeslerorflight"));
  });
});

describe("facility password proofs", () => {
  it("derives the same 64-hex proof on every device for the same name + password", async () => {
    const a = await deriveWorkspaceKey("Keesler AFB OR", "Keeslerorflight");
    const b = await deriveWorkspaceKey("  keesler   afb or ", "Keeslerorflight"); // spacing/case of the NAME don't matter
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).toBe(a);
  });

  it("a different password or facility is a different address", async () => {
    const base = await deriveWorkspaceKey("Keesler AFB OR", "Keeslerorflight");
    expect(await deriveWorkspaceKey("Keesler AFB OR", "keeslerorflight")).not.toBe(base); // password is case-sensitive
    expect(await deriveWorkspaceKey("Mercy General OR", "Keeslerorflight")).not.toBe(base);
  });

  it("normalizes facility names", () => {
    expect(normalizeFacilityName("  Keesler   AFB  OR ")).toBe("keesler afb or");
  });
});

describe("sync root switching", () => {
  const uid = "uid-steven";
  const ws = { id: "a".repeat(64), name: "Keesler AFB OR" };

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
