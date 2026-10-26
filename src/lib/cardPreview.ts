// A picture of a card for chat apps: the printed card (the same template as
// Share → PDF) rendered to a PNG, pages stacked, so Messages shows the card
// itself next to the .orsync import file instead of a blank document icon.

const WIDTH = 1080;
const MAX_PAGES = 3;

export async function pdfToPng(pdf: Blob): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) }).promise;
  const pages: HTMLCanvasElement[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const view = page.getViewport({ scale: WIDTH / base.width });
    const c = document.createElement("canvas");
    c.width = Math.round(view.width);
    c.height = Math.round(view.height);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: view }).promise;
    pages.push(collapseBlank(c));
  }
  const gap = 12;
  const out = document.createElement("canvas");
  out.width = WIDTH;
  out.height = pages.reduce((h, p) => h + p.height, 0) + gap * (pages.length - 1);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, out.width, out.height);
  let y = 0;
  for (const p of pages) { ctx.drawImage(p, 0, y); y += p.height + gap; }
  return await new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/png"));
}

/** Shrink long empty stretches (the bottom of a short last page) to a
 *  small gap, so the picture is the card, not mostly white paper. */
function collapseBlank(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  const blank = (y: number) => {
    for (let x = 0; x < width; x += 3) {
      const p = (y * width + x) * 4;
      if (data[p] < 245 || data[p + 1] < 245 || data[p + 2] < 245) return false;
    }
    return true;
  };
  const keep: [number, number][] = [];
  const MAX_GAP = 60;
  let y = 0;
  while (y < height) {
    if (!blank(y)) { const s = y; while (y < height && !blank(y)) y++; keep.push([s, y]); continue; }
    const s = y;
    while (y < height && blank(y)) y++;
    keep.push([s, Math.min(y, s + MAX_GAP)]);
  }
  const h = keep.reduce((n, [a, b]) => n + (b - a), 0);
  if (h >= height) return c;
  const out = document.createElement("canvas");
  out.width = width;
  out.height = h;
  const octx = out.getContext("2d")!;
  let at = 0;
  for (const [a, b] of keep) { octx.drawImage(c, 0, a, width, b - a, 0, at, width, b - a); at += b - a; }
  return out;
}
