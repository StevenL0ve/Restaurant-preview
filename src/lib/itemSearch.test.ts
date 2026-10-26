import { describe, it, expect } from "vitest";
import { search } from "./search";
import { buildSeed } from "../state/seed";

describe("item search", () => {
  it("finds a tray in sterile processing with its cabinet and shelf", () => {
    const st = { ...buildSeed(), spdTrays: [{ id: "t1", name: "Major Ortho Tray", setNumber: "2", cabinet: "B", shelf: "3", updatedAt: "2026-10-26T00:00:00Z" }] };
    const hit = search(st, "ortho tray").find((h) => h.kind === "item");
    expect(hit?.title).toBe("Major Ortho Tray");
    expect(hit?.snippet).toContain("SPD Cabinet B · Shelf 3");
  });

  it("finds a supply once, with how many cards list it", () => {
    const st = buildSeed();
    const any = st.cards[0].supplies[0] ?? st.cards[0].instruments[0];
    const items = search(st, any.name).filter((h) => h.kind === "item");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].snippet).toMatch(/on \d+ card/);
  });
});
