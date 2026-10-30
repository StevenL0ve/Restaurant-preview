import { describe, expect, it } from "vitest";
import { boardGaps, boardTime, matchPeople, mergeBoards, readBoard, splitPeople } from "./boardImport";
import type { OcrLine } from "./ocr";
import type { StaffMember } from "../types";

// A board laid out the way the recognizer returns it: one box per cell line,
// columns at the x the Periop Tracking screen puts them. Cases come from the
// typed samples in docs/greaseboard/ (no patient data; the patient and
// comment columns hold placeholders so we can check they're ignored).

const X = { start: 0.02, patient: 0.07, age: 0.16, surgeon: 0.21, procedure: 0.31, dur: 0.5, stop: 0.54, anes: 0.59, circ: 0.67, tech: 0.75, comment: 0.83, caseno: 0.94 };
const LH = 0.013;
const CW = 0.0062; // width of one character

type Row = { time: string; surgeon: string; proc: string[]; dur: string; stop: string; anes?: string[]; circ: string[]; tech: string[]; commentLines?: number };
type Item = { bar: string } | Row;

function board(items: Item[], opts: { title?: string[]; footer?: string; tilt?: number; merge?: boolean } = {}): OcrLine[] {
  const out: OcrLine[] = [];
  const put = (text: string, x: number, y: number) => out.push({ text, x, y: y + (opts.tilt ?? 0) * x, w: text.length * CW, h: LH });
  let y = 0.03;
  for (const t of opts.title ?? []) { put(t, 0.02, y); y += LH * 1.6; }
  y += LH;
  const heads: [string, number][] = [["Start", X.start], ["Patient", X.patient], ["Age / Sex", X.age], ["Surgeon", X.surgeon], ["Procedure(s)", X.procedure],
    ["Dur", X.dur], ["Stop", X.stop], ["Anes Type", X.anes], ["Circulator", X.circ], ["Tech", X.tech], ["Comment(s)", X.comment], ["Case #", X.caseno]];
  for (const [t, x] of heads) put(t, x, y);
  y += LH * 2;
  for (const it of items) {
    if ("bar" in it) { put(it.bar, 0.02, y); y += LH * 1.8; continue; }
    const cells: [number, string[]][] = [
      [X.start, [it.time, "Prereg"]], [X.patient, ["XXXXXXXX, XXXX"]], [X.age, ["00 Y / X"]], [X.surgeon, [it.surgeon]],
      [X.procedure, it.proc], [X.dur, [it.dur]], [X.stop, [it.stop]], [X.anes, it.anes ?? []],
      [X.circ, it.circ], [X.tech, it.tech],
      [X.comment, Array.from({ length: it.commentLines ?? 1 }, (_, i) => (i === 0 ? "call 555-0100 day before" : "labs pending, H&P on chart"))],
      [X.caseno, ["0000-000000"]],
    ];
    let rows = 1;
    for (const [x, lines] of cells) {
      lines.forEach((l, i) => put(l, x, y + i * LH * 1.25));
      rows = Math.max(rows, lines.length);
    }
    if (opts.merge) {
      // A phone recognizer that boxes "Xia  Angie" as one line across the
      // circulator and tech columns.
      const ci = out.findIndex((l) => l.text === it.circ[0] && Math.abs(l.x - X.circ) < 0.001 && l.y >= y - 0.001);
      const ti = out.findIndex((l) => l.text === it.tech[0] && Math.abs(l.x - X.tech) < 0.001 && l.y >= y - 0.001);
      if (ci >= 0 && ti >= 0) {
        const gap = Math.round((X.tech - X.circ) / CW) - it.circ[0].length;
        const text = it.circ[0] + " ".repeat(gap) + it.tech[0];
        out[ci] = { ...out[ci], text, w: text.length * CW };
        out.splice(ti, 1);
      }
    }
    y += rows * LH * 1.25 + LH * 0.8;
  }
  if (opts.footer) put(opts.footer, 0.02, 0.97);
  return out;
}

