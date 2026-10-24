import { describe, it, expect } from "vitest";
import { pruneEphemeral, localDay } from "./store";
import { buildSeed } from "./seed";
import type { AppState, CaseCart } from "../types";

function cart(id: string, date: string): CaseCart {
  return { id, cardId: "c1", date, pulls: {}, missing: [], createdAt: "", updatedAt: "" };
}

describe("end-of-day cleanup", () => {
  it("drops carts and one-day notes older than yesterday, keeps today and yesterday", () => {
    const today = localDay(0);
    const yesterday = localDay(-1);
    const s: AppState = {
      ...buildSeed(),
      carts: [cart("a", today), cart("b", yesterday), cart("c", localDay(-2)), cart("d", localDay(-9))],
      dayNotes: [
        { id: "n1", cardId: "c1", date: today, text: "x", createdAt: "" },
        { id: "n2", cardId: "c1", date: localDay(-3), text: "y", createdAt: "" },
      ],
    };
    const out = pruneEphemeral(s, today);
    expect(out.carts.map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect(out.dayNotes.map((n) => n.id)).toEqual(["n1"]);
  });

  it("computes yesterday across a month boundary with local date math", () => {
    const s: AppState = {
      ...buildSeed(),
      carts: [cart("keep", "2026-02-28"), cart("drop", "2026-02-27")],
      dayNotes: [],
    };
    const out = pruneEphemeral(s, "2026-03-01");
    expect(out.carts.map((c) => c.id)).toEqual(["keep"]);
  });

  it("returns the same state object when there is nothing to prune", () => {
    const today = localDay(0);
    const s: AppState = { ...buildSeed(), carts: [cart("a", today)], dayNotes: [] };
    expect(pruneEphemeral(s, today)).toBe(s);
  });
});
