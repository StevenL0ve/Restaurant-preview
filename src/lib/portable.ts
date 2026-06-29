import type { AppState, Facility, Location, PrefCard, Surgeon } from "../types";
import { locationLabel } from "../types";

// A portable, self-contained bundle of one or more cards plus everything they
// reference (surgeons, facilities, locations). This is the reliable unit of
// *sharing*: a tech exports a card to a file, sends it to a colleague, and the
// colleague imports it as their own editable copy — and it's also how a
// facility can hand off its whole pre-built set as one file.
//
// Importing is a structural *merge*: facilities/surgeons/locations are matched
// to the importer's library by name (so they don't duplicate), and everything
// gets fresh ids so the copy is independent of the original.

export const BUNDLE_KIND = "orsync/card-bundle";

export interface CardBundle {
  kind: typeof BUNDLE_KIND;
  version: 1;
  exportedAt: string;
  facilities: Facility[];
  surgeons: Surgeon[];
  locations: Location[];
  cards: PrefCard[];
}

export function isCardBundle(x: unknown): x is CardBundle {
  return !!x && typeof x === "object" && (x as { kind?: string }).kind === BUNDLE_KIND;
}

/** Accept either a card bundle or a full library export and normalize to a
 *  bundle, so both "a card someone shared" and "my whole backup" can be
 *  imported (merged) through one path. Returns null if it has no cards. */
export function asBundle(parsed: unknown, exportedAt: string): CardBundle | null {
  if (isCardBundle(parsed)) return parsed;
  const p = parsed as Partial<AppState> | null;
  if (p && Array.isArray(p.cards) && p.cards.length) {
    return {
      kind: BUNDLE_KIND,
      version: 1,
      exportedAt,
      facilities: p.facilities ?? [],
      surgeons: p.surgeons ?? [],
      locations: p.locations ?? [],
      cards: p.cards,
    };
  }
  return null;
}

/** Build a shareable bundle from a set of card ids, pulling in only the
 *  surgeons, facilities, and locations those cards actually use. */
export function bundleCards(state: AppState, cardIds: string[], exportedAt: string): CardBundle {
  const cards = state.cards.filter((c) => cardIds.includes(c.id));
  const surgeonIds = new Set(cards.map((c) => c.surgeonId));
  const facilityIds = new Set(cards.map((c) => c.facilityId).filter(Boolean) as string[]);
  const locationIds = new Set<string>();
  for (const c of cards)
    for (const key of ["instruments", "sutures", "supplies", "medications", "equipment"] as const)
      for (const it of c[key]) if (it.locationId) locationIds.add(it.locationId);

  return {
    kind: BUNDLE_KIND,
    version: 1,
    exportedAt,
    facilities: state.facilities.filter((f) => facilityIds.has(f.id)),
    surgeons: state.surgeons.filter((s) => surgeonIds.has(s.id)),
    locations: state.locations.filter((l) => locationIds.has(l.id)),
    cards,
  };
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface ImportResult {
  state: AppState;
  added: number; // cards added
}

/** Merge a bundle into an existing library. Matches facilities/surgeons by name
 *  (case-insensitive) and locations by facility + label so nothing duplicates;
 *  remaps all ids so imported cards are independent, editable copies. */
export function importBundle(state: AppState, bundle: CardBundle): ImportResult {
  const facilities = [...state.facilities];
  const surgeons = [...state.surgeons];
  const locations = [...state.locations];

  const facMap = new Map<string, string>(); // bundle facilityId -> local id
  for (const f of bundle.facilities) {
    const existing = facilities.find((x) => x.name.trim().toLowerCase() === f.name.trim().toLowerCase());
    if (existing) facMap.set(f.id, existing.id);
    else {
      const nf = { id: uid("fac"), name: f.name };
      facilities.push(nf);
      facMap.set(f.id, nf.id);
    }
  }

  const sgMap = new Map<string, string>();
  for (const s of bundle.surgeons) {
    const existing = surgeons.find((x) => x.name.trim().toLowerCase() === s.name.trim().toLowerCase());
    if (existing) sgMap.set(s.id, existing.id);
    else {
      const ns = { ...s, id: uid("sg") };
      surgeons.push(ns);
      sgMap.set(s.id, ns.id);
    }
  }

  const locMap = new Map<string, string>();
  for (const l of bundle.locations) {
    const localFac = facMap.get(l.facilityId);
    if (!localFac) continue;
    const label = locationLabel(l).toLowerCase();
    const existing = locations.find((x) => x.facilityId === localFac && locationLabel(x).toLowerCase() === label);
    if (existing) locMap.set(l.id, existing.id);
    else {
      const nl = { id: uid("loc"), facilityId: localFac, area: l.area, spot: l.spot };
      locations.push(nl);
      locMap.set(l.id, nl.id);
    }
  }

  const remapItems = (arr: PrefCard["instruments"]) =>
    arr.map((it) => ({ ...it, id: uid("it"), locationId: it.locationId ? locMap.get(it.locationId) : undefined }));

  const newCards: PrefCard[] = bundle.cards.map((c) => ({
    ...c,
    id: uid("card"),
    surgeonId: sgMap.get(c.surgeonId) ?? c.surgeonId,
    facilityId: c.facilityId ? facMap.get(c.facilityId) : undefined,
    favorite: false,
    updatedAt: new Date().toISOString(),
    instruments: remapItems(c.instruments),
    sutures: remapItems(c.sutures),
    supplies: remapItems(c.supplies),
    medications: remapItems(c.medications),
    equipment: remapItems(c.equipment),
  }));

  return {
    state: {
      ...state,
      facilities,
      surgeons,
      locations,
      cards: [...newCards, ...state.cards],
    },
    added: newCards.length,
  };
}
