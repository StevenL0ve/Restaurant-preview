// Downscale tray photos on-device before storing them. Everything lives in
// localStorage, so photos must be small: a 12MP shot becomes a ~150-250KB
// JPEG at 1000px, which is plenty to recognize a tray layer's contents.

const MAX_DIM = 1000;
const QUALITY = 0.72;

export async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", QUALITY);
}

/** Compress a batch of picked photos; files that fail to read are skipped. */
export async function filesToDataUrls(files: FileList | File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of Array.from(files)) {
    try {
      out.push(await fileToDataUrl(f));
    } catch {
      // unreadable/unsupported file: skip it rather than failing the batch
    }
  }
  return out;
}
