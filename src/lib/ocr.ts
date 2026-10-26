// On-device text recognition for scanning a printed/typed preference card.
// Nothing is uploaded: recognition happens on the phone (or in the browser),
// which keeps us clear of any PHI/privacy concern.
//
// Engines, best first:
//  • iPhone: Apple Vision (accurate level, language correction, en-US) on the
//    FULL-resolution, upright image; plus the VisionKit document camera, which
//    finds the card's edges and flattens it (crop + deskew) before reading.
//  • Android: Google ML Kit text recognition (bundled model, offline).
//  • Web: Tesseract.js (lazy-loaded) on a cleaned-up image: upright, sized
//    for ~300 dpi text, grayscale, contrast-stretched, lightly smoothed (cuts
//    the moiré from photographing a screen) and adaptively thresholded.
//  • PDF exports: the PDF's own text layer when it has one (exact, no OCR);
//    scanned PDFs are rendered and read like photos.
// Native engines return lines with boxes; buildLines() rebuilds reading order
// (rows, and left-then-right when the card is printed in two columns).

import { Capacitor, registerPlugin } from "@capacitor/core";

export type OcrProgress = (pct: number, status: string) => void;

/** One recognized line, box normalized to 0..1 with a top-left origin. */
export interface OcrLine {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence?: number;
}

interface OrsyncOcrPlugin {
  recognize(o: { image: string }): Promise<{ lines: OcrLine[] }>;
  scanDocument(): Promise<{ pages: { lines: OcrLine[] }[]; cancelled?: boolean }>;
  isDocumentScannerAvailable(): Promise<{ available: boolean }>;
}
const NativeOcr = registerPlugin<OrsyncOcrPlugin>("OrsyncOcr");

export function nativeOcrAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("OrsyncOcr");
}

/** The iPhone document camera (auto-crop + deskew), when this device has it. */
export async function documentScannerAvailable(): Promise<boolean> {
  if (!nativeOcrAvailable()) return false;
  try {
    return (await NativeOcr.isDocumentScannerAvailable()).available;
  } catch {
    return false;
  }
}

/** Open the document camera and read every page it captures. Resolves to ""
 *  if the person cancels. */
