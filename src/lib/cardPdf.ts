import type { Facility, PrefCard, SectionKey, Surgeon } from "../types";
import { SECTIONS } from "../types";
import { editLine, PRINT_HISTORY } from "./cardHistory";

// Turn a preference card into a clean one-or-more-page PDF, entirely on the
// device (jsPDF is lazy-loaded so it never weighs down app startup). This is
// what gets texted or emailed: a document with a proper preview bubble in
// Messages, not a wall of raw text. Layout mirrors the print sheet: header,
// gloves and surgeon notes, the position/prep/draping block, then an
// Item / Detail / Location table per section.

const MARGIN = 48;
const BRAND = { r: 36, g: 114, b: 216 };
const INK = { r: 17, g: 17, b: 17 };
const MUTED = { r: 102, g: 102, b: 102 };

/** A QR code printed top-right that points at the live digital version:
 *  the card itself, or one case's cart for one day. */
export interface CardPdfLink {
  url: string;
  label?: string;
}

// The mascot rides next to the brand name in the header. Cached after the
// first load; printing still works if the asset can't be fetched.
let mascotData: string | null | undefined;
async function loadMascot(): Promise<string | null> {
  if (mascotData !== undefined) return mascotData;
  try {
    const res = await fetch("brand/mascot-sm.png");
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    mascotData = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("read failed"));
      r.readAsDataURL(blob);
    });
  } catch {
    mascotData = null;
  }
  return mascotData;
}

/** One card's worth of a (possibly multi-card) PDF. */
export interface CardPdfEntry {
  card: PrefCard;
  surgeon?: Surgeon;
  facility?: Facility;
  locationName?: (id: string) => string | undefined;
  dayConsiderations?: string[];
  link?: CardPdfLink;
  /** Printed above the title in day packets: "OR 1 · Case 2 · 07:30". */
  caseLine?: string;
}

const BOX_COL = 16; // the pick-ticket checkbox column

export async function cardPdfBlob(
  card: PrefCard,
  surgeon?: Surgeon,
  facility?: Facility,
  locationName?: (id: string) => string | undefined,
  dayConsiderations: string[] = [],
  link?: CardPdfLink,
): Promise<Blob> {
  return cardsPdfBlob([{ card, surgeon, facility, locationName, dayConsiderations, link }]);
}

/** A whole day's cards (or any picked set) as ONE document, each card
 *  starting on a fresh page, each with its own QR back to the live version. */
export async function cardsPdfBlob(entries: CardPdfEntry[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) doc.addPage();
    await renderCard(doc, autoTable, entries[i]);
  }

  // Footer on every page.
  const pageW = doc.internal.pageSize.getWidth();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(136, 136, 136);
    const h = doc.internal.pageSize.getHeight();
    doc.text("Printed from ORSync. No patient information on this card.", MARGIN, h - 24);
    if (pages > 1) doc.text(`Page ${i} of ${pages}`, pageW - MARGIN, h - 24, { align: "right" });
  }

  return doc.output("blob");
}

