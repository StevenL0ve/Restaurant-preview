import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory Firestore: just the doc paths these helpers touch.
const docs = new Map<string, Record<string, unknown>>();
const members = new Map<string, { status: string; role?: string }>();
vi.mock("./cloud", () => ({ firebase: async () => ({ db: {} }) }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  setDoc: async (path: string, data: Record<string, unknown>) => { docs.set(path, data); },
  getDoc: async (path: string) => ({ exists: () => docs.has(path), data: () => docs.get(path) }),
}));
vi.mock("../state/cloudSync", () => ({
  myMembership: async (id: string) => members.get(id) ?? null,
}));

import { restoreAccountSettings, saveAccountSettings } from "./accountCloud";
import { getProfile, setProfile } from "./profile";
import { getFacilities, getWorkspace, setWorkspace } from "./workspace";

const A = "a".repeat(64), B = "b".repeat(64), C = "c".repeat(64);

describe("account settings follow the account", () => {
  beforeEach(() => { localStorage.clear(); docs.clear(); members.clear(); });

  it("saves the profile and facilities, then restores them on a new device", async () => {
    setWorkspace({ id: A, name: "Mercy General", role: "admin" });
    setWorkspace({ id: B, name: "St. Luke's", role: "member" });
    setWorkspace({ id: A, name: "Mercy General", role: "admin" }); // A active
    setProfile({ uid: "u1", name: "Steven Nelson", email: "s@example.com", role: "tech", completedAt: "2026-10-01T00:00:00Z" });
    await saveAccountSettings("u1");
    expect(docs.get("users/u1/meta/account")).toMatchObject({ activeId: A, profile: { name: "Steven Nelson" } });

    // New browser: nothing local.
    localStorage.clear();
    members.set(A, { status: "active", role: "admin" });
    members.set(B, { status: "blocked" }); // removed since: not restored
    expect(await restoreAccountSettings("u1")).toBe(true);
    expect(getProfile("u1")).toMatchObject({ name: "Steven Nelson", role: "tech", completedAt: "2026-10-01T00:00:00Z" });
    expect(getFacilities().map((f) => f.name)).toEqual(["Mercy General"]);
    expect(getWorkspace()?.id).toBe(A);
  });

  it("has nothing to restore for a brand-new account, and doesn't save an unfinished setup", async () => {
    expect(await restoreAccountSettings("u2")).toBe(false);
    setProfile({ uid: "u2", name: "New", email: "n@example.com" });
    await saveAccountSettings("u2");
    expect(docs.has("users/u2/meta/account")).toBe(false);
  });

  it("keeps a pending request pending, and skips unchanged saves", async () => {
    docs.set("users/u3/meta/account", { profile: { uid: "u3", name: "P", email: "p@example.com", completedAt: "x" }, facilities: [{ id: C, name: "Mercy General" }], activeId: C });
    members.set(C, { status: "pending", role: "member" });
    await restoreAccountSettings("u3");
    expect(getFacilities()[0]).toMatchObject({ id: C, pending: true });
    expect(getWorkspace()).toBeNull(); // not synced until approved

    await saveAccountSettings("u3");
    const first = docs.get("users/u3/meta/account");
    docs.delete("users/u3/meta/account");
    await saveAccountSettings("u3"); // nothing changed since: no write
    expect(docs.has("users/u3/meta/account")).toBe(false);
    expect(first).toBeTruthy();
  });
});
