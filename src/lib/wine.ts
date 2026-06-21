import type { TasteProfile, WineColor } from "../types";

// Presentation helpers shared across the app: how each wine style looks and
// reads, and small formatters.

export const COLOR_META: Record<
  WineColor,
  { label: string; emoji: string; hex: string }
> = {
  sparkling: { label: "Sparkling", emoji: "🥂", hex: "#e7d27a" },
  white: { label: "White", emoji: "🥂", hex: "#e9dba0" },
  rosé: { label: "Rosé", emoji: "🍷", hex: "#e3a0a8" },
  orange: { label: "Orange", emoji: "🍷", hex: "#d08a3e" },
  red: { label: "Red", emoji: "🍷", hex: "#7b1f2b" },
  dessert: { label: "Dessert", emoji: "🍷", hex: "#c98a3a" },
  fortified: { label: "Fortified", emoji: "🍷", hex: "#5a1320" },
};

export const ALL_COLORS: WineColor[] = [
  "sparkling",
  "white",
  "rosé",
  "orange",
  "red",
  "dessert",
  "fortified",
];

export const TASTE_LABELS: Record<keyof TasteProfile, [string, string]> = {
  body: ["Light", "Full"],
  sweetness: ["Dry", "Sweet"],
  tannin: ["Silky", "Grippy"],
  acidity: ["Soft", "Zesty"],
};

export function vintageLabel(v: number | null): string {
  return v == null ? "NV" : String(v);
}

export function priceLabel(p: number | null): string {
  return p == null ? "—" : `$${p.toFixed(p % 1 === 0 ? 0 : 2)}`;
}

// A handful of common "what I like" tags for quick tagging when logging a wine.
export const COMMON_TAGS = [
  "dark fruit",
  "red fruit",
  "citrus",
  "stone fruit",
  "floral",
  "earthy",
  "smoky",
  "spice",
  "oak",
  "mineral",
  "velvety",
  "silky",
  "crisp",
  "bold",
  "creamy",
  "rich",
];
