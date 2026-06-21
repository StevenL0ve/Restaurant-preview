// Core domain types for My Cellar.
// Everything is plain serializable data so the whole collection lives in
// localStorage today and moves cleanly to a hosted backend later, and so a
// user can export their cellar as JSON at any time — they own their data.

export type ID = string;

// The classic wine styles, ordered roughly light → bold, which is also how we
// lay them out on the cellar shelves.
export type WineColor =
  | "sparkling"
  | "white"
  | "rosé"
  | "orange"
  | "red"
  | "dessert"
  | "fortified";

// Where a bottle lives in the user's world:
//  - "rack": they own it (they bought it) — it sits in the wine rack.
//  - "wishlist": they want to try it — it rests in the cellar only.
// Either way the bottle is always visible in the elegant cellar view.
export type WineStatus = "rack" | "wishlist";

// A coarse taste axis we can compare wines on and learn a palate from.
export interface TasteProfile {
  body: number; // 1 (light) – 5 (full)
  sweetness: number; // 1 (bone dry) – 5 (lusciously sweet)
  tannin: number; // 1 (silky) – 5 (grippy)
  acidity: number; // 1 (soft) – 5 (zesty)
}

export interface Wine {
  id: ID;
  name: string; // e.g. "Barolo Riserva"
  producer: string; // e.g. "Giacomo Conterno"
  vintage: number | null; // year, or null for NV
  varietal: string; // grape(s), e.g. "Nebbiolo"
  region: string; // e.g. "Piedmont"
  country: string; // e.g. "Italy"
  color: WineColor;
  photo: string | null; // data URL of the bottle photo
  // Free-form tasting notes the user wrote about the bottle.
  notes: string;
  // The heart of the app: what the user *likes* about this wine, captured as
  // both a short note and quick tags so we can recommend more like it.
  likes: string;
  likeTags: string[]; // e.g. ["dark fruit", "smoky", "velvety"]
  rating: number; // 0 (unrated) – 5 stars
  price: number | null; // what they paid / it costs
  taste: TasteProfile;
  status: WineStatus;
  pairing: string; // foods it goes with, optional
  createdAt: string; // ISO
}

export type Venue = "restaurant" | "wine-store" | "winery";

// A planned outing the user tells the app about so it can recommend bottles to
// try, based on what's already in their rack and cellar.
export interface Outing {
  id: ID;
  venue: Venue;
  place: string; // name of the restaurant / store / winery
  date: string; // ISO
  // The wines the app suggested for this outing (snapshot at creation).
  suggestionIds: ID[];
  notes: string;
}

export interface AppState {
  wines: Wine[];
  outings: Outing[];
}
