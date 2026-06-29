import type { AppState, CardItem, Facility, Location, LoanerTray, PrefCard, Surgeon } from "../types";

// A realistic, fully-populated demo library so the app never opens to an empty
// screen. Cards are authored with plain location *strings* for readability; the
// builder below resolves them into shared, per-facility Location entities that
// items reference by id — the same model the real app uses.

let n = 0;
const id = (p: string) => `${p}-seed-${n++}`;

// Authoring shape: an item plus the raw "where to find it" string.
type SeedItem = CardItem & { _loc?: string };
const items = (...rows: [string, string?, string?][]): SeedItem[] =>
  rows.map(([name, detail, _loc]) => ({ id: id("it"), name, detail, _loc }));

const surgeons: Surgeon[] = [
  {
    id: "sg-alvarez",
    name: "Dr. Alvarez",
    specialty: "General Surgery",
    facility: "Mercy General",
    gloveSize: "7.0",
    gloveType: "Biogel PI, latex-free",
    quirks:
      "Likes the room cool. Classic rock low on the speaker. Wants the specimen confirmed back before closing.",
    color: "#4338ca",
    initials: "DA",
  },
  {
    id: "sg-chen",
    name: "Dr. Chen",
    specialty: "Orthopedics",
    facility: "Mercy General",
    gloveSize: "6.5",
    gloveType: "Biogel, double-glove with colored underglove",
    quirks:
      "Tourniquet up before prep — confirm pressure and time out loud. No talking during cementing. Counts twice on closing.",
    color: "#0e7490",
    initials: "DC",
  },
  {
    id: "sg-okafor",
    name: "Dr. Okafor",
    specialty: "OB/GYN",
    facility: "St. Luke's",
    gloveSize: "6.0",
    gloveType: "Latex-free",
    quirks:
      "Moves fast on a c-section — have the second suction ready. Baby warmer confirmed on before incision.",
    color: "#b91c1c",
    initials: "DO",
  },
  {
    id: "sg-rosen",
    name: "Dr. Rosen",
    specialty: "ENT",
    facility: "St. Luke's",
    gloveSize: "7.5",
    gloveType: "Standard",
    quirks: "Headlight on the field before timeout. Quiet room on the dissection.",
    color: "#15803d",
    initials: "DR",
  },
];

// Authoring shape for a card (items still carry location strings here).
interface SeedCard {
  surgeonId: ID2;
  procedure: string;
  specialty: string;
  position?: string;
  prep?: string;
  draping?: string;
  notes?: string;
  instruments: SeedItem[];
  sutures: SeedItem[];
  supplies: SeedItem[];
  medications: SeedItem[];
  equipment: SeedItem[];
  favorite?: boolean;
  daysAgo?: number;
}
type ID2 = string;