export async function scanDocumentText(): Promise<string> {
  const { pages, cancelled } = await NativeOcr.scanDocument();
  if (cancelled) return "";
  return pages.map((p) => buildLines(p.lines).join("\n")).filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------
// Reading order

/** Rebuild text lines from recognized boxes: group boxes into rows (same
 *  baseline band), left to right within a row; when a clear vertical gutter
 *  splits the page into two columns, read the left column, then the right,
 *  between any full-width lines (titles, section banners). */
export function buildLines(input: OcrLine[]): string[] {
  const lines = input.filter((l) => l.text && l.text.trim() && l.w > 0 && l.h > 0);
  if (!lines.length) return [];

  const gutter = findGutter(lines);
  if (gutter === null) return rows(lines);

  const left = (l: OcrLine) => l.x + l.w <= gutter;
  const right = (l: OcrLine) => l.x >= gutter;
  const spanning = lines.filter((l) => !left(l) && !right(l)).sort((a, b) => a.y - b.y);
  const out: string[] = [];
  let top = -Infinity;
  for (const s of [...spanning, null]) {
    const bottom = s ? s.y : Infinity;
    const band = (l: OcrLine) => l.y + l.h / 2 > top && l.y + l.h / 2 <= bottom;
    out.push(...rows(lines.filter((l) => left(l) && band(l))));
    out.push(...rows(lines.filter((l) => right(l) && band(l))));
    if (s) out.push(s.text.trim());
    top = s ? s.y + s.h / 2 : top;
  }
  return out;
}

/** An x position (0..1) with almost no text over it and plenty of text on
 *  both sides, or null for a single-column card. */
function findGutter(lines: OcrLine[]): number | null {
  if (lines.length < 8) return null;
  const BINS = 100;
  const cover = new Array<number>(BINS).fill(0);
  for (const l of lines) {
    const a = Math.max(0, Math.floor(l.x * BINS));
    const b = Math.min(BINS - 1, Math.ceil((l.x + l.w) * BINS) - 1);
    for (let i = a; i <= b; i++) cover[i]++;
  }
  let best = -1;
  for (let i = 25; i <= 75; i++) if (best < 0 || cover[i] < cover[best]) best = i;
  const x = (best + 0.5) / BINS;
  const leftCount = lines.filter((l) => l.x + l.w <= x).length;
  const rightCount = lines.filter((l) => l.x >= x).length;
  const crossing = lines.length - leftCount - rightCount;
  const ok = crossing <= lines.length * 0.15 && leftCount >= lines.length * 0.2 && rightCount >= lines.length * 0.2;
  return ok ? x : null;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

function rows(lines: OcrLine[]): string[] {
  if (!lines.length) return [];
  const sorted = [...lines].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const lineH = median(sorted.map((l) => l.h)) || 0.01;
  const groups: OcrLine[][] = [];
  for (const l of sorted) {
    const mid = l.y + l.h / 2;
    const g = groups[groups.length - 1];
    if (g) {
      const gMid = g.reduce((n, x) => n + x.y + x.h / 2, 0) / g.length;
      if (Math.abs(mid - gMid) <= lineH * 0.55) { g.push(l); continue; }
    }
    groups.push([l]);
  }
  return groups.map((g) => {
    const cells = g.sort((a, b) => a.x - b.x);
    let s = cells[0].text.trim();
    for (let i = 1; i < cells.length; i++) {
      const gap = cells[i].x - (cells[i - 1].x + cells[i - 1].w);
      // A wide gap is a column break (item | qty): keep it visible as two
      // spaces so the parser can tell "Sponges   10" from "Vicryl 3-0".
      s += (gap > lineH * 1.5 ? "   " : " ") + cells[i].text.trim();
    }
    return s;
  });
}

// ---------------------------------------------------------------------------
// Images

/** Decode a photo upright (browsers apply the EXIF orientation when an image
 *  element is drawn), capped at `maxDim` on the long side. HEIC works on
 *  iPhone because the system decodes it. */
async function uprightCanvas(file: Blob, maxDim: number, minDim = 0): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("decode"));
      im.src = url;
    });
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    let k = Math.min(1, maxDim / long);
    if (minDim && long * k < minDim) k = minDim / long; // upscale small text for Tesseract
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function rotate(src: HTMLCanvasElement, degrees: 0 | 90 | 270): HTMLCanvasElement {
  if (!degrees) return src;
  const c = document.createElement("canvas");
  c.width = src.height;
  c.height = src.width;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

/** Grayscale → contrast stretch (2nd–98th percentile) → 3×3 smoothing →
 *  adaptive (Bradley) threshold. Turns an unevenly lit phone photo, or a
 *  photo of a screen, into clean black text on white for Tesseract. */
export function cleanForOcr(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const n = w * h;
  const gray = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const v = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    gray[i] = v;
    hist[v | 0]++;
  }
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.02) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.02) { hi = v; break; } }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < n; i++) gray[i] = Math.min(255, Math.max(0, ((gray[i] - lo) * 255) / span));

  // 3×3 box smoothing.
  const smooth = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          s += gray[yy * w + xx]; c++;
        }
      }
      smooth[y * w + x] = s / c;
    }
  }

  // Bradley adaptive threshold over an integral image.
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += smooth[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + row;
    }
  }
  const half = Math.max(8, Math.round(Math.max(w, h) / 32));
  const T = 0.15;
  const out = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half), y1 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half), x1 = Math.min(w - 1, x + half);
      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = integral[(y1 + 1) * (w + 1) + (x1 + 1)] - integral[y0 * (w + 1) + (x1 + 1)]
        - integral[(y1 + 1) * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      const v = smooth[y * w + x] * count < sum * (1 - T) ? 0 : 255;
      const p = (y * w + x) * 4;
      out[p] = out[p + 1] = out[p + 2] = v;
      out[p + 3] = 255;
    }
  }
  removeRules(out, w, h);
  return out;
}

/** Erase table borders and header underlines: horizontal or vertical runs of
 *  ink far longer than any letter stroke. Left in, they fuse with the text
 *  next to them ("SUTURES" over a rule reads as "soopres eo"). */
