// Core domain types for ORSync.
//
// ORSync is a *personal* surgical preference-card library. Everything is
// plain, serializable data so it lives in localStorage, exports to JSON, and
// works fully offline — no hospital account, no admin approval, no server.
// (That last part is the whole point: the App Store reviews of the app this
// replaces are full of techs furious that they couldn't just use it for
// themselves.)

export type ID = string;

/** A hospital / surgery center. Locations are scoped to a facility, so the same
 *  surgeon at two sites keeps two independent location sets — exactly what a
 *  traveling tech needs. */
export interface Facility {
  id: ID;
  name: string; // "Mercy General"
}

/** A storage location within a facility, split into a coarse `area` (the
 *  grouping key — "Lap cart", "Sterile store room") and a finer `spot`
 *  ("drawer 2", "cabinet 7, shelf 3"). Items reference a location by id, so
 *  editing it here updates every card that points at it. */
export interface Location {
  id: ID;
  facilityId: ID;
  area: string;
  spot?: string;
}

/** Joined display string for a location ("Lap cart, drawer 2"). */
export function locationLabel(loc: Pick<Location, "area" | "spot">): string {
  return loc.spot ? `${loc.area}, ${loc.spot}` : loc.area;
}

/** A surgeon you scrub or circulate for. */
export interface Surgeon {
  id: ID;
  name: string; // "Dr. Alvarez"
  specialty: string; // "General Surgery"
  facility?: string; // "Mercy General" — same surgeon can differ by site
  gloveSize?: string; // "7.0" — techs need this constantly
  gloveType?: string; // "Biogel, latex-free"
  quirks?: string; // music, temperament, "no chatter on closing", room temp…
  color: string; // avatar color
  initials: string;
}

/** A single line on a card: an instrument, suture, supply, med, or piece of
 *  equipment. `detail` carries size / quantity / "for fascia" context;
 *  `locationId` points at a shared Location in the card's facility — so where
 *  to find it stays consistent and updates everywhere when the location moves. */
export interface CardItem {
  id: ID;
  name: string;
  detail?: string;
  locationId?: ID;
}

/** The five checklist sections every card shares. Kept as a const tuple so the
 *  UI, search, and setup mode can iterate them in a stable order. */
export const SECTIONS = [
  { key: "instruments", label: "Instruments & trays", icon: "🔧" },
  { key: "sutures", label: "Sutures", icon: "🧵" },
  { key: "supplies", label: "Supplies & disposables", icon: "📦" },
  { key: "medications", label: "Medications & irrigation", icon: "💉" },
  { key: "equipment", label: "Equipment", icon: "🖥️" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

/** A preference card: one surgeon's setup for one procedure. */
export interface PrefCard {
  id: ID;
  surgeonId: ID;
  facilityId?: ID; // which facility's location set this card draws from
  procedure: string; // "Laparoscopic Cholecystectomy"
  specialty: string;
  position?: string; // "Supine, both arms tucked"
  prep?: string; // "ChloraPrep, xiphoid to pubis"
  draping?: string; // "Laparotomy drape"
  notes?: string; // case-specific quirks / reminders
  instruments: CardItem[];
  sutures: CardItem[];
  supplies: CardItem[];
  medications: CardItem[];
  equipment: CardItem[];
  favorite: boolean;
  updatedAt: string; // ISO
}

/** Live "pull list" progress while setting up a room. Keyed by card id and kept
 *  in app state so closing the app mid-setup doesn't lose your checkmarks. */
export interface SetupState {
  checked: ID[]; // CardItem ids already gathered
  startedAt: string;
}

// ---- Loaner trays ----------------------------------------------------------
// Vendor loaner sets (ortho/spine implants, specialty trays) borrowed for a
// specific case. The pain Casechek targets: trays arriving late or with no time
// to sterilize. So each request tracks a delivery deadline and moves through a
// clear pipeline with a timestamped history.

export const LOANER_STATUSES = [
  { key: "requested", label: "Requested", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "delivered", label: "Delivered", icon: "📦" },
  { key: "ready", label: "Sterile / ready", icon: "♨️" },
  { key: "in-use", label: "In use", icon: "🔪" },
  { key: "returned", label: "Returned", icon: "↩️" },
] as const;

export type LoanerStatus = (typeof LOANER_STATUSES)[number]["key"];

export interface LoanerTray {
  id: ID;
  description: string; // "Stryker Triathlon total knee set"
  vendor?: string; // "Stryker"
  repName?: string;
  repPhone?: string;
  quantity?: number; // # of trays / sets
  poNumber?: string;
  facilityId?: ID;
  surgeonId?: ID;
  cardId?: ID; // optional link to the preference card it's for
  procedure?: string;
  caseDate?: string; // ISO date/datetime of the surgery
  neededBy?: string; // ISO delivery deadline (leaves time to sterilize)
  status: LoanerStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  history: { status: LoanerStatus; at: string }[]; // status timeline
}

// ---- Case day --------------------------------------------------------------
// A scheduled case: "7:30, OR 4, Dr. Chen's total knee." Links to the
// preference card so the day view can show setup progress and loaner readiness
// per case — the 6 AM "what am I walking into" screen.

export interface CaseEntry {
  id: ID;
  date: string; // "2026-07-02" (local calendar day)
  time?: string; // "07:30"
  cardId: ID;
  room?: string; // "OR 4"
  notes?: string;
}

export interface AppState {
  facilities: Facility[];
  locations: Location[];
  surgeons: Surgeon[];
  cards: PrefCard[];
  loaners: LoanerTray[];
  cases: CaseEntry[];
  setups: Record<ID, SetupState>; // cardId -> progress
}
