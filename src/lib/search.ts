import type { AppState, CaseEntry, OnCallPerson, PrefCard, SectionKey, Surgeon } from "../types";
import { SECTIONS, locationLabel, spdPlace, teamMemberLabel } from "../types";

// One global search across the whole library: surgeons, procedures, every item
// on every card, and the on-call directory. Techs search by all of these —
// "Dr. Chen", "total knee", "tourniquet", "Vicryl", "Marcus" — so a single
// ranked index covers them all.

export type SearchHit =
  | { kind: "surgeon"; id: string; title: string; subtitle: string; snippet?: string; surgeon: Surgeon }
  | { kind: "card"; id: string; title: string; subtitle: string; snippet?: string; card: PrefCard }
  | { kind: "oncall"; id: string; title: string; subtitle: string; snippet?: string; person: OnCallPerson }
  | { kind: "case"; id: string; title: string; subtitle: string; snippet?: string; entry: CaseEntry }
  | { kind: "item"; id: string; title: string; subtitle: string; snippet?: string; name: string };

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
          snippet: nowPos ? `On call now: ${nowPos}` : undefined,
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
        const sc = Math.max(score(it.name), score(it.detail ?? ""), score(it.ref ?? ""), score(where ?? ""));
        if (sc > 0 && sc >= best && !snippet) {
          snippet = `${sec.label}: ${it.name}${it.detail ? ` (${it.detail})` : ""}${it.ref ? ` · REF ${it.ref}` : ""}${where ? ` · ${where}` : ""}`;
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

  // Scheduled cases: find a case by the doctor, the procedure, the room, or
  // anyone on the room team. Today's board ranks first, upcoming days next.
  const d0 = new Date();
  const today = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;
  for (const c of state.cases) {
    const card = state.cards.find((k) => k.id === c.cardId);
    const surgeon = card ? state.surgeons.find((s) => s.id === card.surgeonId) : undefined;
    let best = Math.max(
      score(card?.procedure ?? ""),
      score(surgeon?.name ?? ""),
      score(c.room ?? ""),
      score(c.notes ?? ""),
    );
    let teamMatch: string | undefined;
    for (const m of c.team ?? []) {
      const sc = score(m.name);
      if (sc > 0 && !teamMatch) teamMatch = teamMemberLabel(m);
      best = Math.max(best, sc);
    }
    if (best > 0) {
      // Today's board ties with (never beats) a same-named surgeon profile;
      // stable sort keeps the surgeon, the richer destination, first.
      const boost = c.date === today ? 1 : c.date > today ? 0.5 : 0;
      const when = [fmtCaseDay(c.date), c.room, c.time, surgeon?.name].filter(Boolean).join(" · ");
      hits.push({
        score: best + boost,
        hit: {
          kind: "case",
          id: c.id,
          title: card?.procedure ?? "Scheduled case",
          subtitle: when,
          // The date always shows, even when the hit was a team member.
          snippet: teamMatch ? `${when} · ${teamMatch}` : undefined,
          entry: c,
        },
      });
    }
  }

  // Items: one result per supply, piece of equipment, or tray, wherever it
  // appears (cards, Sterile processing, the catalog), with where it's kept
  // and how many cards list it. Ranked just under an exact card match.
  const items = new Map<string, { name: string; section?: string; cards: Set<string>; where: Set<string>; spd?: string; best: number }>();
  const norm = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");
  const touch = (name: string, sc: number) => {
    const k = norm(name);
    const e = items.get(k) ?? { name: name.trim(), cards: new Set<string>(), where: new Set<string>(), best: 0 };
    e.best = Math.max(e.best, sc);
    items.set(k, e);
    return e;
  };
  for (const c of state.cards) {
    for (const sec of SECTIONS) {
      for (const it of c[sec.key as SectionKey]) {
        const sc = Math.max(score(it.name), score(it.ref ?? ""));
        if (!sc) continue;
        const e = touch(it.name, sc);
        e.section ??= sec.label;
        e.cards.add(c.id);
        const where = it.locationId ? locLabel.get(it.locationId) : undefined;
        if (where) e.where.add(where);
      }
    }
  }
  for (const t of state.spdTrays ?? []) {
    const sc = Math.max(score(t.name), score(t.cabinet ? `cabinet ${t.cabinet}` : ""), score(t.notes ?? ""));
    if (!sc) continue;
    const e = touch(t.name, sc);
    e.section ??= "Instrument tray";
    const place = spdPlace(t);
    e.spd = place ? `SPD ${place}` : "SPD, no shelf yet";
  }
  for (const c of state.catalog ?? []) {
    const sc = Math.max(score(c.name), score(c.ref ?? ""));
    if (sc) touch(c.name, sc).section ??= "Catalog";
  }
  for (const [k, e] of items) {
    const where = [e.spd, ...e.where].filter(Boolean).slice(0, 2).join(" · ");
    hits.push({
      score: Math.max(0.5, e.best - 0.5),
      hit: {
        kind: "item",
        id: k,
        title: e.name,
        subtitle: e.section ?? "Item",
        name: e.name,
        snippet: [where || "No location yet", e.cards.size ? `on ${e.cards.size} card${e.cards.size === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · "),
      },
    });
  }

  return hits.sort((a, b) => b.score - a.score).map((h) => h.hit);
}

function fmtCaseDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(dt.getTime())
    ? date
    : dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
