import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState, CardItem, PrefCard, SectionKey, Surgeon } from "../types";
import { SECTIONS } from "../types";
import { buildSeed } from "./seed";

const STORAGE_KEY = "caseready.v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Merge over a fresh seed so keys added in later versions can't crash an
      // older saved state.
      return { ...buildSeed(), ...(JSON.parse(raw) as Partial<AppState>) } as AppState;
    }
  } catch {
    /* fall through to seed */
  }
  return buildSeed();
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const PALETTE = ["#4338ca", "#0e7490", "#b91c1c", "#15803d", "#b45309", "#7c3aed", "#be185d"];

/** A blank card ready to edit, owned by the given surgeon. */
export function emptyCard(surgeonId: string, specialty: string): PrefCard {
  return {
    id: uid("card"),
    surgeonId,
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
  // data ownership
  exportAll: () => void;
  importAll: (json: string) => void;
  resetDemo: () => void;
  wipeAll: () => void;
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

      exportAll: () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        triggerDownload(blob, "caseready-export.json");
      },

      importAll: (json) => {
        const parsed = JSON.parse(json) as Partial<AppState>;
        update((st) => ({
          surgeons: parsed.surgeons ?? st.surgeons,
          cards: parsed.cards ?? st.cards,
          setups: parsed.setups ?? {},
        }));
      },

      resetDemo: () => setState(buildSeed()),

      wipeAll: () => setState({ surgeons: [], cards: [], setups: {} }),
    };
  }, [state]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
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

/** Total checklist items on a card across all five sections. */
export function totalItems(card: PrefCard): number {
  return SECTIONS.reduce((sum, sec) => sum + card[sec.key as SectionKey].length, 0);
}

/** How many of a card's items are checked in the live setup. */
export function setupProgress(s: AppState, card: PrefCard): { done: number; total: number } {
  const total = totalItems(card);
  const done = s.setups[card.id]?.checked.length ?? 0;
  // Clamp in case items were deleted after being checked.
  return { done: Math.min(done, total), total };
}
