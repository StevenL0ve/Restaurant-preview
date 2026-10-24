import { describe, it, expect } from "vitest";
import { withQueuedCart, cartForCase } from "./store";
import { buildSeed } from "./seed";
import { parseRoomInput } from "../pages/TodayPage";
import type { AppState } from "../types";

describe("the board feeds the pull queue", () => {
  it("queues a cart for a card+day that has none", () => {
    const s: AppState = { ...buildSeed(), carts: [] };
    const out = withQueuedCart(s, "card-1", "2026-10-24");
    expect(out.carts).toHaveLength(1);
    expect(out.carts[0].cardId).toBe("card-1");
    expect(out.carts[0].date).toBe("2026-10-24");
    expect(cartForCase(out, "card-1", "2026-10-24")).toBe(out.carts[0]);
  });

  it("is a no-op (same reference) when a cart is already queued", () => {
    const s: AppState = { ...buildSeed(), carts: [] };
    const once = withQueuedCart(s, "card-1", "2026-10-24");
    expect(withQueuedCart(once, "card-1", "2026-10-24")).toBe(once);
    // A different day still queues its own cart.
    expect(withQueuedCart(once, "card-1", "2026-10-25").carts).toHaveLength(2);
  });
});

describe("room input parsing", () => {
  it("recognizes OR + number rooms and strips the prefix for the field", () => {
    expect(parseRoomInput("OR 4")).toEqual({ named: false, value: "4" });
    expect(parseRoomInput("or12")).toEqual({ named: false, value: "12" });
    expect(parseRoomInput("OR 7A")).toEqual({ named: false, value: "7A" });
  });

  it("treats everything else as a named room", () => {
    expect(parseRoomInput("Hybrid")).toEqual({ named: true, value: "Hybrid" });
    expect(parseRoomInput("Cysto 2")).toEqual({ named: true, value: "Cysto 2" });
    expect(parseRoomInput(undefined)).toEqual({ named: false, value: "" });
    expect(parseRoomInput("  ")).toEqual({ named: false, value: "" });
  });
});