const oct29: Item[] = [
  { bar: "0073-MOR-01 (1 case)" },
  { time: "09:30", surgeon: "AKULA, K", proc: ["Circumcision (No", "Laterality)"], dur: "65", stop: "10:35", circ: ["Roberts"], tech: ["Rosales", "Medina"] },
  { bar: "0073-MOR-04 (3 cases)" },
  { time: "09:30", surgeon: "PETERSON, A", proc: ["Ureteroscopy Retrograde", "with Lithotripsy (Right)"], dur: "70", stop: "10:40", circ: ["Xia"], tech: ["Uro Tech", "Moore"], commentLines: 9 },
  { time: "10:40", surgeon: "PETERSON, A", proc: ["Ureteroscopy Retrograde", "with Lithotripsy", "(Bilateral)"], dur: "120", stop: "12:40", circ: ["Xia"], tech: ["Uro Tech", "Moore"] },
  { time: "12:40", surgeon: "PETERSON, A", proc: ["Ureteroscopy Retrograde", "with Lithotripsy (Right)"], dur: "70", stop: "13:50", circ: ["Xia"], tech: ["Uro Tech", "Moore"] },
  { bar: "0073-MOR-05 (1 case)" },
  { time: "09:30", surgeon: "SMITH, T", proc: ["Excision Bone Cyst Hand", "(Left)"], dur: "35", stop: "10:05", anes: ["Monitored", "Anesthesia", "Care"], circ: ["Clarke"], tech: ["Garnica", "Vargas"] },
  { bar: "0073-MOR-06 (1 case)" },
  { time: "10:35", surgeon: "DAVIS, G", proc: ["Biopsy Temporal Artery", "(Left)"], dur: "65", stop: "11:40", anes: ["Monitored", "Anesthesia", "Care"], circ: ["Clarke/roberts"], tech: [] },
];
const oct29Title = ["Periop Tracking", "WB - OR 0073 +1", "Total Cases: 6"];
const statusBar = "P0630 SVCGBKEESOR04 October 29, 2026 15:10";

