import type { AppState, PrefCard, SectionKey, Surgeon } from "../types";
import { SECTIONS } from "../types";

// One global search across the whole library: surgeons, procedures, and every
// item on every card. Techs search by all of these — "Dr. Chen", "total knee",
// "tourniquet", "Vicryl" — so a single ranked index covers them all.

export type SearchHit =
  | { kind: "surgeon"; id: string; title: string; subtitle: string; snippet?: string; surgeon: Surgeon }
  | { kind: "card"; id: string; title: string; subtitle: string; snippet?: string; card: PrefCard };

export function search(state: AppState, raw: string): SearchHit[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];

  const hits: { hit: SearchHit; score: number }[] = [];
  const score = (hay: string) => {
    const h = hay.toLowerCase();
    if (!h.includes(q)) return 0;
    if (h === q) return 3;
    if (h.startsWith(q)) return 2;
    return 1;
  };

  for (const s of state.surgeons) {
    const sc = Math.max(score(s.name), score(s.specialty), score(s.facility ?? ""));
    if (sc > 0) {
      hits.push({
        score: sc + 1, // surgeons rank slightly above item hits
        hit: {
          kind: "surgeon",
          id: s.id,
          title: s.name,
          subtitle: [s.specialty, s.facility].filter(Boolean).join(" · "),
          surgeon: s,
        },
      });
    }
  }

  for (const c of state.cards) {
    const surgeon = state.surgeons.find((s) => s.id === c.surgeonId);
    let best = Math.max(score(c.procedure), score(c.specialty));
    let snippet: string | undefined;

    // Search inside every item line; surface the first matching item.
    for (const sec of SECTIONS) {
      for (const it of c[sec.key as SectionKey]) {
        const sc = Math.max(score(it.name), score(it.detail ?? ""));
        if (sc > 0 && sc >= best && !snippet) {
          snippet = `${sec.label}: ${it.name}${it.detail ? ` (${it.detail})` : ""}`;
        }
        best = Math.max(best, sc);
      }
    }

    if (best > 0) {
      hits.push({
        score: best,
        hit: {
          kind: "card",
          id: c.id,
          title: c.procedure,
          subtitle: surgeon ? surgeon.name : c.specialty,
          card: c,
          snippet,
        },
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).map((h) => h.hit);
}
