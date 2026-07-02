import { describe, it, expect } from "vitest";
import { makeGiftCode, parseGiftCode } from "./giftcode";

describe("gift codes", () => {
  it("round-trips a valid code", () => {
    const code = makeGiftCode(25)!;
    expect(code).toMatch(/^CGPG-25-/);
    expect(parseGiftCode(code)).toBe(25);
  });
  it("is case- and whitespace-forgiving on redeem", () => {
    const code = makeGiftCode(50)!;
    expect(parseGiftCode(`  ${code.toLowerCase()} `)).toBe(50);
  });
  it("rejects tampered amounts", () => {
    const code = makeGiftCode(10)!;
    expect(parseGiftCode(code.replace("CGPG-10-", "CGPG-99-"))).toBeNull();
  });
  it("rejects garbage and out-of-range purchases", () => {
    expect(parseGiftCode("CGPG-25-AAAA-1234567")).toBeNull();
    expect(parseGiftCode("hello")).toBeNull();
    expect(makeGiftCode(2)).toBeNull();
    expect(makeGiftCode(1000)).toBeNull();
  });
});
