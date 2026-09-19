import type { Expense } from "../types";

// Many shared costs repeat every month — childcare, tuition, insurance,
// activity fees. Re-entering them by hand is tedious and error-prone, so a
// single entry can be expanded into a series of monthly expenses.

export function addMonths(iso: string, n: number): string {
  const d = new Date(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  // Guard against month overflow (e.g. Jan 31 + 1 month → Mar 3); clamp to the
  // last valid day of the target month instead.
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString();
}

/**
 * Expand a single expense into `months` monthly occurrences. When months <= 1
 * the original (single) expense is returned unchanged. Each occurrence is
 * tagged "(i/n)" in its description so the series is easy to read.
 */
export function expandRecurringExpense(
  base: Omit<Expense, "id">,
  months: number,
): Omit<Expense, "id">[] {
  const count = Math.max(1, Math.floor(months));
  if (count === 1) return [base];
  return Array.from({ length: count }, (_, i) => ({
    ...base,
    date: addMonths(base.date, i),
    description: `${base.description} (${i + 1}/${count})`,
  }));
}
