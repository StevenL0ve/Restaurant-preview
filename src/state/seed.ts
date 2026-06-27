import type { AppState, CardItem, PrefCard, Surgeon } from "../types";

// A realistic, fully-populated demo library so the app never opens to an empty
// screen. These are believable preference cards across common specialties —
// enough that someone can poke every feature (setup mode, search, favorites,
// export) before adding their own.

let n = 0;
const id = (p: string) => `${p}-seed-${n++}`;
const items = (...rows: [string, string?][]): CardItem[] =>
  rows.map(([name, detail]) => ({ id: id("it"), name, detail }));

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

function card(
  c: Omit<PrefCard, "id" | "favorite" | "updatedAt"> & { favorite?: boolean; daysAgo?: number },
): PrefCard {
  const updatedAt = new Date(Date.now() - (c.daysAgo ?? 3) * 86400000).toISOString();
  return {
    id: id("card"),
    favorite: c.favorite ?? false,
    updatedAt,
    surgeonId: c.surgeonId,
    procedure: c.procedure,
    specialty: c.specialty,
    position: c.position,
    prep: c.prep,
    draping: c.draping,
    notes: c.notes,
    instruments: c.instruments,
    sutures: c.sutures,
    supplies: c.supplies,
    medications: c.medications,
    equipment: c.equipment,
  };
}

