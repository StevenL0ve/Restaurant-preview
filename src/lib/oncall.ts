import type { OnCallShift } from "../types";

// Pure date logic for on-call coverage windows — kept out of the components so
// the "who's on right now / when does this end" rules are testable without a
// DOM or a fixed clock (callers pass `nowMs`).

export type WindowStatus =
  | { state: "upcoming"; start: number }
  | { state: "current"; end?: number } // end undefined = open-ended ("until changed")
  | { state: "ended"; end: number };

/** Classify a shift relative to now: not started, covering now, or over. */
export function windowState(shift: Pick<OnCallShift, "start" | "end">, nowMs: number): WindowStatus {
  const start = Date.parse(shift.start);
  const end = shift.end ? Date.parse(shift.end) : undefined;
  if (start > nowMs) return { state: "upcoming", start };
  if (end !== undefined && end < nowMs) return { state: "ended", end };
  return { state: "current", end };
}

export type PresetKind = "now" | "today" | "tonight" | "week";

export const PRESETS: { kind: PresetKind; label: string }[] = [
  { kind: "now", label: "On now (until I change it)" },
  { kind: "tonight", label: "Tonight → 7 AM" },
  { kind: "today", label: "Rest of today" },
  { kind: "week", label: "Next 7 days" },
];

/** Turn a quick preset into a concrete start/end window. `now` is open-ended. */
export function presetWindow(kind: PresetKind, nowMs: number): { start: string; end?: string } {
  const start = new Date(nowMs).toISOString();
  if (kind === "now") return { start };
  if (kind === "week") return { start, end: new Date(nowMs + 7 * 86400000).toISOString() };
  if (kind === "today") {
    const end = new Date(nowMs);
    end.setHours(23, 59, 0, 0);
    return { start, end: end.toISOString() };
  }
  // tonight: now until 7:00 AM the next day
  const end = new Date(nowMs);
  end.setDate(end.getDate() + 1);
  end.setHours(7, 0, 0, 0);
  return { start, end: end.toISOString() };
}

/** Pretty-print a phone number for reading aloud / dialing from a landline.
 *  Handles US 10-digit and +1 11-digit; anything else is returned trimmed. */
export function formatPhone(phone?: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return trimmed;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → value for <input type="datetime-local"> (local wall-clock, no zone). */
export function toLocalInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO (interpreted as local time), or undefined if blank. */
export function fromLocalInputValue(v: string): string | undefined {
  if (!v) return undefined;
  const ms = Date.parse(v);
  return isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/** A short human window description for the board ("On now · until changed"). */
export function describeWindow(shift: Pick<OnCallShift, "start" | "end">, nowMs: number): string {
  const st = windowState(shift, nowMs);
  const when = (ms: number) => {
    const d = new Date(ms);
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const today = new Date(nowMs);
    const sameDay = d.toDateString() === today.toDateString();
    const tomorrow = new Date(nowMs + 86400000);
    if (sameDay) return `today ${time}`;
    if (d.toDateString() === tomorrow.toDateString()) return `tomorrow ${time}`;
    return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ${time}`;
  };
  if (st.state === "upcoming") return `Starts ${when(st.start)}`;
  if (st.state === "ended") return `Ended ${when(st.end)}`;
  return st.end === undefined ? "On now · until you change it" : `On now · until ${when(st.end)}`;
}

// ---- Scheduling ahead -------------------------------------------------------
// Call is set for many days at once: tap the days on a month calendar, give
// the hours ("17:00" to "07:00" runs into the next morning), and either make
// each day its own shift or join back-to-back days into one stretch
// (Friday 17:00 through Monday 07:00).

/** "2026-10-27" for a local Date. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function at(day: string, time: string, plusDays = 0): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d + plusDays, hh || 0, mm || 0, 0, 0);
}

function nextDay(day: string): string {
  return dayKey(at(day, "00:00", 1));
}

/** Shift windows for picked days. An end time at or before the start time
 *  ends the next day (overnight call; equal times = 24 hours). */
export function windowsForDays(
  days: string[],
  startTime: string,
  endTime: string,
  mode: "each" | "stretch",
): { start: string; end: string }[] {
  const sorted = [...new Set(days)].sort();
  const overnight = endTime <= startTime ? 1 : 0;
  if (mode === "each") {
    return sorted.map((d) => ({ start: at(d, startTime).toISOString(), end: at(d, endTime, overnight).toISOString() }));
  }
  const runs: string[][] = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && nextDay(last[last.length - 1]) === d) last.push(d);
    else runs.push([d]);
  }
  return runs.map((r) => ({ start: at(r[0], startTime).toISOString(), end: at(r[r.length - 1], endTime, overnight).toISOString() }));
}

/** The days of a month as "YYYY-MM-DD", padded with nulls so the first
 *  lands on its weekday column (Sunday first). */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(dayKey(new Date(year, month, d)));
  return cells;
}

/** Does a shift touch this local day at all? (Open-ended: every day from its start.) */
export function shiftOnDay(shift: Pick<OnCallShift, "start" | "end">, day: string): boolean {
  const dayStart = at(day, "00:00").getTime();
  const dayEnd = at(day, "00:00", 1).getTime();
  const s = Date.parse(shift.start);
  const e = shift.end ? Date.parse(shift.end) : Infinity;
  return s < dayEnd && e > dayStart;
}

/** "17:00 → 07:00 next day", "07:00 → 19:00", "Fri 17:00 → Mon 07:00". */
export function shiftHours(shift: Pick<OnCallShift, "start" | "end">): string {
  const s = new Date(shift.start);
  const t = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (!shift.end) return `${t(s)} → until changed`;
  const e = new Date(shift.end);
  const days = Math.round((at(dayKey(e), "00:00").getTime() - at(dayKey(s), "00:00").getTime()) / 86400000);
  if (days === 0) return `${t(s)} → ${t(e)}`;
  if (days === 1) return `${t(s)} → ${t(e)} next day`;
  const wd = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${wd(s)} ${t(s)} → ${wd(e)} ${t(e)}`;
}

/** For a day-by-day list: a shift belongs on the day it starts and any day
 *  it's still running at midday (a weekend stretch), not on the morning an
 *  overnight call ends. */
export function shiftListedOnDay(shift: Pick<OnCallShift, "start" | "end">, day: string): boolean {
  if (dayKey(new Date(shift.start)) === day) return true;
  const noon = at(day, "12:00").getTime();
  return Date.parse(shift.start) <= noon && (!shift.end || Date.parse(shift.end) > noon);
}

/** A position's shifts for one day's list: its scheduled (ending) shifts,
 *  plus whoever is on "until changed" that day (only the latest one; an
 *  older open-ended assignment was replaced by it). */
export function dayShifts<T extends Pick<OnCallShift, "start" | "end">>(shifts: T[], day: string): { scheduled: T[]; standing?: T } {
  const noon = at(day, "12:00").getTime();
  const scheduled = shifts.filter((s) => s.end && shiftListedOnDay(s, day)).sort((a, b) => a.start.localeCompare(b.start));
  const standing = shifts
    .filter((s) => !s.end && Date.parse(s.start) <= Math.max(noon, at(day, "23:59").getTime()))
    .sort((a, b) => b.start.localeCompare(a.start))[0];
  return { scheduled, standing };
}
