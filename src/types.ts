// Core domain types for CaseReady.
//
// CaseReady is a *personal* surgical preference-card library. Everything is
// plain, serializable data so it lives in localStorage, exports to JSON, and
// works fully offline — no hospital account, no admin approval, no server.
// (That last part is the whole point: the App Store reviews of the app this
// replaces are full of techs furious that they couldn't just use it for
// themselves.)

export type ID = string;

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
 *  equipment. `detail` carries size / quantity / "for fascia" context. */
export interface CardItem {
  id: ID;
  name: string;
  detail?: string;
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

export interface AppState {
  surgeons: Surgeon[];
  cards: PrefCard[];
  setups: Record<ID, SetupState>; // cardId -> progress
}
