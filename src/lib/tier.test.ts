import { describe, it, expect, beforeEach } from "vitest";
import { BETA_UNLOCKED, FREE_CARD_LIMIT, gateNewCard, gateNewFacility, hasPro, grantProLocally } from "./tier";
import { buildSeed } from "../state/seed";
import type { AppState } from "../types";

function withCards(n: number): AppState {
  const s = buildSeed();
  const proto = s.cards[0];
  return { ...s, cards: Array.from({ length: n }, (_, i) => ({ ...proto, id: `c${i}` })) };
}

describe("pricing tiers", () => {
  beforeEach(() => localStorage.clear());

  it("beta keeps everything unlocked", () => {
    // This is the launch safety check: while in TestFlight, no gate may fire.
    expect(BETA_UNLOCKED).toBe(true);
    expect(hasPro()).toBe(true);
    expect(gateNewCard(withCards(FREE_CARD_LIMIT + 50)).allowed).toBe(true);
    expect(gateNewFacility(buildSeed()).allowed).toBe(true);
  });

  it("local entitlement scaffold persists", () => {
    grantProLocally();
    expect(localStorage.getItem("orsync.pro.v1")).toBe("1");
    expect(hasPro()).toBe(true);
  });
});
