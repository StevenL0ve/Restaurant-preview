import { describe, it, expect } from "vitest";
import { isOpenOn, seatingTimes, formatSeating, isValidParty } from "./reservations";

describe("restaurant hours (Tue–Sat 11–3)", () => {
  it("is open Tuesday through Saturday", () => {
    expect(isOpenOn("2026-07-07")).toBe(true); // Tue
    expect(isOpenOn("2026-07-11")).toBe(true); // Sat
  });
  it("is closed Sunday and Monday", () => {
    expect(isOpenOn("2026-07-05")).toBe(false); // Sun
    expect(isOpenOn("2026-07-06")).toBe(false); // Mon
  });
  it("offers 30-minute seatings from 11:00 to 2:30", () => {
    const t = seatingTimes("2026-07-07");
    expect(t[0]).toBe("11:00");
    expect(t[t.length - 1]).toBe("14:30");
    expect(t).toHaveLength(8);
    expect(seatingTimes("2026-07-06")).toEqual([]); // Monday
  });
  it("formats seatings for humans", () => {
    expect(formatSeating("11:00")).toBe("11:00 AM");
    expect(formatSeating("14:30")).toBe("2:30 PM");
  });
  it("caps party size", () => {
    expect(isValidParty(2)).toBe(true);
    expect(isValidParty(0)).toBe(false);
    expect(isValidParty(11)).toBe(false);
  });
});
