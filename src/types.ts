// Core domain types for CGP — the Common Ground Projects app.
// Everything is plain, serializable data so the whole app state persists to
// localStorage and could sync to a hosted backend later without a rewrite.

export type ID = string;

// The five services under the Common Ground Projects roof.
export type Venue = "restaurant" | "cafe" | "yoga" | "zenden" | "massage";

export const VENUES: Record<Venue, { name: string; short: string; icon: string; blurb: string }> = {
  restaurant: { name: "The Kitchen", short: "Restaurant", icon: "🍽️", blurb: "Farm-to-table plates made from scratch." },
  cafe: { name: "Common Grounds Café", short: "Coffee Shop", icon: "☕️", blurb: "Small-batch coffee & fresh bakes. Earn a punch on every drink." },
  yoga: { name: "The Studio", short: "Yoga Studio", icon: "🧘", blurb: "Vinyasa, restorative & community flows." },
  zenden: { name: "The Zen Den", short: "Wellness Spa", icon: "🌿", blurb: "Saunas, soaks & facials to reset." },
  massage: { name: "Massage", short: "Massage", icon: "💆", blurb: "Therapeutic & relaxation bodywork." },
};

// ---- Menus & ordering (restaurant + café) ----

export interface MenuItem {
  id: ID;
  venue: "restaurant" | "cafe";
  category: string; // e.g. "Espresso", "Bowls", "Pastries"
  name: string;
  description: string;
  price: number;
  tags: string[]; // "vegan", "gf", "seasonal", "popular"
  earnsPunch: boolean; // café drinks earn a punch-card stamp
}

export interface CartLine {
  itemId: ID;
  qty: number;
}

export type OrderStatus = "received" | "preparing" | "ready" | "completed";
export type OrderMethod = "pickup" | "dine-in";

export interface OrderLine {
  name: string;
  price: number;
  qty: number;
  venue: Venue;
}

export interface Order {
  id: ID;
  createdAt: string; // ISO
  lines: OrderLine[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  method: OrderMethod;
  punchesEarned: number;
  usedReward: boolean; // a free drink was redeemed on this order
}

// ---- Coffee-shop punch card ----

export interface PunchCard {
  goal: number; // stamps needed for a free drink
  punches: number; // stamps toward the CURRENT card
  rewards: number; // free drinks ready to redeem
  lifetimePunches: number;
  redeemed: number; // free drinks claimed all-time
}

// ---- Bookable sessions (yoga classes, spa treatments, massage) ----

export interface SessionClass {
  id: ID;
  venue: "yoga" | "zenden" | "massage";
  name: string;
  instructor: string;
  description: string;
  start: string; // ISO datetime
  durationMin: number;
  capacity: number;
  booked: number; // spots already taken (demo)
  price: number;
  level?: string; // yoga level / spa focus
  requiresWaiver: boolean;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: ID;
  classId: ID;
  name: string;
  venue: Venue;
  instructor: string;
  start: string;
  durationMin: number;
  createdAt: string;
  status: BookingStatus;
}

// ---- Waivers ----
// A signed liability waiver, one required per venue that involves physical
// activity or bodywork (yoga, the Zen Den spa, massage).

export type WaiverVenue = "yoga" | "zenden" | "massage";

export interface Waiver {
  id: ID;
  venue: WaiverVenue;
  signedName: string;
  signedAt: string; // ISO
}

export interface AppState {
  menu: MenuItem[];
  classes: SessionClass[];
  cart: CartLine[];
  orders: Order[];
  bookings: Booking[];
  punch: PunchCard;
  waivers: Waiver[];
}
