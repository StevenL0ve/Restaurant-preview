import type { Venue, Wine } from "../types";
import { CATALOG } from "./catalog";
import { buildPalate, matchReason, matchScore, type Palate } from "./taste";

export interface Recommendation {
  wine: Wine; // a candidate styled as a full Wine for display (not persisted)
  score: number; // 0–100 palate match
  reason: string;
  // The user's own bottle this candidate most resembles — the "if you liked X".
  anchor: Wine | null;
}

function uid(): string {
  return `cand-${Math.random().toString(36).slice(2, 9)}`;
}

// Different venues call for a different slant on the same palate:
//  - winery: lean into discovery — surface a couple of styles outside the rut.
//  - wine store: balanced, buy-worthy matches across price-friendly picks.
//  - restaurant: tight matches you'll be confident ordering by the glass.
const VENUE_TILT: Record<Venue, { count: number; explore: number }> = {
  restaurant: { count: 4, explore: 0 },
  "wine-store": { count: 6, explore: 1 },
  winery: { count: 5, explore: 2 },
};

// Find the user's bottle that's closest in taste to a candidate, so we can say
// "because you loved this one".
function nearestOwned(candidate: Wine, owned: Wine[]): Wine | null {
  let best: Wine | null = null;
  let bestDist = Infinity;
  for (const w of owned) {
    const dist =
      Math.abs(w.taste.body - candidate.taste.body) +
      Math.abs(w.taste.sweetness - candidate.taste.sweetness) +
      Math.abs(w.taste.tannin - candidate.taste.tannin) +
      Math.abs(w.taste.acidity - candidate.taste.acidity);
    if (dist < bestDist) {
      bestDist = dist;
      best = w;
    }
  }
  return best;
}

export function recommendForVenue(
  venue: Venue,
  wines: Wine[],
): { palate: Palate; recommendations: Recommendation[] } {
  const palate = buildPalate(wines);
  const tilt = VENUE_TILT[venue];
  const loved = wines.filter((w) => w.rating >= 3 || w.status === "rack");

  const scored = CATALOG.map((c) => {
    const wine: Wine = {
      ...c,
      id: uid(),
      photo: null,
      notes: "",
      likes: "",
      rating: 0,
      price: null,
      status: "wishlist",
      createdAt: new Date().toISOString(),
    };
    return {
      wine,
      score: matchScore(wine, palate),
      reason: matchReason(wine, palate),
      anchor: nearestOwned(wine, loved),
    } as Recommendation;
  }).sort((a, b) => b.score - a.score);

  // Strong matches fill most slots; for stores/wineries reserve a couple of
  // "stretch" picks lower down the list to nudge the user toward new styles.
  const strong = scored.slice(0, tilt.count - tilt.explore);
  const explore = scored
    .slice(tilt.count - tilt.explore)
    .filter((r) => !palate.topColors.slice(0, 1).includes(r.wine.color))
    .slice(0, tilt.explore);

  return { palate, recommendations: [...strong, ...explore] };
}
