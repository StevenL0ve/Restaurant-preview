import { describe, it, expect } from "vitest";
import { stripFacilityData } from "./store";
import { buildSeed } from "./seed";

describe("leaving a facility", () => {
  it("keeps what's personal and drops what belongs to the OR", () => {
    const s = buildSeed();
    const out = stripFacilityData(s);
    expect(out.cards).toBe(s.cards);
    expect(out.surgeons).toBe(s.surgeons);
    expect(out.cases).toBe(s.cases);
    expect(out.setups).toBe(s.setups);
    expect(out.carts).toEqual([]);
    expect(out.onCallPeople).toEqual([]);
    expect(out.onCallShifts).toEqual([]);
    expect(out.loaners).toEqual([]);
    expect(out.catalog).toEqual([]);
    expect(out.dayNotes).toEqual([]);
  });
});
