import type { CalEvent } from "../types";

// Custody-rotation generator. Co-parents almost always follow a repeating
// pattern (week-on/week-off, 2-2-3, 2-2-5-5). Entering those by hand is exactly
// the "woeful, cumbersome calendar" reviewers complain about — here you pick a
// template and a start date and the parenting-time blocks are generated for you.

export type RotationPattern =
  | "alternating-weeks"
  | "2-2-3"
  | "2-2-5-5"
  | "every-weekend";

export const ROTATION_LABELS: Record<RotationPattern, string> = {
  "alternating-weeks": "Week on / week off",
  "2-2-3": "2-2-3",
  "2-2-5-5": "2-2-5-5",
  "every-weekend": "Weekdays / weekends",
};

// Each pattern is a per-day assignment over its repeating cycle, expressed as
// booleans: true = parent A has the child that day, false = parent B.
// "every-weekend" is keyed off the actual weekday rather than a fixed cycle.
const CYCLES: Record<Exclude<RotationPattern, "every-weekend">, boolean[]> = {
  "alternating-weeks": [
    true, true, true, true, true, true, true,
    false, false, false, false, false, false, false,
  ],
  "2-2-3": [
    true, true, false, false, true, true, true,
    false, false, true, true, false, false, false,
  ],
  "2-2-5-5": [
    true, true, false, false, true, true, true, true, true,
    false, false, false, false, false,
  ],
};

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Returns true when parent A has the child on the given day index.
 * `startWithA` flips which parent the cycle opens with.
 */
function aHasDay(
  pattern: RotationPattern,
  dayIndex: number,
  date: Date,
  startWithA: boolean,
): boolean {
  if (pattern === "every-weekend") {
    const dow = date.getDay(); // 0 Sun .. 6 Sat
    const isWeekend = dow === 0 || dow === 6;
    // Parent A keeps weekdays; weekends alternate by week number.
    if (!isWeekend) return startWithA;
    const weekNo = Math.floor(dayIndex / 7);
    return startWithA ? weekNo % 2 === 1 : weekNo % 2 === 0;
  }
  const cycle = CYCLES[pattern];
  const base = cycle[dayIndex % cycle.length];
  return startWithA ? base : !base;
}

export interface RotationOptions {
  pattern: RotationPattern;
  startDate: string; // ISO date (YYYY-MM-DD)
  weeks: number;
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  startWithA: boolean;
}

/**
 * Generate coalesced all-day parenting-time events for the rotation. Adjacent
 * days assigned to the same parent are merged into a single block so the
 * calendar shows "with You · Mon–Sun" rather than seven separate entries.
 */
export function generateRotation(opts: RotationOptions): Omit<CalEvent, "id">[] {
  const totalDays = Math.max(1, Math.round(opts.weeks * 7));
  const start = new Date(opts.startDate + "T00:00");

  const events: Omit<CalEvent, "id">[] = [];
  let runStart = 0;
  let runIsA = aHasDay(opts.pattern, 0, start, opts.startWithA);

  const flush = (fromIdx: number, toIdxExclusive: number, isA: boolean) => {
    const blockStart = addDays(start, fromIdx);
    const blockEndExclusive = addDays(start, toIdxExclusive);
    events.push({
      title: `Parenting time — with ${isA ? opts.aName : opts.bName}`,
      category: "parenting-time",
      start: blockStart.toISOString(),
      end: blockEndExclusive.toISOString(),
      allDay: true,
      withId: isA ? opts.aId : opts.bId,
      requestStatus: "none",
    });
  };

  for (let i = 1; i < totalDays; i++) {
    const date = addDays(start, i);
    const isA = aHasDay(opts.pattern, i, date, opts.startWithA);
    if (isA !== runIsA) {
      flush(runStart, i, runIsA);
      runStart = i;
      runIsA = isA;
    }
  }
  flush(runStart, totalDays, runIsA);

  return events;
}
