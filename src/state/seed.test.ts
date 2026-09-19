import { describe, it, expect } from "vitest";
import { buildFamily, buildSeed } from "./seed";

describe("buildFamily", () => {
  it("creates a clean family with the given names and no demo records", () => {
    const s = buildFamily("Steven Nelson", "Leya Cruz", ["Ava", "John"]);
    const names = s.people.map((p) => p.name);
    expect(names).toEqual(["Steven Nelson", "Leya Cruz", "Ava", "John"]);
    expect(s.people[0].role).toBe("me");
    expect(s.people[1].role).toBe("coparent");
    expect(s.messages).toHaveLength(0);
    expect(s.events).toHaveLength(0);
    expect(s.expenses).toHaveLength(0);
    expect(s.packing).toHaveLength(0);
  });

  it("derives initials and skips blank child names", () => {
    const s = buildFamily("Steven Nelson", "Leya", ["", "  ", "Ava"]);
    const kids = s.people.filter((p) => p.role === "child");
    expect(kids).toHaveLength(1);
    expect(s.people[0].initials).toBe("SN");
    expect(kids[0].name).toBe("Ava");
  });

  it("falls back to sensible defaults for empty parent names", () => {
    const s = buildFamily("", "", []);
    expect(s.people[0].name).toBe("You");
    expect(s.people[1].name).toBe("Co-parent");
  });
});

describe("buildSeed", () => {
  it("still produces the demo family with records", () => {
    const s = buildSeed();
    expect(s.messages.length).toBeGreaterThan(0);
    expect(s.events.length).toBeGreaterThan(0);
  });
});
