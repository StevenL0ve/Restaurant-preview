import type { AppState, OnCallPerson, PrefCard, SectionKey, Surgeon } from "../types";
import { SECTIONS, locationLabel } from "../types";

// One global search across the whole library: surgeons, procedures, every item
// on every card, and the on-call directory. Techs search by all of these —
// "Dr. Chen", "total knee", "tourniquet", "Vicryl", "Marcus" — so a single
// ranked index covers them all.

export type SearchHit =
  | { kind: "surgeon"; id: string; title: string; subtitle: string; snippet?: string; surgeon: Surgeon }
  | { kind: "card"; id: string; title: string; subtitle: string; snippet?: string; card: PrefCard }
  | { kind: "oncall"; id: string; title: string; subtitle: string; snippet?: string; person: OnCallPerson };

export function search(state: AppState, raw: string): SearchHit[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];

  // Resolve item location ids to display labels once, up front.
  const locLabel = new Map(state.locations.map((l) => [l.id, locationLabel(l)]));

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

  // On-call people: find by name, role, or number — someone on call right now
  // ranks above everything (that's usually why you're searching a name).
  const nowISO = new Date().toISOString();
  const onNow = new Map<string, string>(); // personId -> position name
  for (const pos of state.onCallPositions) {
    const covering = state.onCallShifts
      .filter((sh) => sh.positionId === pos.id && sh.start <= nowISO && (!sh.end || sh.end >= nowISO))
      .sort((a, b) => b.start.localeCompare(a.start))[0];
    if (covering && !onNow.has(covering.personId)) onNow.set(covering.personId, pos.name);
  }
  for (const p of state.onCallPeople) {
    const sc = Math.max(score(p.name), score(p.role ?? ""), score(p.phone ?? ""));
    if (sc > 0) {
      const nowPos = onNow.get(p.id);
      // On-now boost ties with (never beats) a same-named surgeon profile,
      // which stays the richer destination; stable sort keeps surgeons first.
      hits.push({
        score: sc + (nowPos ? 1 : 0.25),
        hit: {
          kind: "oncall",
          id: p.id,
          title: p.name,
          subtitle: [p.role, p.phone].filter(Boolean).join(" · "),
          snippet: nowPos ? `📟 On call now — ${nowPos}` : undefined,
          person: p,
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
        const where = it.locationId ? locLabel.get(it.locationId) : undefined;
        const sc = Math.max(score(it.name), score(it.detail ?? ""), score(where ?? ""));
        if (sc > 0 && sc >= best && !snippet) {
          snippet = `${sec.label}: ${it.name}${it.detail ? ` (${it.detail})` : ""}${where ? ` 📍 ${where}` : ""}`;
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
