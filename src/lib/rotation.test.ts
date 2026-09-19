import { describe, it, expect } from "vitest";
import { generateRotation, type RotationOptions } from "./rotation";

const base: Omit<RotationOptions, "pattern"> = {
  startDate: "2026-01-05", // a Monday
  weeks: 4,
  aId: "a",
  bId: "b",
  aName: "You",
  bName: "Jordan",
  startWithA: true,
};

describe("generateRotation", () => {
  it("alternating weeks produces one block per 7-day stretch", () => {
    const events = generateRotation({ ...base, pattern: "alternating-weeks", weeks: 4 });
    expect(events.length).toBe(4);
    // First block is parent A (You), second is B (Jordan), alternating.
    expect(events[0].withId).toBe("a");
    expect(events[1].withId).toBe("b");
    expect(events[2].withId).toBe("a");
  });

  it("covers every day with exactly one parent and no gaps", () => {
    const events = generateRotation({ ...base, pattern: "2-2-3", weeks: 4 });
    // Blocks should be contiguous: each block's end equals the next block's start.
    for (let i = 1; i < events.length; i++) {
      expect(events[i].start).toBe(events[i - 1].end);
    }
    // Total span is 28 days.
    const span =
      (+new Date(events[events.length - 1].end) - +new Date(events[0].start)) / 86400000;
    expect(Math.round(span)).toBe(28);
  });

  it("startWithA flips the assignment", () => {
    const a = generateRotation({ ...base, pattern: "2-2-3", startWithA: true });
    const b = generateRotation({ ...base, pattern: "2-2-3", startWithA: false });
    expect(a[0].withId).toBe("a");
    expect(b[0].withId).toBe("b");
  });

  it("all generated events are all-day parenting-time blocks", () => {
    const events = generateRotation({ ...base, pattern: "2-2-5-5" });
    expect(events.every((e) => e.allDay && e.category === "parenting-time")).toBe(true);
  });

  it("every-weekend keeps weekdays with the primary parent", () => {
    const events = generateRotation({ ...base, pattern: "every-weekend", weeks: 2 });
    expect(events.length).toBeGreaterThan(1);
    // Monday (start date) is a weekday → primary parent A.
    expect(events[0].withId).toBe("a");
  });
});
