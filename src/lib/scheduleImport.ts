import type { CaseEntry, PrefCard, Surgeon } from "../types";
import { parseCsv } from "./csvImport";

// Batch schedule upload: an OR schedule exported from the EHR (Epic, Cerner,
// MHS GENESIS) or kept in a spreadsheet becomes a day's (or week's) cases in
// one go. Each row is matched to a surgeon and their preference card; the
// person reviews the matches before anything is added.
//
// Only the date, time, room, surgeon and procedure are read. Patient columns
// (name, MRN, DOB, account…) are never read or stored.

export type ScheduleField = "date" | "time" | "room" | "surgeon" | "procedure";
export const SCHEDULE_FIELDS: { key: ScheduleField; label: string; required: boolean }[] = [
  { key: "date", label: "Date", required: true },
  { key: "time", label: "Start time", required: false },
  { key: "room", label: "Room", required: false },
  { key: "surgeon", label: "Surgeon", required: true },
  { key: "procedure", label: "Procedure", required: true },
];
export type ColumnMap = Partial<Record<ScheduleField, number>>;

const HEADER_WORDS: Record<ScheduleField, RegExp> = {
  date: /^(surgery |case |service |sched(uled)? |procedure |or )?(date|dos|day)$|date of (surgery|service)|^start date$/i,
  time: /^(sched(uled)? |case |start |in ?room |procedure |incision )?(time|start)( time)?$|^in room$|^start date\/time$|^date\/time$|^start date ?time$/i,
  room: /^(or|or room|room|location|suite|theat(er|re)|or #|room #|or number)$/i,
  surgeon: /^(primary )?(surgeon|physician|provider|attending|doctor)( name)?$/i,
  procedure: /^(primary |scheduled )?(procedure|procedures|case|operation|proc)( name| description)?$|^description$|^case description$/i,
};

/** Columns that hold patient identifiers: never mapped, never read. */
export const PHI_HEADER = /\b(patient|pt|mrn|medical record|dob|birth|ssn|account|acct|fin|encounter|age|sex|gender|insurance|phone|address)\b/i;

export function detectColumns(header: string[]): ColumnMap {
  const map: ColumnMap = {};
  header.forEach((raw, i) => {
    const h = String(raw ?? "").trim().replace(/\s+/g, " ").replace(/[:*]$/, "");
    if (!h || PHI_HEADER.test(h)) return;
    for (const f of SCHEDULE_FIELDS) {
      if (map[f.key] === undefined && HEADER_WORDS[f.key].test(h)) { map[f.key] = i; break; }
    }
  });
  return map;
}

/** A spreadsheet's rows as strings (dates from Excel come back as Dates). */
export type Cell = string | number | boolean | Date | null | undefined;

export async function readScheduleFile(file: File): Promise<Cell[][]> {
  if (/\.xlsx$/i.test(file.name) || file.type.includes("spreadsheetml")) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown as Cell[][];
  }
  return parseCsv(await file.text());
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "10/27/2026", "2026-10-27", "27-Oct-2026", "Oct 27, 2026", an Excel date
 *  or serial number -> "2026-10-27"; undefined if it isn't a date. */
export function parseScheduleDate(v: Cell): string | undefined {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : ymd(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    return ymd(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return +m[1] <= 12 ? `${y}-${pad(+m[1])}-${pad(+m[2])}` : `${y}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  m = s.match(/^(\d{1,2})[\s-]([a-z]{3})[a-z]*[\s-,]+(\d{2,4})/i);
  if (m && MONTHS.includes(m[2].toLowerCase())) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return `${y}-${pad(MONTHS.indexOf(m[2].toLowerCase()) + 1)}-${pad(+m[1])}`;
  }
  m = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m && MONTHS.includes(m[1].toLowerCase())) return `${m[3]}-${pad(MONTHS.indexOf(m[1].toLowerCase()) + 1)}-${pad(+m[2])}`;
  return undefined;
}

/** "0730", "07:30", "7:30 AM", "7:30p", a date-time, or an Excel time
 *  fraction -> "07:30". */
export function parseScheduleTime(v: Cell): string | undefined {
  if (v instanceof Date) {
    const h = v.getUTCHours(), mi = v.getUTCMinutes();
    return h || mi ? `${pad(h)}:${pad(mi)}` : undefined;
  }
  if (typeof v === "number" && v >= 0 && v < 1) {
    const mins = Math.round(v * 1440);
    return `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
  }
  const s = String(v ?? "").trim();
  const m = s.match(/(?:^|\s|T)(\d{1,2}):?(\d{2})(?::\d{2})?\s*([ap])?\.?m?\.?\s*$/i);
  if (!m) return undefined;
  let h = +m[1];
  const mi = +m[2];
  if (m[3]) { const pm = m[3].toLowerCase() === "p"; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
  if (h > 23 || mi > 59) return undefined;
  return `${pad(h)}:${pad(mi)}`;
}

// ---- Matching ---------------------------------------------------------------

const SURGEON_NOISE = /\b(dr|md|do|mbbs|facs|phd|pa|np|dpm|dds|dmd)\b\.?/gi;
function nameParts(raw: string): { last: string; first: string; full: string } {
  let s = raw.replace(SURGEON_NOISE, " ").replace(/[^a-z,'\- ]/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
  let last = "", first = "";
  if (s.includes(",")) {
    const [l, f] = s.split(",", 2).map((x) => x.trim());
    last = l; first = (f ?? "").split(" ")[0] ?? "";
    s = `${first} ${last}`.trim();
  } else {
    const parts = s.split(" ");
    last = parts[parts.length - 1] ?? ""; first = parts.length > 1 ? parts[0] : "";
  }
  return { last, first, full: s };
}

/** The surgeon a schedule's name means: same full name, else the only
 *  surgeon with that last name (first initial breaks ties). */
export function matchSurgeon(raw: string, surgeons: Surgeon[]): Surgeon | undefined {
  const want = nameParts(raw);
  if (!want.last) return undefined;
  const all = surgeons.map((s) => ({ s, n: nameParts(s.name) }));
  const exact = all.find((x) => x.n.full === want.full);
  if (exact) return exact.s;
  const byLast = all.filter((x) => x.n.last === want.last);
  if (byLast.length === 1) return byLast[0].s;
  if (want.first) return byLast.find((x) => x.n.first && x.n.first[0] === want.first[0])?.s;
  return undefined;
}

// Common OR shorthand on schedules, expanded before comparing words.
const EXPAND: [RegExp, string][] = [
  [/\blap\b/g, "laparoscopic"], [/\blaparoscopy\b/g, "laparoscopic"], [/\bchole\b/g, "cholecystectomy"],
  [/\btka\b/g, "total knee arthroplasty"], [/\btha\b/g, "total hip arthroplasty"], [/\btkr\b/g, "total knee arthroplasty"],
  [/\bthr\b/g, "total hip arthroplasty"], [/\bacl\b/g, "acl reconstruction"], [/\bc-?section\b/g, "cesarean section"],
  [/\bcs\b/g, "cesarean section"], [/\bih\b|\bihr\b/g, "inguinal hernia repair"], [/\bvh\b|\bvhr\b/g, "ventral hernia repair"],
  [/\borif\b/g, "open reduction internal fixation"], [/\blsc\b/g, "laparoscopic"], [/\bappy\b/g, "appendectomy"],
  [/\bhyst\b/g, "hysterectomy"], [/\bcysto\b/g, "cystoscopy"], [/\bturp\b/g, "transurethral resection prostate"],
  [/\bknee scope\b/g, "knee arthroscopy"], [/\bscope\b/g, "arthroscopy"], [/\bmenisc\b/g, "meniscectomy"],
];
// Approach words: they narrow a match but never make one on their own.
const GENERIC = new Set(["laparoscopic", "open", "robotic", "robot", "assisted", "repair", "excision", "removal", "revision", "diagnostic", "arthroscopy", "arthroscopic", "minor", "major", "exploration", "insertion", "placement"]);
const STOP = new Set(["with", "and", "or", "of", "the", "a", "left", "right", "bilateral", "lt", "rt", "bil", "possible", "poss", "w", "wo", "without", "procedure", "case", "add", "on", "addon"]);

function words(s: string): string[] {
  let t = ` ${s.toLowerCase().replace(/[()[\],;:/+&]/g, " ")} `;
  for (const [re, rep] of EXPAND) t = t.replace(re, rep);
  return t.split(/\s+/).map((w) => w.replace(/[^a-z0-9-]/g, "")).filter((w) => w.length > 1 && !STOP.has(w));
}

/** 0..1: how well a schedule's procedure text fits a card's title. */
export function procedureScore(scheduled: string, card: Pick<PrefCard, "procedure">): number {
  const a = new Set(words(scheduled));
  const b = new Set(words(card.procedure));
  if (!a.size || !b.size) return 0;
  let shared = 0, specific = 0;
  for (const w of a) {
    if (b.has(w) || [...b].some((x) => x.length > 4 && w.length > 4 && (x.startsWith(w) || w.startsWith(x)))) {
      shared++;
      if (!GENERIC.has(w)) specific++;
    }
  }
  const score = shared / Math.min(a.size, b.size) * (0.5 + 0.5 * shared / Math.max(a.size, b.size));
  // Sharing only "laparoscopic" or "repair" isn't a match.
  return specific ? score : score * 0.3;
}

export interface ScheduleRow {
  line: number; // spreadsheet row number (1-based, header included)
  date?: string;
  time?: string;
  room?: string;
  surgeonText: string;
  procedureText: string;
  surgeonId?: string;
  /** Best-fitting cards, best first (the surgeon's own when known). */
  candidates: { cardId: string; score: number }[];
  /** The card to book, or undefined to skip the row. */
  cardId?: string;
  /** Already on the schedule (same day, card and time). */
  duplicate?: boolean;
  problem?: string;
}

const MATCH_MIN = 0.34;

export function buildScheduleRows(
  rows: Cell[][],
  map: ColumnMap,
  data: { cards: PrefCard[]; surgeons: Surgeon[]; cases: CaseEntry[] },
  headerRow = true,
): ScheduleRow[] {
  const out: ScheduleRow[] = [];
  const get = (r: Cell[], f: ScheduleField) => (map[f] === undefined ? undefined : r[map[f]!]);
  rows.forEach((r, i) => {
    if (headerRow && i === 0) return;
    const surgeonText = String(get(r, "surgeon") ?? "").trim();
    const procedureText = String(get(r, "procedure") ?? "").trim();
    if (!surgeonText && !procedureText) return;
    const dateCell = get(r, "date");
    const date = parseScheduleDate(dateCell);
    const time = parseScheduleTime(get(r, "time") ?? dateCell);
    const room = String(get(r, "room") ?? "").trim() || undefined;
    const surgeon = surgeonText ? matchSurgeon(surgeonText, data.surgeons) : undefined;
    const pool = surgeon ? data.cards.filter((c) => c.surgeonId === surgeon.id) : data.cards;
    const candidates = pool
      .map((c) => ({ cardId: c.id, score: procedureScore(procedureText, c) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    // Only pre-pick a card for a surgeon ORSync knows; otherwise suggest.
    const best = surgeon && candidates[0] && candidates[0].score >= MATCH_MIN ? candidates[0].cardId : undefined;
    const row: ScheduleRow = {
      line: i + 1, date, time, room: room ? (/^\d+$/.test(room) ? `OR ${room}` : room) : undefined,
      surgeonText, procedureText, surgeonId: surgeon?.id, candidates, cardId: best,
    };
    if (!date) row.problem = "No date";
    else if (!surgeon) row.problem = surgeonText ? `No surgeon named ${surgeonText} in ORSync` : "No surgeon";
    else if (!best) row.problem = "No matching card";
    if (row.cardId && date) {
      row.duplicate = data.cases.some((c) => c.date === date && c.cardId === row.cardId && (c.time ?? "") === (time ?? ""));
      if (row.duplicate) row.problem = "Already on the schedule";
    }
    if (row.duplicate || !date) row.cardId = undefined;
    out.push(row);
  });
  return out;
}
