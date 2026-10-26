import { describe, expect, it } from "vitest";
import { glovesLabel } from "./gloves";
import { parseCardText, parseGlovePair } from "./parseCard";

describe("under and over gloves", () => {
  it("reads double gloving the ways printouts write it", () => {
    expect(parseGlovePair("8/8")).toEqual({ under: "8", over: "8" });
    expect(parseGlovePair("7.5/8")).toEqual({ under: "7.5", over: "8" });
    expect(parseGlovePair("Dr. Wagner 8 over/8 under")).toEqual({ under: "8", over: "8" });
    expect(parseGlovePair("under 7.5, over 8 Biogel")).toEqual({ under: "7.5", over: "8" });
    expect(parseGlovePair("7.5")).toBeNull(); // one pair only
    expect(parseGlovePair("Dr. A 7/7.5, Dr. B 8/8.5")).toBeNull(); // several people
  });

  it("fills the card's glove fields: one size = over gloves only", () => {
    expect(parseCardText("GLOVES: 7.5 Biogel")).toMatchObject({ gloveSize: "7.5", gloveType: "Biogel" });
    expect(parseCardText("GLOVES: 7.5 Biogel").gloveUnder).toBeUndefined();
    expect(parseCardText("GLOVES: 7.5/8")).toMatchObject({ gloveSize: "8", gloveUnder: "7.5" });
  });

  it("labels them plainly", () => {
    expect(glovesLabel({ gloveSize: "8", gloveUnder: "8" })).toBe("Under 8 · Over 8");
    expect(glovesLabel({ gloveSize: "7.5", gloveType: "Biogel" })).toBe("7.5 (Biogel)");
    expect(glovesLabel({})).toBeNull();
  });
});
