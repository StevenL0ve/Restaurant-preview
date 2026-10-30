import { describe, expect, it } from "vitest";
import { caseTitle, countLine, filterLabel, filterLog, logText, specialtyCounts, type LogEntry } from "./caseLog";

const e = (id: string, date: string, specialty: string, extra: Partial<LogEntry> = {}): LogEntry =>
  ({ id, date, specialty, procedure: `Case ${id}`, surgeon: "John Peterson", role: "Trainee tech III", room: "OR 1", ...extra });
const log = [
  e("5", "2026-11-02", "General Surgery"),
  e("4", "2026-10-27", "General Surgery", { time: "07:30" }),
  e("3", "2026-10-20", "Orthopedics"),
  e("2", "2026-09-30", "General Surgery"),
  e("1", "2025-12-31", "Orthopedics"),
]; // newest first, like logEntries

describe("case log", () => {
  it("filters by date range and specialty", () => {
    expect(filterLog(log, { from: "2026-10-01", to: "2026-10-31" }).map((x) => x.id)).toEqual(["4", "3"]);
    expect(filterLog(log, { specialty: "Orthopedics" }).map((x) => x.id)).toEqual(["3", "1"]);
    expect(filterLog(log, { from: "2026-01-01", specialty: "General Surgery" }).map((x) => x.id)).toEqual(["5", "4", "2"]);
  });
  it("counts by specialty", () => {
    expect(specialtyCounts(log)).toEqual([["General Surgery", 3], ["Orthopedics", 2]]);
    expect(countLine(log)).toBe("5 cases: General Surgery 3, Orthopedics 2");
  });
  it("labels the filter", () => {
    expect(filterLabel({})).toBe("All dates · All specialties");
    expect(filterLabel({ from: "2026-10-01", to: "2026-10-31", specialty: "Orthopedics" })).toBe("Oct 1, 2026 to Oct 31, 2026 · Orthopedics");
  });
  it("writes a text: done oldest first, then scheduled", () => {
    const t = logText("Areli Vargas", log, {}, "2026-10-27");
    expect(t.startsWith("CASE LOG: Areli Vargas\nAll dates · All specialties\n5 cases")).toBe(true);
    expect(t.indexOf("Case 1")).toBeLessThan(t.indexOf("Case 3"));
    expect(t).toContain("DONE (3)");
    expect(t).toContain("SCHEDULED (2)");
    expect(t.indexOf("SCHEDULED")).toBeLessThan(t.indexOf("Case 5"));
    expect(t).toContain("John Peterson · General Surgery · as Trainee tech III");
  });
  it("keeps a day's cases in case order", () => {
    const day = [e("b", "2026-10-02", "X"), e("a", "2026-10-02", "X", { time: "07:30" }), e("c", "2026-10-01", "X")];
    const t = logText("A", day, {}, "2026-10-27");
    expect([t.indexOf("Case c"), t.indexOf("Case a"), t.indexOf("Case b")]).toEqual([...[t.indexOf("Case c"), t.indexOf("Case a"), t.indexOf("Case b")]].sort((x, y) => x - y));
  });
  it("names the case the way the board does", () => {
    expect(caseTitle({ procedure: "Repair Umbilical Hernia" }, { procedure: "Hernia Repair" })).toBe("Repair Umbilical Hernia");
    expect(caseTitle({}, { procedure: "ACL + TKA (one case)" })).toBe("ACL + TKA");
  });
});

describe("whose log", () => {
  it("lists everyone at the facility, busiest first, without email addresses", async () => {
    const { logPeople } = await import("./caseLog");
    const team = (...names: string[]) => names.map((name, i) => ({ id: `t${i}`, role: "tech" as const, name }));
    const state = {
      cases: [
        { id: "1", date: "2026-10-01", cardId: "c", team: team("Angie Burks", "Tyra Moore") },
        { id: "2", date: "2026-10-02", cardId: "c", team: team("Tyra Moore", "Tyra Moore") },
        { id: "3", date: "2026-10-03", cardId: "c", team: team("Pending Person"), approval: { kind: "add", at: "x" } },
      ],
      staff: [{ id: "s", name: "Lin Xia", role: "nurse" }, { id: "s2", name: "angie burks", role: "tech" }],
      onCallPeople: [{ id: "o", name: "Dr. On Call" }],
    } as never;
    expect(logPeople(state, ["Sam Roberts", "someone@example.com"])).toEqual([
      { name: "Tyra Moore", cases: 2 },
      { name: "Angie Burks", cases: 1 },
      { name: "Dr. On Call", cases: 0 },
      { name: "Lin Xia", cases: 0 },
      { name: "Sam Roberts", cases: 0 },
    ]);
  });
});
