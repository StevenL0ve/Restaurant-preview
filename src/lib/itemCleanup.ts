import { SECTIONS, type PrefCard, type SectionKey } from "../types";

// Item clean-up: the same thing spelled different ways across a library
// ("Ray-tec 4x4", "Raytec 4x4", "raytec 4 x 4") or sharing a reference
// number. Groups are suggested for review; merging renames every item in
// the group to one standard name and can keep the familiar name beside it.

export interface ItemVariant {
  name: string;
  count: number; // how many card items use this exact name
  cards: number; // on how many cards
  refs: string[];
}

export interface DuplicateGroup {
  key: string; // stable id for dismissing
  variants: ItemVariant[]; // most used first
  reason: "spelling" | "ref";
  total: number;
}

/** Comparable form: lower case, no punctuation, "4 x 4" -> "4x4", plurals
 *  folded ("sponges" -> "sponge"). */
export function normalizeItem(name: string): string {
  return name
    .toLowerCase()
    .replace(/(\d)\s*[x×]\s*(\d)/g, "$1x$2")
    .replace(/[-_.,'"()/]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w))
    .join(" ");
}

const numbers = (s: string) => (s.match(/\d+/g) ?? []).join(",");
const refKey = (r: string) => r.toUpperCase().replace(/[^A-Z0-9]/g, "");

function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Same item, different spelling? Never when the numbers differ
 *  ("Vicryl 2-0" vs "Vicryl 3-0", "7.5 gloves" vs "8 gloves"). */
export function sameItem(a: string, b: string): boolean {
  const na = normalizeItem(a), nb = normalizeItem(b);
  if (na === nb) return true;
  if (numbers(na) !== numbers(nb)) return false;
  const squeezedA = na.replace(/\s/g, ""), squeezedB = nb.replace(/\s/g, "");
  if (squeezedA === squeezedB) return true;
  const longest = Math.max(squeezedA.length, squeezedB.length);
  if (longest < 5) return false;
  return 1 - distance(squeezedA, squeezedB) / longest >= 0.85;
}

/** Higher for names that look like a standard name: capitalized, no stray
 *  spaces or hyphens inside sizes. */
function tidy(name: string): number {
  return (/[A-Z]/.test(name) ? 2 : 0) + (name === name.toUpperCase() ? -1 : 0) + (/\d\s+x\s+\d/i.test(name) ? -1 : 0);
}

export function findDuplicates(cards: PrefCard[]): DuplicateGroup[] {
  const byName = new Map<string, { count: number; cards: Set<string>; refs: Set<string> }>();
  for (const c of cards) {
    for (const s of SECTIONS) {
      for (const it of c[s.key as SectionKey] ?? []) {
        const name = it.name.trim();
        if (!name) continue;
        const v = byName.get(name) ?? { count: 0, cards: new Set(), refs: new Set() };
        v.count++;
        v.cards.add(c.id);
        if (it.ref?.trim()) v.refs.add(it.ref.trim());
        byName.set(name, v);
      }
    }
  }
  const names = [...byName.keys()];
  const parent = names.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const reason = new Map<number, "spelling" | "ref">();
  const join = (i: number, j: number, why: "spelling" | "ref") => {
    const a = find(i), b = find(j);
    if (a === b) return;
    parent[b] = a;
    if (why === "spelling" || !reason.has(a)) reason.set(a, why);
  };
  // Shared reference numbers.
  const byRef = new Map<string, number>();
  names.forEach((n, i) => {
    for (const r of byName.get(n)!.refs) {
      const k = refKey(r);
      if (!k) continue;
      if (byRef.has(k)) join(byRef.get(k)!, i, "ref");
      else byRef.set(k, i);
    }
  });
  // Spelling variants.
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (sameItem(names[i], names[j])) join(i, j, "spelling");
    }
  }
  const groups = new Map<number, number[]>();
  names.forEach((_, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), i]);
  });
  const out: DuplicateGroup[] = [];
  for (const [root, members] of groups) {
    if (members.length < 2) continue;
    const variants = members
      .map((i) => {
        const v = byName.get(names[i])!;
        return { name: names[i], count: v.count, cards: v.cards.size, refs: [...v.refs] };
      })
      // Most used first; on a tie, properly capitalized and tidier names.
      .sort((a, b) => b.count - a.count || tidy(b.name) - tidy(a.name) || a.name.length - b.name.length);
    out.push({
      key: variants.map((v) => v.name.toLowerCase()).sort().join("|"),
      variants,
      reason: reason.get(root) ?? "spelling",
      total: variants.reduce((n, v) => n + v.count, 0),
    });
  }
  return out.sort((a, b) => b.total - a.total);
}

/** Rename every item named one of `variants` to `standard` on one card.
 *  Returns the card unchanged (same object) when nothing matched. */
export function mergeOnCard(card: PrefCard, variants: string[], standard: string, keepAlias: boolean, ref?: string): { card: PrefCard; changes: string[] } {
  const want = new Set(variants.map((v) => v.trim()));
  const changes: string[] = [];
  let touched = false;
  const next = { ...card };
  for (const s of SECTIONS) {
    const key = s.key as SectionKey;
    const items = card[key] ?? [];
    if (!items.some((it) => want.has(it.name.trim()) && (it.name.trim() !== standard || (ref && !it.ref)))) continue;
    touched = true;
    next[key] = items.map((it) => {
      if (!want.has(it.name.trim())) return it;
      const renamed = it.name.trim() !== standard;
      if (renamed) changes.push(`Clean-up: ${it.name} → ${standard}`);
      return {
        ...it,
        name: standard,
        ...(renamed && keepAlias ? { alias: it.alias ?? it.name } : {}),
        ...(ref && !it.ref ? { ref } : {}),
      };
    });
  }
  return touched ? { card: next, changes } : { card, changes };
}
