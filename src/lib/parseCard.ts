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
  /** How many to pull (only set when > 1). */
  qty?: number;
  /** S3's "(Avail)": pull it but keep it unopened unless asked for. */
  hold?: boolean;
  /** Catalog / reference number printed in parentheses ("(EGIA45AVM)"). */
  ref?: string;
}

export interface ParsedCard {
  procedure?: string;
  surgeonName?: string;
  specialty?: string;
  position?: string;
  prep?: string;
  draping?: string;
  notes?: string;
  /** "7.5" from "Gloves: 7.5 Biogel, latex-free": the (over) glove size. */
  gloveSize?: string;
  /** Under-glove size when the card shows double gloving ("8/8", "7.5 under"). */
  gloveUnder?: string;
  /** "Biogel, latex-free" from the same line. */
  gloveType?: string;
  /** The paper card's own "Last updated" date, as an ISO day (YYYY-MM-DD). */
  sourceUpdated?: string;
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
  "fluid cart": "medications", fluids: "medications", fluid: "medications",
  "clean room": "supplies", clinic: "supplies", "clinic - dental": "supplies",
  // medications & irrigation
  medication: "medications", medications: "medications", med: "medications", meds: "medications",
  irrigation: "medications", drug: "medications", drugs: "medications", "medications & irrigation": "medications",
  pharmacy: "medications", solutions: "medications",
  // equipment
  equipment: "equipment", equip: "equipment", "positioning room": "equipment", "positioning equipment": "equipment", equipments: "equipment", devices: "equipment",
  "or equipment": "equipment", video: "equipment",
};

