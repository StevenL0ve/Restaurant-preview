import { describe, expect, it } from "vitest";
import { monthGrid, shiftHours, shiftOnDay, windowsForDays } from "./oncall";

const local = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

describe("scheduling call ahead", () => {
  it("each picked day is its own shift; overnight ends the next morning", () => {
    const w = windowsForDays(["2026-10-30", "2026-10-28"], "17:00", "07:00", "each");
    expect(w.map((x) => `${local(x.start)} -> ${local(x.end)}`)).toEqual([
      "2026-10-28 17:00 -> 2026-10-29 07:00",
      "2026-10-30 17:00 -> 2026-10-31 07:00",
    ]);
  });
  it("day call stays on the same day; equal times are 24 hours", () => {
    expect(windowsForDays(["2026-10-28"], "07:00", "19:00", "each").map((x) => local(x.end))).toEqual(["2026-10-28 19:00"]);
    expect(windowsForDays(["2026-10-28"], "07:00", "07:00", "each").map((x) => local(x.end))).toEqual(["2026-10-29 07:00"]);
  });
  it("one stretch joins back-to-back days, including across a month", () => {
    const w = windowsForDays(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-05"], "17:00", "07:00", "stretch");
    expect(w.map((x) => `${local(x.start)} -> ${local(x.end)}`)).toEqual([
      "2026-10-30 17:00 -> 2026-11-02 07:00",
      "2026-11-05 17:00 -> 2026-11-06 07:00",
    ]);
  });
  it("lays a month out by weekday", () => {
    const g = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(g.slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
    expect(g.filter(Boolean)).toHaveLength(31);
  });
  it("knows which days a shift touches and how to describe its hours", () => {
    const [night] = windowsForDays(["2026-10-28"], "17:00", "07:00", "each");
    expect(shiftOnDay(night, "2026-10-28")).toBe(true);
    expect(shiftOnDay(night, "2026-10-29")).toBe(true);
    expect(shiftOnDay(night, "2026-10-30")).toBe(false);
    expect(shiftHours(night)).toBe("17:00 → 07:00 next day");
    expect(shiftOnDay({ start: night.start }, "2026-12-25")).toBe(true);
    const [stretch] = windowsForDays(["2026-10-30", "2026-10-31", "2026-11-01"], "17:00", "07:00", "stretch");
    expect(shiftHours(stretch)).toMatch(/17:00 → .*07:00/);
  });
});

import { dayShifts, shiftListedOnDay } from "./oncall";
describe("call schedule list", () => {
  it("lists an overnight once, a weekend stretch on each day it covers", () => {
    const [night] = windowsForDays(["2026-10-28"], "17:00", "07:00", "each");
    expect(shiftListedOnDay(night, "2026-10-28")).toBe(true);
    expect(shiftListedOnDay(night, "2026-10-29")).toBe(false);
    const [wknd] = windowsForDays(["2026-10-30", "2026-10-31"], "17:00", "07:00", "stretch");
    expect(["2026-10-30", "2026-10-31", "2026-11-01"].map((d) => shiftListedOnDay(wknd, d))).toEqual([true, true, false]);
  });
  it("shows only the latest 'until changed' person", () => {
    const old = { id: "a", start: "2026-10-20T12:00:00.000Z" };
    const newer = { id: "b", start: "2026-10-25T12:00:00.000Z" };
    const later = { id: "c", start: "2026-11-15T12:00:00.000Z" };
    expect(dayShifts([old, newer, later], "2026-10-28").standing?.id).toBe("b");
    expect(dayShifts([old], "2026-10-28").scheduled).toEqual([]);
  });
});
