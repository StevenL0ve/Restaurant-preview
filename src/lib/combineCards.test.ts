import { describe, it, expect } from "vitest";
import { planCombine, buildCombinedCard, dupKey } from "./combineCards";
import type { CardItem, PrefCard } from "../types";

let n = 0;
function item(name: string, over: Partial<CardItem> = {}): CardItem {
  return { id: `it-${n++}`, name, ...over };
}
function card(procedure: string, over: Partial<PrefCard> = {}): PrefCard {
  return {
    id: `card-${n++}`, surgeonId: "sg1", facilityId: "f1", procedure,
    specialty: "General Surgery", position: "", prep: "", draping: "", notes: "",
    instruments: [], sutures: [], supplies: [], medications: [], equipment: [],
    favorite: false, updatedAt: "2026-10-20T00:00:00Z", ...over,
  };
}

const cysto = card("Cystoscopy", {
  position: "Lithotomy",
  instruments: [item("Cystoscope")],
  supplies: [item("Raytec", { qty: 2 }), item("Lubricating jelly")],
  equipment: [item("Video tower")],
});
const hernia = card("Inguinal Hernia Repair", {
  position: "Supine",
  instruments: [item("Minor tray")],
  supplies: [item("raytec", { qty: 4 }), item("Mesh"), item("Blades", { detail: "#15", hold: true })],
  equipment: [item("Video tower", { hold: true })],
});

describe("combining preference cards", () => {
  it("finds overlapping items case-blind and sums the multiplied total", () => {
    const plan = planCombine([cysto, hernia]);
    const names = plan.dups.map((d) => d.name.toLowerCase());
    expect(names).toContain("raytec");
    expect(names).toContain("video tower");
    const raytec = plan.dups.find((d) => d.name.toLowerCase() === "raytec")!;
    expect(raytec.combinedQty).toBe(6); // 2 + 4
    expect(raytec.sources).toHaveLength(2);
    expect(plan.itemCount).toBe(7); // 9 items, 2 merged pairs
  });

  it("keeps the multiplied count by default and applies step-downs", () => {
    const combined = buildCombinedCard([cysto, hernia], {
      procedure: "Cysto + Hernia",
      qtyOverrides: { [dupKey("equipment", "Video tower")]: 1 },
      oneCase: false,
    });
    const raytec = combined.supplies.find((i) => i.name.toLowerCase() === "raytec")!;
    expect(raytec.qty).toBe(6); // stayed multiplied
    const tower = combined.equipment.find((i) => i.name === "Video tower")!;
    expect(tower.qty).toBeUndefined(); // stepped down to 1
    expect(combined.equipment).toHaveLength(1); // merged, not doubled
  });

  it("merges meta, keeps hold only when every source holds, and carries singles over", () => {
    const combined = buildCombinedCard([cysto, hernia], {
      procedure: "Cysto + Hernia", qtyOverrides: {}, oneCase: false,
    });
    expect(combined.position).toBe("Lithotomy / Supine");
    expect(combined.notes).toContain("Combined from: Cystoscopy + Inguinal Hernia Repair");
    const tower = combined.equipment.find((i) => i.name === "Video tower")!;
    expect(tower.hold).toBeUndefined(); // cysto wants it open
    const blades = combined.supplies.find((i) => i.name === "Blades")!;
    expect(blades.hold).toBe(true); // only source holds it
    expect(combined.supplies.map((i) => i.name)).toContain("Mesh");
    expect(combined.instruments).toHaveLength(2);
  });

  it("keeps same-name items with different details separate", () => {
    const a = card("A", { sutures: [item("Vicryl", { detail: "2-0", qty: 2 })] });
    const b = card("B", { sutures: [item("Vicryl", { detail: "0", qty: 3 })] });
    const plan = planCombine([a, b]);
    expect(plan.dups).toHaveLength(0); // different sizes are different items
    const combined = buildCombinedCard([a, b], { procedure: "A + B", qtyOverrides: {}, oneCase: false });
    expect(combined.sutures).toHaveLength(2);
    expect(combined.sutures.map((i) => i.detail).sort()).toEqual(["0", "2-0"]);
  });

  it("names each surgeon's procedure when combining across surgeons", () => {
    const a = card("Cysto", { surgeonId: "sg1", specialConsiderations: "No latex in the room" });
    const b = card("Hernia", { surgeonId: "sg2", specialConsiderations: "Count sheet to the desk" });
    const names: Record<string, string> = { sg1: "Dr. Patel", sg2: "Dr. Chen" };
    const combined = buildCombinedCard([a, b], {
      procedure: "Cysto + Hernia", qtyOverrides: {}, oneCase: false,
      surgeonNameOf: (id) => names[id],
    });
    expect(combined.notes).toContain("Cysto (Dr. Patel) + Hernia (Dr. Chen)");
    expect(combined.surgeonId).toBe("sg1"); // files under the first card's surgeon
    expect(combined.specialConsiderations).toBe("No latex in the room / Count sheet to the desk");
  });

  it("drops locations that belong to another facility and flags one-case combos", () => {
    const here = card("A", { facilityId: "f1", supplies: [item("Towels", { locationId: "loc-f1" })] });
    const there = card("B", { facilityId: "f2", supplies: [item("Gowns", { locationId: "loc-f2" })] });
    const combined = buildCombinedCard([here, there], { procedure: "A + B", qtyOverrides: {}, oneCase: true });
    expect(combined.supplies.find((i) => i.name === "Towels")!.locationId).toBe("loc-f1");
    expect(combined.supplies.find((i) => i.name === "Gowns")!.locationId).toBeUndefined();
    expect(combined.oneCase).toBe(true);
    expect(combined.facilityId).toBe("f1");
  });
});
