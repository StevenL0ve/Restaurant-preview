import { describe, it, expect } from "vitest";
import { buildSeed } from "./seed";
import { isLoanerOverdue, isLoanerSoon, loanerStats, loanersSorted } from "./store";
import type { LoanerTray } from "../types";

const base: Omit<LoanerTray, "id" | "status" | "createdAt" | "updatedAt" | "history"> = {
  description: "Test set",
};
function mk(partial: Partial<LoanerTray>): LoanerTray {
  return {
    id: partial.id ?? "l1",
    description: partial.description ?? "Test set",
    status: partial.status ?? "requested",
    createdAt: "2026-06-20T00:00:00Z",
    updatedAt: "2026-06-20T00:00:00Z",
    history: partial.history ?? [{ status: partial.status ?? "requested", at: "2026-06-20T00:00:00Z" }],
    ...partial,
  };
}

describe("loaner trays", () => {
  it("seeds demo loaner trays", () => {
    const s = buildSeed();
    expect(s.loaners.length).toBeGreaterThanOrEqual(3);
    expect(s.loaners.every((l) => l.history.length >= 1)).toBe(true);
  });

  it("flags an overdue tray (deadline passed, not yet delivered)", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isLoanerOverdue(mk({ neededBy: past, status: "confirmed" }))).toBe(true);
    // Delivered → no longer overdue even if the deadline passed.
    expect(isLoanerOverdue(mk({ neededBy: past, status: "delivered" }))).toBe(false);
  });

  it("flags a soon tray (case within the window)", () => {
    const soon = new Date(Date.now() + 2 * 86400000).toISOString();
    expect(isLoanerSoon(mk({ caseDate: soon, status: "confirmed" }))).toBe(true);
    const far = new Date(Date.now() + 30 * 86400000).toISOString();
    expect(isLoanerSoon(mk({ caseDate: far, status: "confirmed" }))).toBe(false);
  });

  it("counts active/overdue/soon and sorts overdue first", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const soon = new Date(Date.now() + 86400000).toISOString();
    const state = {
      facilities: [], locations: [], surgeons: [], cards: [], cases: [], setups: {},
      onCallPositions: [], onCallPeople: [], onCallShifts: [], carts: [],
      loaners: [
        mk({ id: "ok", caseDate: new Date(Date.now() + 20 * 86400000).toISOString(), status: "confirmed" }),
        mk({ id: "late", neededBy: past, status: "requested" }),
        mk({ id: "done", status: "returned" }),
      ],
    };
    const stats = loanerStats(state);
    expect(stats.active).toBe(2); // 'done' excluded
    expect(stats.overdue).toBe(1);
    void soon; void base;
    expect(loanersSorted(state)[0].id).toBe("late"); // overdue first
  });
});
