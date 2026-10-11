// CGP takes payment through Cash App today. Cash App payment links accept a
// prefilled amount (cash.app/$cashtag/12.50), so checkout can hand the
// customer a one-tap payment for their exact total. In Phase 2 this moves
// in-app via Stripe — which offers Cash App Pay as a method, so customers
// keep paying the way they already do.

export const CASH_APP_TAG = "$commongroundprojects";

export function cashAppUrl(amount?: number): string {
  const base = `https://cash.app/${CASH_APP_TAG}`;
  if (amount == null || amount <= 0) return base;
  return `${base}/${amount.toFixed(2)}`;
}
