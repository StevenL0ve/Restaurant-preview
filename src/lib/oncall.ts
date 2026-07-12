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
