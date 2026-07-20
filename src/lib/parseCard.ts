import type { SectionKey } from "../types";
import { SECTIONS } from "../types";

// Turn the free text of a preference card — pasted from an email/PDF, typed by
// hand, or produced by OCR from a photo of a printed card — into a structured
// draft the normal card editor can open. This is deliberately forgiving: real
// cards are messy, OCR is imperfect, so we recover as much structure as we can
// and let the tech fix the rest in the editor.
//
// It understands two shapes:
//  • Simple lists ("Instruments" / "- Lap chole tray") people type themselves.
//  • Hospital system printouts (AORS / Genesis / S3 style): a labeled header
//    block (PREF CARD / PROCEDURE / STAFF / SERVICE / GLOVES / POSITION /
//    PREP), many fine-grained sections ("Peel Packs", "Suture Cart", "OR
//    Equipment", "Clean Room"…), quantity-prefixed items with catalog numbers
//    and "(Avail)" flags, wrapped lines, and a NOTES/SPECIAL INSTRUCTIONS list.

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

// Where each hospital-system section lands in ORSync's five sections.
const SECTION_ALIASES: Record<string, SectionKey> = {
  // instruments & trays
  instrument: "instruments", instruments: "instruments", tray: "instruments", trays: "instruments",
  instrumentation: "instruments", "instruments & trays": "instruments",
  "peel packs": "instruments", "peel pack": "instruments",
  // sutures
  suture: "sutures", sutures: "sutures", suturing: "sutures", "suture & needle": "sutures",
  "suture cart": "sutures",
  // supplies & disposables
  supply: "supplies", supplies: "supplies", disposable: "supplies", disposables: "supplies",
  "supplies & disposables": "supplies", soft: "supplies", "soft goods": "supplies",
  "sterile supplies": "supplies", packs: "supplies", pack: "supplies",
  "gowns/gloves": "supplies", gowns: "supplies", gloves: "supplies",
  "blades/bits/burrs": "supplies", blades: "supplies", burrs: "supplies",
  "needles, syringes, iv": "supplies", needles: "supplies", syringes: "supplies",
  cautery: "supplies", sponges: "supplies", sponge: "supplies",
  dressing: "supplies", dressings: "supplies",
  drapes: "supplies", drape: "supplies",
  opth: "supplies", ophth: "supplies", positioning: "supplies",
  "clean room": "supplies", clinic: "supplies", "clinic - dental": "supplies",
  // medications & irrigation
  medication: "medications", medications: "medications", med: "medications", meds: "medications",
  irrigation: "medications", drug: "medications", drugs: "medications", "medications & irrigation": "medications",
  pharmacy: "medications", solutions: "medications",
  // equipment
  equipment: "equipment", equip: "equipment", equipments: "equipment", devices: "equipment",
  "or equipment": "equipment", video: "equipment",
};

// Headers that switch into "these lines are card notes" mode — the
// NOTES/SPECIAL INSTRUCTIONS block on hospital printouts.
const NOTES_HEADER_RE = /^notes?\s*[/&]?\s*(special\s*)?(instructions?)?$|^special\s*instructions?$|^comments?$/i;

// Labeled header fields. `key` is where the value lands; "ignore" drops it.
const FIELD_LABELS: { key: keyof ParsedCard | "notes+" | "ignore"; re: RegExp; strip?: RegExp }[] = [
  // "PREF CARD: 4138 - Osteotomy, Lefort I…" — the best title; strip the card number.
  { key: "procedure", re: /^pref\.?\s*card\b/i, strip: /^[#\d]+\s*[-–—]\s*/ },
  { key: "procedure", re: /^(procedure|proc|case|surgery|operation)\b/i, strip: /^\d+\s*[-–—]\s*/ },
  { key: "surgeonName", re: /^(surgeon|physician|doctor|provider|staff|md)\b/i },
  { key: "specialty", re: /^(specialty|speciality|service|discipline)\b/i },
  { key: "position", re: /^(position|positioning)\b/i },
  { key: "prep", re: /^(skin\s*prep|prep|prepping)\b/i },
  { key: "draping", re: /^(draping|drape|drapes)\b/i },
  { key: "notes+", re: /^(gloves?)\b/i }, // surgeon's gloves → keep visible in notes
  { key: "notes+", re: /^(notes?|comments?|quirks?|reminders?|special\s*instructions?)\b/i },
  { key: "ignore", re: /^(last\s*update|update\s*by|pull\s*by|pull\s*date|page|printed|updated)\b/i },
];

// Lines that are print/screen junk, not card content.
const NOISE_RES: RegExp[] = [
  /^page\s*:?\s*\d+(\s*of\s*\d+)?$/i,
  /^https?:\/\//i,
  /^www\./i,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // bare dates
  /^\d+(\.\d+)?%$/, // zoom levels
  /^\d+\s*\/\s*\d+$/, // "2 / 2"
  /^search$/i,
  /^[\s\-—_=~.·•]*$/, // rules / separators / empty
];

// Keyword hints used to guess a section for items with no section header.
const KEYWORD_SECTION: { section: SectionKey; re: RegExp }[] = [
  { section: "sutures", re: /\b(vicryl|pds|monocryl|prolene|nylon|silk|chromic|ethibond|dermabond|stratafix|\d-0|suture)\b/i },
  { section: "medications", re: /\b(saline|irrigation|lidocaine|marcaine|bupivacaine|xylocaine|epinephrine|\bepi\b|heparin|thrombin|antibiotic|cefazolin|ancef|gelfoam|surgicel|hemostatic|\d+\s?(mg|ml|cc|units?)\b|local|injectable)\b/i },
  { section: "equipment", re: /\b(unit|tower|insufflator|camera|monitor|\besu\b|bovie|generator|pump|warmer|microscope|c-?arm|headlight|light\s?source|machine|drill|saw|tourniquet|console|footswitch)\b/i },
  { section: "instruments", re: /\b(tray|set|pan|forceps|clamp|scissors|retractor|needle\s?driver|dissector|kelly|hemostat|scalpel|blade|handle|elevator|rongeur|curette|osteotome)\b/i },
];

const BULLET_RE = /^\s*(?:[-–—•*·▪◻☐□■◦●○‣_]+|\d+[.)]|[a-z][.)])\s+/i;

