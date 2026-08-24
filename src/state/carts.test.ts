import { describe, it, expect } from "vitest";
import { buildSeed } from "./seed";
import {
  buildMissingList,
  cartProgress,
  cartsOn,
  localDay,
  missingDayText,
  missingForDay,
  openMissing,
  totalItems,
} from "./store";
import type { CaseCart } from "../types";

const bareCart = (cardId: string, over: Partial<CaseCart> = {}): CaseCart => ({
  id: "cart-x",
  cardId,
  date: localDay(0),
  pulls: {},
  missing: [],
  createdAt: "2026-07-14T05:00:00.000Z",
  updatedAt: "2026-07-14T05:00:00.000Z",
  ...over,
});

describe("case carts", () => {
  it("seeds carts for today, including one done with an open missing item", () => {
    const s = buildSeed();
    const today = cartsOn(s, localDay(0));
    expect(today.length).toBeGreaterThanOrEqual(3);
    const done = today.filter((c) => c.donePulling);
    expect(done.length).toBeGreaterThanOrEqual(1);
    expect(done.some((c) => openMissing(c).length > 0)).toBe(true);
    // The same card is pulled as two separate carts (two cases, one procedure).
    const byCard = new Map<string, number>();
    for (const c of today) byCard.set(c.cardId, (byCard.get(c.cardId) ?? 0) + 1);
    expect(Math.max(...byCard.values())).toBeGreaterThanOrEqual(2);
  });

  it("tracks who pulled what, and progress counts only pulled items", () => {
    const s = buildSeed();
    const pulling = cartsOn(s, localDay(0)).find((c) => !c.donePulling && Object.keys(c.pulls).length > 0)!;
    const { pulled, total } = cartProgress(s, pulling);
    expect(pulled).toBe(Object.keys(pulling.pulls).length);
    const card = s.cards.find((c) => c.id === pulling.cardId)!;
    expect(total).toBe(totalItems(card));
    // Two different people pulled on the same cart.
    const pullers = new Set(Object.values(pulling.pulls).map((p) => p.by));
    expect(pullers.size).toBeGreaterThanOrEqual(2);
  });

  it("buildMissingList snapshots everything not pulled, by section", () => {
    const s = buildSeed();
    const card = s.cards[0];
    const firstItem = card.instruments[0];
    const cart = bareCart(card.id, { pulls: { [firstItem.id]: { by: "Marcus", at: "2026-07-14T06:00:00.000Z" } } });
    const missing = buildMissingList(card, cart);
    expect(missing.length).toBe(totalItems(card) - 1);
    expect(missing.every((m) => m.itemId !== firstItem.id)).toBe(true);
    expect(missing[0].sectionLabel).toBe("Instruments & trays");
    expect(missing[0].name).toBe(card.instruments[1].name);
  });

  it("re-finishing keeps comments entered for still-missing items", () => {
    const s = buildSeed();
    const card = s.cards[0];
    const target = card.sutures[0];
    const cart = bareCart(card.id, {
      missing: [
        { itemId: target.id, name: target.name, sectionLabel: "Sutures", comment: "On order — ETA tomorrow" },
      ],
    });
    const missing = buildMissingList(card, cart);
    expect(missing.find((m) => m.itemId === target.id)?.comment).toBe("On order — ETA tomorrow");
  });

  it("rolls up a day's open missing items for ops, as data and as text", () => {
    const s = buildSeed();
    const groups = missingForDay(s, localDay(0));
    expect(groups.length).toBeGreaterThanOrEqual(1);
    expect(groups[0].missing.every((m) => !m.resolvedAt)).toBe(true);
    const text = missingDayText(s, localDay(0));
    expect(text).toContain("MISSING ITEMS");
    expect(text).toContain("Tourniquet");
    expect(text).toContain("In SPD being prepared");
    // The resolved cement no longer appears.
    expect(text).not.toContain("Rep delivering with trays");
  });
});
