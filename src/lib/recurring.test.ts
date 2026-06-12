import { describe, it, expect } from "vitest";
import { addMonths, expandRecurringExpense } from "./recurring";
import type { Expense } from "../types";

const base: Omit<Expense, "id"> = {
  description: "Childcare",
  amount: 800,
  paidById: "me",
  splitOtherShare: 0.5,
  date: "2026-01-15T00:00:00.000Z",
  category: "Childcare",
  status: "open",
};

describe("addMonths", () => {
  it("advances by whole months", () => {
    expect(addMonths("2026-01-15T00:00:00.000Z", 2).slice(0, 7)).toBe("2026-03");
  });

  it("clamps end-of-month overflow", () => {
    // Jan 31 + 1 month should land in February, not spill into March.
    const r = new Date(addMonths("2026-01-31T00:00:00.000Z", 1));
    expect(r.getMonth()).toBe(1); // February
  });
});

describe("expandRecurringExpense", () => {
  it("returns the single expense unchanged when months <= 1", () => {
    const out = expandRecurringExpense(base, 1);
    expect(out).toHaveLength(1);
    expect(out[0].description).toBe("Childcare");
  });

  it("creates one entry per month, tagged and dated monthly", () => {
    const out = expandRecurringExpense(base, 3);
    expect(out).toHaveLength(3);
    expect(out[0].description).toBe("Childcare (1/3)");
    expect(out[2].description).toBe("Childcare (3/3)");
    expect(out[0].date.slice(0, 7)).toBe("2026-01");
    expect(out[1].date.slice(0, 7)).toBe("2026-02");
    expect(out[2].date.slice(0, 7)).toBe("2026-03");
  });

  it("preserves amount and split across the series", () => {
    const out = expandRecurringExpense(base, 6);
    expect(out.every((e) => e.amount === 800 && e.splitOtherShare === 0.5)).toBe(true);
  });
});
