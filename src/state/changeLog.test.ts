import { describe, it, expect } from "vitest";
import { logChange } from "./store";
import { buildSeed } from "./seed";
import { SYNCED_KEYS } from "./cloudSync";

describe("change log", () => {
  it("records who changed what, newest first, and syncs with the facility", () => {
    const a = logChange(buildSeed(), "oncall", "On call: set Tech 1: Kim Park", "Steven Nelson", "2026-10-25T20:00:00Z");
    const b = logChange(a, "schedule", "Schedule: cancelled TKA", "Dana Ortiz", "2026-10-25T20:05:00Z");
    expect(b.changeLog[0]).toMatchObject({ kind: "schedule", by: "Dana Ortiz", text: "Schedule: cancelled TKA" });
    expect(b.changeLog[1]).toMatchObject({ kind: "oncall", by: "Steven Nelson" });
    expect(SYNCED_KEYS).toContain("changeLog");
  });

  it("is capped so it never grows without bound", () => {
    let st = buildSeed();
    for (let i = 0; i < 350; i++) st = logChange(st, "other", `change ${i}`, "x");
    expect(st.changeLog.length).toBe(300);
    expect(st.changeLog[0].text).toBe("change 349");
  });
});
