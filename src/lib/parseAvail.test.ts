import { describe, expect, it } from "vitest";
import { parseCardText } from "./parseCard";

const items = (lines: string[], header = "SUPPLIES") => {
  const p = parseCardText(["PROCEDURE: Test", "SURGEON: Smith, John", header, ...lines].join("\n"));
  return Object.entries(p.sections).flatMap(([section, list]) => list.map((it) => ({ section, ...it })));
};

describe("(Avail) at the end of an item means hold", () => {
  it("reads every spelling as a hold and drops the word", () => {
    const got = items([
      "Kerrison rongeur (Avail)", "Bone wax (avail)", "Harmonic scalpel (Avail.)", "Cell saver (AVAIL)",
      "Fluoro (Available)", "Hemoclips ( Avail )", "Bipolar cord - Avail", "Stryker drill (Avail) REF 5400-50",
      "2 Lap sponges (Avail)", "Avail: Fogarty catheter",
    ]);
    for (const it of got) {
      expect(it.hold, it.name).toBe(true);
      expect(`${it.name} ${it.detail ?? ""}`).not.toMatch(/avail/i);
    }
    expect(got.map((i) => i.name)).toEqual(expect.arrayContaining(["Fluoro", "Hemoclips", "Bipolar cord", "Fogarty catheter"]));
    expect(got.find((i) => /stryker/i.test(i.name))?.ref).toBe("5400-50");
    expect(got.find((i) => /lap sponges/i.test(i.name))?.qty).toBe(2);
  });
  it("leaves other items alone", () => {
    const [it] = items(["Available blankets for warming"]);
    expect(it.hold).toBeUndefined();
  });
});

describe("items that start with a section word", () => {
  it("'Suture passer (PRN)' is an item, not a Sutures header", () => {
    const got = items(["Bone wax", "Suture passer (PRN)", "Lap sponges"]);
    expect(got.map((i) => i.name)).toContain("Suture passer");
    expect(got.find((i) => i.name === "Lap sponges")?.section).not.toBe("sutures");
  });
  it("'Suture scissors' stays an item; real headers still work", () => {
    const got = items(["Suture scissors", "SUTURES", "2-0 Vicryl", "Instrument trays", "Major tray"]);
    expect(got.find((i) => i.name === "Suture scissors")).toBeTruthy();
    expect(got.find((i) => /vicryl/i.test(i.name))?.section).toBe("sutures");
    expect(got.find((i) => /major tray/i.test(i.name))?.section).toBe("instruments");
    expect(got.find((i) => /instrument trays/i.test(i.name))).toBeUndefined();
  });
});
