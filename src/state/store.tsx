import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Outing, Wine } from "../types";
import { buildSeed } from "./seed";

const STORAGE_KEY = "mycellar.v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Backfill any keys added in newer versions so older saved state can't
      // crash the app.
      return { ...buildSeed(), ...(JSON.parse(raw) as Partial<AppState>) } as AppState;
    }
  } catch {
    /* fall through to seed */
  }
  return buildSeed();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Store {
  state: AppState;
  addWine: (w: Omit<Wine, "id" | "createdAt">) => string;
  updateWine: (id: string, patch: Partial<Wine>) => void;
  deleteWine: (id: string) => void;
  // Move a wishlist bottle into the rack ("I bought it").
  markPurchased: (id: string, price?: number | null) => void;
  addOuting: (o: Omit<Outing, "id">) => string;
  deleteOuting: (id: string) => void;
  exportAll: () => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const store = useMemo<Store>(() => {
    const update = (fn: (s: AppState) => AppState) => setState((s) => fn(s));

    return {
      state,

      addWine: (w) => {
        const id = uid("w");
        update((s) => ({
          ...s,
          wines: [{ ...w, id, createdAt: new Date().toISOString() }, ...s.wines],
        }));
        return id;
      },

      updateWine: (id, patch) =>
        update((s) => ({
          ...s,
          wines: s.wines.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),

      deleteWine: (id) =>
        update((s) => ({ ...s, wines: s.wines.filter((w) => w.id !== id) })),

      markPurchased: (id, price) =>
        update((s) => ({
          ...s,
          wines: s.wines.map((w) =>
            w.id === id
              ? { ...w, status: "rack", price: price ?? w.price }
              : w,
          ),
        })),

      addOuting: (o) => {
        const id = uid("o");
        update((s) => ({ ...s, outings: [{ ...o, id }, ...s.outings] }));
        return id;
      },

      deleteOuting: (id) =>
        update((s) => ({ ...s, outings: s.outings.filter((o) => o.id !== id) })),

      exportAll: () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        });
        triggerDownload(blob, "my-cellar-export.json");
      },

      resetDemo: () => setState(buildSeed()),

      clearAll: () => setState({ wines: [], outings: [] }),
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

// Derived selectors used across pages.
export function rackWines(s: AppState): Wine[] {
  return s.wines.filter((w) => w.status === "rack");
}

export function wishlistWines(s: AppState): Wine[] {
  return s.wines.filter((w) => w.status === "wishlist");
}

export function cellarValue(s: AppState): number {
  return rackWines(s).reduce((sum, w) => sum + (w.price ?? 0), 0);
}
