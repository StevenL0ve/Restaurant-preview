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
  CalEvent,
  Expense,
  JournalEntry,
  Message,
} from "../types";
import { buildSeed } from "./seed";
import { analyzeTone } from "../lib/tone";

const STORAGE_KEY = "coparently.v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
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
  // messaging
  sendMessage: (body: string) => void;
  markAllRead: () => void;
  saveDraft: (body: string) => void;
  clearDraft: () => void;
  // calendar
  addEvent: (e: Omit<CalEvent, "id">) => void;
  addEvents: (es: Omit<CalEvent, "id">[]) => void;
  respondToRequest: (id: string, accept: boolean) => void;
  deleteEvent: (id: string) => void;
  // expenses
  addExpense: (e: Omit<Expense, "id">) => void;
  addExpenses: (es: Omit<Expense, "id">[]) => void;
  setExpenseStatus: (id: string, status: Expense["status"]) => void;
  // journal
  addJournal: (e: Omit<JournalEntry, "id">) => void;
  deleteJournal: (id: string) => void;
  // account / data ownership
  exportAll: () => void;
  resetDemo: () => void;
  deleteAccount: () => void;
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

      sendMessage: (body) =>
        update((s) => {
          const tone = analyzeTone(body).level;
          const msg: Message = {
            id: uid("m"),
            fromId: s.meId,
            body: body.trim(),
            createdAt: new Date().toISOString(),
            readAt: null,
            tone,
            edited: false,
          };
          return { ...s, messages: [...s.messages, msg], draft: null };
        }),

      markAllRead: () =>
        update((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.fromId !== s.meId && !m.readAt
              ? { ...m, readAt: new Date().toISOString() }
              : m,
          ),
        })),

      saveDraft: (body) =>
        update((s) => ({
          ...s,
          draft: body.trim()
            ? { to: s.coParentId, body, updatedAt: new Date().toISOString() }
            : null,
        })),

      clearDraft: () => update((s) => ({ ...s, draft: null })),

      addEvent: (e) =>
        update((s) => ({ ...s, events: [...s.events, { ...e, id: uid("e") }] })),

      addEvents: (es) =>
        update((s) => ({
          ...s,
          events: [...s.events, ...es.map((e) => ({ ...e, id: uid("e") }))],
        })),

      respondToRequest: (id, accept) =>
        update((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === id
              ? { ...e, requestStatus: accept ? "accepted" : "declined" }
              : e,
          ),
        })),

      deleteEvent: (id) =>
        update((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) })),

      addExpense: (e) =>
        update((s) => ({
          ...s,
          expenses: [{ ...e, id: uid("x") }, ...s.expenses],
        })),

      addExpenses: (es) =>
        update((s) => ({
          ...s,
          expenses: [...es.map((e) => ({ ...e, id: uid("x") })), ...s.expenses],
        })),

      setExpenseStatus: (id, status) =>
        update((s) => ({
          ...s,
          expenses: s.expenses.map((x) => (x.id === id ? { ...x, status } : x)),
        })),

      addJournal: (e) =>
        update((s) => ({
          ...s,
          journal: [{ ...e, id: uid("j") }, ...s.journal],
        })),

      deleteJournal: (id) =>
        update((s) => ({
          ...s,
          journal: s.journal.filter((j) => j.id !== id),
        })),

      exportAll: () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        });
        triggerDownload(blob, "coparent-export.json");
      },

      resetDemo: () => setState(buildSeed()),

      deleteAccount: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState(buildSeed());
      },
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
export function unreadCount(s: AppState): number {
  return s.messages.filter((m) => m.fromId !== s.meId && !m.readAt).length;
}

export function pendingRequests(s: AppState): CalEvent[] {
  return s.events.filter((e) => e.requestStatus === "pending");
}

// Running balance: positive means the co-parent owes you.
export function expenseBalance(s: AppState): number {
  return s.expenses.reduce((bal, x) => {
    if (x.status === "settled") return bal;
    const otherOwes = x.amount * x.splitOtherShare;
    return x.paidById === s.meId ? bal + otherOwes : bal - otherOwes;
  }, 0);
}
