import type { SectionKey } from "../types";
import { SECTIONS } from "../types";

// Turn the free text of a preference card — pasted from an email/PDF, typed by
// hand, or produced by OCR from a photo of a printed card — into a structured
// draft the normal card editor can open. This is deliberately forgiving: real
// cards are messy, OCR is imperfect, so we recover as much structure as we can
// and let the tech fix the rest in the editor. Nothing here is destructive; the
// worst case is an item landing in the wrong section, which is one tap to move.

export interface ParsedItem {
  name: string;
  detail?: string;
}

export interface ParsedCard {
  procedure?: string;
  surgeonName?: string;
  specialty?: string;
  position?: string;
  prep?: string;
  draping?: string;
  notes?: string;
  sections: Record<SectionKey, ParsedItem[]>;
  itemCount: number;
}

const SECTION_ALIASES: Record<string, SectionKey> = {
  instrument: "instruments", instruments: "instruments", tray: "instruments", trays: "instruments",
  instrumentation: "instruments", "instruments & trays": "instruments",
  suture: "sutures", sutures: "sutures", suturing: "sutures", "suture & needle": "sutures",
  supply: "supplies", supplies: "supplies", disposable: "supplies", disposables: "supplies",
  "supplies & disposables": "supplies", soft: "supplies", "soft goods": "supplies",
  medication: "medications", medications: "medications", med: "medications", meds: "medications",
  irrigation: "medications", drug: "medications", drugs: "medications", "medications & irrigation": "medications",
  pharmacy: "medications", solutions: "medications",
  equipment: "equipment", equip: "equipment", equipments: "equipment", devices: "equipment",
};

// Field labels that can prefix a line ("Procedure: ...", "Surgeon — Dr. Chen").
const FIELD_LABELS: { key: keyof ParsedCard; re: RegExp }[] = [
  { key: "procedure", re: /^(procedure|proc|case|operation|surgery)\b/i },
  { key: "surgeonName", re: /^(surgeon|physician|doctor|provider|md)\b/i },
  { key: "specialty", re: /^(specialty|speciality|service|discipline)\b/i },
  { key: "position", re: /^(position|positioning)\b/i },
  { key: "prep", re: /^(skin\s*prep|prep|prepping)\b/i },
  { key: "draping", re: /^(draping|drape|drapes)\b/i },
  { key: "notes", re: /^(notes?|comments?|quirks?|reminders?|special\s*instructions?)\b/i },
];

// Keyword hints used to guess a section for items that appear before any
// section header (common when someone just lists everything in a block).
const KEYWORD_SECTION: { section: SectionKey; re: RegExp }[] = [
  { section: "sutures", re: /\b(vicryl|pds|monocryl|prolene|nylon|silk|chromic|ethibond|dermabond|stratafix|\d-0|suture)\b/i },
  { section: "medications", re: /\b(saline|irrigation|lidocaine|marcaine|bupivacaine|xylocaine|epinephrine|\bepi\b|heparin|thrombin|antibiotic|cefazolin|ancef|gelfoam|surgicel|hemostatic|\d+\s?(mg|ml|cc|units?)\b|local|injectable)\b/i },
  { section: "equipment", re: /\b(unit|tower|insufflator|camera|monitor|\besu\b|bovie|generator|pump|warmer|microscope|c-?arm|headlight|light\s?source|machine|drill|saw|tourniquet|console|footswitch)\b/i },
  { section: "instruments", re: /\b(tray|set|pan|forceps|clamp|scissors|retractor|needle\s?driver|dissector|kelly|hemostat|scalpel|blade|handle|elevator|rongeur|curette|osteotome)\b/i },
];

const BULLET_RE = /^\s*(?:[-–—•*·▪◦●○‣]|\d+[.)]|[a-z][.)])\s+/i;

/** Split an item line into a name and an optional trailing detail (size, qty,
 *  parenthetical, or an em/en-dash aside). Conservative: only splits on clear
 *  separators so it doesn't chop real item names. */
function splitDetail(line: string): ParsedItem {
  const text = line.trim();
  // Parenthetical detail: "ESU pencil (with holster)".
  const paren = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren && paren[1].trim()) return { name: paren[1].trim(), detail: paren[2].trim() };
  // Colon aside with no leading space: "Blade: #10".
  const colon = text.match(/^([^:]+):\s+(.+)$/);
  if (colon && colon[1].trim() && !/\d$/.test(colon[1])) return { name: colon[1].trim(), detail: colon[2].trim() };
  // Dash-separated aside: "Vicryl 0 — fascia".
  const dash = text.match(/^(.+?)\s+(?:[—–]|-{1,2})\s+(.+)$/);
  if (dash && dash[1].trim() && dash[2].trim()) return { name: dash[1].trim(), detail: dash[2].trim() };
  // Trailing quantity: "Raytec x2", "Kittner ×5", "qty 3".
  const qty = text.match(/^(.+?)\s+(?:[x×]\s?\d+|qty\.?\s*\d+|\d+\s?(?:ea|each|pk|packs?))\s*$/i);
  if (qty && qty[1].trim()) {
    const detail = text.slice(qty[1].length).trim();
    return { name: qty[1].trim(), detail };
  }
  return { name: text };
}

