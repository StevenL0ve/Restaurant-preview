import { describe, it, expect } from "vitest";
import { buildSeed } from "./seed";
import { casesOn, localDay, pendingLoanersForCard } from "./store";

describe("case day", () => {
  it("seeds cases on today, sorted by time", () => {
    const s = buildSeed();
    const today = casesOn(s, localDay(0));
    expect(today.length).toBeGreaterThanOrEqual(2);
    // Sorted ascending by time (07:30 before 10:15).
    const times = today.map((c) => c.time ?? "99:99");
    expect([...times]).toEqual([...times].sort());
  });

  it("localDay yields a YYYY-MM-DD string and offsets by whole days", () => {
    expect(localDay(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(localDay(1)).not.toBe(localDay(0));
  });

  it("flags a card's not-yet-ready loaners", () => {
    const s = buildSeed();
    // The seeded ACL loaner is 'requested' (not ready) and linked to the ACL card.
    const acl = s.cards.find((c) => c.procedure.startsWith("ACL"))!;
    const pending = pendingLoanersForCard(s, acl.id);
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending.every((l) => l.status !== "ready" && l.status !== "returned")).toBe(true);
  });
});
