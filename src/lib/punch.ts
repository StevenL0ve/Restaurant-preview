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