/** True for OCR garbage: too few letters, or drowning in symbols. Keeps real
 *  short items ("SCD", "ESU") while dropping "| a 0" and "= =e —_—" lines. */
function looksLikeJunk(text: string): boolean {
  const letters = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (letters < 3) return true;
  const dense = text.replace(/\s/g, "");
  return letters / dense.length < 0.45;
}
// Leading checkbox/blank glyphs hospital printouts put before the quantity.
const CHECKBOX_RE = /^[\s_☐□■◻▢[\]()｜|]*(?:[-–—]{1,2}\s+)?/;

/** Split an item line into name + detail on clear separators only. */
function splitDetail(line: string): ParsedItem {
  const text = line.trim();
  const paren = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren && paren[1].trim()) return { name: paren[1].trim(), detail: paren[2].trim() };
  const colon = text.match(/^([^:]+):\s+(.+)$/);
  if (colon && colon[1].trim() && !/\d$/.test(colon[1])) return { name: colon[1].trim(), detail: colon[2].trim() };
  const dash = text.match(/^(.+?)\s+(?:[—–]|-{1,2})\s+(.+)$/);
  if (dash && dash[1].trim() && dash[2].trim()) return { name: dash[1].trim(), detail: dash[2].trim() };
  const qty = text.match(/^(.+?)\s+(?:[x×]\s?\d+|qty\.?\s*\d+|\d+\s?(?:ea|each|pk|packs?))\s*$/i);
  if (qty && qty[1].trim()) {
    const detail = text.slice(qty[1].length).trim();
    return { name: qty[1].trim(), detail };
  }
  return { name: text };
}

/** Parse one item line: checkbox glyphs, "2 " quantity prefix, "(Avail)" flag,
 *  catalog parentheticals. Returns null for lines with no content left. */
function parseItemLine(raw: string): ParsedItem | null {
  let text = raw.replace(CHECKBOX_RE, "").replace(BULLET_RE, "").trim();
  if (!text) return null;

  const extras: string[] = [];
  // "(Avail)" = stocked in the room, don't pull — keep it, techs care.
  if (/\(avail\.?\)\s*$/i.test(text)) {
    extras.push("Avail");
    text = text.replace(/\s*\(avail\.?\)\s*$/i, "").trim();
  }
  // Leading quantity: "2 BOWLS, BLUE (61200)".
  const qty = text.match(/^(\d{1,3})\s+(?=\D)(.+)$/);
  let count: number | undefined;
  if (qty) {
    count = parseInt(qty[1], 10);
    text = qty[2].trim();
  }
  if (!text) return null;

  const item = splitDetail(text);
  if (looksLikeJunk(item.name)) return null;
  const detailParts = [
    ...(count && count > 1 ? [`×${count}`] : []),
    ...(item.detail ? [item.detail] : []),
    ...extras,
  ];
  return { name: item.name, detail: detailParts.length ? detailParts.join(" · ") : undefined };
}

function guessSection(item: ParsedItem): SectionKey {
  const hay = `${item.name} ${item.detail ?? ""}`;
  for (const { section, re } of KEYWORD_SECTION) if (re.test(hay)) return section;
  return "supplies";
}

function emptySections(): Record<SectionKey, ParsedItem[]> {
  return { instruments: [], sutures: [], supplies: [], medications: [], equipment: [] };
}

/** Normalize a possible section-header line to a section key, or null. */
function asSectionHeader(line: string): SectionKey | null {
  const cleaned = line.trim().replace(/[:\-–—]+\s*$/, "").replace(/\s*\(\d+\)\s*$/, "").trim().toLowerCase();
  if (!cleaned || cleaned.length > 30) return null;
  if (SECTION_ALIASES[cleaned]) return SECTION_ALIASES[cleaned];
  const first = cleaned.split(/[\s,/]+/)[0];
  return SECTION_ALIASES[first] ?? null;
}