function removeRules(px: Uint8ClampedArray, w: number, h: number): void {
  const minH = Math.max(40, Math.round(w * 0.06));
  const minV = Math.max(40, Math.round(h * 0.06));
  const black = (x: number, y: number) => px[(y * w + x) * 4] === 0;
  const clear = (x: number, y: number) => { const p = (y * w + x) * 4; px[p] = px[p + 1] = px[p + 2] = 255; };
  const marks: number[] = [];
  // Runs tolerate small breaks (a photographed rule isn't perfectly solid).
  const GAP = 3;
  for (let y = 0; y < h; y++) {
    let start = -1, last = -1;
    for (let x = 0; x <= w; x++) {
      if (x < w && black(x, y)) { if (start < 0) start = x; last = x; continue; }
      if (start >= 0 && x < w && x - last <= GAP) continue;
      if (start >= 0 && last - start + 1 >= minH) {
        // The rule plus a pixel either side (its blurred edges).
        for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) for (let k = start; k <= last; k++) marks.push(yy * w + k);
      }
      start = -1;
    }
  }
  for (let x = 0; x < w; x++) {
    let start = -1, last = -1;
    for (let y = 0; y <= h; y++) {
      if (y < h && black(x, y)) { if (start < 0) start = y; last = y; continue; }
      if (start >= 0 && y < h && y - last <= GAP) continue;
      if (start >= 0 && last - start + 1 >= minV) for (let k = start; k <= last; k++) marks.push(k * w + x);
      start = -1;
    }
  }
  for (const i of marks) clear(i % w, Math.floor(i / w));
}

/** Crop a photo to the card: the paper is the bright region, the desk or
 *  table around it is darker. Rows/columns whose brightness is well above the
 *  darkest ones are paper. Returns the canvas unchanged when it can't tell. */
export function cropToPaper(src: HTMLCanvasElement): HTMLCanvasElement {
  const k = Math.min(1, 400 / Math.max(src.width, src.height));
  const sw = Math.max(1, Math.round(src.width * k)), sh = Math.max(1, Math.round(src.height * k));
  const small = document.createElement("canvas");
  small.width = sw; small.height = sh;
  const sctx = small.getContext("2d")!;
  sctx.drawImage(src, 0, 0, sw, sh);
  const d = sctx.getImageData(0, 0, sw, sh).data;
  const lum = (x: number, y: number) => { const p = (y * sw + x) * 4; return 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]; };
  // "Bright" is relative to this photo's lighting: halfway between its darker
  // and lighter parts (paper in a dim corner is still lighter than the desk).
  const all: number[] = [];
  for (let y = 0; y < sh; y += 2) for (let x = 0; x < sw; x += 2) all.push(lum(x, y));
  all.sort((a, b) => a - b);
  const cut = (all[Math.floor(all.length * 0.1)] + all[Math.floor(all.length * 0.9)]) / 2;
  const bright = (v: number) => v > cut;
  const rowFrac = (y: number) => { let n = 0; for (let x = 0; x < sw; x++) if (bright(lum(x, y))) n++; return n / sw; };
  const colFrac = (x: number) => { let n = 0; for (let y = 0; y < sh; y++) if (bright(lum(x, y))) n++; return n / sh; };
  let top = 0, bottom = sh - 1, left = 0, right = sw - 1;
  while (top < sh - 1 && rowFrac(top) < 0.3) top++;
  while (bottom > top && rowFrac(bottom) < 0.3) bottom--;
  while (left < sw - 1 && colFrac(left) < 0.3) left++;
  while (right > left && colFrac(right) < 0.3) right--;
  const cw = (right - left + 1) / sw, ch = (bottom - top + 1) / sh;
  if (cw < 0.3 || ch < 0.3 || (cw > 0.97 && ch > 0.97)) return src;
  const pad = 4;
  const x0 = Math.max(0, Math.round((left - pad) / k)), y0 = Math.max(0, Math.round((top - pad) / k));
  const x1 = Math.min(src.width, Math.round((right + 1 + pad) / k)), y1 = Math.min(src.height, Math.round((bottom + 1 + pad) / k));
  const out = document.createElement("canvas");
  out.width = x1 - x0; out.height = y1 - y0;
  out.getContext("2d")!.drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function canvasBlob(c: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), type, q));
}

async function nativeRecognize(source: HTMLCanvasElement): Promise<string> {
  const image = source.toDataURL("image/jpeg", 0.95);
  const { lines } = await NativeOcr.recognize({ image });
  return buildLines(lines).join("\n");
}

