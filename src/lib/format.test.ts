import { describe, it, expect } from "vitest";
import { dayKey, isoDateInput } from "./format";

describe("dayKey / isoDateInput", () => {
  it("formats a local date as zero-padded YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("does not shift the day for an evening local time (UTC-rollover bug)", () => {
    // 9pm local on the 8th must stay on the 8th, not roll to the 9th.
    const evening = new Date(2026, 5, 8, 21, 0, 0);
    expect(dayKey(evening)).toBe("2026-06-08");
  });

  it("isoDateInput round-trips a local date key", () => {
    const d = new Date(2026, 5, 8, 21, 0, 0);
    expect(isoDateInput(d.toISOString())).toBe("2026-06-08");
  });
});
