import { BRAND, INK, MARGIN, MUTED, loadMascot, pdfSafe } from "./cardPdf";

// One day's lineup as a single sheet to text or email: the date across the
// top, every room's cases in board order, and the ORSync stamp at the
// bottom with when it was made ("Current as of: ..."), since the board
// keeps changing after it's sent.

export interface DayPdfCase {
  label: string; // "Case 1\n07:30"
  procedure: string;
  surgeon?: string;
  team: string[]; // "RN: Jane Doe"
  notes: string[];
}

export interface DayPdfRoom {
  room: string; // "OR 4", or "" for no room
  firstTime?: string;
  cases: DayPdfCase[];
}

/** "Monday, 26 October 2026" */
export function longDate(d: Date): string {
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(undefined, o);
  return `${part({ weekday: "long" })}, ${d.getDate()} ${part({ month: "long" })} ${d.getFullYear()}`;
}

/** "Current as of: Monday, 26 October 2026, 2:15 PM" */
export function currentAsOf(now: Date): string {
  return `Current as of: ${longDate(now)}, ${now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

/** "2026-10-26" as a local calendar day. */
export function dayDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayPdfFilename(date: string): string {
  return `orsync-day-${date}.pdf`;
}

export async function dayPdfBlob(date: string, rooms: DayPdfRoom[], now = new Date(), facility?: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const caseCount = rooms.reduce((n, r) => n + r.cases.length, 0);
  const roomCount = rooms.filter((r) => r.room).length;

  // Header: the day itself.
  let y = MARGIN + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(pdfSafe(["OR SCHEDULE", facility?.toUpperCase()].filter(Boolean).join(" · ")), MARGIN, y);
  y += 24;
  doc.setFontSize(22);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(pdfSafe(longDate(dayDate(date))), MARGIN, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(51, 51, 51);
  const counts = [`${caseCount} ${caseCount === 1 ? "case" : "cases"}`];
  if (roomCount) counts.push(`${roomCount} ${roomCount === 1 ? "room" : "rooms"}`);
  doc.text(counts.join(" · "), MARGIN, y);
  y += 10;
  doc.setDrawColor(INK.r, INK.g, INK.b);
  doc.setLineWidth(1.6);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 12;

  type Cell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> };
  const body: Cell[][] = [];
  for (const r of rooms) {
    body.push([{
      content: pdfSafe(`${r.room || "No room set"}${r.firstTime ? `  ·  first case ${r.firstTime}` : ""}`),
      colSpan: 5,
      styles: { fontStyle: "bold", fontSize: 10, textColor: [BRAND.r, BRAND.g, BRAND.b], fillColor: [238, 243, 251] },
    }]);
    for (const c of r.cases) {
      body.push([
        pdfSafe(c.label),
        { content: pdfSafe(c.procedure), styles: { fontStyle: "bold" } },
        pdfSafe(c.surgeon ?? ""),
        pdfSafe(c.team.join("\n")),
        pdfSafe(c.notes.length > 1 ? c.notes.map((n) => `• ${n}`).join("\n") : c.notes.join("")),
      ]);
    }
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 78 },
    head: [["Case", "Procedure", "Surgeon", "Team", "Notes"]],
    body,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 }, textColor: [INK.r, INK.g, INK.b], valign: "top" },
    headStyles: { fontStyle: "bold", fontSize: 8, textColor: [MUTED.r, MUTED.g, MUTED.b] },
    columnStyles: { 0: { cellWidth: 62 }, 2: { cellWidth: 92 }, 3: { cellWidth: 116 }, 4: { cellWidth: 118 } },
    didDrawCell: (d) => {
      // A hairline under each case row.
      if (d.section !== "body" || d.column.index !== 0) return;
      doc.setDrawColor(221, 221, 221);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, d.cell.y + d.cell.height, pageW - MARGIN, d.cell.y + d.cell.height);
    },
  });

  // Footer stamp on every page: Jolie + ORSync, and when this was made.
  const mascot = await loadMascot();
  const stamp = pdfSafe(currentAsOf(now));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const fy = pageH - 52;
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, fy - 8, pageW - MARGIN, fy - 8);
    let tx = MARGIN;
    if (mascot) {
      doc.addImage(mascot, "PNG", MARGIN, fy - 2, 28, 28);
      tx += 34;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text("ORSync", tx, fy + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(stamp, tx, fy + 22);
    doc.setFontSize(7.5);
    doc.text("No patient information on this sheet.", pageW - MARGIN, fy + 10, { align: "right" });
    if (pages > 1) doc.text(`Page ${i} of ${pages}`, pageW - MARGIN, fy + 22, { align: "right" });
  }

  return doc.output("blob");
}
