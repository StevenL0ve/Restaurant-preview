import type { Facility, PrefCard, SectionKey, Surgeon } from "../types";
import { SECTIONS } from "../types";

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

export async function cardPdfBlob(
  card: PrefCard,
  surgeon?: Surgeon,
  facility?: Facility,
  locationName?: (id: string) => string | undefined,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - MARGIN * 2;

  // Header: procedure title, surgeon line, brand + date on the right.
  let y = MARGIN + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const titleLines = doc.splitTextToSize(card.procedure, usable - 90);
  doc.text(titleLines, MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("ORSync", pageW - MARGIN, MARGIN + 2, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const updated = new Date(card.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  doc.text(`Updated ${updated}`, pageW - MARGIN, MARGIN + 14, { align: "right" });
  y += titleLines.length * 20;

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
  const meta: [string, string | undefined][] = [
    ["Position", card.position],
    ["Skin prep", card.prep],
    ["Draping", card.draping],
    ["Notes", card.notes],
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

  // One table per section: Item / Detail / Location.
  for (const sec of SECTIONS) {
    const items = card[sec.key as SectionKey];
    if (!items.length) continue;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [[sec.label.toUpperCase(), "DETAIL", "LOCATION"]],
      body: items.map((it) => [
        it.name,
        it.detail ?? "",
        (it.locationId ? locationName?.(it.locationId) : "") ?? "",
      ]),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 0, right: 8 }, textColor: [17, 17, 17], lineColor: [230, 230, 230], lineWidth: { bottom: 0.6 } },
      headStyles: { fontStyle: "bold", fontSize: 8, textColor: [17, 17, 17], lineColor: [17, 17, 17], lineWidth: { bottom: 1.2 } },
      columnStyles: { 0: { cellWidth: usable * 0.42 }, 1: { cellWidth: usable * 0.28 }, 2: { cellWidth: usable * 0.3 } },
      rowPageBreak: "avoid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  // Footer on every page.
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

export function cardPdfFilename(procedure: string): string {
  const slug = procedure.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card";
  return `${slug}-preference-card.pdf`;
}
