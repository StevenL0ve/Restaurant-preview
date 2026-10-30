import type { OcrLine } from "./ocr";
import type { StaffMember, TeamRole } from "../types";

// Reading a photo of the OR board (PowerChart "Periop Tracking" greaseboard,
// or any screen laid out as a table under a header row: Start, Surgeon,
// Procedure(s), Circulator, Tech...). Input is the recognizer's text boxes;
// output is one entry per case, plus the counts and date the board shows so
// the review can say what's missing.
//
// Patient columns (Patient, Age / Sex, Pt Rm #, Case #, Comment(s), Patient
// Type) are located only so their text can be thrown away; nothing in them
// is returned. See docs/greaseboard/ for typed samples of real boards.

export interface BoardCase {
  /** "OR 5"; undefined when the room's heading was scrolled off. */
  room?: string;
  time: string; // board start "07:30"
  stop?: string;
  minutes?: number;
  surgeon: string; // as the board writes it: "SMITH, T"
  procedure: string;
  anes?: string;
  circulators: string[]; // one per name: ["Clarke", "Roberts"]
  techs: string[];
}

export interface BoardRead {
  cases: BoardCase[];
  /** "Total Cases: 12" in the board's header. */
  total?: number;
  /** "0073-MOR-06 (5 cases)" -> { "OR 6": 5 } */
  roomCounts: Record<string, number>;
  /** The date on screen (status bar), "2026-10-29". */
  shownDate?: string;
  /** "+1" in the board's filter: the cases are for the day after. */
  plusDays: number;
  /** The day the cases are for, when the board says. */
  date?: string;
  headerFound: boolean;
}

type Col = "start" | "surgeon" | "procedure" | "dur" | "stop" | "anes" | "circulator" | "tech" | "skip";
const HEADERS: [RegExp, Col][] = [
  [/^start$/, "start"],
  [/^surgeons?$/, "surgeon"],
  [/^proc(edure)?s?$/, "procedure"],
  [/^dur(ation)?$/, "dur"],
  [/^(stop|end)$/, "stop"],
  [/^anes(th|thesia)?$/, "anes"],
  [/^circ(ulators?|ulating)?$/, "circulator"],
  [/^(techs?|scrubs?)$/, "tech"],
  // Located only to fence off their text.
  [/^(patient|age|sex|comments?|case|pt|status|mrn|fin|type)$/, "skip"],
];
const KEY_COLS: Col[] = ["start", "surgeon", "procedure"];

interface Word { text: string; x: number; y: number; w: number; h: number }

/** Split each recognized line into words, placing each by its share of the
 *  line's characters (phone recognizers box whole lines, which can run
 *  across two columns: "Ivester  Garnica"). */
export function explodeWords(lines: OcrLine[]): Word[] {
  const out: Word[] = [];
  for (const l of lines) {
    const text = l.text ?? "";
    const n = text.length;
    if (!n || !(l.w > 0) || !(l.h > 0)) continue;
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      out.push({ text: m[0], x: l.x + (l.w * m.index) / n, y: l.y, w: (l.w * m[0].length) / n, h: l.h });
    }
  }
  return out;
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
const mid = (w: Word) => w.y + w.h / 2;
const headerKey = (t: string) => t.toLowerCase().replace(/\(s\)/g, "s").replace(/[^a-z]/g, "");

