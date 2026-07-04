import type { PunchCard } from "../types";

// Pure punch-card math, kept out of the store so it's easy to test.
// Rules:
//  - every purchased café drink earns one punch;
//  - a redeemed (free) drink does not itself earn a punch;
//  - every `goal` punches converts into one free-drink reward, carrying
//    any remainder onto the next card.

export interface PunchResult {
  punch: PunchCard;
  punchesEarned: number;
  newRewards: number;
}

// Counter redemption: the member shows a full card, the barista confirms
// with the staff PIN, and one free drink is claimed on the spot. No order is
// created and no punch is earned — the free drink never stamps itself.
export function redeemRewardAtCounter(punch: PunchCard): PunchCard | null {
  if (punch.rewards < 1) return null;
  return { ...punch, rewards: punch.rewards - 1, redeemed: punch.redeemed + 1 };
}

export function applyPunches(punch: PunchCard, drinksPurchased: number, redeeming: boolean): PunchResult {
  const p = { ...punch };
  let earned = drinksPurchased;
  if (redeeming && earned > 0) earned -= 1; // the free drink earns nothing

  if (redeeming) {
    p.rewards -= 1;
    p.redeemed += 1;
  }
  p.punches += earned;
  p.lifetimePunches += earned;

  let newRewards = 0;
  while (p.punches >= p.goal) {
    p.punches -= p.goal;
    p.rewards += 1;
    newRewards += 1;
  }
  return { punch: p, punchesEarned: earned, newRewards };
}
