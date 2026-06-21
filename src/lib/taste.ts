import type { TasteProfile, Wine, WineColor } from "../types";

// Learn a palate from the bottles a user has reacted to, and score how close
// any other wine sits to that palate. This is the engine behind "recommend me
// wines like the ones I love" — kept deliberately simple and explainable so the
// app can always say *why* it suggested something.

export const TASTE_AXES: (keyof TasteProfile)[] = [
  "body",
  "sweetness",
  "tannin",
  "acidity",
];

export const EMPTY_TASTE: TasteProfile = {
  body: 3,
  sweetness: 1,
  tannin: 3,
  acidity: 3,
};

// A wine "counts" toward the palate in proportion to how much the user likes it.
// A 5-star bottle pulls the profile hard; an unrated one barely registers.
function weightFor(w: Wine): number {
  const base = w.rating > 0 ? w.rating : 2; // unrated → mild interest
  // Owning a bottle (it's in the rack) is a stronger signal than wishing for it.
  return base * (w.status === "rack" ? 1.5 : 1);
}

export interface Palate {
  taste: TasteProfile;
  // Favourite styles and flavour tags, most-loved first.
  topColors: WineColor[];
  topTags: string[];
  // How much evidence we have. 0 means "we don't really know you yet".
  confidence: number;
}

export function buildPalate(wines: Wine[]): Palate {
  const liked = wines.filter((w) => w.rating >= 3 || w.status === "rack");
  if (liked.length === 0) {
    return { taste: EMPTY_TASTE, topColors: [], topTags: [], confidence: 0 };
  }

  const sum: TasteProfile = { body: 0, sweetness: 0, tannin: 0, acidity: 0 };
  let totalWeight = 0;
  const colorScore = new Map<WineColor, number>();
  const tagScore = new Map<string, number>();

  for (const w of liked) {
    const wt = weightFor(w);
    totalWeight += wt;
    for (const axis of TASTE_AXES) sum[axis] += w.taste[axis] * wt;
    colorScore.set(w.color, (colorScore.get(w.color) ?? 0) + wt);
    for (const tag of w.likeTags) {
      tagScore.set(tag, (tagScore.get(tag) ?? 0) + wt);
    }
  }

  const taste: TasteProfile = {
    body: sum.body / totalWeight,
    sweetness: sum.sweetness / totalWeight,
    tannin: sum.tannin / totalWeight,
    acidity: sum.acidity / totalWeight,
  };

  const topColors = [...colorScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
  const topTags = [...tagScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  // Confidence saturates as the user logs and rates more bottles.
  const confidence = Math.min(1, liked.length / 6);

  return { taste, topColors, topTags, confidence };
}

// 0–100 similarity between a wine and a learned palate. Higher = closer match.
export function matchScore(wine: Wine, palate: Palate): number {
  // Taste distance: max possible distance per axis is 4, four axes → 16.
  let dist = 0;
  for (const axis of TASTE_AXES) {
    dist += Math.abs(wine.taste[axis] - palate.taste[axis]);
  }
  const tasteCloseness = 1 - dist / 16; // 1 = identical palate

  // Style affinity: how favoured is this wine's colour?
  const colorRank = palate.topColors.indexOf(wine.color);
  const colorAffinity =
    colorRank === -1 ? 0.3 : 1 - colorRank / Math.max(palate.topColors.length, 1);

  // Flavour overlap: shared "like" tags with the user's favourites.
  const overlap = wine.likeTags.filter((t) => palate.topTags.includes(t)).length;
  const tagAffinity = palate.topTags.length
    ? Math.min(1, overlap / 3)
    : 0;

  const raw =
    0.55 * tasteCloseness + 0.25 * colorAffinity + 0.2 * tagAffinity;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

// A short, human explanation of why a wine matches — shown on recommendations.
export function matchReason(wine: Wine, palate: Palate): string {
  const bits: string[] = [];
  const shared = wine.likeTags.filter((t) => palate.topTags.includes(t));
  if (shared.length) bits.push(`you love ${shared.slice(0, 2).join(" & ")}`);
  if (palate.topColors[0] === wine.color) {
    bits.push(`${wine.color} is your go-to style`);
  }
  if (Math.abs(wine.taste.body - palate.taste.body) <= 0.6) {
    bits.push("matches the body you reach for");
  }
  if (!bits.length) bits.push("a new style to broaden your palate");
  // Capitalize the first letter for a tidy sentence.
  const s = bits.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
