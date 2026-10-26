import type { PrefCard, Surgeon } from "../types";
import { procedureScore } from "./scheduleImport";

// Booking a case: the case name is typed as it reads on the schedule, and it
// doubles as a search for the preference card(s) to pull. The surgeon field
// is a search too, with "add a new surgeon" when nobody matches.

const fold = (s: string) => s.toLowerCase().replace(/\bdr\.?\s*/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Surgeons whose name (or specialty) contains every typed word. */
export function searchSurgeons(surgeons: Surgeon[], query: string): Surgeon[] {
  const words = fold(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  return surgeons
    .filter((s) => {
      const hay = ` ${fold(s.name)} ${fold(s.specialty ?? "")}`;
      return words.every((w) => hay.includes(` ${w}`));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** An exact name match ("Dr. Feery" = "Declan Feery" is not exact). */
export function surgeonNamed(surgeons: Surgeon[], name: string): Surgeon | undefined {
  const want = fold(name);
  return want ? surgeons.find((s) => fold(s.name) === want) : undefined;
}

/** 0..1: how well typed text fits a card, counting half-typed words
 *  ("hern rep" already finds "Hernia Repair"). */
export function typedScore(text: string, card: Pick<PrefCard, "procedure">): number {
  const t = fold(text);
  if (!t) return 0;
  const proc = fold(card.procedure);
  if (proc === t) return 1;
  if (proc.includes(t)) return 0.9;
  const words = proc.split(" ");
  const typed = t.split(" ").filter((w) => w.length > 1);
  const prefixHits = typed.filter((w) => words.some((x) => x.startsWith(w))).length;
  const prefix = typed.length ? (prefixHits / typed.length) * 0.8 : 0;
  return Math.max(prefix, procedureScore(text, card));
}

const MIN_SCORE = 0.45;

/** Cards to offer for a case, best first. With a surgeon, that surgeon's
 *  cards (all of them when nothing is typed yet); without one, any card
 *  whose name fits the typed text. */
export function suggestCards(cards: PrefCard[], text: string, surgeonId?: string, limit = 8): PrefCard[] {
  const pool = surgeonId ? cards.filter((c) => c.surgeonId === surgeonId) : cards;
  if (!fold(text)) {
    return surgeonId ? [...pool].sort((a, b) => a.procedure.localeCompare(b.procedure)).slice(0, limit) : [];
  }
  return pool
    .map((card) => ({ card, score: typedScore(text, card) }))
    .filter((x) => x.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.card.procedure.localeCompare(b.card.procedure))
    .slice(0, limit)
    .map((x) => x.card);
}
