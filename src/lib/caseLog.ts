import type { AppState, CaseEntry } from "../types";
import { casesForPerson, surgeonOf } from "../state/store";
import { roleLabel } from "./profile";

// A person's case log as plain rows: what to show, filter, count, and share
// (PDF or a text). Built from the room teams on My day, so nothing about the
// patient is ever in it.

/** What a case is called on the board: the schedule's wording when it was
 *  typed, else the card's title (minus a one-case combo's tag). */
export function caseTitle(entry: Pick<CaseEntry, "procedure">, card?: { procedure: string }): string {
  return entry.procedure || (card?.procedure ?? "").replace(/\s*\(one case\)$/, "");
}

export interface LogEntry {
  id: string;
  date: string; // "2026-10-27"
  room?: string;
  time?: string;
  procedure: string;
  surgeon?: string;
  specialty: string;
  role?: string; // "Trainee tech III"
}

export interface LogFilter {
  from?: string; // inclusive "YYYY-MM-DD"
  to?: string; // inclusive
  specialty?: string; // "" = all
}

/** Everyone named `who` on a room team, newest first. */
export function logEntries(state: AppState, who: string): LogEntry[] {
  const q = who.trim().toLowerCase();
  return casesForPerson(state, who).map((c) => {
    const card = state.cards.find((k) => k.id === c.cardId);
    const sg = card ? surgeonOf(state, card.surgeonId) : undefined;
    const me = (c.team ?? []).find((m) => m.name.toLowerCase().includes(q));
    return {
      id: c.id,
      date: c.date,
      room: c.room,
      time: c.time,
      procedure: caseTitle(c, card) || "Case",
      surgeon: sg?.name,
      specialty: card?.specialty || sg?.specialty || "Other",
      role: me ? roleLabel(me.role, me.level) : undefined,
    };
  });
}

/** Everyone whose log can be opened, for the "Whose log?" search: people
 *  on any room team, the staff list, the on-call roster, and the facility's
 *  members (`more`). Most cases first, then A to Z. */
export function logPeople(state: AppState, more: string[] = []): { name: string; cases: number }[] {
  const counts = new Map<string, { name: string; cases: number }>();
  const add = (raw: string | undefined, n = 0) => {
    const name = (raw ?? "").trim();
    if (!name || name.includes("@")) return;
    const k = name.toLowerCase();
    const hit = counts.get(k);
    if (hit) hit.cases += n;
    else counts.set(k, { name, cases: n });
  };
  for (const c of state.cases) {
    if (c.approval) continue;
    for (const m of new Set((c.team ?? []).map((t) => t.name))) add(m, 1);
  }
  for (const m of state.staff) add(m.name);
  for (const p of state.onCallPeople ?? []) add(p.name);
  for (const n of more) add(n);
  return [...counts.values()].sort((a, b) => b.cases - a.cases || a.name.localeCompare(b.name));
}

export function filterLog(entries: LogEntry[], f: LogFilter): LogEntry[] {
  return entries.filter((e) =>
    (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to) && (!f.specialty || e.specialty === f.specialty));
}

/** [specialty, count], most first. */
export function specialtyCounts(entries: LogEntry[]): [string, number][] {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.specialty, (m.get(e.specialty) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Oldest first; within a day, timed cases by the clock, then followers. */
export function chronological(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
}

/** "Tue, Oct 27, 2026" */
export function logDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(dt.getTime())
    ? date
    : dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** "Oct 1, 2026 to Oct 31, 2026 · General Surgery", or "All dates". */
export function filterLabel(f: LogFilter): string {
  const short = (d: string) => logDay(d).replace(/^\w+, /, "");
  const range = f.from && f.to ? `${short(f.from)} to ${short(f.to)}`
    : f.from ? `From ${short(f.from)}`
    : f.to ? `Through ${short(f.to)}`
    : "All dates";
  return [range, f.specialty || "All specialties"].join(" · ");
}

export function countLine(entries: LogEntry[]): string {
  const n = entries.length;
  const by = specialtyCounts(entries).map(([s, k]) => `${s} ${k}`).join(", ");
  return `${n} ${n === 1 ? "case" : "cases"}${by ? `: ${by}` : ""}`;
}

/** The log as a text message: oldest first, one short block per case. */
export function logText(name: string, entries: LogEntry[], f: LogFilter, today: string): string {
  const done = entries.filter((e) => e.date < today);
  const ahead = entries.filter((e) => e.date >= today);
  const block = (e: LogEntry) => [
    `${logDay(e.date)}${e.room ? ` · ${e.room}` : ""}${e.time ? ` ${e.time}` : ""}`,
    e.procedure,
    [e.surgeon, e.specialty, e.role ? `as ${e.role}` : null].filter(Boolean).join(" · "),
  ].join("\n");
  const lines = [`CASE LOG: ${name}`, filterLabel(f), countLine(entries)];
  if (done.length) lines.push("", `DONE (${done.length})`, "", chronological(done).map(block).join("\n\n"));
  if (ahead.length) lines.push("", `SCHEDULED (${ahead.length})`, "", chronological(ahead).map(block).join("\n\n"));
  lines.push("", "Sent from ORSync");
  return lines.join("\n");
}