// Supply sub-sections a printout names on purpose ("Dressing", "Drapes"):
// what the card files there stays there. Only the catch-all Supplies (and
// facility-custom headers) let a plain suture, drug or device move out.
const SPECIFIC_SUPPLY_HEADERS = new Set([
  "dressing", "dressings", "drapes", "drape", "gowns/gloves", "gowns", "gloves", "blades/bits/burrs", "blades", "burrs",
  "needles, syringes, iv", "needles", "syringes", "packs", "pack", "peel packs", "sponges", "sponge", "cautery", "positioning", "opth", "ophth",
]);
/** "Laparoscopic (cont)", "Supplies cont'd", "Instruments - continued" */
const CONT_RE = /\s*[-–—]?\s*\(?\s*cont(?:'?d|inued|\.)?\s*\)?\s*$/i;

// Headers that switch into "these lines are card notes" mode — the
// NOTES/SPECIAL INSTRUCTIONS block on hospital printouts.
const NOTES_HEADER_RE = /^notes?\s*[/&]?\s*(special\s*)?(instructions?)?$|^special\s*instructions?$|^comments?$/i;

// Labeled header fields. `key` is where the value lands; "ignore" drops it.
const FIELD_LABELS: { key: keyof ParsedCard | "notes+" | "ignore" | "gloves" | "updated"; re: RegExp; strip?: RegExp }[] = [
  // "PREF CARD: 4138 - Osteotomy, Lefort I…" — the best title; strip the card number.
  { key: "procedure", re: /^pref\.?\s*card\b/i, strip: /^[#\d]+\s*[-–—]\s*/ },
  { key: "procedure", re: /^(procedures?|procs?|cases?|surger(?:y|ies)|operations?)\b/i, strip: /^\d+\s*[-–—]\s*/ },
  { key: "surgeonName", re: /^(surgeon|physician|doctor|provider|staff|md)\b/i },
  { key: "specialty", re: /^(specialty|speciality|service|discipline)\b/i },
  { key: "position", re: /^(position|positioning)\b/i },
  { key: "prep", re: /^(skin\s*prep|prep|prepping)\b/i },
  { key: "draping", re: /^(draping|drape|drapes)\b/i },
  { key: "gloves", re: /^(glove\s*size|gloves?)\b/i },
  { key: "notes+", re: /^(notes?|comments?|quirks?|reminders?|special\s*instructions?)\b/i },
  { key: "updated", re: /^(last\s*updated?|last\s*revised|revised|rev(?:ision)?\s*date|date\s*updated|updated(?:\s*on)?)\b/i },
  { key: "ignore", re: /^(update\s*by|updated\s*by|pull\s*by|pull\s*date|page|printed)\b/i },
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
  /\w=\d+\s*$/, // URL query debris ("…card=4138")
  /\b[\w-]+\.(com|org|net|gov|edu|mil)\b/i, // web addresses, even OCR-garbled
  /^[\s\-—_=~.·•]*$/, // rules / separators / empty
];

// Keyword hints used to guess a section for items with no section header.
const KEYWORD_SECTION: { section: SectionKey; re: RegExp }[] = [
  { section: "sutures", re: /\b(vicryl|pds|monocryl|prolene|nylon|ethilon|silk|chromic|ethibond|maxon|biosyn|caprosyn|polysorb|v-?loc|quill|stratafix|fiberwire|mersilene|ti-?cron|surgilon|dermabond|steri-?strips?|\d-0|suture|(ct|sh|ps|fs|rb|cp)-\d)\b/i },
  { section: "medications", re: /\b(saline|irrigation|lidocaine|marcaine|bupivacaine|ropivacaine|naropin|exparel|xylocaine|epinephrine|\bepi\b|heparin|thrombin|antibiotic|cefazolin|ancef|vancomycin|vanco|gentamicin|bacitracin|kenalog|toradol|ketorolac|decadron|dexamethasone|glycine|sorbitol|sterile water|lactated ringers?|methylene blue|indigo carmine|icg|papaverine|tisseel|floseal|evicel|gelfoam|surgicel|hemostatic|\d+(\.\d+)?\s?(mg|mcg|units?)\b|\d+(\.\d+)?\s?%|local|injectable)\b/i },
  { section: "equipment", re: /\b(unit|tower|insufflator|camera|monitor|\besu\b|bovie|generator|laser|cell saver|bair hugger|warmer|pump|microscope|c-?arm|fluoro|doppler|nerve monitor|nim|stealth|navigation|headlight|light\s?source|machine|drill|saw|tourniquet|console|footswitch|smoke evac\w*|stirrups|mayfield|jackson table|beach chair|arm ?board|positioner)\b/i },
  { section: "instruments", re: /\b(tray|set|pan|forceps|clamp|scissors|retractor|needle\s?driver|needle holder|dissector|kelly|hemostat|metz\w*|debakey|allis|babcock|kocher|army-?navy|richardson|deaver|weitlaner|gelpi|bookwalter|balfour|freer|penfield|kerrison|cobb|scalpel|knife handle|handle|elevator|rongeur|curette|osteotome|mallet|rasp)\b/i },
];

// Disposable-sounding words that keep an item in Supplies even when it also
// names a device or drug ("camera drape", "60 ml syringe", "saw blade").
const SUPPLY_WORDS_RE = /\b(drape|cover|sleeve|bag|bit|blade|tubing|pad|electrode|pencil|tip|cord|syringe|needle|cup|basin|bowl|sponge|lap|towel|glove|gown|canister|liner|cable|trocar|sheath)s?\b/i;

const BULLET_RE = /^\s*(?:[-–—•*·▪◻☐□■◦●○‣_]+|\d+[.)]|[a-z][.)])\s+/i;

/** True for OCR garbage: too few letters, or drowning in symbols. Keeps real
 *  short items ("SCD", "ESU") while dropping "| a 0" and "= =e —_—" lines. */
function looksLikeJunk(text: string): boolean {
  const letters = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (letters < 3) return true;
  const dense = text.replace(/\s/g, "");
  // Digits are real content too ("VICRYL, #0, UR-6, 37\"" is mostly symbols).
  const alnum = (text.match(/[a-zA-Z0-9]/g) ?? []).length;
  return alnum / dense.length < 0.55;
}
// Leading checkbox/blank glyphs hospital printouts put before the quantity.
const CHECKBOX_RE = /^[\s_☐□■◻▢[\]()｜|]*(?:[-–—]{1,2}\s+)?/;

/** A catalog / reference code: no spaces, has a digit ("41180", "EGIA45AVM",
 *  "0703-046-000", "LT-C02"); "REGULAR" or "fridge" are details. */
const isRefCode = (s: string) => /^[A-Z0-9][A-Z0-9\-./]{2,}$/i.test(s) && /\d/.test(s);

/** Split an item line into name + detail on clear separators only. */
function splitDetail(line: string): ParsedItem {
  const text = line.trim();
  const paren = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren && paren[1].trim()) {
    const name = paren[1].trim().replace(/[,\s]+$/, "");
    const inner = paren[2].trim();
    return isRefCode(inner) ? { name, ref: inner } : { name, detail: inner };
  }
  const colon = text.match(/^([^:]+):\s+(.+)$/);
  if (colon && colon[1].trim() && !/\d$/.test(colon[1])) return { name: colon[1].trim(), detail: colon[2].trim() };
  const dash = text.match(/^(.+?)\s+(?:[—–]|-{1,2})\s+(.+)$/);
  if (dash && dash[1].trim() && dash[2].trim()) return { name: dash[1].trim(), detail: dash[2].trim() };
  // Scanned tables keep their column gaps as 3+ spaces: "Lap sponges   10"
  // is a quantity column, "Monocryl 4-0 PS-2   Y3216H" a catalog column.
  const cols = text.match(/^(.+?)\s{3,}(.+)$/);
  if (cols && cols[1].trim()) {
    const right = cols[2].trim();
    const n = right.match(/^(\d{1,3})(?:\s*(?:ea|each|pk|x))?$/i);
    if (n) return { name: cols[1].trim(), qty: parseInt(n[1], 10) > 1 ? parseInt(n[1], 10) : undefined };
    return { name: cols[1].trim(), detail: right.replace(/\s{2,}/g, " · ") };
  }
  // Trailing quantity ("Raytec x2", "Towels qty 4", "Blades 2 ea") becomes a
  // structured qty, not detail text.
  const qty = text.match(/^(.+?)\s+(?:[x×]\s?(\d+)|qty\.?\s*(\d+)|(\d+)\s?(?:ea|each|pk|packs?))\s*$/i);
  if (qty && qty[1].trim()) {
    const n = parseInt(qty[2] ?? qty[3] ?? qty[4], 10);
    return { name: qty[1].trim(), qty: n > 1 ? n : undefined };
  }
  return { name: text };
}

/** Parse one item line: checkbox glyphs, "2 " quantity prefix, "(Avail)" flag,
 *  catalog parentheticals. Returns null for lines with no content left. */
function parseItemLine(raw: string): ParsedItem | null {
  let text = raw.replace(CHECKBOX_RE, "").replace(BULLET_RE, "").trim();
  if (!text) return null;

  // "(Avail)" = pull it, keep it unopened unless asked — a structured hold.
  let hold = false;
  if (/\(avail\.?\)\.?\s*$/i.test(text)) {
    hold = true;
    text = text.replace(/\s*\(avail\.?\)\.?\s*$/i, "").trim();
  }
  // Printouts end lines with stray periods ("VERESS NEEDLE 120MM..").
  text = text.replace(/\s*\.+$/, "").trim();
  // "1 2 RELOAD…": a checkbox blank read as "1" ahead of the real count.
  // (Not "1 60 ml syringe": there the second number is a size.)
  text = text.replace(/^1\s+(?=\d{1,3}\s+(?!(?:ml|cc|mm|cm|fr|french|in|oz|l|g|mg|mcg|ga)\b)[A-Za-z])/i, "");
  // Leading quantity: "2 BOWLS, BLUE (61200)".
  // ("1 60 ml syringe" too: a count before a measured size.)
  const qty = text.match(/^(\d{1,3})\s+(?=\D|\d+(?:\.\d+)?\s?(?:ml|cc|mm|cm|fr|french|in|oz|l)\b|\d+(?:\.\d+)?\s?%)(.+)$/i);
  let count: number | undefined;
  if (qty) {
    count = parseInt(qty[1], 10);
    text = qty[2].trim();
  }
  if (!text) return null;

  const item = splitDetail(text);
  if (looksLikeJunk(item.name)) return null;
  return {
    name: item.name.replace(/[,\s]+$/, ""),
    detail: item.detail,
    ref: item.ref,
    qty: count && count > 1 ? count : item.qty,
    hold: hold || undefined,
  };
}

function guessSection(item: ParsedItem): SectionKey {
  const hay = `${item.name} ${item.detail ?? ""}`;
  for (const { section, re } of KEYWORD_SECTION) {
    if (!re.test(hay)) continue;
    if ((section === "equipment" || section === "medications") && SUPPLY_WORDS_RE.test(item.name) && !strongDrug(hay)) continue;
    return section;
  }
  return "supplies";
}

function strongDrug(hay: string): boolean {
  return /\b(lidocaine|marcaine|bupivacaine|ropivacaine|exparel|epinephrine|heparin|thrombin|cefazolin|ancef|vancomycin|gentamicin|kenalog|toradol|ketorolac|dexamethasone|papaverine)\b/i.test(hay);
}

/** Where an item goes when it sits under a section header: the header's
 *  section, unless the item doesn't fit it and is plainly a suture, a
 *  medication, or a piece of equipment (Supplies is the usual catch-all, and
 *  a header the scan missed leaves the previous section running on). */
function placeItem(current: SectionKey, item: ParsedItem, specificHeader: boolean): SectionKey {
  if (current === "instruments" || specificHeader) return current;
  const hay = `${item.name} ${item.detail ?? ""}`;
  const own = KEYWORD_SECTION.find((k) => k.section === current);
  if (own && own.re.test(hay)) return current;
  const guess = guessSection(item);
  // A stocked item with a catalog number is a disposable (tourniquet cuffs,
  // pump tubing), not the device itself.
  if (guess === "equipment" && item.ref) return current;
  return guess === "sutures" || guess === "medications" || guess === "equipment" ? guess : current;
}

function emptySections(): Record<SectionKey, ParsedItem[]> {
  return { instruments: [], sutures: [], supplies: [], medications: [], equipment: [] };
}

/** A header line as a lookup key: lower case, no trailing colon or count. */
function headerKey(line: string): string {
  return line.trim().replace(/[:\-–—]+\s*$/, "").replace(/\s*\(\d+\)\s*$/, "").trim().toLowerCase();
}

/** Normalize a possible section-header line to a section key, or null. */
function asSectionHeader(line: string): SectionKey | null {
  const cleaned = headerKey(line);
  if (!cleaned) return null;
  if (SECTION_ALIASES[cleaned]) return SECTION_ALIASES[cleaned];
  // Long sub-section names ("Sterile Supplies, Needles, Syringes, IV
  // Supplies", "Sterile Supplies Drapes"): match their opening words.
  if (cleaned.length > 30 && (/\d/.test(cleaned) || cleaned.length > 60)) return null;
  const words = cleaned.split(/[\s,/]+/).filter(Boolean);
  for (let n = Math.min(words.length, 3); n >= 1; n--) {
    const k = SECTION_ALIASES[words.slice(0, n).join(" ")];
    if (k) return k;
  }
  return null;
}

/** Item-shaped: a checkbox/quantity prefix ("_ 1 SCOPE…") or a bullet. */
const ITEMISH_RE = /^[\s_☐□■◻▢]*\d{1,3}\s+\D/;
function isItemish(line: string): boolean {
  return ITEMISH_RE.test(line) || BULLET_RE.test(line);
}

/** Could this short, clean line be a facility-custom section header
 *  ("Urology", "Fluid Cart")? Confirmed only when the next line is an item. */
function isHeaderish(line: string): boolean {
  if (line.length > 28 || /[\d;:,.()]/.test(line)) return false;
  const words = line.split(/[\s/&]+/).filter(Boolean);
  if (!words.length || words.length > 4) return false;
  const dense = line.replace(/\s/g, "");
  return dense.length > 0 && (line.match(/[a-zA-Z]/g) ?? []).length / dense.length > 0.8;
}

/** The value after a label, up to the next table column (3+ spaces). */
function labelValue(line: string, re: RegExp): string {
  return line.replace(re, "").replace(/^\s*[:\-–—]\s*/, "").trim().split(/\s{3,}/)[0].trim();
}

/** "Debuysere, Sean" -> "Sean Debuysere"; "Dr. Chen, Michael" -> "Dr. Chen". */
function surgeonFrom(value: string): string {
  const m = value.match(/^([A-Za-z'’-]+),\s*([A-Za-z'’-]+)(?:\s+[A-Za-z]\.?)?$/);
  if (m && !/^dr$/i.test(m[1])) return `${m[2]} ${m[1]}`;
  return value.replace(/,.*$/, "").trim();
}

/** Suture lengths lose their inch mark to OCR: 18" reads as 18i or 18Ảồi. */
function fixInchMarks(line: string): string {
  return line.replace(/(\b\d{1,2})(?:[^\x00-\x7F]{1,4}i?|i|″)(?=[\s,.;)]|$)/g, '$1"');
}

