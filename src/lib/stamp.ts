// Barista stamping for counter purchases: the customer opens their punch
// card, the barista taps Stamp and enters the café's stamp PIN on the
// customer's phone. With the hosted backend this becomes a server-validated
// scan of the card's QR at the register; the PIN gate is the honest local
// version of the same control.

// Default barista PIN — documented in the README for the café owner.
// Server-side validation replaces this constant in production.
const DEFAULT_STAMP_PIN = "7391";

export const MAX_STAMPS_PER_VISIT = 6;

export function verifyStampPin(pin: string): boolean {
  return pin.trim() === DEFAULT_STAMP_PIN;
}

export function isValidStampCount(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= MAX_STAMPS_PER_VISIT;
}
