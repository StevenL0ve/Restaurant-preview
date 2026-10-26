import { SECTIONS, type CardEdit, type CardItem, type PrefCard, type SectionKey } from "../types";
import { userStamp } from "./user";

// Card edit history: every save records who changed what, as short lines
// ("Vicryl 0 → Vicryl 2-0", "Removed Raytec ×10"). The app shows all of it
// (up to HISTORY_CAP); the printed card shows only the last few saves.

export const HISTORY_CAP = 50;
export const PRINT_HISTORY = 5;
const MAX_LINES_PER_EDIT = 12;

const FIELDS: { key: keyof PrefCard; label: string }[] = [
  { key: "procedure", label: "Title" },
  { key: "specialty", label: "Specialty" },
  { key: "position", label: "Position" },
  { key: "prep", label: "Prep" },
  { key: "draping", label: "Draping" },
  { key: "specialConsiderations", label: "Special considerations" },
];

const sectionLabel = (k: SectionKey) => SECTIONS.find((s) => s.key === k)?.label.split(" ")[0] ?? k;
const clip = (v: unknown, n = 40) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
export const itemLabel = (it: Pick<CardItem, "name" | "qty">) => `${it.name}${(it.qty ?? 1) > 1 ? ` ×${it.qty}` : ""}`;

/** What changed between two versions of a card, as short human lines. */
export function diffCard(before: PrefCard, after: PrefCard, surgeonName?: (id: string) => string | undefined): string[] {
  const out: string[] = [];
  if (before.surgeonId !== after.surgeonId) {
    out.push(`Surgeon → ${surgeonName?.(after.surgeonId) ?? "changed"}`);
  }
  for (const { key, label } of FIELDS) {
    const a = String(before[key] ?? "").trim();
    const b = String(after[key] ?? "").trim();
    if (a === b) continue;
    if (!a) out.push(`${label}: ${clip(b)}`);
    else if (!b) out.push(`${label} cleared`);
    else out.push(`${label}: ${clip(a, 30)} → ${clip(b, 30)}`);
  }
  if ((before.notes ?? "").trim() !== (after.notes ?? "").trim()) out.push("Notes edited");
  if (before.mayoPhoto !== after.mayoPhoto || before.backTablePhoto !== after.backTablePhoto) out.push("Setup photos updated");

  type Where = { item: CardItem; section: SectionKey };
  const index = (c: PrefCard) => {
    const m = new Map<string, Where>();
    for (const s of SECTIONS) for (const item of c[s.key as SectionKey] ?? []) m.set(item.id, { item, section: s.key as SectionKey });
    return m;
  };
  const was = index(before);
  const now = index(after);
  for (const [id, n] of now) {
    const o = was.get(id);
    if (!o) { out.push(`Added ${itemLabel(n.item)} (${sectionLabel(n.section)})`); continue; }
    const a = o.item, b = n.item;
    if (a.name !== b.name) out.push(`${itemLabel(a)} → ${itemLabel(b)}`);
    else if ((a.qty ?? 1) !== (b.qty ?? 1)) out.push(`${a.name} ×${a.qty ?? 1} → ×${b.qty ?? 1}`);
    if ((a.detail ?? "") !== (b.detail ?? "")) out.push(`${b.name}: ${b.detail ? `detail “${clip(b.detail, 30)}”` : "detail removed"}`);
    if ((a.ref ?? "") !== (b.ref ?? "")) out.push(`${b.name}: REF ${b.ref || "removed"}`);
    if (!!a.hold !== !!b.hold) out.push(`${b.name}: ${b.hold ? "hold" : "no longer hold"}`);
    if (!!a.haveAvailable !== !!b.haveAvailable) out.push(`${b.name}: ${b.haveAvailable ? "have available" : "pulled"}`);
    if ((a.locationId ?? "") !== (b.locationId ?? "")) out.push(`${b.name}: location changed`);
    if (o.section !== n.section) out.push(`Moved ${b.name} to ${sectionLabel(n.section)}`);
  }
  for (const [id, o] of was) if (!now.has(id)) out.push(`Removed ${itemLabel(o.item)}`);

  if (out.length > MAX_LINES_PER_EDIT) {
    const extra = out.length - (MAX_LINES_PER_EDIT - 1);
    return [...out.slice(0, MAX_LINES_PER_EDIT - 1), `and ${extra} more changes`];
  }
  return out;
}

/** The card with one more edit on top of its history (newest first, capped). */
export function withEdit(card: PrefCard, edit: CardEdit): PrefCard {
  if (!edit.changes.length) return card;
  return { ...card, history: [edit, ...(card.history ?? [])].slice(0, HISTORY_CAP) };
}

/** "Oct 26 · Lee, S. (CST): Vicryl 0 → Vicryl 2-0; Removed Raytec ×10" */
export function editLine(e: CardEdit): string {
  const when = new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const who = e.by ? `${userStamp(e.by)}${e.role ? ` (${e.role})` : ""}` : "Someone";
  return `${when} · ${who}: ${e.changes.join("; ")}`;
}
