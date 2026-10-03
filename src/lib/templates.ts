import type { SectionKey } from "../types";

// Starter preference cards, the feature hospital-grade systems charge for:
// a library of pre-built cards for common procedures that a tech tweaks to
// their surgeon instead of typing from a blank page. Everything here is
// deliberately generic (standard counts, common setups, no facility detail);
// it's a head start, not gospel. qty = how many to pull, hold = pull it but
// keep it unopened unless asked (same open/hold idea as a hospital pick list).

export interface TemplateItem {
  name: string;
  detail?: string;
  qty?: number;
  hold?: boolean;
}

export interface CardTemplate {
  procedure: string;
  specialty: string;
  position?: string;
  prep?: string;
  draping?: string;
  notes?: string;
  sections: Partial<Record<SectionKey, TemplateItem[]>>;
}

export const TEMPLATES: CardTemplate[] = [
  {
    procedure: "Laparoscopic Cholecystectomy",
    specialty: "General Surgery",
    position: "Supine, left arm tucked, reverse Trendelenburg",
    prep: "ChloraPrep, nipples to pubis",
    draping: "Laparotomy drape",
    notes: "Have an open tray in the room, unopened. Cholangiogram supplies on hold.",
    sections: {
      instruments: [
        { name: "Lap chole tray" },
        { name: "Major tray", detail: "in room, do not open", hold: true },
        { name: "Maryland dissector", detail: "5 mm" },
        { name: "Clip applier", detail: "5 mm" },
      ],
      sutures: [
        { name: "Vicryl 0", detail: "fascia, port sites" },
        { name: "Monocryl 4-0", detail: "skin" },
      ],
      supplies: [
        { name: "Trocars", detail: "2× 5 mm, 1× 10/12 mm" },
        { name: "Endo catch bag", detail: "10 mm" },
        { name: "Raytec", qty: 2 },
        { name: "Cholangiogram catheter", hold: true },
      ],
      medications: [
        { name: "Saline irrigation", detail: "warm" },
        { name: "Marcaine 0.25%", detail: "port sites" },
      ],
      equipment: [
        { name: "Laparoscopic tower", detail: "30° 10 mm scope" },
        { name: "Insufflator", detail: "15 mmHg" },
        { name: "ESU", detail: "coag 30" },
      ],
    },
  },
  {
    procedure: "Laparoscopic Appendectomy",
    specialty: "General Surgery",
    position: "Supine, left arm tucked, Trendelenburg with left tilt",
    prep: "ChloraPrep, abdomen",
    draping: "Laparotomy drape",
    sections: {
      instruments: [
        { name: "Lap appy tray" },
        { name: "Endo stapler", detail: "with reloads" },
      ],
      sutures: [
        { name: "Vicryl 0", detail: "fascia" },
        { name: "Monocryl 4-0", detail: "skin" },
      ],
      supplies: [
        { name: "Trocars", detail: "2× 5 mm, 1× 12 mm" },
        { name: "Endo catch bag" },
        { name: "Endoloop", qty: 2, hold: true },
      ],
      medications: [
        { name: "Saline irrigation", detail: "warm" },
        { name: "Marcaine 0.25%", detail: "port sites" },
      ],
      equipment: [
        { name: "Laparoscopic tower", detail: "30° 5 mm scope" },
        { name: "Insufflator" },
      ],
    },
  },
  {
    procedure: "Open Inguinal Hernia Repair",
    specialty: "General Surgery",
    position: "Supine, arms out",
    prep: "ChloraPrep, abdomen and groin",
    draping: "Laparotomy drape",
    sections: {
      instruments: [
        { name: "Minor tray" },
        { name: "Self-retaining retractor", detail: "Weitlaner" },
      ],
      sutures: [
        { name: "Prolene 2-0", detail: "mesh fixation" },
        { name: "Vicryl 3-0", detail: "subcutaneous" },
        { name: "Monocryl 4-0", detail: "skin" },
      ],
      supplies: [
        { name: "Mesh", detail: "size per surgeon" },
        { name: "Raytec", qty: 4 },
        { name: "Penrose drain", detail: "cord retraction" },
      ],
      medications: [
        { name: "Marcaine 0.25% with epi", detail: "local" },
      ],
      equipment: [
        { name: "ESU", detail: "cut 30 / coag 30" },
      ],
    },
  },
  {
    procedure: "Total Knee Arthroplasty",
    specialty: "Orthopedics",
    position: "Supine, leg holder, tourniquet high on thigh",
    prep: "ChloraPrep, toes to tourniquet",
    draping: "Extremity drape with stockinette and Coban",
    notes: "Implants and trials per rep. Confirm sizes from templating before the room opens.",
    sections: {
      instruments: [
        { name: "Total knee tray", detail: "system per surgeon" },
        { name: "Primary knee instruments", detail: "vendor trays" },
        { name: "Pulse lavage" },
      ],
      sutures: [
        { name: "Vicryl 1", detail: "arthrotomy", qty: 4 },
        { name: "Vicryl 2-0", detail: "subcutaneous", qty: 2 },
        { name: "Staples", detail: "skin" },
      ],
      supplies: [
        { name: "Raytec", qty: 10 },
        { name: "Lap sponges", qty: 5 },
        { name: "Blades", detail: "#10", qty: 2 },
        { name: "Cement", detail: "with antibiotic", qty: 2, hold: true },
        { name: "Drain", detail: "per surgeon", hold: true },
      ],
      medications: [
        { name: "Saline irrigation", detail: "3 L warm" },
        { name: "TXA", detail: "per anesthesia" },
      ],
      equipment: [
        { name: "Tourniquet", detail: "300 mmHg" },
        { name: "Power", detail: "saw and drill" },
        { name: "Cement mixer", hold: true },
      ],
    },
  },
  {
    procedure: "Carpal Tunnel Release",
    specialty: "Orthopedics",
    position: "Supine, arm on hand table",
    prep: "ChloraPrep, hand and forearm",
    draping: "Hand drape",
    sections: {
      instruments: [
        { name: "Hand tray" },
        { name: "Bipolar forceps" },
      ],
      sutures: [
        { name: "Nylon 4-0", detail: "skin" },
      ],
      supplies: [
        { name: "Blades", detail: "#15", qty: 2 },
        { name: "Raytec", qty: 2 },
        { name: "Soft dressing", detail: "Kerlix and Coban" },
      ],
      medications: [
        { name: "Lidocaine 1% with epi", detail: "local" },
      ],
      equipment: [
        { name: "Tourniquet", detail: "250 mmHg", hold: true },
        { name: "Bipolar ESU" },
      ],
    },
  },
  {
    procedure: "Cystoscopy",
    specialty: "Urology",
    position: "Lithotomy",
    prep: "Betadine, genitalia",
    draping: "Cysto drape with leggings",
    sections: {
      instruments: [
        { name: "Cystoscope", detail: "rigid, 30° and 70° lenses" },
        { name: "Flexible cystoscope", hold: true },
        { name: "Graspers", detail: "stone", hold: true },
      ],
      supplies: [
        { name: "Cysto tubing" },
        { name: "Lubricating jelly" },
        { name: "Specimen cups", qty: 2 },
      ],
      medications: [
        { name: "Sterile water irrigation", detail: "3 L bags", qty: 2 },
        { name: "Lidocaine jelly", detail: "urethral" },
      ],
      equipment: [
        { name: "Camera and light source" },
        { name: "Video tower" },
      ],
    },
  },
  {
    procedure: "Cataract Extraction with IOL",
    specialty: "Ophthalmology",
    position: "Supine, head ring, operative eye up",
    prep: "Betadine 5%, operative eye",
    draping: "Ophthalmic drape with aperture",
    notes: "Confirm lens power and backup lens before the patient is in the room.",
    sections: {
      instruments: [
        { name: "Cataract tray" },
        { name: "Phaco handpiece", detail: "with tips" },
        { name: "I/A handpiece" },
      ],
      supplies: [
        { name: "IOL", detail: "primary, power per biometry" },
        { name: "IOL", detail: "backup", hold: true },
        { name: "Viscoelastic", qty: 2 },
        { name: "Eye shield", detail: "post-op" },
      ],
      medications: [
        { name: "BSS", detail: "500 mL", qty: 2 },
        { name: "Dilating drops", detail: "per surgeon" },
        { name: "Antibiotic drops", detail: "post-op" },
      ],
      equipment: [
        { name: "Phaco machine", detail: "settings per surgeon" },
        { name: "Operating microscope" },
      ],
    },
  },
  {
    procedure: "Cesarean Section",
    specialty: "OB/GYN",
    position: "Supine with left tilt",
    prep: "ChloraPrep, abdomen",
    draping: "C-section drape with pouch",
    notes: "Count extra sharp and sponge before uterine closure. Baby warmer on and checked.",
    sections: {
      instruments: [
        { name: "C-section tray" },
        { name: "Delivery forceps", hold: true },
      ],
      sutures: [
        { name: "Chromic 1", detail: "uterus", qty: 2 },
        { name: "Vicryl 0", detail: "fascia", qty: 2 },
        { name: "Monocryl 4-0", detail: "skin" },
      ],
      supplies: [
        { name: "Lap sponges", qty: 10 },
        { name: "Bulb syringe" },
        { name: "Cord clamps", qty: 2 },
        { name: "Specimen cup", detail: "cord gases", hold: true },
      ],
      medications: [
        { name: "Pitocin", detail: "per anesthesia" },
        { name: "Saline irrigation", detail: "warm" },
      ],
      equipment: [
        { name: "ESU" },
        { name: "Suction", detail: "2 set up", qty: 2 },
      ],
    },
  },
  {
    procedure: "Tonsillectomy and Adenoidectomy",
    specialty: "ENT",
    position: "Supine, shoulder roll, head extended",
    prep: "None",
    draping: "Head drape, body sheet",
    sections: {
      instruments: [
        { name: "T&A tray" },
        { name: "McIvor mouth gag", detail: "with blades" },
        { name: "Adenoid curettes", hold: true },
      ],
      supplies: [
        { name: "Tonsil sponges", qty: 5 },
        { name: "Red rubber catheter", detail: "palate retraction" },
        { name: "Suction cautery tip", qty: 2 },
      ],
      medications: [
        { name: "Saline irrigation" },
        { name: "Epinephrine-soaked pledgets", hold: true },
      ],
      equipment: [
        { name: "ESU", detail: "low settings per surgeon" },
        { name: "Headlight" },
      ],
    },
  },
  {
    procedure: "Lumbar Laminectomy",
    specialty: "Neurosurgery",
    position: "Prone on Wilson frame, arms up",
    prep: "ChloraPrep, midline back",
    draping: "Laparotomy drape",
    notes: "X-ray for level check before incision. Keep blood products status with anesthesia.",
    sections: {
      instruments: [
        { name: "Laminectomy tray" },
        { name: "Kerrison rongeurs", detail: "full set" },
        { name: "Microscope drape", hold: true },
      ],
      sutures: [
        { name: "Vicryl 0", detail: "fascia", qty: 2 },
        { name: "Vicryl 2-0", detail: "subcutaneous" },
        { name: "Nylon 3-0", detail: "skin" },
      ],
      supplies: [
        { name: "Raytec", qty: 10 },
        { name: "Cottonoids", detail: "assorted", qty: 5 },
        { name: "Bone wax", qty: 2 },
        { name: "Gelfoam with thrombin", hold: true },
      ],
      medications: [
        { name: "Saline irrigation", detail: "warm" },
        { name: "Marcaine 0.25%", detail: "incision" },
      ],
      equipment: [
        { name: "C-arm", detail: "level check" },
        { name: "ESU and bipolar" },
        { name: "Headlight" },
      ],
    },
  },
];

/** Templates grouped by specialty, in a stable order, for the picker. */
export function templatesBySpecialty(): [string, CardTemplate[]][] {
  const map = new Map<string, CardTemplate[]>();
  for (const t of TEMPLATES) {
    const list = map.get(t.specialty) ?? [];
    list.push(t);
    map.set(t.specialty, list);
  }
  return [...map.entries()];
}

export function templateItemCount(t: CardTemplate): number {
  return Object.values(t.sections).reduce((n, arr) => n + (arr?.length ?? 0), 0);
}
