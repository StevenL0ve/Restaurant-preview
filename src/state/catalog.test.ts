import { describe, it, expect } from "vitest";
import { applyCatalogUpdate } from "./store";
import { buildSeed } from "./seed";
import type { AppState, CatalogItem } from "../types";

const entry: CatalogItem = {
  id: "cat-1", name: "Polypropylene mesh 6x6", ref: "PRO-4521",
  updatedAt: "2026-10-20T00:00:00Z", updatedBy: "Steven Nelson",
};

function stateWith(): AppState {
  const s = buildSeed();
  const card = {
    ...s.cards[0],
    supplies: [
      { id: "s1", name: "mesh (old name)", ref: "OLD-1", catalogId: "cat-1" },
      { id: "s2", name: "Raytec", qty: 2 },
    ],
  };
  return { ...s, catalog: [entry], cards: [card, ...s.cards.slice(1)] };
}

describe("supply catalog updates flow into linked cards", () => {
  it("propagates a REF/name change to every linked item, stamped", () => {
    const out = applyCatalogUpdate(stateWith(), "cat-1", { ref: "PRO-9999" }, "2026-10-24T12:00:00Z", "Kim Park");
    const item = out.cards[0].supplies.find((i) => i.id === "s1")!;
    expect(item.ref).toBe("PRO-9999");
    expect(item.name).toBe("Polypropylene mesh 6x6"); // nomenclature wins
    expect(out.cards[0].updatedBy).toBe("Kim Park");
    // Unlinked items untouched.
    expect(out.cards[0].supplies.find((i) => i.id === "s2")!.ref).toBeUndefined();
    // Catalog entry itself is stamped.
    expect(out.catalog[0].ref).toBe("PRO-9999");
    expect(out.catalog[0].updatedBy).toBe("Kim Park");
  });

  it("leaves cards without a link untouched (same reference)", () => {
    const s = stateWith();
    const out = applyCatalogUpdate(s, "cat-1", { ref: "PRO-9999" }, "2026-10-24T12:00:00Z");
    expect(out.cards[1]).toBe(s.cards[1]);
  });

  it("is a no-op for an unknown catalog id", () => {
    const s = stateWith();
    expect(applyCatalogUpdate(s, "nope", { ref: "X" }, "2026-10-24T12:00:00Z")).toBe(s);
  });
});
