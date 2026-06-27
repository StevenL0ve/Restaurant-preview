import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  CardItem,
  Facility,
  Location,
  PrefCard,
  SectionKey,
  Surgeon,
} from "../types";
import { SECTIONS, locationLabel } from "../types";
import { buildSeed, splitLocation } from "./seed";
import { asBundle, bundleCards, importBundle } from "../lib/portable";
import { CSV_TEMPLATE, csvToBundle, parseCsv } from "../lib/csvImport";

const STORAGE_KEY = "caseready.v2";
const LEGACY_KEY = "caseready.v1"; // free-text item.location strings, no facilities

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...buildSeed(), ...(JSON.parse(raw) as Partial<AppState>) } as AppState;
    }
    // One-time migration from the pre-facility format.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return migrateLegacy(JSON.parse(legacy));
  } catch {
    /* fall through to seed */
  }
  return buildSeed();
}

// Old cards stored a plain `location` string per item and surgeons carried a
// facility name. Promote those into shared per-facility Location entities so the
// "edit once, updates everywhere" model applies retroactively.
function migrateLegacy(old: any): AppState {
  const facilities: Facility[] = [];
  const facByName = new Map<string, Facility>();
  for (const s of old.surgeons ?? []) {
    const name: string | undefined = s.facility?.trim();
    if (name && !facByName.has(name)) {
      const f = { id: uid("fac"), name };
      facilities.push(f);
      facByName.set(name, f);
    }
  }
  const locations: Location[] = [];
  const locByKey = new Map<string, Location>();
  const resolve = (facilityId: string | undefined, raw?: string): string | undefined => {
    if (!facilityId || !raw?.trim()) return undefined;
    const { area, spot } = splitLocation(raw);
    const label = spot ? `${area}, ${spot}` : area;
    const key = `${facilityId}::${label.toLowerCase()}`;
    let loc = locByKey.get(key);
    if (!loc) {
      loc = { id: uid("loc"), facilityId, area, spot };
      locations.push(loc);
      locByKey.set(key, loc);
    }
    return loc.id;
  };
  const cards: PrefCard[] = (old.cards ?? []).map((c: any) => {
    const surgeon = (old.surgeons ?? []).find((s: any) => s.id === c.surgeonId);
    const facilityId = surgeon?.facility ? facByName.get(surgeon.facility)?.id : undefined;
    const fix = (arr: any[] = []): CardItem[] =>
      arr.map(({ location, ...it }) => ({ ...it, locationId: resolve(facilityId, location) }));
    return {
      ...c,
      facilityId,
      instruments: fix(c.instruments),
      sutures: fix(c.sutures),
      supplies: fix(c.supplies),
      medications: fix(c.medications),
      equipment: fix(c.equipment),
    };
  });
  return { facilities, locations, surgeons: old.surgeons ?? [], cards, setups: old.setups ?? {} };
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const PALETTE = ["#4338ca", "#0e7490", "#b91c1c", "#15803d", "#b45309", "#7c3aed", "#be185d"];

/** A blank card ready to edit, owned by the given surgeon + facility. */
export function emptyCard(surgeonId: string, specialty: string, facilityId?: string): PrefCard {
  return {
    id: uid("card"),
    surgeonId,
    facilityId,
    procedure: "",
    specialty,
    position: "",
    prep: "",
    draping: "",
    notes: "",
    instruments: [],
    sutures: [],
    supplies: [],
    medications: [],
    equipment: [],
    favorite: false,
    updatedAt: new Date().toISOString(),
  };
}

export interface Store {
  state: AppState;
  // facilities & locations
  addFacility: (name: string) => Facility;
  updateFacility: (id: string, name: string) => void;
  deleteFacility: (id: string) => void;
  addLocation: (facilityId: string, area: string, spot?: string) => Location;
  updateLocation: (id: string, patch: Partial<Pick<Location, "area" | "spot">>) => void;
  deleteLocation: (id: string) => void;
  // surgeons
  addSurgeon: (s: Omit<Surgeon, "id" | "color" | "initials">) => Surgeon;
  updateSurgeon: (id: string, patch: Partial<Surgeon>) => void;
  deleteSurgeon: (id: string) => void;
  // cards
  saveCard: (card: PrefCard) => void;
  deleteCard: (id: string) => void;
  duplicateCard: (id: string) => PrefCard | null;
  toggleFavorite: (id: string) => void;
  // setup / pull-list mode
  toggleSetupItem: (cardId: string, itemId: string) => void;
  resetSetup: (cardId: string) => void;
  // sharing — portable card bundles
  exportCardFile: (cardId: string) => void;
  exportFacilityFile: (facilityId: string) => void;
  importCards: (json: string) => number; // merges; returns # cards added; throws if invalid
  importCsv: (text: string) => number; // bulk import from a spreadsheet; returns # added
  downloadCsvTemplate: () => void;
  copyCardToFacility: (cardId: string, facilityId: string) => PrefCard | null;
  // data ownership
  exportAll: () => void;
  importAll: (json: string) => void;
  resetDemo: () => void;
  wipeAll: () => void;
}

function slugName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "export";
}

