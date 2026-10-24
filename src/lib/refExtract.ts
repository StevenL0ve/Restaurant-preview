// Pull reference-number candidates out of OCR'd packaging text. Supply
// packaging prints the number next to REF / CAT / Item No. markers; lines
// with those markers rank first, then anything else shaped like a catalog
// number. The custodian confirms the right one with a tap.

const MARKER = /\b(?:REF|CAT|CATALOG|ITEM\s*(?:NO|#)?|PROD(?:UCT)?\s*(?:NO|#)?|MODEL)\b/i;
// Catalog numbers: letters/digits with - . / separators, at least one digit,
// 4+ chars. Pure words and pure short numbers are noise.
const TOKEN = /[A-Z0-9][A-Z0-9\-./]{2,}[A-Z0-9]/gi;

function looksLikeRef(tok: string): boolean {
  if (tok.length < 4 || tok.length > 20) return false;
  if (!/\d/.test(tok)) return false; // needs at least one digit
  if (/^\d{1,3}$/.test(tok)) return false;
  if (/^(19|20)\d{2}$/.test(tok)) return false; // bare years
  if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(tok)) return false; // dates
  return true;
}

export function parseRefCandidates(text: string): string[] {
  const ranked: string[] = [];
  const rest: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const toks = (line.toUpperCase().match(TOKEN) ?? []).filter(looksLikeRef);
    // Drop the marker word itself if it matched the token pattern.
    const clean = toks.filter((t) => !MARKER.test(t) || /\d/.test(t.replace(MARKER, "")));
    (MARKER.test(line) ? ranked : rest).push(...clean);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...ranked, ...rest]) {
    const k = t.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 6) break;
  }
  return out;
}
