import { describe, it, expect } from "vitest";
import { answerQuery, resolveDate } from "./assistant";
import { buildSeed } from "../state/seed";

const seed = buildSeed();
// Fixed "now" so relative dates are deterministic. The seed builds events
// relative to the real now, so use the real now for the custody test.

describe("resolveDate", () => {
  it("understands tomorrow", () => {
    const now = new Date(2026, 5, 10);
    const r = resolveDate("are the kids with me tomorrow", now)!;
    expect(r.start.getDate()).toBe(11);
  });
  it("understands a named weekday", () => {
    const now = new Date(2026, 5, 10); // a Wednesday
    const r = resolveDate("what about next saturday", now)!;
    expect(r.start.getDay()).toBe(6);
    expect(r.label.toLowerCase()).toContain("saturday");
  });
  it("understands next month as a range", () => {
    const now = new Date(2026, 5, 10);
    const r = resolveDate("the vacation next month", now)!;
    expect(r.start.getMonth()).toBe(6);
    expect(r.end.getMonth()).toBe(7);
  });
});

describe("answerQuery", () => {
  it("answers a child's shoe size from the info bank", () => {
    const a = answerQuery(seed, "what size shoes does Ava wear?");
    expect(a.text.toLowerCase()).toContain("ava");
    expect(a.text).toContain("13 (kids)");
    expect(a.route).toBe("/info");
  });

  it("finds an upcoming event by keyword", () => {
    const a = answerQuery(seed, "when's Leo's soccer practice?");
    expect(a.text.toLowerCase()).toContain("soccer");
    expect(a.route).toBe("/calendar");
  });

  it("confirms whether a topic was messaged", () => {
    const a = answerQuery(seed, "did I message about the vacation next month?");
    expect(a.text.toLowerCase()).toContain("yes");
    expect(a.detail?.toLowerCase()).toContain("vacation");
    expect(a.route).toBe("/messages");
  });

  it("answers a custody question for a parenting-time day", () => {
    // Seed block e1 is "with You" for today..+3 days, so 'today' is with you.
    const a = answerQuery(seed, "are the kids with me today?");
    expect(a.route).toBe("/calendar");
    expect(a.text).toMatch(/kids are with/i);
  });

  it("answers the running balance ('who owes who?')", () => {
    const a = answerQuery(seed, "who owes who money?");
    // Seed balance: Jordan owes you $32.50 (unsettled items only).
    expect(a.text).toContain("Jordan owes you");
    expect(a.text).toContain("$32.50");
    expect(a.route).toBe("/expenses");
  });

  it("answers monthly spend questions", () => {
    const a = answerQuery(seed, "how much did I spend this month?");
    expect(a.text.toLowerCase()).toContain("out of pocket");
    expect(a.route).toBe("/expenses");
  });

  it("falls back gracefully on an unknown question", () => {
    const a = answerQuery(seed, "what's the weather like");
    expect(a.text.length).toBeGreaterThan(0);
  });
});
