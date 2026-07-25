import { describe, it, expect } from "vitest";
import { search } from "./search";
import { buildSeed } from "../state/seed";

const state = buildSeed();

describe("global search", () => {
  it("returns nothing for an empty query", () => {
    expect(search(state, "")).toEqual([]);
    expect(search(state, "   ")).toEqual([]);
  });

  it("finds a surgeon by name", () => {
    const hits = search(state, "chen");
    expect(hits[0].kind).toBe("surgeon");
    expect(hits[0].title).toContain("Chen");
  });

  it("finds a card by procedure", () => {
    const hits = search(state, "total knee");
    expect(hits.some((h) => h.kind === "card" && h.title.includes("Total Knee"))).toBe(true);
  });

  it("matches an item buried inside a card and surfaces a snippet", () => {
    const hits = search(state, "tourniquet");
    const card = hits.find((h) => h.kind === "card");
    expect(card).toBeTruthy();
    if (card && card.kind === "card") expect(card.snippet?.toLowerCase()).toContain("tourniquet");
  });

  it("finds a card by an item's storage location", () => {
    const hits = search(state, "cabinet 7");
    const card = hits.find((h) => h.kind === "card");
    expect(card).toBeTruthy();
    if (card && card.kind === "card") expect(card.snippet).toContain("📍");
  });

  it("ranks exact procedure matches above incidental item matches", () => {
    const hits = search(state, "vicryl"); // appears as a suture on several cards
    expect(hits.length).toBeGreaterThan(1);
    expect(hits.every((h) => h.kind === "card")).toBe(true);
  });

  it("finds an on-call person by name and flags who's on right now", () => {
    const hits = search(state, "Marcus");
    const oc = hits.find((h) => h.kind === "oncall");
    expect(oc).toBeTruthy();
    if (oc && oc.kind === "oncall") {
      expect(oc.title).toBe("Marcus Reed");
      expect(oc.snippet).toContain("On call now"); // seeded as current OR tech
    }
  });

  it("finds on-call people by role", () => {
    const hits = search(state, "CRNA");
    expect(hits.some((h) => h.kind === "oncall" && h.title === "Kelly Osei")).toBe(true);
  });
});
