// On-device OCR for scanning a printed/typed preference card into text.
//
// Tesseract.js is dynamically imported so it never lands in the main bundle and
// never runs on the offline OR path — it only loads the first time a tech taps
// "scan", and its language model streams from a CDN then caches. The image
// never leaves the device (no upload, no server), which keeps us clear of any
// PHI/privacy concern: recognition happens locally in the browser/WebView.
//
// Preprocessing (validated against a real photo of a hospital pref-card):
//  • Downscale to ≤2200px — softens the moiré from photographing a screen and
//    speeds recognition on multi-MP phone photos.
//  • Grayscale + slight contrast — printed cards are black-on-white anyway.
//  • Orientation retry at 90°/270° — cards are very often photographed
//    sideways; a wrong orientation reads as gibberish.

export type OcrProgress = (pct: number, status: string) => void;

const MAX_DIM = 2200;

/** Draw the image scaled, grayscaled, and rotated onto a canvas. */
async function preprocess(file: File | Blob, degrees: 0 | 90 | 270): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const swap = degrees % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d")!;
  if ("filter" in ctx) ctx.filter = "grayscale(1) contrast(1.12)";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
  bmp.close();
  return await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("preprocess failed"))), "image/jpeg", 0.92),
  );
}

interface Attempt {
  text: string;
  confidence: number;
}

/** Recognize the text in an image. If the first pass looks like a sideways
 *  photo (low confidence / barely any text), automatically retries at 90° and
 *  270° and keeps the best read. Resolves to the raw recognized text (which
 *  the caller then parses + lets the user correct). Throws if the OCR engine
 *  can't load (e.g. offline first run) so the UI can fall back to paste/type. */
export async function ocrImage(file: File | Blob, onProgress?: OcrProgress): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status && typeof m.progress === "number") {
        onProgress?.(Math.round(m.progress * 100), m.status);
      }
    },
  });
  try {
    const run = async (degrees: 0 | 90 | 270): Promise<Attempt> => {
      let img: File | Blob = file;
      try {
        img = await preprocess(file, degrees);
      } catch {
        if (degrees !== 0) throw new Error("cannot rotate");
        // canvas unavailable — OCR the original as-is
      }
      const { data } = await worker.recognize(img);
      return { text: (data.text ?? "").trim(), confidence: data.confidence ?? 0 };
    };

    let best = await run(0);
    // A straight-on shot of a printed card reads with decent confidence and
    // plenty of text. A sideways one reads as near-gibberish — worth retrying.
    if (best.confidence < 60 || best.text.length < 60) {
      for (const deg of [90, 270] as const) {
        onProgress?.(0, `trying rotated ${deg}°`);
        try {
          const attempt = await run(deg);
          if (attempt.confidence > best.confidence && attempt.text.length >= best.text.length / 2) {
            best = attempt;
          }
        } catch {
          /* rotation attempt failed — keep what we have */
        }
        if (best.confidence >= 75) break; // good enough, stop burning time
      }
    }
    return best.text;
  } finally {
    await worker.terminate();
  }
}