const Ctx = createContext<Store | null>(null);

function initials(name: string): string {
  const parts = name.replace(/^dr\.?\s*/i, "").trim().split(/\s+/);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || name.slice(0, 2)).toUpperCase();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const store = useMemo<Store>(() => {
    const update = (fn: (s: AppState) => AppState) => setState((s) => fn(s));

    return {
      state,

      addFacility: (name) => {
        const f: Facility = { id: uid("fac"), name: name.trim() };
        update((st) => ({ ...st, facilities: [...st.facilities, f] }));
        return f;
      },

      updateFacility: (id, name) =>
        update((st) => ({
          ...st,
          facilities: st.facilities.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)),
        })),

      deleteFacility: (id) =>
        update((st) => {
          const locIds = new Set(st.locations.filter((l) => l.facilityId === id).map((l) => l.id));
          return {
            ...st,
            facilities: st.facilities.filter((f) => f.id !== id),
            locations: st.locations.filter((l) => l.facilityId !== id),
            cards: st.cards.map((c) =>
              c.facilityId === id ? { ...c, facilityId: undefined, ...clearItemLocations(c, locIds) } : c,
            ),
          };
        }),

      addLocation: (facilityId, area, spot) => {
        const loc: Location = { id: uid("loc"), facilityId, area: area.trim(), spot: spot?.trim() || undefined };
        update((st) => ({ ...st, locations: [...st.locations, loc] }));
        return loc;
      },

      // Editing in one place updates every card that references this location.
      updateLocation: (id, patch) =>
        update((st) => ({
          ...st,
          locations: st.locations.map((l) =>
            l.id === id
              ? { ...l, ...patch, spot: (patch.spot ?? l.spot)?.trim() || undefined, area: (patch.area ?? l.area).trim() }
              : l,
          ),
        })),

      deleteLocation: (id) =>
        update((st) => ({
          ...st,
          locations: st.locations.filter((l) => l.id !== id),
          cards: st.cards.map((c) => clearItemLocationsFull(c, new Set([id]))),
        })),

      addSurgeon: (s) => {
        const surgeon: Surgeon = {
          ...s,
          id: uid("sg"),
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          initials: initials(s.name),
        };
        update((st) => ({ ...st, surgeons: [...st.surgeons, surgeon] }));
        return surgeon;
      },

      updateSurgeon: (id, patch) =>
        update((st) => ({
          ...st,
          surgeons: st.surgeons.map((s) =>
            s.id === id
              ? { ...s, ...patch, initials: patch.name ? initials(patch.name) : s.initials }
              : s,
          ),
        })),

      deleteSurgeon: (id) =>
        update((st) => ({
          ...st,
          surgeons: st.surgeons.filter((s) => s.id !== id),
          cards: st.cards.filter((c) => c.surgeonId !== id),
        })),

      saveCard: (card) =>
        update((st) => {
          const stamped = { ...card, updatedAt: new Date().toISOString() };
          const exists = st.cards.some((c) => c.id === card.id);
          return {
            ...st,
            cards: exists
              ? st.cards.map((c) => (c.id === card.id ? stamped : c))
              : [stamped, ...st.cards],
          };
        }),

      deleteCard: (id) =>
        update((st) => {
          const setups = { ...st.setups };
          delete setups[id];
          return { ...st, cards: st.cards.filter((c) => c.id !== id), setups };
        }),

      duplicateCard: (id) => {
        const src = state.cards.find((c) => c.id === id);
        if (!src) return null;
        const reId = (arr: CardItem[]) => arr.map((it) => ({ ...it, id: uid("it") }));
        const copy: PrefCard = {
          ...src,
          id: uid("card"),
          procedure: `${src.procedure} (copy)`,
          favorite: false,
          updatedAt: new Date().toISOString(),
          instruments: reId(src.instruments),
          sutures: reId(src.sutures),
          supplies: reId(src.supplies),
          medications: reId(src.medications),
          equipment: reId(src.equipment),
        };
        update((st) => ({ ...st, cards: [copy, ...st.cards] }));
        return copy;
      },

      toggleFavorite: (id) =>
        update((st) => ({
          ...st,
          cards: st.cards.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)),
        })),

      toggleSetupItem: (cardId, itemId) =>
        update((st) => {
          const cur = st.setups[cardId] ?? { checked: [], startedAt: new Date().toISOString() };
          const checked = cur.checked.includes(itemId)
            ? cur.checked.filter((x) => x !== itemId)
            : [...cur.checked, itemId];
          return { ...st, setups: { ...st.setups, [cardId]: { ...cur, checked } } };
        }),

      resetSetup: (cardId) =>
        update((st) => {
          const setups = { ...st.setups };
          delete setups[cardId];
          return { ...st, setups };
        }),

      exportCardFile: (cardId) => {
        const card = state.cards.find((c) => c.id === cardId);
        const bundle = bundleCards(state, [cardId], new Date().toISOString());
        triggerDownload(
          new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
          `${slugName(card?.procedure ?? "card")}.caseready.json`,
        );
      },

      exportFacilityFile: (facilityId) => {
        const ids = state.cards.filter((c) => c.facilityId === facilityId).map((c) => c.id);
        const fac = state.facilities.find((f) => f.id === facilityId);
        const bundle = bundleCards(state, ids, new Date().toISOString());
        triggerDownload(
          new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
          `${slugName(fac?.name ?? "facility")}-cards.caseready.json`,
        );
      },

      importCards: (json) => {
        const bundle = asBundle(JSON.parse(json), new Date().toISOString());
        if (!bundle || !bundle.cards.length) throw new Error("No cards found in that file.");
        const { state: next, added } = importBundle(state, bundle);
        setState(next);
        return added;
      },

      importCsv: (text) => {
        const bundle = csvToBundle(parseCsv(text), new Date().toISOString());
        const { state: next, added } = importBundle(state, bundle);
        setState(next);
        return added;
      },

      downloadCsvTemplate: () =>
        triggerDownload(new Blob([CSV_TEMPLATE], { type: "text/csv" }), "caseready-import-template.csv"),

      // Transfer a card to another facility: clone it and remap each item's
      // location to the target facility's set, matching by name (creating any
      // that don't exist there yet). The surgeon's setup carries over intact.
      copyCardToFacility: (cardId, facilityId) => {
        const src = state.cards.find((c) => c.id === cardId);
        if (!src) return null;
        const { card, newLocations } = produceFacilityCopy(state, src, facilityId);
        setState((st) => ({ ...st, locations: [...st.locations, ...newLocations], cards: [card, ...st.cards] }));
        return card;
      },

      exportAll: () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        triggerDownload(blob, "caseready-export.json");
      },

      importAll: (json) => {
        const parsed = JSON.parse(json) as Partial<AppState>;
        update((st) => ({
          facilities: parsed.facilities ?? st.facilities,
          locations: parsed.locations ?? st.locations,
          surgeons: parsed.surgeons ?? st.surgeons,
          cards: parsed.cards ?? st.cards,
          setups: parsed.setups ?? {},
        }));
      },

      resetDemo: () => setState(buildSeed()),

      wipeAll: () => setState({ facilities: [], locations: [], surgeons: [], cards: [], setups: {} }),
    };
  }, [state]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