function guessSection(item: ParsedItem): SectionKey {
  const hay = `${item.name} ${item.detail ?? ""}`;
  for (const { section, re } of KEYWORD_SECTION) if (re.test(hay)) return section;
  return "supplies";
}

function emptySections(): Record<SectionKey, ParsedItem[]> {
  return { instruments: [], sutures: [], supplies: [], medications: [], equipment: [] };
}

/** Normalize a possible section-header line to a section key, or null. Accepts
 *  "Instruments", "SUTURES:", "Medications & Irrigation", with optional counts
 *  like "Supplies (4)". */
function asSectionHeader(line: string): SectionKey | null {
  const cleaned = line.trim().replace(/[:\-–—]+\s*$/, "").replace(/\s*\(\d+\)\s*$/, "").trim().toLowerCase();
  if (!cleaned || cleaned.length > 28) return null;
  if (SECTION_ALIASES[cleaned]) return SECTION_ALIASES[cleaned];
  // First significant word (so "Instrument tray:" → instruments).
  const first = cleaned.split(/\s+/)[0];
  return SECTION_ALIASES[first] ?? null;
}

/** Strip a leading field label and its separator, returning the value. */
function labelValue(line: string, re: RegExp): string {
  return line.replace(re, "").replace(/^\s*[:\-–—]\s*/, "").trim();
}

export function parseCardText(text: string): ParsedCard {
  const out: ParsedCard = { sections: emptySections(), itemCount: 0 };
  const rawLines = text.split(/\r?\n/);
  let current: SectionKey | null = null;
  let sawSectionHeader = false;
  const looseItems: ParsedItem[] = []; // items seen before any header — sectioned by keyword later

  for (const raw of rawLines) {
    const line = raw.replace(/\t/g, " ").trim();
    if (!line) continue;

    // 1) Field labels win (only fill the first time we see each).
    const label = FIELD_LABELS.find((l) => l.re.test(line));
    const isBullet = BULLET_RE.test(line);
    if (label && !isBullet) {
      const value = labelValue(line, label.re);
      if (value && !out[label.key]) {
        if (label.key === "surgeonName") out.surgeonName = value.replace(/,.*$/, "").trim();
        else (out as unknown as Record<string, string>)[label.key] = value;
      }
      continue;
    }

    // 2) Section headers switch the active section.
    const header = !isBullet ? asSectionHeader(line) : null;
    if (header) {
      current = header;
      sawSectionHeader = true;
      continue;
    }

    // 3) A bare "Dr. Somebody" line, before any items, is the surgeon.
    if (!out.surgeonName && !current && !isBullet && /^dr\.?\s+[a-z]/i.test(line) && line.length < 40) {
      out.surgeonName = line.replace(/,.*$/, "").trim();
      continue;
    }

    // 4) First meaningful line with no procedure yet becomes the procedure title.
    if (!out.procedure && !current && !isBullet && !sawSectionHeader) {
      out.procedure = line.replace(/[:.]$/, "").trim();
      continue;
    }

    // 5) Otherwise it's an item.
    const item = splitDetail(line.replace(BULLET_RE, ""));
    if (!item.name) continue;
    if (current) {
      out.sections[current].push(item);
      out.itemCount++;
    } else {
      looseItems.push(item);
    }
  }

  // Distribute pre-header items by keyword guess.
  for (const item of looseItems) {
    out.sections[guessSection(item)].push(item);
    out.itemCount++;
  }

  return out;
}

/** A short, human summary of what was recognized — shown live under the text
 *  box so the tech can see the parse working before they commit. */
export function summarizeParse(parsed: ParsedCard): string {
  const bits: string[] = [];
  if (parsed.procedure) bits.push(`“${parsed.procedure}”`);
  if (parsed.surgeonName) bits.push(parsed.surgeonName);
  const secBits = SECTIONS.filter((s) => parsed.sections[s.key].length)
    .map((s) => `${parsed.sections[s.key].length} ${s.label.toLowerCase().split(" ")[0]}`);
  const head = bits.length ? bits.join(" · ") : "No title detected yet";
  if (!parsed.itemCount) return `${head} — no items detected yet.`;
  return `${head} — ${parsed.itemCount} item${parsed.itemCount === 1 ? "" : "s"} (${secBits.join(", ")}).`;
}