/** Words grouped into text rows (top to bottom, left to right). */
function textRows(words: Word[], lh: number): Word[][] {
  const sorted = [...words].sort((a, b) => mid(a) - mid(b));
  const rows: Word[][] = [];
  for (const w of sorted) {
    const r = rows[rows.length - 1];
    if (r && Math.abs(mid(w) - r.reduce((n, x) => n + mid(x), 0) / r.length) <= lh * 0.6) r.push(w);
    else rows.push([w]);
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}
const rowText = (r: Word[]) => r.map((w) => w.text).join(" ");

/** OCR slips in times: "O7:3O" "07.30" "0730" "7:3o" -> "07:30". */
export function boardTime(raw: string): string | undefined {
  const s = raw.trim().replace(/[Oo]/g, "0").replace(/[lI|]/g, "1").replace(/[.;,]/g, ":");
  const m = s.match(/^([01]?\d|2[0-3]):?([0-5]\d)$/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : undefined;
}

const ROOM_BAR = /\b\d{2,5}\s*[-–]\s*([A-Z]{1,5})\s*[-–]\s*0*(\d{1,2})\b/i;
const ROOM_SHORT = /\b(MOR|OR)\s*[-–#]?\s*0*(\d{1,2})\b/i;
function roomOf(text: string): string | undefined {
  const m = text.match(ROOM_BAR) ?? text.match(ROOM_SHORT);
  if (!m) return undefined;
  const kind = m[1].toUpperCase();
  return `${kind === "MOR" || kind === "OR" ? "OR" : kind} ${+m[2]}`;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const pad = (n: number) => String(n).padStart(2, "0");
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dateIn(text: string): string | undefined {
  let m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (m) return `${m[3]}-${pad(MONTHS.findIndex((x) => x.startsWith(m![1].toLowerCase())) + 1)}-${pad(+m[2])}`;
  m = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (m) return `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
  return undefined;
}

/** Title case for names the board writes in caps or lower case
 *  ("roberts" -> "Roberts", "SMITH, T" stays for the surgeon matcher). */
export function niceName(s: string): string {
  return s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

/** One cell's lines -> people: each line is a person, and "/" or "&"
 *  separates two on one line ("Clarke/roberts"). Bracketed notes stay
 *  attached ("Clarke (appt 1330-EOD)"). */
export function splitPeople(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    for (const part of line.split(/\s*(?:\/|&|\+|,(?![^(]*\)))\s*/)) {
      const t = part.replace(/[^A-Za-z0-9()'.\- :]/g, "").replace(/\s+/g, " ").trim();
      if (t && /[A-Za-z]{2}/.test(t)) out.push(t);
    }
  }
  return out;
}

/** Procedure lines -> one text. A line after one that closed with the
 *  laterality ("(Right)") starts the next procedure of the same case. */
function joinProcedure(lines: string[]): string {
  let s = "";
  for (const l of lines) {
    const t = l.trim();
    if (!t) continue;
    s = !s ? t : /\)\s*$/.test(s) && !/^\(/.test(t) ? `${s}; ${t}` : `${s} ${t}`;
  }
  // A bracket whose other half the photo lost ("Circumcision Laterality)").
  let open = 0;
  s = [...s].filter((ch) => (ch === "(" ? ++open > 0 : ch === ")" ? open-- > 0 : true)).join("");
  if (open > 0) s = s.replace(/\(([^()]*)$/, "$1");
  return s.replace(/\s+/g, " ").trim();
}

export function readBoard(lines: OcrLine[]): BoardRead {
  let words = explodeWords(lines);
  const empty: BoardRead = { cases: [], roomCounts: {}, plusDays: 0, headerFound: false };
  if (!words.length) return empty;
  const lh = median(words.map((w) => w.h)) || 0.01;

  // Header row: the line through the most distinct column names. Tried at
  // a range of tilts, since a phone held a little crooked puts the right-
  // hand headings rows lower than the left-hand ones.
  const named = words.map((w) => ({ w, col: HEADERS.find(([re]) => re.test(headerKey(w.text)))?.[1] })).filter((x): x is { w: Word; col: Col } => !!x.col);
  let header: { w: Word; col: Col }[] = [];
  let best = { score: 0, tilt: Infinity };
  for (const cand of named) {
    if (!KEY_COLS.includes(cand.col)) continue;
    for (let t = -0.12; t <= 0.1201; t += 0.005) {
      const band = named.filter((x) => Math.abs(mid(x.w) - (mid(cand.w) + t * (x.w.x - cand.w.x))) <= lh * 0.8);
      const kinds = new Set(band.map((x) => x.col));
      if (!KEY_COLS.every((k) => kinds.has(k))) continue;
      // Every heading word on the line counts (the ones fencing off patient
      // columns too), so the full row beats a partial one at a flatter tilt.
      const score = band.length;
      if (score > best.score || (score === best.score && Math.abs(t) < Math.abs(best.tilt))) {
        best = { score, tilt: t };
        header = band;
      }
    }
  }

  // Level the photo: the header words share one baseline, so their slope is
  // the camera's tilt. Without this, a few degrees shifts the right-hand
  // columns into the neighboring row.
  const hs = header.map((x) => x.w);
  const mx = hs.length ? hs.reduce((n, w) => n + w.x, 0) / hs.length : 0;
  const my = hs.length ? hs.reduce((n, w) => n + mid(w), 0) / hs.length : 0;
  const den = hs.reduce((n, w) => n + (w.x - mx) ** 2, 0);
  const slope = hs.length >= 3 && den > 0 ? hs.reduce((n, w) => n + (w.x - mx) * (mid(w) - my), 0) / den : 0;
  if (slope && Math.abs(slope) < 0.3) {
    const level = (w: Word) => ({ ...w, y: w.y - slope * (w.x - mx) });
    words = words.map(level);
    header = header.map((x) => ({ ...x, w: level(x.w) }));
  }
  // Board text: the title, filter and totals above the header, and the
  // status bar (top or bottom) with the date on screen.
  const all = textRows(words, lh);
  const headerTop = header.length ? Math.min(...header.map((x) => x.w.y)) : Infinity;
  const above = all.filter((r) => mid(r[0]) < headerTop).map(rowText).join("\n");
  const total = all.map(rowText).join("\n").match(/total\s*cases?\s*[:;.]?\s*(\d{1,3})/i);
  const plus = (header.length ? above : all.map(rowText).join("\n")).match(/(?:^|\s)\+\s?([1-7lI|])(?=\s|$)/m);
  const shownDate = all.map((r) => dateIn(rowText(r))).find(Boolean);
  const plusDays = plus ? (/\d/.test(plus[1]) ? +plus[1] : 1) : 0;
  const base: BoardRead = {
    ...empty,
    total: total ? +total[1] : undefined,
    shownDate,
    plusDays,
    date: shownDate ? addDays(shownDate, plusDays) : undefined,
  };
  if (!header.length) return base;


  const headerY = my + lh * 0.8;

  // Columns start at their heading's left edge (cells are left-aligned).
  const anchors = header.map((x) => ({ col: x.col, x: x.w.x })).sort((a, b) => a.x - b.x)
    .filter((a, i, arr) => i === 0 || a.x - arr[i - 1].x > 0.004);
  const colOf = (w: Word): Col => {
    let c: Col = "skip";
    for (let i = 0; i < anchors.length; i++) {
      const next = anchors[i + 1];
      const tol = Math.min(0.006, ((next ? next.x : 1) - anchors[i].x) * 0.15);
      if (w.x + tol >= anchors[i].x) c = anchors[i].col;
    }
    return w.x + 0.006 < anchors[0].x ? "skip" : c;
  };

  const body = words.filter((w) => mid(w) > headerY);
  const rows = textRows(body, lh);

  // Room headings and case starts, top to bottom.
  // A row with a start time begins a case; the case runs down to the next
  // one (rows grow tall with long comments). Room headings start at the left
  // edge; the status bar or totals line ends the last case.
  type Mark = { y: number; room?: string; count?: number; time?: string; end?: boolean };
  const marks: Mark[] = [];
  const surgeonX = anchors.find((a) => a.col === "surgeon")!.x;
  for (const r of rows) {
    const t = rowText(r);
    const y = Math.min(...r.map((w) => w.y));
    const room = r[0].x < surgeonX ? roomOf(t) : undefined;
    const startCell = r.filter((w) => colOf(w) === "start");
    const time = startCell.map((w) => boardTime(w.text)).find(Boolean);
    if (!time && (dateIn(t) || /total\s*cases?/i.test(t))) {
      marks.push({ y, end: true });
    } else if (room && !time) {
      const count = t.match(/\(\s*(\d{1,2})\s*cases?\s*\)/i);
      marks.push({ y, room, count: count ? +count[1] : undefined });
    } else if (time) {
      marks.push({ y, time });
    }
  }

  const cases: BoardCase[] = [];
  const roomCounts: Record<string, number> = {};
  let room: string | undefined;
  marks.forEach((m, i) => {
    if (m.end) return;
    if (m.room) {
      room = m.room;
      if (m.count !== undefined) roomCounts[m.room] = m.count;
      return;
    }
    const top = m.y - lh * 0.6;
    const bottom = (marks[i + 1]?.y ?? Infinity) - lh * 0.6;
    const inRow = body.filter((w) => mid(w) >= top && mid(w) < bottom);
    const cell = (c: Col) => textRows(inRow.filter((w) => colOf(w) === c), lh).map(rowText);
    // "PETERSON. A" / "PETERSON A" (a misread comma) -> "PETERSON, A".
    const surgeon = cell("surgeon").join(" ").replace(/\s*,\s*/g, ", ").trim()
      .replace(/^([A-Za-z'-]{2,})[.;:]?\s+([A-Za-z])\.?$/, "$1, $2");
    const procedure = joinProcedure(cell("procedure"));
    if (!surgeon && !procedure) return;
    const dur = cell("dur").join(" ").match(/\b(\d{1,3})\b/);
    const stop = cell("stop").map((t) => t.split(/\s+/).map(boardTime).find(Boolean)).find(Boolean);
    const anes = cell("anes").join(" ").trim() || undefined;
    cases.push({
      room, time: m.time!, stop, minutes: dur ? +dur[1] : undefined, surgeon, procedure, anes,
      circulators: splitPeople(cell("circulator")),
      techs: splitPeople(cell("tech")),
    });
  });

  return { ...base, cases, roomCounts, headerFound: true };
}

const caseKey = (c: BoardCase) => `${c.time}|${c.surgeon.toLowerCase().replace(/[^a-z]/g, "")}|${c.procedure.toLowerCase().replace(/[^a-z]/g, "").slice(0, 40)}`;

/** Several photos of the same board (scrolled, or one per half) -> one.
 *  A case seen twice is kept once, taking whatever each photo could read
 *  (the room heading may only be in one of them). */
export function mergeBoards(reads: BoardRead[]): BoardRead {
  const out: BoardRead = { cases: [], roomCounts: {}, plusDays: 0, headerFound: false };
  for (const r of reads) {
    const taken = new Set<BoardCase>();
    for (const c of r.cases) {
      const hit = out.cases.find((x) => !taken.has(x) && caseKey(x) === caseKey(c) && (!x.room || !c.room || x.room === c.room));
      if (hit) {
        taken.add(hit);
        hit.room ??= c.room;
        if (!hit.circulators.length) hit.circulators = c.circulators;
        if (!hit.techs.length) hit.techs = c.techs;
        hit.stop ??= c.stop;
        hit.minutes ??= c.minutes;
        hit.anes ??= c.anes;
      } else {
        const copy = { ...c };
        out.cases.push(copy);
        taken.add(copy);
      }
    }
    for (const [k, v] of Object.entries(r.roomCounts)) out.roomCounts[k] = Math.max(out.roomCounts[k] ?? 0, v);
    if (r.total !== undefined) out.total = Math.max(out.total ?? 0, r.total);
    out.shownDate ??= r.shownDate;
    out.plusDays ||= r.plusDays;
    out.date ??= r.date;
    out.headerFound ||= r.headerFound;
  }
  // Board order: by room as it appears, then start time.
  const order = [...new Set(out.cases.map((c) => c.room ?? ""))];
  out.cases.sort((a, b) => order.indexOf(a.room ?? "") - order.indexOf(b.room ?? "") || a.time.localeCompare(b.time));
  return out;
}

/** What the board says it has that the photos didn't show. */
export function boardGaps(b: BoardRead): string[] {
  const out: string[] = [];
  const n = b.cases.length;
  if (b.total !== undefined && b.total > n) {
    out.push(`The board lists ${b.total} cases; ${n === 1 ? "1 was" : `${n} were`} read. Scroll the board and add a photo of the rest.`);
  }
  for (const [room, want] of Object.entries(b.roomCounts)) {
    const got = b.cases.filter((c) => c.room === room).length;
    if (got < want) out.push(`${room} shows ${want} cases; ${got} read.`);
  }
  const noRoom = b.cases.filter((c) => !c.room).length;
  if (noRoom) out.push(`${noRoom} ${noRoom === 1 ? "case is" : "cases are"} above the first room heading (scrolled off). Pick the room below, or add a photo that shows it.`);
  return out;
}

// ---- People ----------------------------------------------------------------

/** Cells that name a role, not a person: "Uro Tech", "RN", "TBD". */
const ROLE_ONLY = /^(?:(?:uro|ortho|gyn|ent|neuro|eye|optho|plastics?|cv|cardiac|vascular|gi|gen|rep|float|travel(?:er)?|agency)\s*)?(?:tech|scrub|rn|nurse|circ(?:ulator)?)$|^(?:tbd|tba|open|none|n\/?a|\?+)$/i;

export interface PersonRead {
  /** As the board writes it: "Angie", "M Jones", "Uro Tech". */
  text: string;
  /** "(appt 1330-EOD)" */
  note?: string;
  /** Staff who fit; one means it's settled. */
  matches: StaffMember[];
  /** Names a role, not a person. */
  roleOnly?: boolean;
}

const NURSE: TeamRole[] = ["nurse"];
const TECH: TeamRole[] = ["tech", "trainee", "phase2"];

function parts(name: string) {
  const p = name.toLowerCase().replace(/[^a-z' -]/g, " ").split(/\s+/).filter(Boolean);
  return { first: p[0] ?? "", last: p[p.length - 1] ?? "", all: p };
}

/** Staff who could be the person a board cell names: by full name, first
 *  name, last name, or initial + last ("M Jones"). Prefers people in the
 *  column's role when the name alone fits several. */
export function matchPeople(cell: string, staff: StaffMember[], column: "circulator" | "tech"): PersonRead[] {
  const note = cell.match(/\(([^)]*)\)/)?.[0];
  const text = cell.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  if (ROLE_ONLY.test(text)) return [{ text, note, matches: [], roleOnly: true }];
  const prefer = column === "circulator" ? NURSE : TECH;
  const narrow = (list: StaffMember[]) => {
    const uniq = list.filter((m, i) => list.findIndex((x) => x.name.toLowerCase() === m.name.toLowerCase()) === i);
    const inRole = uniq.filter((m) => prefer.includes(m.role));
    return inRole.length ? inRole : uniq;
  };
  const people = staff.map((m) => ({ m, n: parts(m.name) }));
  const want = parts(text);
  const full = people.filter((x) => x.n.all.join(" ") === want.all.join(" ")).map((x) => x.m);
  if (full.length) return [{ text, note, matches: narrow(full) }];
  if (want.all.length === 1) {
    const w = want.first;
    return [{ text, note, matches: narrow(people.filter((x) => x.n.first === w || x.n.last === w).map((x) => x.m)) }];
  }
  // "M Jones": an initial and a last name.
  if (want.all.length === 2 && want.first.length === 1) {
    return [{ text, note, matches: narrow(people.filter((x) => x.n.last === want.last && x.n.first.startsWith(want.first)).map((x) => x.m)) }];
  }
  const firstLast = people.filter((x) => x.n.first === want.first && x.n.last === want.last).map((x) => x.m);
  if (firstLast.length) return [{ text, note, matches: narrow(firstLast) }];
  // "Fisher Moore": two people on one line, when each name fits someone.
  if (want.all.length === 2) {
    const each = want.all.map((w) => narrow(people.filter((x) => x.n.first === w || x.n.last === w).map((x) => x.m)));
    if (each.every((l) => l.length)) return want.all.map((w, i) => ({ text: niceName(w), matches: each[i], ...(i === 0 && note ? { note } : {}) }));
  }
  return [{ text, note, matches: [] }];
}