describe("reading the board", () => {
  it("reads every case of the Oct 29 board, for the next day", () => {
    const b = readBoard(board(oct29, { title: oct29Title, footer: statusBar }));
    expect(b.headerFound).toBe(true);
    expect(b.total).toBe(6);
    expect(b.shownDate).toBe("2026-10-29");
    expect(b.plusDays).toBe(1);
    expect(b.date).toBe("2026-10-30");
    expect(b.roomCounts).toEqual({ "OR 1": 1, "OR 4": 3, "OR 5": 1, "OR 6": 1 });
    expect(b.cases.map((c) => `${c.room} ${c.time} ${c.surgeon} | ${c.procedure}`)).toEqual([
      "OR 1 09:30 AKULA, K | Circumcision (No Laterality)",
      "OR 4 09:30 PETERSON, A | Ureteroscopy Retrograde with Lithotripsy (Right)",
      "OR 4 10:40 PETERSON, A | Ureteroscopy Retrograde with Lithotripsy (Bilateral)",
      "OR 4 12:40 PETERSON, A | Ureteroscopy Retrograde with Lithotripsy (Right)",
      "OR 5 09:30 SMITH, T | Excision Bone Cyst Hand (Left)",
      "OR 6 10:35 DAVIS, G | Biopsy Temporal Artery (Left)",
    ]);
    const [akula, uro, , , smith, davis] = b.cases;
    expect(akula).toMatchObject({ minutes: 65, stop: "10:35", circulators: ["Roberts"], techs: ["Rosales", "Medina"] });
    expect(uro.techs).toEqual(["Uro Tech", "Moore"]);
    expect(smith.anes).toBe("Monitored Anesthesia Care");
    expect(davis).toMatchObject({ circulators: ["Clarke", "roberts"], techs: [] });
    expect(boardGaps(b)).toEqual([]);
  });

  it("never returns patient or comment text", () => {
    const b = readBoard(board(oct29, { title: oct29Title, footer: statusBar }));
    const text = JSON.stringify(b);
    for (const leak of ["XXXX", "00 Y", "555-0100", "labs", "0000-000000", "Prereg"]) expect(text).not.toContain(leak);
  });

  it("handles a tilted photo and lines that run across two columns", () => {
    for (const opts of [{ tilt: 0.04 }, { tilt: -0.03 }, { merge: true }]) {
      const b = readBoard(board(oct29, { title: oct29Title, ...opts }));
      expect(b.cases).toHaveLength(6);
      expect(b.plusDays).toBe(1);
      expect(b.cases[1]).toMatchObject({ room: "OR 4", circulators: ["Xia"], techs: ["Uro Tech", "Moore"] });
      expect(b.cases[4].procedure).toBe("Excision Bone Cyst Hand (Left)");
    }
  });

  it("flags a scrolled board and merges a second photo", () => {
    const top: Item[] = [
      { time: "10:15", surgeon: "SMITH, T", proc: ["Arthroplasty Reverse", "Shoulder (Right)"], dur: "160", stop: "12:55", circ: ["Ivester"], tech: ["Garnica", "Vargas"] },
      { time: "13:55", surgeon: "SMITH, T", proc: ["Arthroplasty Total Knee", "(Right)"], dur: "135", stop: "16:10", circ: ["Ivester"], tech: ["Gonzalez", "Vargas"] },
      { bar: "0073-MOR-05 (2 cases)" },
      { time: "07:30", surgeon: "SMITH, T", proc: ["Arthroplasty Total Knee", "(Right)"], dur: "165", stop: "10:15", circ: ["Lindsey"], tech: ["Gonzalez", "Vargas"] },
      { time: "12:55", surgeon: "SMITH, T", proc: ["Arthroscopy Knee (Left)"], dur: "60", stop: "13:55", anes: ["General"], circ: ["Lindsey"], tech: ["M Jones"] },
      { bar: "0073-MOR-06 (5 cases)" },
      { time: "07:30", surgeon: "WALTERS, B", proc: ["Removal Cerumen Ear", "(Bilateral)"], dur: "30", stop: "08:00", circ: ["Xia"], tech: ["Angie", "Moore"] },
      { time: "08:00", surgeon: "WALTERS, B", proc: ["Nasal Endoscopy", "(Bilateral)"], dur: "30", stop: "08:30", circ: ["Xia"], tech: ["Angie", "Moore"] },
      { time: "08:30", surgeon: "WALTERS, B", proc: ["Nasal Endoscopy", "(Bilateral)"], dur: "30", stop: "09:00", circ: ["Xia"], tech: ["Angie", "Moore"] },
    ];
    const first = readBoard(board(top, { title: ["WB - OR 0073 +1", "Total Cases: 9"] }));
    expect(first.cases).toHaveLength(7);
    expect(first.cases[0].room).toBeUndefined();
    expect(first.cases[5].procedure).toBe("Nasal Endoscopy (Bilateral)"); // two of them: both kept
    expect(first.cases[6].procedure).toBe("Nasal Endoscopy (Bilateral)");
    const gaps = boardGaps(first);
    expect(gaps[0]).toMatch(/lists 9 cases; 7 were read/);
    expect(gaps.some((g) => /OR 6 shows 5 cases; 3 read/.test(g))).toBe(true);
    expect(gaps.some((g) => /2 cases are above the first room heading/.test(g))).toBe(true);

    // Scrolled down: the first room's heading is now on screen, plus the rest.
    const rest: Item[] = [
      { bar: "0073-MOR-04 (2 cases)" },
      top[0], top[1],
      top[2], top[3], top[4],
      { bar: "0073-MOR-06 (5 cases)" },
      top[6], top[7], top[8],
      { time: "09:00", surgeon: "WALTERS, B", proc: ["Insertion Stimulator", "Upper Airway (Right)"], dur: "95", stop: "10:35", circ: ["Xia"], tech: ["Angie", "Moore"] },
      { time: "10:35", surgeon: "WALTERS, B", proc: ["Insertion Stimulator", "Upper Airway (Right)"], dur: "100", stop: "12:15", circ: ["Xia"], tech: ["Angie", "Moore"] },
    ];
    const second = readBoard(board(rest, { title: ["Total Cases: 9"] }));
    const both = mergeBoards([first, second]);
    expect(both.cases).toHaveLength(9);
    expect(both.cases.filter((c) => c.room === "OR 4").map((c) => c.time)).toEqual(["10:15", "13:55"]);
    expect(both.cases.filter((c) => c.room === "OR 6")).toHaveLength(5);
    expect(boardGaps(both)).toEqual([]);
    expect(both.date).toBeUndefined(); // no status bar: the review asks
    expect(both.plusDays).toBe(1);
  });

  it("reads OCR-mangled times and finds no board in random text", () => {
    expect(boardTime("O7:3O")).toBe("07:30");
    expect(boardTime("7.30")).toBe("07:30");
    expect(boardTime("0730")).toBe("07:30");
    expect(boardTime("Prereg")).toBeUndefined();
    expect(readBoard([{ text: "Sutures  2-0 Vicryl", x: 0.1, y: 0.1, w: 0.3, h: 0.02 }]).headerFound).toBe(false);
  });
});

