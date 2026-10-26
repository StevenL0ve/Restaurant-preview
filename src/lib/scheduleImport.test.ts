import { describe, expect, it } from "vitest";
import { buildScheduleRows, detectColumns, matchSurgeon, parseScheduleDate, parseScheduleTime, procedureScore } from "./scheduleImport";
import type { CaseEntry, PrefCard, Surgeon } from "../types";

const surgeons = [
  { id: "s1", name: "Dr. Maria Alvarez" },
  { id: "s2", name: "Dr. James Chen" },
  { id: "s3", name: "Dr. Linda Chen" },
] as Surgeon[];
const cards = [
  { id: "c1", surgeonId: "s1", procedure: "Laparoscopic Cholecystectomy" },
  { id: "c2", surgeonId: "s1", procedure: "Inguinal Hernia Repair (open)" },
  { id: "c3", surgeonId: "s2", procedure: "Total Knee Arthroplasty" },
  { id: "c4", surgeonId: "s2", procedure: "ACL Reconstruction (arthroscopic)" },
] as PrefCard[];

describe("schedule upload", () => {
  it("finds the columns, skipping patient columns", () => {
    const map = detectColumns(["Patient Name", "MRN", "Surgery Date", "Start Time", "OR", "Primary Surgeon", "Procedure Description"]);
    expect(map).toEqual({ date: 2, time: 3, room: 4, surgeon: 5, procedure: 6 });
  });

  it("reads common date and time formats", () => {
    expect(parseScheduleDate("10/27/2026")).toBe("2026-10-27");
    expect(parseScheduleDate("2026-10-27")).toBe("2026-10-27");
    expect(parseScheduleDate("27-Oct-2026")).toBe("2026-10-27");
    expect(parseScheduleDate("Oct 27, 2026")).toBe("2026-10-27");
    expect(parseScheduleDate(46322)).toBe("2026-10-27"); // Excel serial
    expect(parseScheduleTime("0730")).toBe("07:30");
    expect(parseScheduleTime("7:30 AM")).toBe("07:30");
    expect(parseScheduleTime("1:15p")).toBe("13:15");
    expect(parseScheduleTime("10/27/2026 12:45 PM")).toBe("12:45");
    expect(parseScheduleTime(0.3125)).toBe("07:30"); // Excel time
  });

  it("matches surgeons by name the way schedules print them", () => {
    expect(matchSurgeon("ALVAREZ, MARIA MD", surgeons)?.id).toBe("s1");
    expect(matchSurgeon("Alvarez", surgeons)?.id).toBe("s1");
    expect(matchSurgeon("Chen, James", surgeons)?.id).toBe("s2");
    expect(matchSurgeon("Chen", surgeons)).toBeUndefined(); // two Chens
    expect(matchSurgeon("Dr. Okafor", surgeons)).toBeUndefined();
  });

  it("understands OR shorthand for procedures", () => {
    expect(procedureScore("LAP CHOLE", cards[0])).toBeGreaterThan(0.5);
    expect(procedureScore("Right TKA", cards[2])).toBeGreaterThan(0.5);
    expect(procedureScore("LAP CHOLE", cards[1])).toBe(0);
    expect(procedureScore("LAP APPY", cards[0])).toBeLessThan(0.34); // only "laparoscopic" in common
  });

  it("builds reviewable rows and flags what it can't match or already has", () => {
    const existing = [{ id: "x", date: "2026-10-27", time: "07:30", cardId: "c1" }] as CaseEntry[];
    const rows = buildScheduleRows(
      [
        ["Patient", "Date", "Time", "Room", "Surgeon", "Procedure"],
        ["DOE, JOHN", "10/27/2026", "0730", "2", "ALVAREZ, MARIA", "LAP CHOLE"],
        ["ROE, JANE", "10/27/2026", "0930", "2", "ALVAREZ, MARIA", "Open inguinal hernia repair, left"],
        ["SMITH, AL", "10/27/2026", "1100", "5", "CHEN, JAMES", "R TKA"],
        ["LEE, KIM", "10/27/2026", "1300", "5", "OKAFOR, ADA", "C-section"],
        ["PARK, JO", "", "1400", "1", "CHEN, JAMES", "ACL"],
      ],
      detectColumns(["Patient", "Date", "Time", "Room", "Surgeon", "Procedure"]),
      { cards, surgeons, cases: existing },
    );
    expect(rows.map((r) => [r.time, r.room, r.cardId ?? null, r.problem ?? null])).toEqual([
      ["07:30", "OR 2", null, "Already on the schedule"],
      ["09:30", "OR 2", "c2", null],
      ["11:00", "OR 5", "c3", null],
      ["13:00", "OR 5", null, "No surgeon named OKAFOR, ADA in ORSync"],
      ["14:00", "OR 1", null, "No date"],
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/DOE|ROE|SMITH|LEE, KIM|PARK/);
  });
});
