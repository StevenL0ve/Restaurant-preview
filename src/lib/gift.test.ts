import { describe, it, expect } from "vitest";
import { giftApplicable, isValidReload } from "./gift";

describe("giftApplicable", () => {
  it("covers the whole total when the balance is big enough", () => {
    expect(giftApplicable(50, 12.75)).toBe(12.75);
  });
  it("caps at the balance when the total is bigger", () => {
    expect(giftApplicable(10, 25)).toBe(10);
  });
  it("is zero with no balance or no total", () => {
    expect(giftApplicable(0, 25)).toBe(0);
    expect(giftApplicable(25, 0)).toBe(0);
  });
});

describe("isValidReload", () => {
  it("accepts normal amounts", () => {
    expect(isValidReload(10)).toBe(true);
    expect(isValidReload(25.5)).toBe(true);
  });
  it("rejects zero, negatives, huge and sub-cent amounts", () => {
    expect(isValidReload(0)).toBe(false);
    expect(isValidReload(-5)).toBe(false);
    expect(isValidReload(501)).toBe(false);
    expect(isValidReload(1.005)).toBe(false);
  });
});
