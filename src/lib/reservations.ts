// Table reservations at By the Fig & the Olive.
// Real hours (figandtheolive.com): Tuesday–Saturday, 11am–3pm.
// Owners adjust these server-side once the hosted backend lands.

export const RESTAURANT_HOURS_TEXT = "Tue–Sat 11am–3pm";
const OPEN_DAYS = [2, 3, 4, 5, 6]; // Tue..Sat (JS getDay)
const OPEN_HOUR = 11;
const LAST_SEATING_HOUR = 14.5; // last table seated at 2:30pm
export const MAX_PARTY = 10;

export function isOpenOn(date: string): boolean {
  // Parse as local time (a bare YYYY-MM-DD would parse as UTC and can
  // shift the weekday).
  const d = new Date(`${date}T12:00:00`);
  return !Number.isNaN(d.getTime()) && OPEN_DAYS.includes(d.getDay());
}

// 30-minute seatings across service, e.g. ["11:00", "11:30", ..., "14:30"].
export function seatingTimes(date: string): string[] {
  if (!isOpenOn(date)) return [];
  const out: string[] = [];
  for (let t = OPEN_HOUR; t <= LAST_SEATING_HOUR; t += 0.5) {
    const h = Math.floor(t);
    out.push(`${String(h).padStart(2, "0")}:${t % 1 ? "30" : "00"}`);
  }
  return out;
}

export function formatSeating(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const am = h < 12;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

export function isValidParty(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= MAX_PARTY;
}
