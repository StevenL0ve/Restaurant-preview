import { describe, expect, it } from "vitest";
import { diffCard, editLine, withEdit, HISTORY_CAP } from "./cardHistory";
import type { PrefCard } from "../types";

const base: PrefCard = {
  id: "c1", surgeonId: "s1", procedure: "Lap chole", specialty: "General Surgery",
  position: "Supine", prep: "ChloraPrep", draping: "", notes: "",
  instruments: [{ id: "i1", name: "Lap chole tray" }],
  sutures: [{ id: "u1", name: "Vicryl 0" }],
  supplies: [{ id: "p1", name: "Raytec", qty: 10 }],
  medications: [], equipment: [],
  updatedAt: "2026-10-01T00:00:00.000Z",
} as unknown as PrefCard;

describe("card edit history", () => {
  it("describes item and field changes in short lines", () => {
    const after: PrefCard = {
      ...base,
      position: "Supine, arms tucked",
      sutures: [{ id: "u1", name: "Vicryl 2-0" }],
      supplies: [{ id: "p1", name: "Raytec", qty: 20 }],
      equipment: [{ id: "e1", name: "Insufflator" }],
      instruments: [],
    };
    expect(diffCard(base, after)).toEqual([
      "Position: Supine → Supine, arms tucked",
      "Vicryl 0 → Vicryl 2-0",
      "Raytec ×10 → ×20",
      "Added Insufflator (Equipment)",
      "Removed Lap chole tray",
    ]);
  });

  it("notices an item moved between sections", () => {
    const after = { ...base, sutures: [], supplies: [...base.supplies, { id: "u1", name: "Vicryl 0" }] };
    expect(diffCard(base, after)).toEqual(["Moved Vicryl 0 to Supplies"]);
  });

  it("records nothing for a save with no changes", () => {
    expect(diffCard(base, { ...base })).toEqual([]);
    expect(withEdit(base, { at: "x", changes: [] })).toBe(base);
  });

  it("keeps the newest edits first, capped", () => {
    let c = base;
    for (let i = 0; i < HISTORY_CAP + 5; i++) c = withEdit(c, { at: `2026-10-0${(i % 9) + 1}T00:00:00Z`, changes: [`edit ${i}`] });
    expect(c.history).toHaveLength(HISTORY_CAP);
    expect(c.history![0].changes).toEqual([`edit ${HISTORY_CAP + 4}`]);
  });

  it("formats a one-line summary with who and when", () => {
    const line = editLine({ at: "2026-10-26T15:00:00Z", by: "Sarah Lee", role: "Surgical technologist", changes: ["Vicryl 0 → Vicryl 2-0", "Removed Raytec ×10"] });
    expect(line).toMatch(/Lee, S\. \(Surgical technologist\): Vicryl 0 → Vicryl 2-0; Removed Raytec ×10$/);
  });
});
