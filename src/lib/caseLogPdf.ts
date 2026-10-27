import { BRAND, INK, MARGIN, MUTED, pdfSafe } from "./cardPdf";
import { drawStamp } from "./dayPdf";
import { chronological, countLine, filterLabel, logDay, specialtyCounts, type LogEntry, type LogFilter } from "./caseLog";

// A case log on paper: whose it is and for what dates/specialty, the counts
// by specialty (what a program or credentialing office asks for), then every
// case, done ones first, with the ORSync stamp at the bottom.

export function caseLogFilename(name: string, f: LogFilter): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ["case-log", slug(name) || "orsync", f.from, f.to].filter(Boolean).join("-") + ".pdf";
}

export async function caseLogPdfBlob(name: string, entries: LogEntry[], f: LogFilter, today: string, now = new Date()): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();

  let y = MARGIN + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("CASE LOG", MARGIN, y);
  y += 24;
  doc.setFontSize(22);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(pdfSafe(name), MARGIN, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(51, 51, 51);
  doc.text(pdfSafe(filterLabel(f)), MARGIN, y);
  y += 10;
  doc.setDrawColor(INK.r, INK.g, INK.b);
  doc.setLineWidth(1.6);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 20;

  // Counts by specialty.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(pdfSafe(countLine(entries).replace(/:.*/, "")), MARGIN, y);
  y += 4;
  const counts = specialtyCounts(entries);
  if (counts.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      body: counts.map(([s, n]) => [pdfSafe(s), String(n)]),
      theme: "plain",
      tableWidth: 260,
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [INK.r, INK.g, INK.b] },
      columnStyles: { 1: { halign: "right", fontStyle: "bold", cellWidth: 50 } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  } else {
    y += 16;
  }

  type Cell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> };
  const body: Cell[][] = [];
  const done = chronological(entries.filter((e) => e.date < today));
  const ahead = chronological(entries.filter((e) => e.date >= today));
  const section = (title: string, list: LogEntry[]) => {
    if (!list.length) return;
    body.push([{
      content: `${title} · ${list.length}`,
      colSpan: 5,
      styles: { fontStyle: "bold", fontSize: 10, textColor: [BRAND.r, BRAND.g, BRAND.b], fillColor: [238, 243, 251] },
    }]);
    for (const e of list) {
      body.push([
        pdfSafe(`${logDay(e.date)}${e.room || e.time ? `\n${[e.room, e.time].filter(Boolean).join(" · ")}` : ""}`),
        { content: pdfSafe(e.procedure), styles: { fontStyle: "bold" } },
        pdfSafe(e.surgeon ?? ""),
        pdfSafe(e.specialty),
        pdfSafe(e.role ?? ""),
      ]);
    }
  };
  section("Done", done);
  section("Scheduled", ahead);

  if (body.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 78 },
      head: [["Date", "Procedure", "Surgeon", "Specialty", "Role"]],
      body,
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 }, textColor: [INK.r, INK.g, INK.b], valign: "top" },
      headStyles: { fontStyle: "bold", fontSize: 8, textColor: [MUTED.r, MUTED.g, MUTED.b] },
      columnStyles: { 0: { cellWidth: 92 }, 2: { cellWidth: 92 }, 3: { cellWidth: 92 }, 4: { cellWidth: 86 } },
      rowPageBreak: "avoid",
      didDrawCell: (d) => {
        if (d.section !== "body" || d.column.index !== 0 || d.row.raw instanceof Array && typeof d.row.raw[0] === "object") return;
        doc.setDrawColor(221, 221, 221);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, d.cell.y + d.cell.height, pageW - MARGIN, d.cell.y + d.cell.height);
      },
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("No cases in this range.", MARGIN, y + 10);
  }

  await drawStamp(doc, now, "No patient information. Cases from ORSync room teams.");
  return doc.output("blob");
}