async function tesseractRecognize(source: HTMLCanvasElement, onProgress?: OcrProgress): Promise<string> {
  const { createWorker, PSM } = await import("tesseract.js");
  // Engine files come from the jsDelivr CDN by default; a page can point
  // them elsewhere (self-hosting, or tests) with __orsyncTesseractPaths.
  const paths = (globalThis as { __orsyncTesseractPaths?: { workerPath?: string; corePath?: string; langPath?: string } }).__orsyncTesseractPaths;
  const worker = await createWorker("eng", 1, {
    ...(paths ?? {}),
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status && typeof m.progress === "number") onProgress?.(Math.round(m.progress * 100), m.status);
    },
  });
  try {
    // One column of variable-size text keeps table rows (qty · item) together.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: "1" });
    const run = async (degrees: 0 | 90 | 270, clean: boolean) => {
      const c = rotate(source, degrees);
      let img: Blob = await canvasBlob(c, "image/png");
      if (clean) {
        const ctx = c.getContext("2d")!;
        const px = ctx.getImageData(0, 0, c.width, c.height);
        px.data.set(cleanForOcr(px.data, c.width, c.height));
        ctx.putImageData(px, 0, 0);
        img = await canvasBlob(c, "image/png");
      }
      const { data } = await worker.recognize(img);
      return { text: (data.text ?? "").trim(), confidence: data.confidence ?? 0 };
    };
    let best = await run(0, true);
    if (best.confidence < 60) {
      // Plain grayscale sometimes beats thresholding on faint print.
      const plain = await run(0, false).catch(() => null);
      if (plain && plain.confidence > best.confidence) best = plain;
    }
    if (best.confidence < 60 || best.text.length < 60) {
      // Sideways photo? A wrong orientation reads as gibberish.
      for (const deg of [90, 270] as const) {
        onProgress?.(0, `trying rotated ${deg}°`);
        const attempt = await run(deg, true).catch(() => null);
        if (attempt && attempt.confidence > best.confidence && attempt.text.length >= best.text.length / 2) best = attempt;
        if (best.confidence >= 75) break;
      }
    }
    return best.text;
  } finally {
    await worker.terminate();
  }
}

/** Recognize the text in a photo of a card. Resolves to text lines in reading
 *  order (the caller parses it and lets the person correct it). Throws if no
 *  engine can start (e.g. the web engine offline on first use). */
export async function ocrImage(file: File | Blob, onProgress?: OcrProgress): Promise<string> {
  if (nativeOcrAvailable()) {
    onProgress?.(10, "reading the card");
    const c = await uprightCanvas(file, 4096); // full resolution (12 MP photos are 4032 px)
    const text = await nativeRecognize(c);
    onProgress?.(100, "reading the card");
    return text;
  }
  const c = cropToPaper(await uprightCanvas(file, 3200, 2000));
  return tesseractRecognize(c, onProgress);
}

// ---------------------------------------------------------------------------
// PDF import

/** Text from a PDF export of a card: its own text layer when it has one
 *  (exact), otherwise each page rendered and read like a photo. */
export async function ocrPdf(file: File | Blob, onProgress?: OcrProgress): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  const total = Math.min(doc.numPages, 10);
  for (let n = 1; n <= total; n++) {
    onProgress?.(Math.round(((n - 1) / total) * 100), `reading page ${n} of ${total}`);
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const lines: OcrLine[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const [, , , d, e, f] = it.transform as number[];
      const h = Math.abs(it.height || d || 10);
      lines.push({ text: it.str, x: e / vp.width, y: 1 - (f + h) / vp.height, w: Math.max(it.width, 1) / vp.width, h: h / vp.height });
    }
    const letters = lines.reduce((k, l) => k + (l.text.match(/[a-z]/gi)?.length ?? 0), 0);
    if (letters >= 20) {
      pages.push(buildLines(lines).join("\n"));
      continue;
    }
    // Scanned PDF: render the page and read it.
    const scale = 2200 / Math.max(vp.width, vp.height);
    const view = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(view.width);
    canvas.height = Math.round(view.height);
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport: view }).promise;
    pages.push(nativeOcrAvailable() ? await nativeRecognize(canvas) : await tesseractRecognize(canvas, onProgress));
  }
  onProgress?.(100, "done");
  return pages.filter(Boolean).join("\n\n");
}
