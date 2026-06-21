import { describe, it, expect } from "vitest";
import { recommendForVenue } from "./recommend";
import { EMPTY_TASTE } from "./taste";
import type { Wine } from "../types";

function wine(p: Partial<Wine>): Wine {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Test", producer: "", vintage: 2020, varietal: "", region: "",
    country: "", color: "red", photo: null, notes: "", likes: "",
    likeTags: [], rating: 0, price: null, taste: { ...EMPTY_TASTE },
    status: "wishlist", pairing: "", createdAt: new Date().toISOString(), ...p,
  };
}

const bigReds: Wine[] = [
  wine({ color: "red", rating: 5, status: "rack", likeTags: ["dark fruit", "structured"], taste: { body: 5, sweetness: 1, tannin: 4, acidity: 4 } }),
  wine({ color: "red", rating: 5, status: "rack", likeTags: ["dark fruit"], taste: { body: 5, sweetness: 1, tannin: 4, acidity: 3 } }),
];

describe("recommendForVenue", () => {
  it("returns the venue-specific number of suggestions", () => {
    expect(recommendForVenue("restaurant", bigReds).recommendations.length).toBe(4);
    expect(recommendForVenue("wine-store", bigReds).recommendations.length).toBeGreaterThanOrEqual(5);
  });

  it("sorts strong matches by descending score", () => {
    const { recommendations } = recommendForVenue("restaurant", bigReds);
    const scores = recommendations.map((r) => r.score);
    const top4 = scores.slice(0, 4);
    expect([...top4].sort((a, b) => b - a)).toEqual(top4);
  });

  it("anchors recommendations to a wine the user owns", () => {
    const { recommendations } = recommendForVenue("restaurant", bigReds);
    expect(recommendations[0].anchor).not.toBeNull();
  });

  it("works with an empty cellar without throwing", () => {
    const { recommendations } = recommendForVenue("winery", []);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