const seedCards: SeedCard[] = [
  {
    surgeonId: "sg-alvarez",
    procedure: "Laparoscopic Cholecystectomy",
    specialty: "General Surgery",
    position: "Supine, both arms tucked, reverse Trendelenburg + slight left tilt",
    prep: "ChloraPrep — xiphoid to pubis, table side to table side",
    draping: "Laparotomy drape",
    notes: "Have the cholangiogram setup on standby but unopened. Specimen in retrieval bag.",
    favorite: true,
    daysAgo: 1,
    instruments: items(
      ["Lap chole tray", undefined, "Sterile core, instrument rack B"],
      ["Veress needle", undefined, "Lap cart, top drawer"],
      ["5mm + 10mm trocars", "2× 5mm, 2× 10/12mm", "Lap cart, drawer 2"],
      ["Maryland dissector", undefined, "Lap cart, drawer 3"],
      ["Laparoscopic hook cautery", undefined, "Lap cart, drawer 3"],
      ["Endo clip applier", "medium-large", "Sterile store room, cabinet 7, shelf 3"],
      ["Specimen retrieval bag", undefined, "Sterile store room, cabinet 7, shelf 3"],
    ),
    sutures: items(
      ["Vicryl 0", "fascia, ×2", "Suture room, bin V-0"],
      ["Monocryl 4-0", "skin", "Suture room, bin M-4"],
    ),
    supplies: items(
      ["Veress / insufflation tubing", undefined, "Lap cart, side bin"],
      ["10mm 30° scope", "warmed", "Scope storage, cabinet 2"],
      ["ESU pencil + cord", undefined, "Sterile store room, cabinet 3, shelf 1"],
      ["Suction-irrigator", undefined, "Sterile store room, cabinet 3, shelf 2"],
      ["Steri-Strips + dressing", undefined, "Dressing cart, drawer 4"],
    ),
    medications: items(
      ["Marcaine 0.25%", "local at port sites", "Med room, fridge"],
      ["Surgicel", "available", "Sterile store room, cabinet 5"],
    ),
    equipment: items(
      ["Laparoscopic tower + insufflator", "CO2 full", "Equipment alcove 1"],
      ["ESU unit", "coag 30 / cut 30", "Equipment alcove 1"],
      ["Sequential compression device", undefined, "Equipment alcove 2"],
    ),
  },
  {
    surgeonId: "sg-alvarez",
    procedure: "Open Inguinal Hernia Repair (mesh)",
    specialty: "General Surgery",
    position: "Supine, arms out",
    prep: "ChloraPrep to operative groin",
    draping: "Fenestrated drape",
    daysAgo: 9,
    instruments: items(
      ["Minor / hernia tray", undefined, "Sterile core, instrument rack A"],
      ["Self-retaining retractor", undefined, "Sterile core, instrument rack A"],
      ["Fine dissecting scissors"],
    ),
    sutures: items(
      ["Prolene 2-0", "mesh fixation", "Suture room, bin P-2"],
      ["Vicryl 2-0", "external oblique", "Suture room, bin V-2"],
      ["Monocryl 4-0", "skin", "Suture room, bin M-4"],
    ),
    supplies: items(
      ["Polypropylene mesh", "surgeon to size", "Sterile store room, cabinet 8"],
      ["ESU pencil", undefined, "Sterile store room, cabinet 3, shelf 1"],
      ["Penrose drain", "cord retraction", "Sterile store room, cabinet 4"],
    ),
    medications: items(["Marcaine 0.5% with epi", "field block", "Med room, fridge"]),
    equipment: items(["ESU unit", undefined, "Equipment alcove 1"], ["Headlight", "optional", "Equipment alcove 3"]),
  },
  {
    surgeonId: "sg-chen",
    procedure: "Total Knee Arthroplasty",
    specialty: "Orthopedics",
    position: "Supine, tourniquet high on operative thigh, leg holder",
    prep: "ChloraPrep ×2 — foot to tourniquet, circumferential",
    draping: "Extremity drape + impervious stockinette + Coban",
    notes: "Confirm implant vendor + sizes in room BEFORE prep. Tourniquet pressure and time called out.",
    favorite: true,
    daysAgo: 2,
    instruments: items(
      ["Total knee instrument set", "vendor-specific", "Ortho room, set shelf 1"],
      ["Oscillating saw + blades", undefined, "Ortho room, power cart"],
      ["Bone hooks / Hohmann retractors", undefined, "Ortho room, set shelf 2"],
      ["Pulse lavage", undefined, "Sterile store room, cabinet 6"],
    ),
    sutures: items(
      ["Barbed #2 / Vicryl #1", "arthrotomy", "Suture room, bin B-2"],
      ["Vicryl 2-0", "subcutaneous", "Suture room, bin V-2"],
      ["Staples", "skin", "Suture room, bin staples"],
    ),
    supplies: items(
      ["Knee implant trays", "confirm size with rep", "Implant room"],
      ["Bone cement ×2", "+ mixing system", "Ortho room, cement shelf"],
      ["Pulse lavage + 3L saline", undefined, "Sterile store room, cabinet 6"],
      ["Hemostatic agent", undefined, "Sterile store room, cabinet 5"],
      ["Drain", "surgeon preference", "Sterile store room, cabinet 4"],
    ),
    medications: items(
      ["Tranexamic acid", "per protocol", "Med room"],
      ["Antibiotic cement", "if specified", "Ortho room, cement shelf"],
      ["Local infiltration cocktail", undefined, "Med room"],
    ),
    equipment: items(
      ["Tourniquet — confirm pressure/time", undefined, "Equipment alcove 2"],
      ["Cement mixing / vacuum system", undefined, "Ortho room, power cart"],
      ["Leg positioner / holder", undefined, "Ortho room, positioner shelf"],
      ["ESU unit", undefined, "Equipment alcove 1"],
    ),
  },
  {
    surgeonId: "sg-chen",
    procedure: "ACL Reconstruction (arthroscopic)",
    specialty: "Orthopedics",
    position: "Supine, leg in arthroscopic leg holder, foot of bed dropped",
    prep: "ChloraPrep circumferential below tourniquet",
    draping: "Extremity drape + arthroscopy drape with fluid pouch",
    daysAgo: 6,
    instruments: items(
      ["Arthroscopy tray", undefined, "Ortho room, set shelf 3"],
      ["ACL reconstruction set", "vendor", "Implant room"],
      ["Graft prep board + sizing tubes", undefined, "Ortho room, set shelf 3"],
    ),
    sutures: items(["FiberWire / graft sutures", "per system", "Suture room, bin F"], ["Monocryl 4-0", "portals", "Suture room, bin M-4"]),
    supplies: items(
      ["30° arthroscope", undefined, "Scope storage, cabinet 1"],
      ["Shaver blades + burr", undefined, "Ortho room, arthro cart"],
      ["Interference screws", "confirm sizes", "Implant room"],
      ["Fluid bags ×3L", undefined, "Sterile store room, cabinet 1"],
    ),
    medications: items(["Marcaine with epi", "portals", "Med room, fridge"], ["Epinephrine in arthroscopy fluid", "if requested", "Med room"]),
    equipment: items(
      ["Arthroscopy tower + pump", undefined, "Ortho room, arthro cart"],
      ["Shaver console", undefined, "Ortho room, arthro cart"],
      ["Tourniquet", undefined, "Equipment alcove 2"],
      ["Leg holder", undefined, "Ortho room, positioner shelf"],
    ),
  },
  {
    surgeonId: "sg-okafor",
    procedure: "Cesarean Section (low transverse)",
    specialty: "OB/GYN",
    position: "Supine with left lateral tilt (wedge under right hip)",
    prep: "ChloraPrep abdomen; confirm Foley placed",
    draping: "C-section drape with fluid collection pouch",
    notes: "Baby warmer ON and confirmed before incision. Second suction ready. Cord blood tubes + gases on table.",
    favorite: true,
    daysAgo: 1,
    instruments: items(
      ["Cesarean section tray", undefined, "L&D core, OR cart"],
      ["Bandage scissors", undefined, "L&D core, OR cart"],
      ["Cord clamp", undefined, "L&D core, supply bin 2"],
      ["DeLee / bulb suction", undefined, "L&D core, supply bin 2"],
    ),
    sutures: items(
      ["Vicryl 0", "uterus, ×2", "L&D suture cabinet"],
      ["Vicryl 0", "fascia", "L&D suture cabinet"],
      ["Vicryl 2-0", "subcutaneous", "L&D suture cabinet"],
      ["Monocryl 4-0", "skin", "L&D suture cabinet"],
    ),
    supplies: items(
      ["Bladder blade", undefined, "L&D core, OR cart"],
      ["Lap sponges ×2 packs", undefined, "L&D core, supply bin 1"],
      ["Cord blood tubes + gas syringe", undefined, "L&D core, lab bin"],
      ["Infant ID bands", undefined, "L&D core, lab bin"],
      ["Baby blankets / warmer setup", undefined, "Warmer station"],
    ),
    medications: items(["Oxytocin", "to anesthesia at delivery", "L&D med room"], ["Hemabate / methergine", "available, NOT on field", "L&D med room, fridge"]),
    equipment: items(
      ["Infant warmer — confirm on", undefined, "Warmer station"],
      ["ESU unit", undefined, "L&D core, equipment bay"],
      ["Second suction canister", undefined, "L&D core, equipment bay"],
    ),
  },
  {
    surgeonId: "sg-rosen",
    procedure: "Tonsillectomy & Adenoidectomy",
    specialty: "ENT",
    position: "Supine, shoulder roll, head of bed turned 90° to anesthesia",
    prep: "None — oral case",
    draping: "Head drape / split sheet",
    notes: "Headlight on the field before timeout. Have a tonsil sponge count system ready.",
    daysAgo: 12,
    instruments: items(
      ["Tonsillectomy tray", undefined, "ENT core, instrument shelf"],
      ["Mouth gag (McIvor) + blades", undefined, "ENT core, instrument shelf"],
      ["Tonsil snare", "if requested", "ENT core, instrument shelf"],
      ["Adenoid curettes", undefined, "ENT core, instrument shelf"],
    ),
    sutures: items(["Vicryl 2-0 on tonsil needle", "ties available", "ENT core, suture bin"]),
    supplies: items(
      ["Bovie with suction-cautery tip", undefined, "ENT core, supply cabinet"],
      ["Tonsil sponges", "count carefully", "ENT core, supply cabinet"],
      ["Red rubber catheter", "adenoid retraction", "ENT core, supply cabinet"],
    ),
    medications: items(["Afrin-soaked pledgets", "adenoid bed", "ENT med drawer"], ["Marcaine with epi", "if injected", "ENT med drawer"]),
    equipment: items(["Headlight", undefined, "ENT core, equipment shelf"], ["Suction-cautery / Bovie unit", undefined, "ENT core, equipment shelf"]),
  },
];

