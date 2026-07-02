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
  CommunityEvent,
  MenuItem,
  Order,
  OrderMethod,
  SessionClass,
  Venue,
  WaiverVenue,
} from "../types";
import { buildSeed } from "./seed";
import { applyPunches } from "../lib/punch";
import { orderStatus } from "../lib/orders";
import { giftApplicable, isValidReload } from "../lib/gift";

const STORAGE_KEY = "cgp.v1";

function load(): AppState {
  const seed = buildSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppState>;
      // The user's data (cart, orders, bookings, punches, waivers) persists,
      // but the catalog (menu + class schedule) always comes fresh from the
      // seed so menu updates reach returning users.
      return { ...seed, ...saved, menu: seed.menu, classes: seed.classes } as AppState;
    }
  } catch {
    /* fall through to seed */
  }
  return seed;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface CheckoutResult {
  order: Order;
  punchesEarned: number;
  newRewards: number; // free drinks unlocked by this order
}

interface Store {
  state: AppState;
  // cart & ordering
  addToCart: (itemId: string, qty?: number) => void;
  setQty: (itemId: string, qty: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  placeOrder: (method: OrderMethod, useReward: boolean, useGift?: boolean) => CheckoutResult | null;
  // punch card
  redeemReward: () => void;
  // Barista counter stamp: N drinks bought at the till, no in-app order.
  stampPunches: (drinks: number) => { punchesEarned: number; newRewards: number };
  // community events
  addEvent: (e: Omit<CommunityEvent, "id">) => void;
  setEventAlerts: (on: boolean) => void;
  // gift card
  reloadGift: (amount: number) => void;
  // bookings
  bookClass: (classId: string) => void;
  cancelBooking: (id: string) => void;
  // waivers
  signWaiver: (venue: WaiverVenue, name: string) => void;
  // account / data
  resetDemo: () => void;
  clearData: () => void;
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

      addToCart: (itemId, qty = 1) =>
        update((s) => {
          const existing = s.cart.find((l) => l.itemId === itemId);
          const cart = existing
            ? s.cart.map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + qty } : l))
            : [...s.cart, { itemId, qty }];
          return { ...s, cart };
        }),

      setQty: (itemId, qty) =>
        update((s) => ({
          ...s,
          cart:
            qty <= 0
              ? s.cart.filter((l) => l.itemId !== itemId)
              : s.cart.map((l) => (l.itemId === itemId ? { ...l, qty } : l)),
        })),

      removeFromCart: (itemId) =>
        update((s) => ({ ...s, cart: s.cart.filter((l) => l.itemId !== itemId) })),

      clearCart: () => update((s) => ({ ...s, cart: [] })),

      placeOrder: (method, useReward, useGift = false) => {
        let result: CheckoutResult | null = null;
        update((s) => {
          if (s.cart.length === 0) return s;
          const lines = s.cart
            .map((l) => {
              const item = s.menu.find((m) => m.id === l.itemId);
              return item ? { item, qty: l.qty } : null;
            })
            .filter((x): x is { item: MenuItem; qty: number } => x !== null);
          if (lines.length === 0) return s;

          const subtotal = lines.reduce((sum, { item, qty }) => sum + item.price * qty, 0);

          // Redeeming a reward makes the single most expensive eligible café
          // drink free. It only applies if the user has a reward AND the cart
          // contains a punch-earning drink.
          const canRedeem =
            useReward &&
            s.punch.rewards > 0 &&
            lines.some(({ item }) => item.earnsPunch);
          const freeDrinkPrice = canRedeem
            ? Math.max(...lines.filter(({ item }) => item.earnsPunch).map(({ item }) => item.price))
            : 0;
          const afterReward = Math.max(0, subtotal - freeDrinkPrice);

          // Gift card covers as much of the remaining total as it can.
          const giftApplied = useGift ? giftApplicable(s.gift.balance, afterReward) : 0;
          const total = Math.round((afterReward - giftApplied) * 100) / 100;

          // Punches: one per café drink purchased. The free redeemed drink does
          // not itself earn a punch.
          const drinks = lines.reduce(
            (n, { item, qty }) => n + (item.earnsPunch ? qty : 0),
            0,
          );
          const { punch: p, punchesEarned, newRewards } = applyPunches(s.punch, drinks, canRedeem);

          const order: Order = {
            id: uid("o"),
            createdAt: new Date().toISOString(),
            lines: lines.map(({ item, qty }) => ({
              name: item.name,
              price: item.price,
              qty,
              venue: item.venue,
            })),
            subtotal,
            total,
            status: "received",
            method,
            punchesEarned,
            usedReward: canRedeem,
            giftApplied: giftApplied > 0 ? giftApplied : undefined,
          };

          const gift =
            giftApplied > 0
              ? {
                  ...s.gift,
                  balance: Math.round((s.gift.balance - giftApplied) * 100) / 100,
                  history: [
                    { id: uid("gt"), kind: "spend" as const, amount: giftApplied, at: order.createdAt, note: `Order #${order.id.slice(-4).toUpperCase()}` },
                    ...s.gift.history,
                  ],
                }
              : s.gift;

          result = { order, punchesEarned, newRewards };
          return { ...s, cart: [], orders: [order, ...s.orders], punch: p, gift };
        });
        return result;
      },

      addEvent: (e) =>
        update((s) => ({
          ...s,
          events: [...s.events, { ...e, id: uid("ev") }],
        })),

      setEventAlerts: (on) => update((s) => ({ ...s, eventAlerts: on })),

      reloadGift: (amount) =>
        update((s) =>
          isValidReload(amount)
            ? {
                ...s,
                gift: {
                  ...s.gift,
                  balance: Math.round((s.gift.balance + amount) * 100) / 100,
                  history: [
                    { id: uid("gt"), kind: "reload" as const, amount, at: new Date().toISOString() },
                    ...s.gift.history,
                  ],
                },
              }
            : s,
        ),

      redeemReward: () =>
        update((s) =>
          s.punch.rewards > 0
            ? { ...s, punch: { ...s.punch, rewards: s.punch.rewards - 1, redeemed: s.punch.redeemed + 1 } }
            : s,
        ),

      stampPunches: (drinks) => {
        let out = { punchesEarned: 0, newRewards: 0 };
        update((s) => {
          const { punch, punchesEarned, newRewards } = applyPunches(s.punch, drinks, false);
          out = { punchesEarned, newRewards };
          return { ...s, punch };
        });
        return out;
      },

      bookClass: (classId) =>
        update((s) => {
          const cls = s.classes.find((c) => c.id === classId);
          if (!cls) return s;
          if (s.bookings.some((b) => b.classId === classId && b.status === "confirmed")) return s;
          return {
            ...s,
            classes: s.classes.map((c) =>
              c.id === classId ? { ...c, booked: Math.min(c.capacity, c.booked + 1) } : c,
            ),
            bookings: [
              {
                id: uid("b"),
                classId,
                name: cls.name,
                venue: cls.venue,
                instructor: cls.instructor,
                start: cls.start,
                durationMin: cls.durationMin,
                createdAt: new Date().toISOString(),
                status: "confirmed" as const,
              },
              ...s.bookings,
            ],
          };
        }),

      cancelBooking: (id) =>
        update((s) => {
          const booking = s.bookings.find((b) => b.id === id);
          return {
            ...s,
            bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" as const } : b)),
            classes: booking
              ? s.classes.map((c) =>
                  c.id === booking.classId ? { ...c, booked: Math.max(0, c.booked - 1) } : c,
                )
              : s.classes,
          };
        }),

      signWaiver: (venue, name) =>
        update((s) => {
          const trimmed = name.trim();
          if (!trimmed) return s;
          const others = s.waivers.filter((w) => w.venue !== venue);
          return {
            ...s,
            waivers: [
              ...others,
              { id: uid("w"), venue, signedName: trimmed, signedAt: new Date().toISOString() },
            ],
          };
        }),

      resetDemo: () => setState(buildSeed()),

      clearData: () => {
        const fresh = buildSeed();
        setState({ ...fresh, punch: { goal: 10, punches: 0, rewards: 0, lifetimePunches: 0, redeemed: 0 } });
      },
    };
  }, [state]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ---- Derived selectors ----

export function cartCount(s: AppState): number {
  return s.cart.reduce((n, l) => n + l.qty, 0);
}

export function cartSubtotal(s: AppState): number {
  return s.cart.reduce((sum, l) => {
    const item = s.menu.find((m) => m.id === l.itemId);
    return item ? sum + item.price * l.qty : sum;
  }, 0);
}

export function hasWaiver(s: AppState, venue: Venue): boolean {
  return s.waivers.some((w) => w.venue === venue);
}

export function upcomingBookings(s: AppState): AppState["bookings"] {
  const now = Date.now();
  return s.bookings
    .filter((b) => b.status === "confirmed" && new Date(b.start).getTime() >= now - 3600_000)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function upcomingEvents(s: AppState): CommunityEvent[] {
  const now = Date.now();
  return s.events
    .filter((e) => new Date(e.start).getTime() >= now - 3600_000)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function activeOrders(s: AppState): Order[] {
  return s.orders.filter((o) => orderStatus(o) !== "completed");
}

// The classes a venue offers, upcoming first.
export function classesFor(s: AppState, venue: SessionClass["venue"]): SessionClass[] {
  return s.classes
    .filter((c) => c.venue === venue)
    .sort((a, b) => a.start.localeCompare(b.start));
}
