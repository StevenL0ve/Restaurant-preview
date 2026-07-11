import { describe, it, expect } from "vitest";
import { parseCsv, csvToBundle, CSV_TEMPLATE } from "./csvImport";
import { importBundle } from "./portable";
import { totalItems } from "../state/store";

const NOW = "2026-06-27T00:00:00.000Z";
const empty = { facilities: [], locations: [], surgeons: [], cards: [], loaners: [], cases: [], setups: {}, onCallPositions: [], onCallPeople: [], onCallShifts: [] };

describe("CSV import", () => {
  it("parses quoted fields, escaped quotes, and embedded commas", () => {
    const rows = parseCsv('a,b\n"x, y","he said ""hi"""\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"'],
    ]);
  });

  it("turns the template into a bundle with one card and grouped sections", () => {
    const bundle = csvToBundle(parseCsv(CSV_TEMPLATE), NOW);
    expect(bundle.cards).toHaveLength(1);
    const card = bundle.cards[0];
    expect(card.procedure).toBe("Laparoscopic Cholecystectomy");
    expect(card.instruments.length).toBe(2);
    expect(card.sutures.length).toBe(1);
    expect(card.equipment.length).toBe(1);
    // Card-level fields come from the first row of the group.
    expect(card.position).toContain("Supine");
  });

  it("creates facilities, surgeons, and locations and links items to them", () => {
    const bundle = csvToBundle(parseCsv(CSV_TEMPLATE), NOW);
    expect(bundle.facilities.map((f) => f.name)).toContain("Mercy General");
    expect(bundle.surgeons.map((s) => s.name)).toContain("Dr. Example");
    const card = bundle.cards[0];
    const item = card.instruments.find((i) => i.name === "Maryland dissector")!;
    const loc = bundle.locations.find((l) => l.id === item.locationId)!;
    expect(loc.area).toBe("Lap cart");
    expect(loc.spot).toBe("drawer 3");
  });

  it("imports the parsed bundle into a library", () => {
    const bundle = csvToBundle(parseCsv(CSV_TEMPLATE), NOW);
    const { state, added } = importBundle(empty, bundle);
    expect(added).toBe(1);
    expect(totalItems(state.cards[0])).toBe(5);
  });

  it("throws a friendly error when required columns are missing", () => {
    expect(() => csvToBundle([["foo", "bar"], ["1", "2"]], NOW)).toThrowError();
  });
});
