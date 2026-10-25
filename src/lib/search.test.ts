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
    if (card && card.kind === "card") expect(card.snippet).toContain("cabinet 7");
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

describe("scheduled case search", () => {
  const sched = {
    ...state,
    cases: [
      {
        id: "case-x", date: "2099-01-05", time: "07:30", room: "OR 3",
        cardId: state.cards[0].id,
        team: [{ id: "tm1", role: "trainee" as const, name: "Lee", level: 2 as const }],
      },
    ],
  };

  it("finds a case by the surgeon's name and points at that day's board", () => {
    const surgeon = state.surgeons.find((s) => s.id === state.cards[0].surgeonId)!;
    const hits = search(sched, surgeon.name.split(" ").pop()!.toLowerCase());
    const hit = hits.find((h) => h.kind === "case");
    expect(hit).toBeTruthy();
    if (hit && hit.kind === "case") {
      expect(hit.entry.date).toBe("2099-01-05");
      expect(hit.subtitle).toContain("OR 3");
    }
  });

  it("finds a case by procedure and by a team member's name", () => {
    const byProc = search(sched, state.cards[0].procedure.slice(0, 8).toLowerCase());
    expect(byProc.some((h) => h.kind === "case")).toBe(true);
    const byTeam = search(sched, "lee");
    const hit = byTeam.find((h) => h.kind === "case");
    expect(hit).toBeTruthy();
    if (hit && hit.kind === "case") expect(hit.snippet).toContain("Trainee tech II · Lee");
  });
});

describe("reference number search", () => {
  it("finds a card by a supply REF number", () => {
    const withRef = {
      ...state,
      cards: state.cards.map((c, i) =>
        i === 0
          ? { ...c, supplies: [{ id: "sup-ref", name: "Polypropylene mesh", ref: "PRO-4521", qty: 1 }, ...c.supplies] }
          : c,
      ),
    };
    const hits = search(withRef, "pro-4521");
    const hit = hits.find((h) => h.kind === "card");
    expect(hit).toBeTruthy();
    if (hit && hit.kind === "card") expect(hit.snippet).toContain("REF PRO-4521");
  });
});
