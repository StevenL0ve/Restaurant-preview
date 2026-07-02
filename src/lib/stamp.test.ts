import { describe, it, expect } from "vitest";
import { verifyStampPin, isValidStampCount, MAX_STAMPS_PER_VISIT } from "./stamp";

describe("verifyStampPin", () => {
  it("accepts the barista PIN (with stray whitespace)", () => {
    expect(verifyStampPin("7391")).toBe(true);
    expect(verifyStampPin(" 7391 ")).toBe(true);
  });
  it("rejects wrong PINs", () => {
    expect(verifyStampPin("0000")).toBe(false);
    expect(verifyStampPin("")).toBe(false);
  });
});

describe("isValidStampCount", () => {
  it("allows 1 through the per-visit max", () => {
    expect(isValidStampCount(1)).toBe(true);
    expect(isValidStampCount(MAX_STAMPS_PER_VISIT)).toBe(true);
  });
  it("rejects zero, negatives, fractions and too many", () => {
    expect(isValidStampCount(0)).toBe(false);
    expect(isValidStampCount(-1)).toBe(false);
    expect(isValidStampCount(2.5)).toBe(false);
    expect(isValidStampCount(MAX_STAMPS_PER_VISIT + 1)).toBe(false);
  });
});
