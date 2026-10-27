import type { ReliefSlot, RoomRelief } from "../types";

// Lunch and break relief for one room on one day: the tech's lunch relief,
// the nurse's (a different person), and the nurse's break. Pure helpers;
// the store keeps the records and the change log.

export type ReliefKey = "techLunch" | "nurseLunch" | "nurseBreak";
export type ReliefSlots = Partial<Record<ReliefKey, ReliefSlot>>;

export const RELIEF_SLOTS: { key: ReliefKey; label: string; short: string; who: "tech" | "nurse" }[] = [
  { key: "techLunch", label: "Tech lunch", short: "Tech lunch", who: "tech" },
  { key: "nurseLunch", label: "Nurse lunch", short: "RN lunch", who: "nurse" },
  { key: "nurseBreak", label: "Nurse break", short: "RN break", who: "nurse" },
];

const roomKey = (room: string) => room.trim().toLowerCase();

export function reliefFor(reliefs: RoomRelief[] | undefined, date: string, room: string): RoomRelief | undefined {
  return (reliefs ?? []).find((r) => r.date === date && roomKey(r.room) === roomKey(room));
}

function clean(slot?: ReliefSlot): ReliefSlot | undefined {
  const time = slot?.time?.trim() || undefined;
  const name = slot?.name?.trim() || undefined;
  return time || name ? { time, name } : undefined;
}

export function hasRelief(r?: Pick<RoomRelief, ReliefKey>): boolean {
  return !!r && RELIEF_SLOTS.some((s) => clean(r[s.key]));
}

/** "Tech lunch 11:30, relief Angie Burks" */
export function slotText(label: string, slot?: ReliefSlot): string | null {
  const s = clean(slot);
  if (!s) return null;
  return [label, s.time, s.name ? `relief ${s.name}` : null].filter(Boolean).join(" ").replace(/ relief/, ", relief");
}

export function reliefSummary(r?: Pick<RoomRelief, ReliefKey>): string {
  if (!r) return "";
  return RELIEF_SLOTS.map((s) => slotText(s.short, r[s.key])).filter(Boolean).join(" · ");
}

/** Set a room's relief for a day (all three slots at once, as the editor
 *  saves them). Blank everywhere removes the record. Returns the new list
 *  and a change-log line, or null when nothing changed. */
export function applyRelief(
  reliefs: RoomRelief[],
  date: string,
  room: string,
  slots: ReliefSlots,
  by: string | undefined,
  at: string,
  newId: () => string,
): { reliefs: RoomRelief[]; text: string } | null {
  const before = reliefFor(reliefs, date, room);
  const next = { techLunch: clean(slots.techLunch), nurseLunch: clean(slots.nurseLunch), nurseBreak: clean(slots.nurseBreak) };
  const same = RELIEF_SLOTS.every((s) => JSON.stringify(clean(before?.[s.key]) ?? null) === JSON.stringify(next[s.key] ?? null));
  if (same) return null;
  const rest = reliefs.filter((r) => r !== before);
  if (!hasRelief(next)) {
    return { reliefs: rest, text: `Relief: cleared for ${room}, ${date}` };
  }
  const record: RoomRelief = { id: before?.id ?? newId(), date, room: room.trim(), ...next, updatedAt: at, updatedBy: by };
  return { reliefs: [...rest, record], text: `Relief ${room.trim()}, ${date}: ${reliefSummary(record)}` };
}

/** Every relief of the day in time order, for the at-a-glance list. */
export function reliefTimeline(rows: { room: string; relief?: RoomRelief }[]): { room: string; label: string; time?: string; name?: string }[] {
  const out: { room: string; label: string; time?: string; name?: string }[] = [];
  for (const { room, relief } of rows) {
    for (const s of RELIEF_SLOTS) {
      const slot = clean(relief?.[s.key]);
      if (slot) out.push({ room, label: s.short, time: slot.time, name: slot.name });
    }
  }
  return out.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.room.localeCompare(b.room, undefined, { numeric: true }));
}
