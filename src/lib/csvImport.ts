import type { CardItem, Facility, Location, PrefCard, SectionKey, Surgeon } from "../types";
import type { CardBundle } from "./portable";
import { BUNDLE_KIND } from "./portable";

// Bulk import from a spreadsheet — the reliable on-ramp for facilities that
// already keep their preference cards in Genesis, SIS / S3, or just Excel.
// We define one simple, forgiving template (one row per item) and convert it
// into a card bundle, which then merges through the same path as a shared file.

const PALETTE = ["#4338ca", "#0e7490", "#b91c1c", "#15803d", "#b45309", "#7c3aed", "#be185d"];

// A small, RFC-4180-ish CSV parser: handles quoted fields, escaped quotes,
// embedded commas/newlines, and CRLF. Good enough for Excel "Save as CSV".
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => { cur.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(cur); cur = []; };
  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { pushField(); i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { pushRow(); i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || cur.length > 0) pushRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const SECTION_ALIASES: Record<string, SectionKey> = {
  instrument: "instruments", instruments: "instruments", tray: "instruments", trays: "instruments",
  suture: "sutures", sutures: "sutures",
  supply: "supplies", supplies: "supplies", disposable: "supplies", disposables: "supplies",
  medication: "medications", medications: "medications", med: "medications", meds: "medications",
  irrigation: "medications", drug: "medications",
  equipment: "equipment", equip: "equipment",
};
function normalizeSection(raw: string): SectionKey {
  const key = raw.trim().toLowerCase().replace(/&.*$/, "").trim().split(/\s+/)[0];
  return SECTION_ALIASES[key] ?? "supplies";
}

function initials(name: string): string {
  const parts = name.replace(/^dr\.?\s*/i, "").trim().split(/\s+/);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || name.slice(0, 2)).toUpperCase();
}
function uid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Column header → index, tolerant of aliases / casing / spacing. */
function headerIndex(header: string[]) {
  const norm = header.map((h) => h.trim().toLowerCase());
  const find = (...names: string[]) => {
    for (const n of names) {
      const i = norm.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  return {
    facility: find("facility", "hospital", "site"),
    surgeon: find("surgeon", "physician", "doctor", "provider"),
    specialty: find("specialty", "service", "speciality"),
    procedure: find("procedure", "case", "surgery", "operation"),
    position: find("position", "positioning"),
    prep: find("prep", "skin prep"),
    draping: find("draping", "drape"),
    notes: find("notes", "note", "comments"),
    section: find("section", "category", "type", "group"),
    item: find("item", "supply", "name", "description"),
    detail: find("detail", "details", "size", "qty", "quantity"),
    area: find("area", "location", "room", "cart"),
    spot: find("spot", "shelf", "bin", "drawer", "position in room"),
  };
}

export interface CsvImportError {
  message: string;
}

/** Convert parsed CSV rows into a mergeable card bundle. Throws CsvImportError
 *  with a friendly message if the required columns are missing. */
export function csvToBundle(rows: string[][], exportedAt: string): CardBundle {
  if (rows.length < 2) throw { message: "The file has no data rows." } as CsvImportError;
  const header = rows[0];
  const col = headerIndex(header);
  if (col.procedure === -1 || col.item === -1) {
    throw {
      message: "Couldn't find the required columns. The file needs at least a 'Procedure' and an 'Item' column.",
    } as CsvImportError;
  }

  const facilities: Facility[] = [];
  const facByName = new Map<string, Facility>();
  const surgeons: Surgeon[] = [];
  const sgByName = new Map<string, Surgeon>();
  const locations: Location[] = [];
  const locByKey = new Map<string, Location>();
  const cards: PrefCard[] = [];
  const cardByKey = new Map<string, PrefCard>();
  let colorI = 0;

  const cell = (row: string[], idx: number) => (idx === -1 ? "" : (row[idx] ?? "").trim());

  for (const row of rows.slice(1)) {
    const procedure = cell(row, col.procedure);
    const itemName = cell(row, col.item);
    if (!procedure || !itemName) continue; // skip incomplete rows quietly

    const facilityName = cell(row, col.facility);
    const surgeonName = cell(row, col.surgeon) || "Unassigned";
    const specialty = cell(row, col.specialty) || "General";

    // Facility (optional).
    let facility: Facility | undefined;
    if (facilityName) {
      facility = facByName.get(facilityName.toLowerCase());
      if (!facility) {
        facility = { id: uid("fac"), name: facilityName };
        facilities.push(facility);
        facByName.set(facilityName.toLowerCase(), facility);
      }
    }

    // Surgeon.
    let surgeon = sgByName.get(surgeonName.toLowerCase());
    if (!surgeon) {
      surgeon = {
        id: uid("sg"),
        name: surgeonName,
        specialty,
        facility: facilityName || undefined,
        color: PALETTE[colorI++ % PALETTE.length],
        initials: initials(surgeonName),
      };
      surgeons.push(surgeon);
      sgByName.set(surgeonName.toLowerCase(), surgeon);
    }

    // Card (one per facility|surgeon|procedure).
    const cardKey = `${facilityName.toLowerCase()}|${surgeonName.toLowerCase()}|${procedure.toLowerCase()}`;
    let card = cardByKey.get(cardKey);
    if (!card) {
      card = {
        id: uid("card"),
        surgeonId: surgeon.id,
        facilityId: facility?.id,
        procedure,
        specialty,
        position: cell(row, col.position) || undefined,
        prep: cell(row, col.prep) || undefined,
        draping: cell(row, col.draping) || undefined,
        notes: cell(row, col.notes) || undefined,
        instruments: [], sutures: [], supplies: [], medications: [], equipment: [],
        favorite: false,
        updatedAt: exportedAt,
      };
      cards.push(card);
      cardByKey.set(cardKey, card);
    }

    // Location (needs a facility to belong to).
    let locationId: string | undefined;
    const area = cell(row, col.area);
    if (area && facility) {
      const spot = cell(row, col.spot) || undefined;
      const label = (spot ? `${area}, ${spot}` : area).toLowerCase();
      const key = `${facility.id}::${label}`;
      let loc = locByKey.get(key);
      if (!loc) {
        loc = { id: uid("loc"), facilityId: facility.id, area, spot };
        locations.push(loc);
        locByKey.set(key, loc);
      }
      locationId = loc.id;
    }

    const item: CardItem = { id: uid("it"), name: itemName, detail: cell(row, col.detail) || undefined, locationId };
    const sectionKey = normalizeSection(cell(row, col.section));
    card[sectionKey].push(item);
  }

  if (!cards.length) throw { message: "No cards could be read — check that rows have a Procedure and an Item." } as CsvImportError;

  return { kind: BUNDLE_KIND, version: 1, exportedAt, facilities, surgeons, locations, cards };
}

/** A ready-to-fill template a facility can export their data into. */
export const CSV_TEMPLATE = [
  "Facility,Surgeon,Specialty,Procedure,Position,Prep,Draping,Notes,Section,Item,Detail,Area,Spot",
  'Mercy General,Dr. Example,General Surgery,Laparoscopic Cholecystectomy,"Supine, arms tucked",ChloraPrep,Laparotomy drape,Specimen back before closing,Instruments,Lap chole tray,,Sterile core,rack B',
  "Mercy General,Dr. Example,General Surgery,Laparoscopic Cholecystectomy,,,,,Instruments,Maryland dissector,,Lap cart,drawer 3",
  "Mercy General,Dr. Example,General Surgery,Laparoscopic Cholecystectomy,,,,,Sutures,Vicryl 0,fascia,Suture room,bin V-0",
  "Mercy General,Dr. Example,General Surgery,Laparoscopic Cholecystectomy,,,,,Supplies,ESU pencil + cord,,Sterile store room,cabinet 3",
  "Mercy General,Dr. Example,General Surgery,Laparoscopic Cholecystectomy,,,,,Equipment,ESU unit,coag 30 / cut 30,Equipment alcove 1,",
].join("\n");