export function parseCardText(text: string): ParsedCard {
  const out: ParsedCard = { sections: emptySections(), itemCount: 0 };
  const notesParts: string[] = [];
  let notesBulleted = false;
  let notesStart = 0; // where the NOTES block's own lines begin
  const rawLines = text.split(/\r?\n/);

  let current: SectionKey | null = null;
  let inNotes = false;
  let sawSectionHeader = false;
  const looseItems: ParsedItem[] = [];
  // Wrapped-line stitching: hospital printouts break long items after a comma
  // ("…ORTHOGNATHIC MATRIX,\nSYNTHES") or wrap a catalog number ("(0703-…)").
  let lastItem: ParsedItem | null = null;
  let lastEndedWithComma = false;
  // S3 prints the PROCEDURES list over several wrapped, semicolon-packed
  // lines; once that label is seen, such lines are list debris, not items.
  let dropProcList = false;
  let titleGuessed = false;
  // A procedure list that ends with "," continues on the next line ("Knee").
  let procWrap = false;

  // Scans leave table rules behind as runs of dashes/underscores; drop them.
  const lines = rawLines.map((r) => fixInchMarks(r.replace(/\t/g, " ").replace(/(\s+[_—–-]+|[_—–-]{2,})[\s_—–-]*$/, "").replace(/[_—–]{3,}/g, " ").trim()));
  let specificHeader = false;

  // "LAST UPDATE" often heads a table column with the date a row below it.
  const upAt = lines.findIndex((l) => /\blast\s*(updated?|revised)\b/i.test(l));
  if (upAt >= 0) {
    for (const l of lines.slice(upAt, upAt + 3)) {
      const m = l.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/);
      const d = m ? parseLooseDate(m[0]) : undefined;
      if (d) { out.sourceUpdated = d; break; }
    }
  }
  // Section names, for spotting a header's broken echo ("INSTRU" under "INSTRUMENTS").
  const headerWords = Object.keys(SECTION_ALIASES).filter((k) => /^[a-z]+$/.test(k) && k.length >= 6);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) { lastEndedWithComma = false; continue; }
    if (NOISE_RES.some((re) => re.test(line))) continue;

    const isBullet = BULLET_RE.test(line) || /^[_☐□■◻▢]/.test(line);

    // 1) Notes-section header ("NOTES/SPECIAL INSTRUCTIONS").
    if (NOTES_HEADER_RE.test(line.replace(/[:\-–—]+\s*$/, "").trim())) {
      inNotes = true;
      notesStart = notesParts.length;
      current = null;
      lastItem = null;
      continue;
    }

    // 2) Labeled header fields ("PROCEDURE: …", "STAFF: …").
    const label = FIELD_LABELS.find((l) => l.re.test(line));
    if (label && /^[a-z .]*[a-z]\s*[:\-–—]/i.test(line)) { // needs a real "Label:" shape
      const rawValue = labelValue(line, label.re);
      const value = label.strip ? rawValue.replace(label.strip, "") : rawValue;
      dropProcList = label.key === "procedure";
      procWrap = label.key === "procedure" && /[,;]\s*$/.test(rawValue);
      if (label.key === "ignore") continue;
      if (label.key === "gloves") {
        // The full line stays in notes (double-gloving, per-person sizes);
        // size and brand fill their own fields only when unambiguous.
        if (rawValue) notesParts.push(`Gloves: ${rawValue}`);
        const sizes = rawValue.match(/(?:^|[^\d.])(?:5|6|7|8|9)(?:\.5)?(?![\d.])/g) ?? [];
        const g = parseGloves(rawValue);
        const pair = parseGlovePair(rawValue);
        if (pair && !out.gloveSize) {
          out.gloveSize = pair.over;
          out.gloveUnder = pair.under;
        } else if (sizes.length === 1 && g.size && !out.gloveSize) {
          out.gloveSize = g.size;
        }
        if ((sizes.length <= 1 || pair) && g.type && !/\d|\b(dr|over|under)\b/i.test(g.type) && g.type.length <= 40 && !out.gloveType) out.gloveType = g.type;
        continue;
      }
      if (label.key === "updated") {
        const d = parseLooseDate(rawValue);
        if (d && !out.sourceUpdated) out.sourceUpdated = d;
        continue;
      }
      if (label.key === "notes+") {
        if (rawValue) {
          const labelWord = line.match(label.re)?.[0] ?? "Note";
          notesParts.push(/^gloves?/i.test(labelWord) ? `Gloves: ${rawValue}` : rawValue);
        }
        continue;
      }
      // A labeled "Procedure:" beats a title guessed from the first line
      // (often a banner like "UNIVERSAL" or the hospital's name).
      if (value && label.key === "procedure" && titleGuessed) {
        out.procedure = value;
        titleGuessed = false;
        continue;
      }
      if (value && !out[label.key]) {
        if (label.key === "surgeonName") out.surgeonName = surgeonFrom(value);
        else (out as unknown as Record<string, string>)[label.key] = value;
      }
      continue;
    }

    if (procWrap && !isItemish(line) && !/:/.test(line)) {
      procWrap = /[,;]\s*$/.test(line);
      continue;
    }
    procWrap = false;

    // 2b) "Laparoscopic (cont)": the section carries on from the last column.
    if (CONT_RE.test(line) && !/\d/.test(line) && line.length <= 40 && sawSectionHeader) {
      const base = line.replace(CONT_RE, "").trim();
      if (base && isHeaderish(base)) {
        const known = asSectionHeader(base);
        if (known) { current = known; specificHeader = SPECIFIC_SUPPLY_HEADERS.has(headerKey(base)); }
        lastItem = null;
        continue;
      }
    }

    // 3) Section headers.
    const header = asSectionHeader(line);
    if (header && !/^\d/.test(line)) {
      current = header;
      specificHeader = SPECIFIC_SUPPLY_HEADERS.has(headerKey(line));
      inNotes = false;
      sawSectionHeader = true;
      lastItem = null;
      dropProcList = false;
      continue;
    }

    // 3a) A fragment of a section name on its own line is scan debris.
    const bare = line.toLowerCase().replace(/[^a-z]/g, "");
    if (bare.length >= 4 && bare.length === line.replace(/[\s.:]/g, "").length && headerWords.some((wd) => wd !== bare && wd.startsWith(bare))) continue;

    // 3b) Facility-custom section headers ("Urology", specialty carts):
    //     once the printout has shown real sections, a short clean line whose
    //     NEXT line is an item starts a new section. Unknown names get a
    //     keyword guess, else land in supplies.
    if (sawSectionHeader && !inNotes && !isBullet && isHeaderish(line) && !(lastItem && lastEndedWithComma)) {
      const next = lines.slice(i + 1).find((l) => l !== "");
      if (next && isItemish(next)) {
        current = guessSection({ name: line });
        specificHeader = false;
        lastItem = null;
        dropProcList = false;
        continue;
      }
    }

    // 3c) Leftover procedure-list wrap lines ("…; Cystoscopy, Flexible; …").
    if (dropProcList && line.includes(";")) continue;
    if (dropProcList && isItemish(line)) dropProcList = false;

    // 4) Inside the notes block, every content line is a note.
    if (inNotes) {
      const bulleted = /^\s*[•▪◦●*·-]/.test(line);
      const text = line.replace(/^\s*[•▪◦●*·-]\s*/, "").replace(BULLET_RE, "").trim();
      if (!text) continue; // an empty bullet
      // A bulleted list's unbulleted lines are wraps of the bullet above.
      if (!bulleted && notesBulleted && notesParts.length > notesStart) {
        notesParts[notesParts.length - 1] += ` ${text}`;
      } else {
        notesParts.push(text);
      }
      if (bulleted) notesBulleted = true;
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
        titleGuessed = true;
      }
      continue;
    }

    // 7) Wrapped-line stitching before treating it as a new item.
    if (lastItem) {
      // "(0703-046-000)" or "(250-070-520). (Avail)": a catalog number
      // wrapped onto its own line, maybe with the hold flag after it.
      const wrapped = line.match(/^\(([^)]+)\)\.?\s*(\(avail\.?\))?\.?$/i);
      if (wrapped) {
        const inner = wrapped[1].trim();
        if (isRefCode(inner) && !lastItem.ref) lastItem.ref = inner;
        else lastItem.detail = lastItem.detail ? `${lastItem.detail} · ${inner}` : inner;
        if (wrapped[2]) lastItem.hold = true;
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
      out.sections[placeItem(current, item, specificHeader)].push(item);
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
/** "7.5 Biogel, latex-free" -> size 7.5, type "Biogel, latex-free". */
/** Double gloving as printed: "8/8" and "7.5/8" (under/over), "8 over / 7.5
 *  under", "under 7.5, over 8". Null for one size, or several people's
 *  sizes on one line. */
export function parseGlovePair(raw: string): { under: string; over: string } | null {
  const SZ = "(5(?:\\.5)?|6(?:\\.5)?|7(?:\\.5)?|8(?:\\.5)?|9)";
  const t = raw.toLowerCase();
  const over = t.match(new RegExp(`${SZ}\\s*(?:over|outer)\\b|\\b(?:over|outer)\\s*:?\\s*${SZ}(?![\\d.])`));
  const under = t.match(new RegExp(`${SZ}\\s*(?:under|inner|indicator)\\b|\\b(?:under|inner|indicator)\\s*:?\\s*${SZ}(?![\\d.])`));
  if (over && under) return { over: (over[1] ?? over[2])!, under: (under[1] ?? under[2])! };
  // "8/8", "7.5/8", "8 Blue/7.5 white x 2" (a color or brand between).
  const slash = t.match(new RegExp(`(?:^|[^\\d.])${SZ}(?:\\s*[a-z]+)?\\s*/\\s*${SZ}(?![\\d.])`));
  if (slash && (t.match(/\d/g) ?? []).length <= 4) return { under: slash[1], over: slash[2] };
  return null;
}

export function parseGloves(raw: string): { size?: string; type?: string } {
  const t = raw.trim();
  const m = t.match(/(?:^|\s|size\s*)(5(?:\.5)?|6(?:\.5)?|7(?:\.5)?|8(?:\.5)?|9)(?![\d.])/i);
  const size = m ? m[1] : undefined;
  const type = (m ? t.replace(m[0], " ") : t).replace(/\bsize\b/i, "").replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, "").replace(/\s{2,}/g, " ");
  return { size, type: type || undefined };
}

/** A date as printed on a card ("10/12/2025", "2025-10-12", "Oct 12, 2025",
 *  "12 Oct 2025") as YYYY-MM-DD, or undefined. Times are ignored. */
export function parseLooseDate(raw: string): string | undefined {
  const t = raw.trim();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ok = (y: number, mo: number, d: number) =>
    y >= 1990 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(mo)}-${pad(d)}` : undefined;
  let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ok(+m[1], +m[2], +m[3]);
  m = t.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return ok(y, +m[1], +m[2]); }
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  m = t.match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m && months.includes(m[1].toLowerCase())) return ok(+m[3], months.indexOf(m[1].toLowerCase()) + 1, +m[2]);
  m = t.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})/i);
  if (m && months.includes(m[2].toLowerCase())) return ok(+m[3], months.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  return undefined;
}

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
