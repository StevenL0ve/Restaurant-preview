import type { CardItem, PrefCard, SectionKey } from "../types";
import { SECTIONS } from "../types";

// Combine preference cards for procedures running as one case (cysto +
// hernia, c-section + tubal). The interesting part is the overlap: both
// cards call for Raytec, blades, the same tray. We find every item that
// appears on more than one selected card, default its count to the
// multiplied total, and let the user step each one down ("two cases don't
// need two bovie pencils") before the combined card is created.

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Items match when the same section carries the same (case-blind) name. */
export function dupKey(section: SectionKey, name: string): string {
  return `${section}|${name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

export interface DupSource {
  procedure: string;
  qty: number;
  hold: boolean;
}

export interface DupGroup {
  key: string;
  section: SectionKey;
  name: string;
  details: string[]; // distinct details across the sources
  sources: DupSource[];
  /** The "stay multiplied" total: sum of every card's count. */
  combinedQty: number;
}

export interface CombinePlan {
  dups: DupGroup[];
  itemCount: number;
}

type Bucket = {
  section: SectionKey;
  name: string;
  details: string[];
  sources: DupSource[];
  holdAll: boolean;
  locationId?: string;
};

function collect(cards: PrefCard[], keepLocationsOf?: string): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();
  for (const card of cards) {
    const locOk = keepLocationsOf === undefined || card.facilityId === keepLocationsOf;
    for (const sec of SECTIONS) {
      for (const it of card[sec.key]) {
        const key = dupKey(sec.key, it.name);
        const qty = it.qty ?? 1;
        const b = buckets.get(key);
        if (!b) {
          buckets.set(key, {
            section: sec.key,
            name: it.name.trim(),
            details: it.detail ? [it.detail] : [],
            sources: [{ procedure: card.procedure, qty, hold: !!it.hold }],
            holdAll: !!it.hold,
            locationId: locOk ? it.locationId : undefined,
          });
        } else {
          b.sources.push({ procedure: card.procedure, qty, hold: !!it.hold });
          if (it.detail && !b.details.includes(it.detail)) b.details.push(it.detail);
          b.holdAll = b.holdAll && !!it.hold;
          if (!b.locationId && locOk && it.locationId) b.locationId = it.locationId;
        }
      }
    }
  }
  return buckets;
}

/** What overlaps across the selected cards, for the review step. */
export function planCombine(cards: PrefCard[]): CombinePlan {
  const buckets = collect(cards);
  const dups: DupGroup[] = [];
  let itemCount = 0;
  for (const [key, b] of buckets) {
    itemCount++;
    if (b.sources.length > 1) {
      dups.push({
        key,
        section: b.section,
        name: b.name,
        details: b.details,
        sources: b.sources,
        combinedQty: b.sources.reduce((n, s) => n + s.qty, 0),
      });
    }
  }
  dups.sort((a, b) => a.name.localeCompare(b.name));
  return { dups, itemCount };
}

/** Join distinct non-empty meta values ("Supine" + "Lithotomy" both matter). */
function joinMeta(cards: PrefCard[], pick: (c: PrefCard) => string | undefined): string {
  const seen: string[] = [];
  for (const c of cards) {
    const v = pick(c)?.trim();
    if (v && !seen.some((s) => s.toLowerCase() === v.toLowerCase())) seen.push(v);
  }
  return seen.join(" / ");
}

export interface BuildOptions {
  procedure: string;
  /** Final count per dup key; keys not present keep the multiplied total. */
  qtyOverrides: Record<string, number>;
  oneCase: boolean;
}

/** Build the combined card. Locations are kept only when they belong to the
 *  first card's facility (locations are facility-scoped). */
export function buildCombinedCard(cards: PrefCard[], opts: BuildOptions): PrefCard {
  const base = cards[0];
  const buckets = collect(cards, base.facilityId);

  const sections: Record<SectionKey, CardItem[]> = {
    instruments: [], sutures: [], supplies: [], medications: [], equipment: [],
  };
  for (const [key, b] of buckets) {
    const combined = b.sources.reduce((n, s) => n + s.qty, 0);
    const qty = Math.max(1, opts.qtyOverrides[key] ?? combined);
    sections[b.section].push({
      id: uid("it"),
      name: b.name,
      detail: b.details.length ? b.details.join(" · ") : undefined,
      qty: qty > 1 ? qty : undefined,
      hold: b.holdAll || undefined,
      locationId: b.locationId,
    });
  }

  const notes = [
    joinMeta(cards, (c) => c.notes),
    `Combined from: ${cards.map((c) => c.procedure).join(" + ")}.`,
  ].filter(Boolean).join("\n");

  return {
    id: uid("card"),
    surgeonId: base.surgeonId,
    facilityId: base.facilityId,
    procedure: opts.procedure.trim(),
    specialty: base.specialty,
    position: joinMeta(cards, (c) => c.position),
    prep: joinMeta(cards, (c) => c.prep),
    draping: joinMeta(cards, (c) => c.draping),
    notes,
    ...sections,
    favorite: false,
    oneCase: opts.oneCase || undefined,
    updatedAt: new Date().toISOString(),
  };
}
