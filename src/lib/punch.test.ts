import { describe, it, expect } from "vitest";
import { applyPunches } from "./punch";
import type { PunchCard } from "../types";

function card(over: Partial<PunchCard> = {}): PunchCard {
  return { goal: 10, punches: 0, rewards: 0, lifetimePunches: 0, redeemed: 0, ...over };
}

describe("applyPunches", () => {
  it("earns one punch per drink", () => {
    const r = applyPunches(card(), 3, false);
    expect(r.punchesEarned).toBe(3);
    expect(r.punch.punches).toBe(3);
    expect(r.punch.lifetimePunches).toBe(3);
    expect(r.newRewards).toBe(0);
  });

  it("converts a full card into a reward and carries the remainder", () => {
    const r = applyPunches(card({ punches: 8 }), 4, false);
    expect(r.newRewards).toBe(1);
    expect(r.punch.rewards).toBe(1);
    expect(r.punch.punches).toBe(2); // 8 + 4 - 10
  });

  it("can earn multiple rewards in one order", () => {
    const r = applyPunches(card(), 21, false);
    expect(r.newRewards).toBe(2);
    expect(r.punch.punches).toBe(1);
  });

  it("redeeming consumes a reward and the free drink earns no punch", () => {
    const r = applyPunches(card({ punches: 4, rewards: 1 }), 2, true);
    expect(r.punch.rewards).toBe(0);
    expect(r.punch.redeemed).toBe(1);
    expect(r.punchesEarned).toBe(1); // 2 drinks, one was free
    expect(r.punch.punches).toBe(5);
  });

  it("redeeming a single drink earns zero punches", () => {
    const r = applyPunches(card({ rewards: 1 }), 1, true);
    expect(r.punchesEarned).toBe(0);
    expect(r.punch.punches).toBe(0);
  });

  it("pastry-only orders earn nothing", () => {
    const r = applyPunches(card({ punches: 6 }), 0, false);
    expect(r.punchesEarned).toBe(0);
    expect(r.punch.punches).toBe(6);
  });
});
