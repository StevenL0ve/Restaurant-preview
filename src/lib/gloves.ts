import type { Surgeon } from "../types";

// Glove sizes: most surgeons wear one pair (over gloves); some double-glove
// with an under glove too. Printouts write that "under/over": 8/8, 7.5/8.

/** "Under 8 · Over 8 (Biogel)", "7.5 (Biogel)", or null when unknown. */
export function glovesLabel(s?: Pick<Surgeon, "gloveSize" | "gloveUnder" | "gloveType"> | null): string | null {
  if (!s?.gloveSize && !s?.gloveUnder) return null;
  const sizes = s.gloveUnder
    ? `Under ${s.gloveUnder} · Over ${s.gloveSize ?? s.gloveUnder}`
    : `${s.gloveSize}`;
  return `${sizes}${s.gloveType ? ` (${s.gloveType})` : ""}`;
}
