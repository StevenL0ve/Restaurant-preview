import { describe, expect, it } from "vitest";
import { findDuplicates, mergeOnCard, normalizeItem, sameItem } from "./itemCleanup";
import type { PrefCard } from "../types";

const card = (id: string, supplies: { name: string; ref?: string }[], sutures: { name: string }[] = []): PrefCard =>
  ({ id, surgeonId: "s", procedure: id, specialty: "", position: "", prep: "", draping: "", notes: "",
     instruments: [], sutures: sutures.map((x, i) => ({ id: `${id}-u${i}`, ...x })), supplies: supplies.map((x, i) => ({ id: `${id}-p${i}`, ...x })),
     medications: [], equipment: [], updatedAt: "" }) as unknown as PrefCard;

describe("item clean-up", () => {
  it("treats spelling variants as the same item but never different sizes", () => {
    expect(normalizeItem("Ray-Tec 4 x 4 Sponges")).toBe("raytec 4x4 sponge");
    expect(sameItem("Ray-tec 4x4", "Raytec 4x4")).toBe(true);
    expect(sameItem("Lap sponges", "Lap sponge")).toBe(true);
    expect(sameItem("Kitner", "Kittner")).toBe(true);
    expect(sameItem("Vicryl 2-0", "Vicryl 3-0")).toBe(false);
    expect(sameItem("Vicryl 0", "Vicryl 2-0")).toBe(false);
    expect(sameItem("Bovie pencil", "Bovie pencil holster")).toBe(false);
  });

  it("groups variants across cards, most used first, and links shared REF numbers", () => {
    const groups = findDuplicates([
      card("a", [{ name: "Raytec 4x4" }, { name: "Mayo stand cover", ref: "89-8010" }]),
      card("b", [{ name: "Ray-tec 4x4" }, { name: "Mayo cover, large", ref: "898010" }], [{ name: "Vicryl 2-0" }]),
      card("c", [{ name: "Raytec 4x4" }], [{ name: "Vicryl 3-0" }]),
    ]);
    expect(groups.map((g) => [g.reason, g.variants.map((v) => `${v.name}:${v.count}`)])).toEqual([
      ["spelling", ["Raytec 4x4:2", "Ray-tec 4x4:1"]],
      ["ref", ["Mayo stand cover:1", "Mayo cover, large:1"]],
    ]);
  });

  it("renames to the standard name, keeping the familiar one beside it", () => {
    const c = card("b", [{ name: "Ray-tec 4x4" }, { name: "Towels" }]);
    const { card: out, changes } = mergeOnCard(c, ["Ray-tec 4x4", "Raytec 4x4"], "Raytec 4x4", true);
    expect(out.supplies.map((i) => [i.name, i.alias ?? null])).toEqual([["Raytec 4x4", "Ray-tec 4x4"], ["Towels", null]]);
    expect(changes).toEqual(["Clean-up: Ray-tec 4x4 → Raytec 4x4"]);
    expect(mergeOnCard(c, ["Gauze"], "Gauze", true).card).toBe(c);
  });
});
