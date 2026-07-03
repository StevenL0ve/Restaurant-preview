// Core domain types for CGP — the Common Ground Projects app.
// Everything is plain, serializable data so the whole app state persists to
// localStorage and could sync to a hosted backend later without a rewrite.

export type ID = string;

// The five services under the Common Ground Projects roof.
export type Venue = "restaurant" | "cafe" | "yoga" | "pilates" | "zenden" | "massage";

export const VENUES: Record<Venue, { name: string; short: string; icon: string; blurb: string; logo?: string; hours?: string }> = {
  restaurant: { name: "By the Fig & the Olive", short: "Restaurant", icon: "🍽️", blurb: "Mediterranean lunch from four self-taught chefs — mezze, shawarma & kabobs.", logo: "/brand/figolive-logo.jpeg", hours: "Tue–Sat 11am–3pm" },
  cafe: { name: "Common Grounds Café", short: "Coffee Shop", icon: "☕️", blurb: "Small-batch coffee & fresh bakes. Earn a punch on every drink.", hours: "Tue–Sun 7am–3pm · Fri & Sat 5–9pm" },
  yoga: { name: "River Rock Yoga", short: "Yoga", icon: "🧘", blurb: "25+ weekly classes — vinyasa, gentle flow, yin, PiYo & heated hatha.", logo: "/brand/riverrock-logo.png", hours: "Mon–Thu 8am–6pm · Fri 8–1:30 · Sat 8:30–12 · Sun 8–10" },
  pilates: { name: "Selah Pilates & Wellness", short: "Pilates", icon: "🤸", blurb: "Reformer, mat & private sessions — classical Pilates, small groups.", logo: "/brand/selah-logo.png", hours: "See class schedule" },
  zenden: { name: "The Zen Den", short: "Wellness Spa", icon: "🌿", blurb: "Nordic cycle spa — infrared sauna, hot & cold plunge, Himalayan salt room.", logo: "/brand/zenden-logo.png", hours: "By reservation" },
  massage: { name: "Massage", short: "Massage", icon: "💆", blurb: "Therapeutic & relaxation bodywork.", hours: "By appointment" },
};

// ---- Menus & ordering (restaurant + café) ----

export interface MenuItem {
  id: ID;
  venue: "restaurant" | "cafe";
  category: string; // e.g. "Signature", "Bowls", "Specials"
  name: string;
  description: string;
  price: number;
  tags: string[]; // "vegan", "gf", "seasonal", "popular"
  earnsPunch: boolean; // café drinks earn a punch-card stamp
  image?: string; // promo photo shown on the menu card
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
  giftApplied?: number; // paid from the gift card balance
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
  venue: "yoga" | "pilates" | "zenden" | "massage";
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
  image?: string; // photo shown on the booking card
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

export type WaiverVenue = "yoga" | "pilates" | "zenden" | "massage";

export interface Waiver {
  id: ID;
  venue: WaiverVenue;
  signedName: string;
  signedAt: string; // ISO
}

// ---- Community events ----
// What's happening across the venues. Posters are image paths (seeded events)
// or data URLs (user-uploaded posters).

export interface CommunityEvent {
  id: ID;
  title: string;
  venue: Venue;
  start: string; // ISO
  description: string;
  image?: string;
}

// ---- Reloadable gift card ----

export interface GiftTxn {
  id: ID;
  kind: "reload" | "spend";
  amount: number;
  at: string; // ISO
  note?: string;
}

export interface GiftCard {
  number: string;
  balance: number;
  history: GiftTxn[];
  redeemedCodes: string[]; // gift codes already claimed on this account
}

// ---- Table reservations (By the Fig & the Olive) ----

export interface Reservation {
  id: ID;
  date: string; // YYYY-MM-DD
  time: string; // "12:30"
  partySize: number;
  name: string;
  createdAt: string;
  status: "confirmed" | "cancelled";
}

export interface AppState {
  menu: MenuItem[];
  classes: SessionClass[];
  cart: CartLine[];
  orders: Order[];
  bookings: Booking[];
  punch: PunchCard;
  waivers: Waiver[];
  events: CommunityEvent[];
  gift: GiftCard;
  eventAlerts: boolean;
  reservations: Reservation[];
}
