import { describe, it, expect } from "vitest";
import { buildPalate, matchScore, EMPTY_TASTE } from "./taste";
import type { Wine } from "../types";

function wine(p: Partial<Wine>): Wine {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Test",
    producer: "",
    vintage: 2020,
    varietal: "",
    region: "",
    country: "",
    color: "red",
    photo: null,
    notes: "",
    likes: "",
    likeTags: [],
    rating: 0,
    price: null,
    taste: { ...EMPTY_TASTE },
    status: "wishlist",
    pairing: "",
    createdAt: new Date().toISOString(),
    ...p,
  };
}

describe("buildPalate", () => {
  it("has zero confidence with no liked wines", () => {
    const p = buildPalate([wine({ rating: 0, status: "wishlist" })]);
    expect(p.confidence).toBe(0);
    expect(p.topColors).toEqual([]);
  });

  it("learns favourite style from owned/highly-rated wines", () => {
    const p = buildPalate([
      wine({ color: "red", rating: 5, status: "rack", taste: { body: 5, sweetness: 1, tannin: 4, acidity: 4 } }),
      wine({ color: "red", rating: 4, status: "rack", taste: { body: 4, sweetness: 1, tannin: 3, acidity: 4 } }),
      wine({ color: "white", rating: 3, taste: { body: 2, sweetness: 1, tannin: 1, acidity: 5 } }),
    ]);
    expect(p.topColors[0]).toBe("red");
    expect(p.taste.body).toBeGreaterThan(3.5); // pulled toward full-bodied reds
    expect(p.confidence).toBeGreaterThan(0);
  });

  it("aggregates like tags weighted by preference", () => {
    const p = buildPalate([
      wine({ rating: 5, status: "rack", likeTags: ["dark fruit", "earthy"] }),
      wine({ rating: 5, status: "rack", likeTags: ["dark fruit"] }),
    ]);
    expect(p.topTags[0]).toBe("dark fruit");
  });
});

describe("matchScore", () => {
  it("scores a palate-aligned wine higher than an opposite one", () => {
    const palate = buildPalate([
      wine({ color: "red", rating: 5, status: "rack", likeTags: ["dark fruit"], taste: { body: 5, sweetness: 1, tannin: 4, acidity: 4 } }),
    ]);
    const similar = wine({ color: "red", likeTags: ["dark fruit"], taste: { body: 5, sweetness: 1, tannin: 4, acidity: 4 } });
    const opposite = wine({ color: "white", likeTags: ["citrus"], taste: { body: 1, sweetness: 4, tannin: 1, acidity: 2 } });
    expect(matchScore(similar, palate)).toBeGreaterThan(matchScore(opposite, palate));
  });

  it("returns a value within 0..100", () => {
    const palate = buildPalate([wine({ rating: 4, status: "rack" })]);
    const s = matchScore(wine({}), palate);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