describe("board names to staff", () => {
  const staff: StaffMember[] = [
    { id: "1", name: "Angie Burks", role: "tech" },
    { id: "2", name: "Tyra Moore", role: "tech" },
    { id: "3", name: "Areli Vargas", role: "trainee", level: 2 },
    { id: "4", name: "Lindsey Biss", role: "nurse" },
    { id: "5", name: "Julia Clarke", role: "nurse" },
    { id: "6", name: "Mark Jones", role: "tech" },
    { id: "7", name: "Mia Jones", role: "nurse" },
    { id: "8", name: "Sam Roberts", role: "nurse" },
    { id: "9", name: "Lee Fisher", role: "tech" },
  ];
  const one = (cell: string, col: "circulator" | "tech") => matchPeople(cell, staff, col).map((p) => (p.roleOnly ? `role:${p.text}` : p.matches.map((m) => m.name).join("|") || `?${p.text}`));

  it("matches a first or last name, preferring the column's role", () => {
    expect(one("Angie", "tech")).toEqual(["Angie Burks"]);
    expect(one("Moore", "tech")).toEqual(["Tyra Moore"]);
    expect(one("Vargas", "tech")).toEqual(["Areli Vargas"]);
    expect(one("Lindsey", "circulator")).toEqual(["Lindsey Biss"]);
    expect(one("roberts", "circulator")).toEqual(["Sam Roberts"]);
    expect(one("M Jones", "tech")).toEqual(["Mark Jones"]);
    expect(one("M Jones", "circulator")).toEqual(["Mia Jones"]);
    expect(one("Jones", "circulator")).toEqual(["Mia Jones"]);
  });
  it("roles, notes, two people on a line, and strangers", () => {
    expect(one("Uro Tech", "tech")).toEqual(["role:Uro Tech"]);
    const clarke = matchPeople("Clarke (appt 1330-EOD)", staff, "circulator");
    expect(clarke[0]).toMatchObject({ text: "Clarke", note: "(appt 1330-EOD)" });
    expect(clarke[0].matches.map((m) => m.name)).toEqual(["Julia Clarke"]);
    expect(one("Fisher Moore", "tech")).toEqual(["Lee Fisher", "Tyra Moore"]);
    expect(one("Garnica", "tech")).toEqual(["?Garnica"]);
    expect(splitPeople(["Clarke/roberts", "Angie / Moore", "x"])).toEqual(["Clarke", "roberts", "Angie", "Moore"]);
  });
});

describe("procedure text", () => {
  it("drops a bracket the photo lost the other half of", () => {
    const at = (text: string, x: number, y: number): OcrLine => ({ text, x, y, w: text.length * 0.006, h: 0.013 });
    const lines = [at("Start", 0.02, 0.1), at("Surgeon", 0.2, 0.1), at("Procedure(s)", 0.3, 0.1),
      at("09:30", 0.02, 0.14), at("AKULA, K", 0.2, 0.14), at("Circumcision", 0.3, 0.14), at("Laterality)", 0.3, 0.157),
      at("10:30", 0.02, 0.2), at("AKULA, K", 0.2, 0.2), at("Cystoscopy (Left", 0.3, 0.2)];
    expect(readBoard(lines).cases.map((c) => c.procedure)).toEqual(["Circumcision Laterality", "Cystoscopy Left"]);
  });
});