// Null out item locations whose location id is being removed (returns the
// section arrays to spread onto a card).
function clearItemLocations(card: PrefCard, locIds: Set<string>) {
  const fix = (arr: CardItem[]) =>
    arr.map((it) => (it.locationId && locIds.has(it.locationId) ? { ...it, locationId: undefined } : it));
  return {
    instruments: fix(card.instruments),
    sutures: fix(card.sutures),
    supplies: fix(card.supplies),
    medications: fix(card.medications),
    equipment: fix(card.equipment),
  };
}
function clearItemLocationsFull(card: PrefCard, locIds: Set<string>): PrefCard {
  return { ...card, ...clearItemLocations(card, locIds) };
}

// Clone a card into another facility, carrying its item locations over by name
// (creating any the target facility lacks). Returns the new card plus only the
// locations that need to be added to state.
function produceFacilityCopy(
  state: AppState,
  src: PrefCard,
  facilityId: string,
): { card: PrefCard; newLocations: Location[] } {
  const newLocations: Location[] = [];
  const findOrCreate = (srcLocId?: string): string | undefined => {
    if (!srcLocId) return undefined;
    const sloc = state.locations.find((l) => l.id === srcLocId);
    if (!sloc) return undefined;
    const label = locationLabel(sloc).toLowerCase();
    const match =
      state.locations.find((l) => l.facilityId === facilityId && locationLabel(l).toLowerCase() === label) ??
      newLocations.find((l) => locationLabel(l).toLowerCase() === label);
    if (match) return match.id;
    const nl: Location = { id: uid("loc"), facilityId, area: sloc.area, spot: sloc.spot };
    newLocations.push(nl);
    return nl.id;
  };
  const remap = (arr: CardItem[]) =>
    arr.map((it) => ({ ...it, id: uid("it"), locationId: findOrCreate(it.locationId) }));
  const card: PrefCard = {
    ...src,
    id: uid("card"),
    facilityId,
    favorite: false,
    updatedAt: new Date().toISOString(),
    instruments: remap(src.instruments),
    sutures: remap(src.sutures),
    supplies: remap(src.supplies),
    medications: remap(src.medications),
    equipment: remap(src.equipment),
  };
  return { card, newLocations };
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ---- Derived selectors -----------------------------------------------------

export function surgeonOf(s: AppState, id: string): Surgeon | undefined {
  return s.surgeons.find((x) => x.id === id);
}

export function cardsForSurgeon(s: AppState, surgeonId: string): PrefCard[] {
  return s.cards.filter((c) => c.surgeonId === surgeonId);
}

export function facilityOf(s: AppState, id?: string): Facility | undefined {
  return id ? s.facilities.find((f) => f.id === id) : undefined;
}

export function locationOf(s: AppState, id?: string): Location | undefined {
  return id ? s.locations.find((l) => l.id === id) : undefined;
}

/** Display label for an item's location id, or undefined if unset/unknown. */
export function locationLabelOf(s: AppState, id?: string): string | undefined {
  const loc = locationOf(s, id);
  return loc ? locationLabel(loc) : undefined;
}

export function locationsForFacility(s: AppState, facilityId?: string): Location[] {
  if (!facilityId) return [];
  return s.locations
    .filter((l) => l.facilityId === facilityId)
    .sort((a, b) => locationLabel(a).localeCompare(locationLabel(b)));
}

/** Distinct area names within a facility, for the "area" datalist when adding. */
export function areasForFacility(s: AppState, facilityId?: string): string[] {
  return Array.from(new Set(locationsForFacility(s, facilityId).map((l) => l.area))).sort();
}

export function locationsCount(s: AppState, facilityId: string): number {
  return s.locations.filter((l) => l.facilityId === facilityId).length;
}

/** Total checklist items on a card across all five sections. */
export function totalItems(card: PrefCard): number {
  return SECTIONS.reduce((sum, sec) => sum + card[sec.key as SectionKey].length, 0);
}

/** How many of a card's items are checked in the live setup. */
export function setupProgress(s: AppState, card: PrefCard): { done: number; total: number } {
  const total = totalItems(card);
  const done = s.setups[card.id]?.checked.length ?? 0;
  return { done: Math.min(done, total), total };
}

export interface SetupRow {
  item: CardItem;
  sectionLabel: string;
  sectionIcon: string;
}
export interface AreaGroup {
  area: string; // "Lap cart", or "" for items with no location set
  rows: SetupRow[];
}

/** Flatten a card's items across sections and group them by location area, so
 *  the pull-list lets you grab everything in one spot at once. Areas are
 *  alphabetical; items with no location land in a trailing "No location" group. */
export function groupByArea(s: AppState, card: PrefCard): AreaGroup[] {
  const byArea = new Map<string, SetupRow[]>();
  for (const sec of SECTIONS) {
    for (const item of card[sec.key as SectionKey]) {
      const loc = locationOf(s, item.locationId);
      const area = loc?.area ?? "";
      const rows = byArea.get(area) ?? [];
      rows.push({ item, sectionLabel: sec.label, sectionIcon: sec.icon });
      byArea.set(area, rows);
    }
  }
  const named = [...byArea.entries()].filter(([a]) => a).sort((a, b) => a[0].localeCompare(b[0]));
  const unplaced = byArea.get("");
  const groups: AreaGroup[] = named.map(([area, rows]) => ({ area, rows }));
  if (unplaced?.length) groups.push({ area: "", rows: unplaced });
  return groups;
}
