// Audit stamps: who touched it and when, the way a paper chart reads it:
// last name, first initial. "Steven Nelson" signs as "Nelson, S."

/** "Steven Nelson" -> "Nelson, S."; "Nelson, Steven" -> "Nelson, S.";
 *  a single word stays as-is; empty stays empty. */
export function userStamp(fullName?: string): string {
  const t = (fullName ?? "").trim();
  if (!t) return "";
  if (t.includes(",")) {
    // Already "Last, First ..." — keep the last name, trim first to initial.
    const [last, rest] = t.split(",", 2).map((s) => s.trim());
    const first = rest?.split(/\s+/)[0] ?? "";
    return first ? `${last}, ${first[0].toUpperCase()}.` : last;
  }
  const parts = t.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${last}, ${parts[0][0].toUpperCase()}.`;
}

/** "Oct 24, 4:32 PM" (local), for showing next to a stamp. */
export function stampTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** The full display line: "Nelson, S. · Oct 24, 4:32 PM" (either half optional). */
export function stampLine(by?: string, at?: string): string {
  return [userStamp(by), stampTime(at)].filter(Boolean).join(" · ");
}
