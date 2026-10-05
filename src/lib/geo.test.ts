import { describe, it, expect } from "vitest";
import { haversineMiles, formatMiles } from "./geo";

describe("geo distances", () => {
  it("measures a known distance (Austin to Dallas, ~182 mi)", () => {
    const mi = haversineMiles(30.2672, -97.7431, 32.7767, -96.797);
    expect(mi).toBeGreaterThan(170);
    expect(mi).toBeLessThan(195);
  });

  it("is zero for the same point", () => {
    expect(haversineMiles(30.1, -97.1, 30.1, -97.1)).toBe(0);
  });

  it("formats near, short, and long distances readably", () => {
    expect(formatMiles(0.05)).toBe("right here");
    expect(formatMiles(3.26)).toBe("3.3 mi");
    expect(formatMiles(182.4)).toBe("182 mi");
  });
});