const cards: PrefCard[] = [
  card({
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
      ["Lap chole tray"],
      ["Veress needle"],
      ["5mm + 10mm trocars", "2× 5mm, 2× 10/12mm"],
      ["Maryland dissector"],
      ["Laparoscopic hook cautery"],
      ["Endo clip applier", "medium-large"],
      ["Specimen retrieval bag"],
    ),
    sutures: items(["Vicryl 0", "fascia, ×2"], ["Monocryl 4-0", "skin"]),
    supplies: items(
      ["Veress / insufflation tubing"],
      ["10mm 30° scope", "warmed"],
      ["ESU pencil + cord"],
      ["Suction-irrigator"],
      ["Steri-Strips + dressing"],
    ),
    medications: items(["Marcaine 0.25%", "local at port sites"], ["Surgicel", "available"]),
    equipment: items(
      ["Laparoscopic tower + insufflator", "CO2 full"],
      ["ESU unit", "coag 30 / cut 30"],
      ["Sequential compression device"],
    ),
  }),
  card({
    surgeonId: "sg-alvarez",
    procedure: "Open Inguinal Hernia Repair (mesh)",
    specialty: "General Surgery",
    position: "Supine, arms out",
    prep: "ChloraPrep to operative groin",
    draping: "Fenestrated drape",
    daysAgo: 9,
    instruments: items(["Minor / hernia tray"], ["Self-retaining retractor"], ["Fine dissecting scissors"]),
    sutures: items(["Prolene 2-0", "mesh fixation"], ["Vicryl 2-0", "external oblique"], ["Monocryl 4-0", "skin"]),
    supplies: items(["Polypropylene mesh", "surgeon to size"], ["ESU pencil"], ["Penrose drain", "cord retraction"]),
    medications: items(["Marcaine 0.5% with epi", "field block"]),
    equipment: items(["ESU unit"], ["Headlight", "optional"]),
  }),
  card({
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
      ["Total knee instrument set", "vendor-specific"],
      ["Oscillating saw + blades"],
      ["Bone hooks / Hohmann retractors"],
      ["Pulse lavage"],
    ),
    sutures: items(["Barbed #2 / Vicryl #1", "arthrotomy"], ["Vicryl 2-0", "subcutaneous"], ["Staples", "skin"]),
    supplies: items(
      ["Knee implant trays", "confirm size with rep"],
      ["Bone cement ×2", "+ mixing system"],
      ["Pulse lavage + 3L saline"],
      ["Hemostatic agent"],
      ["Drain", "surgeon preference"],
    ),
    medications: items(
      ["Tranexamic acid", "per protocol"],
      ["Antibiotic cement", "if specified"],
      ["Local infiltration cocktail"],
    ),
    equipment: items(
      ["Tourniquet — confirm pressure/time"],
      ["Cement mixing / vacuum system"],
      ["Leg positioner / holder"],
      ["ESU unit"],
    ),
  }),
  card({
    surgeonId: "sg-chen",
    procedure: "ACL Reconstruction (arthroscopic)",
    specialty: "Orthopedics",
    position: "Supine, leg in arthroscopic leg holder, foot of bed dropped",
    prep: "ChloraPrep circumferential below tourniquet",
    draping: "Extremity drape + arthroscopy drape with fluid pouch",
    daysAgo: 6,
    instruments: items(["Arthroscopy tray"], ["ACL reconstruction set", "vendor"], ["Graft prep board + sizing tubes"]),
    sutures: items(["FiberWire / graft sutures", "per system"], ["Monocryl 4-0", "portals"]),
    supplies: items(
      ["30° arthroscope"],
      ["Shaver blades + burr"],
      ["Interference screws", "confirm sizes"],
      ["Fluid bags ×3L"],
    ),
    medications: items(["Marcaine with epi", "portals"], ["Epinephrine in arthroscopy fluid", "if requested"]),
    equipment: items(["Arthroscopy tower + pump"], ["Shaver console"], ["Tourniquet"], ["Leg holder"]),
  }),
  card({
    surgeonId: "sg-okafor",
    procedure: "Cesarean Section (low transverse)",
    specialty: "OB/GYN",
    position: "Supine with left lateral tilt (wedge under right hip)",
    prep: "ChloraPrep abdomen; confirm Foley placed",
    draping: "C-section drape with fluid collection pouch",
    notes: "Baby warmer ON and confirmed before incision. Second suction ready. Cord blood tubes + gases on table.",
    favorite: true,
    daysAgo: 1,
    instruments: items(["Cesarean section tray"], ["Bandage scissors"], ["Cord clamp"], ["DeLee / bulb suction"]),
    sutures: items(
      ["Vicryl 0", "uterus, ×2"],
      ["Vicryl 0", "fascia"],
      ["Vicryl 2-0", "subcutaneous"],
      ["Monocryl 4-0", "skin"],
    ),
    supplies: items(
      ["Bladder blade"],
      ["Lap sponges ×2 packs"],
      ["Cord blood tubes + gas syringe"],
      ["Infant ID bands"],
      ["Baby blankets / warmer setup"],
    ),
    medications: items(["Oxytocin", "to anesthesia at delivery"], ["Hemabate / methergine", "available, NOT on field"]),
    equipment: items(["Infant warmer — confirm on"], ["ESU unit"], ["Second suction canister"]),
  }),
  card({
    surgeonId: "sg-rosen",
    procedure: "Tonsillectomy & Adenoidectomy",
    specialty: "ENT",
    position: "Supine, shoulder roll, head of bed turned 90° to anesthesia",
    prep: "None — oral case",
    draping: "Head drape / split sheet",
    notes: "Headlight on the field before timeout. Have a tonsil sponge count system ready.",
    daysAgo: 12,
    instruments: items(
      ["Tonsillectomy tray"],
      ["Mouth gag (McIvor) + blades"],
      ["Tonsil snare", "if requested"],
      ["Adenoid curettes"],
    ),
    sutures: items(["Vicryl 2-0 on tonsil needle", "ties available"]),
    supplies: items(
      ["Bovie with suction-cautery tip"],
      ["Tonsil sponges", "count carefully"],
      ["Red rubber catheter", "adenoid retraction"],
    ),
    medications: items(["Afrin-soaked pledgets", "adenoid bed"], ["Marcaine with epi", "if injected"]),
    equipment: items(["Headlight"], ["Suction-cautery / Bovie unit"]),
  }),
];

export function buildSeed(): AppState {
  return { surgeons, cards, setups: {} };
}
