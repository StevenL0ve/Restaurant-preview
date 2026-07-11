import { describe, it, expect } from "vitest";
import { windowState, presetWindow, toLocalInputValue, fromLocalInputValue } from "./oncall";

const NOW = Date.parse("2026-07-11T12:00:00.000Z");

describe("windowState", () => {
  it("flags a future shift as upcoming", () => {
    const s = windowState({ start: "2026-07-12T07:00:00.000Z" }, NOW);
    expect(s.state).toBe("upcoming");
  });
  it("flags an open-ended started shift as current with no end", () => {
    const s = windowState({ start: "2026-07-11T06:00:00.000Z" }, NOW);
    expect(s).toEqual({ state: "current", end: undefined });
  });
  it("flags a shift whose end has passed as ended", () => {
    const s = windowState({ start: "2026-07-10T06:00:00.000Z", end: "2026-07-11T06:00:00.000Z" }, NOW);
    expect(s.state).toBe("ended");
  });
  it("keeps a shift current until its end", () => {
    const s = windowState({ start: "2026-07-11T06:00:00.000Z", end: "2026-07-11T18:00:00.000Z" }, NOW);
    expect(s.state).toBe("current");
  });
});

describe("presetWindow", () => {
  it("'now' is open-ended", () => {
    const w = presetWindow("now", NOW);
    expect(w.start).toBe(new Date(NOW).toISOString());
    expect(w.end).toBeUndefined();
  });
  it("'week' ends seven days out", () => {
    const w = presetWindow("week", NOW);
    expect(Date.parse(w.end!) - NOW).toBe(7 * 86400000);
  });
  it("'tonight' ends at a 7 AM the next day", () => {
    const w = presetWindow("tonight", NOW);
    const end = new Date(w.end!);
    expect(end.getHours()).toBe(7);
    expect(end.getTime()).toBeGreaterThan(NOW);
  });
});

describe("datetime-local round trip", () => {
  it("fromLocalInputValue is the inverse of toLocalInputValue (to the minute)", () => {
    const iso = "2026-07-11T09:30:00.000Z";
    const local = toLocalInputValue(iso);
    const back = fromLocalInputValue(local)!;
    // Round-trips to the same wall-clock minute.
    expect(toLocalInputValue(back)).toBe(local);
  });
  it("blank in, blank/undefined out", () => {
    expect(toLocalInputValue(undefined)).toBe("");
    expect(fromLocalInputValue("")).toBeUndefined();
  });
});
