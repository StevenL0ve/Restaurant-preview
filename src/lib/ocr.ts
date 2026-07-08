// On-device OCR for scanning a printed/typed preference card into text.
//
// Tesseract.js is dynamically imported so it never lands in the main bundle and
// never runs on the offline OR path — it only loads the first time a tech taps
// "scan", and its language model streams from a CDN then caches. The image
// never leaves the device (no upload, no server), which keeps us clear of any
// PHI/privacy concern: recognition happens locally in the browser/WebView.

export type OcrProgress = (pct: number, status: string) => void;

/** Recognize the text in an image. Resolves to the raw recognized text (which
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
    const { data } = await worker.recognize(file);
    return (data.text ?? "").trim();
  } finally {
    await worker.terminate();
  }
}