async function renderCard(
  doc: import("jspdf").jsPDF,
  autoTable: typeof import("jspdf-autotable").default,
  entry: CardPdfEntry,
): Promise<void> {
  const { card, surgeon, facility, locationName, link, caseLine } = entry;
  const dayConsiderations = entry.dayConsiderations ?? [];
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - MARGIN * 2;

  // Header: procedure title, surgeon line, brand + date on the right.
  let y = MARGIN + 8;
  if (caseLine) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(caseLine.toUpperCase(), MARGIN, y - 2);
    y += 14;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const titleLines = doc.splitTextToSize(card.procedure, usable - (link ? 118 : 90));
  doc.text(titleLines, MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("ORSync", pageW - MARGIN, MARGIN + 2, { align: "right" });
  const mascot = await loadMascot();
  if (mascot) {
    const tw = doc.getTextWidth("ORSync");
    doc.addImage(mascot, "PNG", pageW - MARGIN - tw - 21, MARGIN - 10, 16, 16);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const updated = new Date(card.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  doc.text(`Updated ${updated}`, pageW - MARGIN, MARGIN + 14, { align: "right" });
  y += titleLines.length * 20;

  // The way back from paper to the live version: scan the code, see the
  // current card (or that case's live cart) with every update since printing.
  if (link?.url) {
    const QRCode = (await import("qrcode")).default;
    const qrData = await QRCode.toDataURL(link.url, {
      margin: 0,
      width: 252,
      color: { dark: "#111111", light: "#ffffff" },
    });
    const size = 84;
    const qx = pageW - MARGIN - size;
    const qy = MARGIN + 24;
    doc.addImage(qrData, "PNG", qx, qy, size, size);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(link.label ?? "Scan for the live digital card", qx + size / 2, qy + size + 10, {
      align: "center",
      maxWidth: size + 30,
    });
    // Keep the body clear of the code.
    y = Math.max(y, qy + size + 22);
  }

  doc.setFontSize(10.5);
  doc.setTextColor(51, 51, 51);
  const subtitle = [surgeon ? `${surgeon.name} · ${surgeon.specialty}` : null, facility?.name]
    .filter(Boolean)
    .join(" · ");
  if (subtitle) {
    doc.text(subtitle, MARGIN, y);
    y += 14;
  }
  doc.setDrawColor(INK.r, INK.g, INK.b);
  doc.setLineWidth(1.6);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 14;

  // Gloves + surgeon notes.
  const glovesLine = surgeon?.gloveSize
    ? `Gloves: ${surgeon.gloveSize}${surgeon.gloveType ? ` (${surgeon.gloveType})` : ""}`
    : null;
  doc.setFontSize(9.5);
  doc.setTextColor(INK.r, INK.g, INK.b);
  if (glovesLine) {
    doc.setFont("helvetica", "bold");
    doc.text(glovesLine, MARGIN, y);
    y += 13;
  }
  if (surgeon?.quirks) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(68, 68, 68);
    const quirkLines = doc.splitTextToSize(`Surgeon notes: ${surgeon.quirks}`, usable);
    doc.text(quirkLines, MARGIN, y);
    y += quirkLines.length * 12 + 2;
  }

  // Case meta block (label/value rows).
  const considerations = [
    card.specialConsiderations?.trim(),
    ...dayConsiderations.map((t) => `Today only: ${t}`),
  ].filter(Boolean).join("\n");
  const meta: [string, string | undefined][] = [
    ["Position", card.position],
    ["Skin prep", card.prep],
    ["Draping", card.draping],
    ["Notes", card.notes],
    ["Special considerations", considerations || undefined],
  ];
  const metaRows = meta.filter(([, v]) => v?.trim()).map(([k, v]) => [k, v as string]);
  if (metaRows.length) {
    autoTable(doc, {
      startY: y + 2,
      margin: { left: MARGIN, right: MARGIN },
      body: metaRows,
      theme: "plain",
      styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 0, right: 8 }, textColor: [17, 17, 17] },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [85, 85, 85], cellWidth: 80 },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // One table per section: Item / Detail / Location. Medications print
  // first, right under the notes block; the rest keep library order.
  const printOrder = [...SECTIONS].sort(
    (a, b) => Number(b.key === "medications") - Number(a.key === "medications"),
  );
  for (const sec of printOrder) {
    const items = card[sec.key as SectionKey];
    if (!items.length) continue;
    // Supplies (or any section) with reference numbers get a REF column, so
    // materials can reorder straight off the printout.
    const hasRef = items.some((it) => it.ref?.trim());
    const rest = usable - BOX_COL;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      // A checkbox column first, so the printout works as a pick ticket.
      head: [hasRef
        ? ["", sec.label.toUpperCase(), "DETAIL", "REF #", "LOCATION"]
        : ["", sec.label.toUpperCase(), "DETAIL", "LOCATION"]],
      // Qty and hold render the way a hospital pick list prints them:
      // "2×" ahead of the name, "(hold)" after the detail.
      body: items.map((it) => {
        const base = [
          "",
          `${(it.qty ?? 1) > 1 ? `${it.qty}× ` : ""}${it.name}${it.alias ? ` ("${it.alias}")` : ""}`,
          [it.detail, it.hold ? "(hold)" : null].filter(Boolean).join(" "),
        ];
        if (hasRef) base.push(it.ref ?? "");
        base.push((it.locationId ? locationName?.(it.locationId) : "") ?? "");
        return base;
      }),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 0, right: 8 }, textColor: [17, 17, 17], lineColor: [230, 230, 230], lineWidth: { bottom: 0.6 } },
      headStyles: { fontStyle: "bold", fontSize: 8, textColor: [17, 17, 17], lineColor: [17, 17, 17], lineWidth: { bottom: 1.2 } },
      columnStyles: hasRef
        ? { 0: { cellWidth: BOX_COL }, 1: { cellWidth: rest * 0.36 }, 2: { cellWidth: rest * 0.22 }, 3: { cellWidth: rest * 0.16 }, 4: { cellWidth: rest * 0.26 } }
        : { 0: { cellWidth: BOX_COL }, 1: { cellWidth: rest * 0.42 }, 2: { cellWidth: rest * 0.28 }, 3: { cellWidth: rest * 0.3 } },
      rowPageBreak: "avoid",
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 0) return;
        const size = 8.5;
        doc.setDrawColor(90, 90, 90);
        doc.setLineWidth(0.7);
        doc.rect(data.cell.x + 1, data.cell.y + (data.cell.height - size) / 2, size, size);
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  // The last few edits, one short line each; the full history is in the app.
  const recent = (card.history ?? []).slice(0, PRINT_HISTORY);
  if (recent.length) {
    const pageH = doc.internal.pageSize.getHeight();
    const need = 14 + recent.length * 10;
    if (y + need > pageH - 40) { doc.addPage(); y = MARGIN + 8; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("RECENT CHANGES", MARGIN, y);
    y += 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    for (const e of recent) {
      // The PDF's built-in font has no arrow or ellipsis glyphs.
      const text = editLine(e).replace(/→/g, "->").replace(/…/g, "...").replace(/[“”]/g, '"');
      const lines = doc.splitTextToSize(text, usable) as string[];
      doc.text(lines.length > 1 ? `${lines[0].replace(/[\s;,.]+$/, "")}...` : lines[0], MARGIN, y);
      y += 10;
    }
  }
}

export function cardPdfFilename(procedure: string): string {
  const slug = procedure.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card";
  return `${slug}-preference-card.pdf`;
}

export function cardsPdfFilename(tag: string): string {
  const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cards";
  return `preference-cards-${slug}.pdf`;
}