const SECTION_KEYS = ["instruments", "sutures", "supplies", "medications", "equipment"] as const;

/** Split "Lap cart, drawer 2" into { area: "Lap cart", spot: "drawer 2" }. */
export function splitLocation(str: string): { area: string; spot?: string } {
  const i = str.indexOf(",");
  if (i === -1) return { area: str.trim() };
  return { area: str.slice(0, i).trim(), spot: str.slice(i + 1).trim() || undefined };
}

export function buildSeed(): AppState {
  // Deterministic ids (local counters / slugs) so repeated buildSeed() calls
  // produce identical state — tests and the live store must agree on card ids.
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // One facility per distinct surgeon facility name.
  const facilities: Facility[] = [];
  const facilityByName = new Map<string, Facility>();
  for (const s of surgeons) {
    const name = s.facility?.trim();
    if (name && !facilityByName.has(name)) {
      const f = { id: `fac-${slug(name)}`, name };
      facilities.push(f);
      facilityByName.set(name, f);
    }
  }

  const locations: Location[] = [];
  let li = 0;
  // Find-or-create a location within a facility, keyed by its normalized label.
  const locKey = (facilityId: string, label: string) => `${facilityId}::${label.toLowerCase()}`;
  const locByKey = new Map<string, Location>();
  const resolveLoc = (facilityId: string, raw?: string): string | undefined => {
    if (!raw?.trim()) return undefined;
    const { area, spot } = splitLocation(raw);
    const label = spot ? `${area}, ${spot}` : area;
    const key = locKey(facilityId, label);
    let loc = locByKey.get(key);
    if (!loc) {
      loc = { id: `loc-seed-${li++}`, facilityId, area, spot };
      locations.push(loc);
      locByKey.set(key, loc);
    }
    return loc.id;
  };

  let ci = 0;
  const cards: PrefCard[] = seedCards.map((c) => {
    const surgeon = surgeons.find((s) => s.id === c.surgeonId);
    const facilityId = surgeon?.facility ? facilityByName.get(surgeon.facility)?.id : undefined;
    const section = (arr: SeedItem[]): CardItem[] =>
      arr.map(({ _loc, ...item }) => ({ ...item, locationId: facilityId ? resolveLoc(facilityId, _loc) : undefined }));
    return {
      id: `card-seed-${ci++}`,
      surgeonId: c.surgeonId,
      facilityId,
      procedure: c.procedure,
      specialty: c.specialty,
      position: c.position,
      prep: c.prep,
      draping: c.draping,
      notes: c.notes,
      instruments: section(c.instruments),
      sutures: section(c.sutures),
      supplies: section(c.supplies),
      medications: section(c.medications),
      equipment: section(c.equipment),
      favorite: c.favorite ?? false,
      updatedAt: new Date(Date.now() - (c.daysAgo ?? 3) * 86400000).toISOString(),
    };
  });

  // A few demo loaner trays tied to the seeded ortho cases.
  const tka = cards.find((c) => c.procedure.startsWith("Total Knee"));
  const acl = cards.find((c) => c.procedure.startsWith("ACL"));
  const mercy = facilityByName.get("Mercy General");
  const day = 86400000;
  const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
  let ki = 0;
  const loaner = (l: Omit<LoanerTray, "id" | "createdAt" | "updatedAt" | "history">): LoanerTray => ({
    ...l,
    id: `loaner-seed-${ki++}`,
    createdAt: iso(-5 * day),
    updatedAt: iso(-1 * day),
    history: [{ status: l.status, at: iso(-1 * day) }],
  });

  const loaners: LoanerTray[] = [
    loaner({
      description: "Stryker Triathlon total knee set (3 trays)",
      vendor: "Stryker",
      repName: "Mike R.",
      repPhone: "+15125550112",
      quantity: 3,
      poNumber: "PO-44821",
      facilityId: mercy?.id,
      surgeonId: "sg-chen",
      cardId: tka?.id,
      procedure: "Total Knee Arthroplasty",
      caseDate: iso(2 * day),
      neededBy: iso(1 * day), // must arrive a day ahead to sterilize
      status: "confirmed",
      notes: "Confirm cement restrictor sizes are in the set.",
    }),
    loaner({
      description: "Arthrex ACL reconstruction set + implants",
      vendor: "Arthrex",
      repName: "Dana P.",
      repPhone: "+15125550148",
      quantity: 2,
      facilityId: mercy?.id,
      surgeonId: "sg-chen",
      cardId: acl?.id,
      procedure: "ACL Reconstruction (arthroscopic)",
      caseDate: iso(5 * day),
      neededBy: iso(4 * day),
      status: "requested",
    }),
    loaner({
      description: "Medtronic spine set — pedicle screws",
      vendor: "Medtronic",
      repName: "Chris L.",
      repPhone: "+15125550199",
      quantity: 4,
      poNumber: "PO-44790",
      facilityId: mercy?.id,
      surgeonId: "sg-chen",
      procedure: "Lumbar fusion",
      caseDate: iso(-2 * day),
      neededBy: iso(-3 * day),
      status: "returned",
    }),
  ];

  return { facilities, locations, surgeons, cards, loaners, setups: {} };
}

// Re-export so the store's migration can reuse the section list.
export { SECTION_KEYS };