function labelValue(line: string, re: RegExp): string {
  return line.replace(re, "").replace(/^\s*[:\-–—]\s*/, "").trim();
}

export function parseCardText(text: string): ParsedCard {
  const out: ParsedCard = { sections: emptySections(), itemCount: 0 };
  const notesParts: string[] = [];
  const rawLines = text.split(/\r?\n/);

  let current: SectionKey | null = null;
  let inNotes = false;
  let sawSectionHeader = false;
  const looseItems: ParsedItem[] = [];
  // Wrapped-line stitching: hospital printouts break long items after a comma
  // ("…ORTHOGNATHIC MATRIX,\nSYNTHES") or wrap a catalog number ("(0703-…)").
  let lastItem: ParsedItem | null = null;
  let lastEndedWithComma = false;

  for (const raw of rawLines) {
    const line = raw.replace(/\t/g, " ").trim();
    if (!line) { lastEndedWithComma = false; continue; }
    if (NOISE_RES.some((re) => re.test(line))) continue;

    const isBullet = BULLET_RE.test(line) || /^[_☐□■◻▢]/.test(line);

    // 1) Notes-section header ("NOTES/SPECIAL INSTRUCTIONS").
    if (NOTES_HEADER_RE.test(line.replace(/[:\-–—]+\s*$/, "").trim())) {
      inNotes = true;
      current = null;
      lastItem = null;
      continue;
    }

    // 2) Labeled header fields ("PROCEDURE: …", "STAFF: …").
    const label = FIELD_LABELS.find((l) => l.re.test(line));
    if (label && /^[a-z .]*[a-z]\s*[:\-–—]/i.test(line)) { // needs a real "Label:" shape
      const rawValue = labelValue(line, label.re);
      const value = label.strip ? rawValue.replace(label.strip, "") : rawValue;
      if (label.key === "ignore") continue;
      if (label.key === "notes+") {
        if (rawValue) {
          const labelWord = line.match(label.re)?.[0] ?? "Note";
          notesParts.push(/^gloves?/i.test(labelWord) ? `Gloves: ${rawValue}` : rawValue);
        }
        continue;
      }
      if (value && !out[label.key]) {
        if (label.key === "surgeonName") out.surgeonName = value.replace(/,.*$/, "").trim();
        else (out as unknown as Record<string, string>)[label.key] = value;
      }
      continue;
    }

    // 3) Section headers.
    const header = asSectionHeader(line);
    if (header && !/^\d/.test(line)) {
      current = header;
      inNotes = false;
      sawSectionHeader = true;
      lastItem = null;
      continue;
    }

    // 4) Inside the notes block, every content line is a note.
    if (inNotes) {
      notesParts.push(line.replace(BULLET_RE, "").trim());
      continue;
    }

    // 5) A bare "Dr. Somebody" line before any items is the surgeon.
    if (!out.surgeonName && !current && !isBullet && /^dr\.?\s+[a-z]/i.test(line) && line.length < 40) {
      out.surgeonName = line.replace(/,.*$/, "").trim();
      continue;
    }

    // 6) First meaningful line with no procedure yet becomes the title —
    //    but never an OCR-noise fragment.
    if (!out.procedure && !current && !isBullet && !sawSectionHeader) {
      if (!looksLikeJunk(line) && (line.match(/[a-zA-Z]/g) ?? []).length >= 4) {
        out.procedure = line.replace(/[:.]$/, "").trim();
      }
      continue;
    }

    // 7) Wrapped-line stitching before treating it as a new item.
    if (lastItem) {
      // "(0703-046-000)" — a catalog number wrapped onto its own line.
      if (/^\(.+\)$/.test(line)) {
        const inner = line.slice(1, -1).trim();
        lastItem.detail = lastItem.detail ? `${lastItem.detail} · ${inner}` : inner;
        lastEndedWithComma = false;
        continue;
      }
      // "…MATRIX,\nSYNTHES" — continuation after a trailing comma.
      if (lastEndedWithComma && !/^\d/.test(line) && line.length <= 32 && line === line.toUpperCase()) {
        lastItem.name = `${lastItem.name.replace(/,\s*$/, "")}, ${line.replace(/[,.]$/, "")}`;
        lastEndedWithComma = /,\s*$/.test(line);
        continue;
      }
    }

    // 8) Otherwise it's an item.
    const item = parseItemLine(line);
    if (!item?.name) continue;
    if (current) {
      out.sections[current].push(item);
    } else {
      looseItems.push(item);
    }
    out.itemCount++;
    lastItem = item;
    lastEndedWithComma = /,\s*$/.test(line.replace(/\s*\(avail\.?\)\s*$/i, ""));
  }

  // Distribute pre-header items by keyword guess.
  for (const item of looseItems) {
    const target = guessSection(item);
    const list = out.sections[target];
    // looseItems were already counted; just move them into place.
    if (!list.includes(item)) list.push(item);
  }

  if (notesParts.length) {
    out.notes = out.notes ? `${out.notes}\n${notesParts.join("\n")}` : notesParts.join("\n");
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
