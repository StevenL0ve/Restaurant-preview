// Shareable gift-card codes: buy a gift in the app, text the code to someone,
// they paste it into their CGP app and the balance lands on their card.
//
// The demo validates codes offline: the amount is embedded alongside a
// checksum, and each account keeps a redeemed-codes list so a code can't be
// claimed twice on the same account. In production the code becomes an opaque
// token the server issues on purchase and burns on redemption — the UI flow
// stays identical.

const SECRET = "common-ground-2026";

function hash(text: string): string {
  let h = 5381;
  for (const ch of text) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h.toString(36).toUpperCase().padStart(7, "0").slice(-7);
}

function randomChunk(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

// e.g. "CGPG-25-K3F9-A1B2C3D" ($25 gift)
export function makeGiftCode(amount: number): string | null {
  if (!Number.isInteger(amount) || amount < 5 || amount > 500) return null;
  const nonce = randomChunk();
  const sig = hash(`${SECRET}:${amount}:${nonce}`);
  return `CGPG-${amount}-${nonce}-${sig}`;
}

// Returns the gift amount for a valid code, or null.
export function parseGiftCode(code: string): number | null {
  const m = code.trim().toUpperCase().match(/^CGPG-(\d{1,3})-([A-Z0-9]{4})-([A-Z0-9]{7})$/);
  if (!m) return null;
  const amount = Number(m[1]);
  if (hash(`${SECRET}:${amount}:${m[2]}`) !== m[3]) return null;
  return amount;
}
