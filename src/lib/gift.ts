// Pure gift-card math, kept out of the store so it's easy to test.

// How much of `total` the card can cover right now.
export function giftApplicable(balance: number, total: number): number {
  if (balance <= 0 || total <= 0) return 0;
  return Math.round(Math.min(balance, total) * 100) / 100;
}

// Valid reload amounts: positive, at most $500 a pop, whole cents.
export function isValidReload(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= 500 && Math.round(amount * 100) === amount * 100;
}
