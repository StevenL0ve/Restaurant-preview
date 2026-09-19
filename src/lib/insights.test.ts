import { describe, it, expect } from "vitest";
import { computeInsights } from "./insights";
import { buildSeed } from "../state/seed";

describe("computeInsights", () => {
  it("sums shared spend and your out-of-pocket for the current month", () => {
    const s = buildSeed();
    const now = new Date();
    // Seed has a $90 soccer expense you paid ~3h ago (this month).
    const r = computeInsights(s, now);
    expect(r.totalSpend).toBeGreaterThanOrEqual(90);
    expect(r.yourOutOfPocket).toBeGreaterThanOrEqual(90);
  });

  it("counts messages from the last 7 days", () => {
    const s = buildSeed();
    const r = computeInsights(s, new Date());
    // All seed messages are within the last ~26h.
    expect(r.messagesThisWeek).toBe(s.messages.length);
  });

  it("counts only events within the next 7 days", () => {
    const s = buildSeed();
    const r = computeInsights(s, new Date());
    expect(r.eventsNext7Days).toBeGreaterThan(0);
    expect(r.eventsNext7Days).toBeLessThanOrEqual(s.events.length);
  });

  it("excludes last-month expenses from the total", () => {
    const s = buildSeed();
    s.expenses = [
      { id: "old", description: "Old", amount: 500, paidById: s.meId,
        splitOtherShare: 0.5, date: "2000-01-01T00:00:00.000Z",
        category: "Other", status: "open" },
    ];
    expect(computeInsights(s, new Date()).totalSpend).toBe(0);
  });
});
