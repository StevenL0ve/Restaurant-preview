import type { CaseEntry, PrefCard, StaffMember, Surgeon, TeamMember, TeamRole } from "../types";
import { matchPeople, niceName, type BoardCase, type PersonRead } from "./boardImport";
import { matchSurgeon, procedureScore } from "./scheduleImport";

// From what the board says to what goes on My day: each board case matched
// to a surgeon, a card and a room team, with a question wherever the match
// isn't certain. Pure; the review screen holds the person's answers.

export type LaterStarts = "follow" | "notBefore";

export interface BoardAnswers {
  date: string;
  later: LaterStarts;
  /** Case index -> room, for cases read above the first room heading. */
  rooms: Record<number, string>;
  /** Board surgeon text ("SMITH, T") -> surgeon id. */
  surgeons: Record<string, string>;
  /** Case index -> card id, "" to skip the case, "new" for a new card. */
  cards: Record<number, string>;
  /** Person key -> staff id, "" to leave them off, "asis" as written. */
  people: Record<string, string>;
}

export interface PlannedPerson {
  key: string;
  column: "circulator" | "tech";
  read: PersonRead;
  /** The current answer (staff id, "", or "asis"); undefined = not yet. */
  choice?: string;
  member?: TeamMember;
}

export interface PlannedCase {
  index: number;
  board: BoardCase;
  room?: string;
  time?: string;
  notBefore?: string;
  surgeonId?: string;
  /** Best cards first (the surgeon's own when known). */
  candidates: { cardId: string; score: number }[];
  /** card id, "new", or undefined (skipped). */
  cardId?: string;
  people: PlannedPerson[];
  team: TeamMember[];
  /** Bracketed notes from the team cells ("Clarke (appt 1330-EOD)"). */
  notes?: string;
  /** Already on My day: the import updates it instead of adding another. */
  existingId?: string;
  problem?: string;
}

const MATCH_MIN = 0.34;
const roomKey = (r?: string) => (r ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const COLUMN_ROLE: Record<PlannedPerson["column"], TeamRole> = { circulator: "nurse", tech: "tech" };

export function planBoard(
  cases: BoardCase[],
  answers: BoardAnswers,
  data: { cards: PrefCard[]; surgeons: Surgeon[]; staff: StaffMember[]; cases: CaseEntry[] },
): PlannedCase[] {
  const out: PlannedCase[] = cases.map((b, index) => {
    const room = b.room ?? answers.rooms[index];
    const picked = answers.surgeons[b.surgeon];
    const surgeon = (picked ? data.surgeons.find((s) => s.id === picked) : undefined) ?? matchSurgeon(b.surgeon, data.surgeons);
    const pool = surgeon ? data.cards.filter((c) => c.surgeonId === surgeon.id) : data.cards;
    const candidates = pool
      .map((c) => ({ cardId: c.id, score: procedureScore(b.procedure, c) }))
      .filter((c) => c.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 6);
    const auto = surgeon && candidates[0] && candidates[0].score >= MATCH_MIN ? candidates[0].cardId : undefined;
    const answer = answers.cards[index];
    const cardId = answer === undefined ? auto : answer || undefined;

    const people: PlannedPerson[] = [];
    const notes: string[] = [];
    (["circulator", "tech"] as const).forEach((column) => {
      (column === "circulator" ? b.circulators : b.techs).forEach((cell, k) => {
        matchPeople(cell, data.staff, column).forEach((read, j) => {
          const key = `${index}:${column}:${k}:${j}`;
          if (read.note) notes.push(`${niceName(read.text)} ${read.note}`);
          const choice = answers.people[key] ?? (read.matches.length === 1 ? read.matches[0].id : read.matches.length ? undefined : "asis");
          const staff = choice ? data.staff.find((m) => m.id === choice) : undefined;
          const member: TeamMember | undefined = staff
            ? { id: `bt-${key}`, role: staff.role, name: staff.name, ...(staff.level ? { level: staff.level } : {}) }
            : choice === "asis"
              ? { id: `bt-${key}`, role: COLUMN_ROLE[column], name: niceName(read.text) }
              : undefined;
          people.push({ key, column, read, choice, member });
        });
      });
    });

    let problem: string | undefined;
    if (!room) problem = "Which room?";
    else if (!surgeon) problem = `No surgeon named ${b.surgeon} in ORSync`;
    else if (!cardId) problem = answer === "" ? "Skipped" : "No matching card";
    return {
      index, board: b, room, surgeonId: surgeon?.id, candidates, cardId, people,
      team: people.map((p) => p.member).filter((m): m is TeamMember => !!m),
      notes: notes.length ? notes.join("; ") : undefined,
      problem,
    };
  });

  // Start times: a room's first case keeps the board's time; the rest follow
  // (or can't start before the board's time, if the person chose that).
  const firstInRoom = new Map<string, number>();
  for (const p of out) {
    if (!p.room) { p.time = p.board.time; continue; }
    const k = roomKey(p.room);
    const first = firstInRoom.get(k);
    if (first === undefined || p.board.time < out[first].board.time) firstInRoom.set(k, p.index);
  }
  for (const p of out) {
    if (!p.room) continue;
    if (firstInRoom.get(roomKey(p.room)) === p.index) p.time = p.board.time;
    else if (answers.later === "notBefore") p.notBefore = p.board.time;
  }

  // Photographing the same day again updates its cases: the n-th board case
  // for a card in a room is the n-th one already on My day there.
  const used = new Set<string>();
  for (const p of out) {
    if (!p.cardId || p.cardId === "new" || !p.room) continue;
    const hit = data.cases
      .filter((c) => c.date === answers.date && c.cardId === p.cardId && roomKey(c.room) === roomKey(p.room) && !used.has(c.id))
      .sort((a, b) => (a.notBefore ?? a.time ?? "").localeCompare(b.notBefore ?? b.time ?? ""))[0];
    if (hit) { used.add(hit.id); p.existingId = hit.id; }
  }
  return out;
}

/** People the review needs an answer for: two or more staff fit the name. */
export const openQuestions = (plan: PlannedCase[]) => plan.flatMap((p) => p.people.filter((x) => x.choice === undefined));
