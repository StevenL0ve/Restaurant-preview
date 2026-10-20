import { describe, it, expect } from "vitest";
import { applyQcFinish, buildMissingList, cartQcState } from "./store";
import type { CaseCart, PrefCard } from "../types";

function card(): PrefCard {
  return {
    id: "card-1", surgeonId: "sg1", procedure: "Lap Chole", specialty: "General Surgery",
    instruments: [{ id: "i1", name: "Lap chole tray" }, { id: "i2", name: "Maryland dissector" }],
    sutures: [], supplies: [{ id: "i3", name: "Raytec", qty: 2 }], medications: [], equipment: [],
    favorite: false, updatedAt: "2026-10-20T00:00:00Z",
  };
}

function cart(over: Partial<CaseCart> = {}): CaseCart {
  return {
    id: "cart-1", cardId: "card-1", date: "2026-10-20",
    pulls: {
      i1: { by: "Marcus", at: "2026-10-20T06:00:00Z" },
      i2: { by: "Marcus", at: "2026-10-20T06:01:00Z" },
      i3: { by: "Dana", at: "2026-10-20T06:02:00Z" },
    },
    donePulling: "2026-10-20T06:10:00Z", doneBy: "Marcus",
    missing: [], createdAt: "", updatedAt: "", ...over,
  };
}

const NOW = "2026-10-20T07:00:00Z";

describe("case cart quality control", () => {
  it("signs off cleanly when every pulled item is verified", () => {
    const c = cart({
      qc: {
        i1: { by: "Priya", at: NOW }, i2: { by: "Priya", at: NOW }, i3: { by: "Jo", at: NOW },
      },
    });
    const done = applyQcFinish(card(), c, "Priya", NOW);
    expect(done.qcDone).toBe(NOW);
    expect(done.qcBy).toBe("Priya");
    expect(Object.keys(done.pulls)).toHaveLength(3);
    expect(done.missing.filter((m) => !m.resolvedAt)).toHaveLength(0);
    expect(cartQcState(done)).toBe("qcd");
  });

  it("unpulls unverified items and sends them to the missing list with a QC note", () => {
    const c = cart({ qc: { i1: { by: "Priya", at: NOW }, i3: { by: "Priya", at: NOW } } });
    const done = applyQcFinish(card(), c, "Priya", NOW);
    expect(done.pulls.i2).toBeUndefined(); // marked pulled, never verified
    expect(done.pulls.i1).toBeDefined();
    const miss = done.missing.find((m) => m.itemId === "i2");
    expect(miss).toBeTruthy();
    expect(miss!.comment).toBe("Not found at QC");
  });

  it("keeps existing comments and turnover flags through a QC rebuild", () => {
    const c = cart({
      pulls: { i1: { by: "Marcus", at: NOW } }, // i2 and i3 were already missing
      qc: {},
      missing: buildMissingList(card(), cart({ pulls: { i1: { by: "Marcus", at: NOW } } })).map((m) =>
        m.itemId === "i3" ? { ...m, comment: "coming off room 2", turnoverFromCartId: "cart-9", qcCheckedAt: NOW, qcCheckedBy: "Jo" } : m,
      ),
    });
    const done = applyQcFinish(card(), c, "Jo", NOW);
    // i1 unverified -> unpulled with QC note; i3's turnover flag survives.
    expect(done.pulls.i1).toBeUndefined();
    expect(done.missing.find((m) => m.itemId === "i1")!.comment).toBe("Not found at QC");
    const i3 = done.missing.find((m) => m.itemId === "i3")!;
    expect(i3.turnoverFromCartId).toBe("cart-9");
    expect(i3.comment).toBe("coming off room 2");
    expect(i3.qcCheckedAt).toBe(NOW); // QC's "confirmed missing" stamp survives
    expect(i3.qcCheckedBy).toBe("Jo");
  });

  it("reports the cart's flow state for badges", () => {
    expect(cartQcState(cart({ donePulling: undefined }))).toBe("pulling");
    expect(cartQcState(cart())).toBe("needs-qc");
    expect(cartQcState(cart({ qcDone: NOW, qcBy: "Jo" }))).toBe("qcd");
  });
});
