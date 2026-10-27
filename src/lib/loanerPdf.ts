import { loanerStatusLabel, type LoanerTray } from "../types";
import { BRAND, INK, MARGIN, MUTED, pdfSafe } from "./cardPdf";
import { drawStamp } from "./dayPdf";
import { formatPhone } from "./oncall";

// A loaner request as people read it: a picture for the message (what the
// rep or SPD sees in Messages) and a short text summary. The .orsync file
// still rides along for ORSync to import; nobody should have to read it.

type Loaner = Omit<LoanerTray, "facilityId" | "surgeonId" | "cardId">;

function when(iso?: string, withTime = false): string | undefined {
  if (!iso) return undefined;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return withTime ? `${day}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : day;
}

/** [label, value] rows, skipping what's blank. */
export function loanerFacts(l: Loaner): [string, string][] {
  const rep = [l.repName, l.repPhone ? formatPhone(l.repPhone) : undefined, l.repEmail].filter(Boolean).join(" · ");
  const rows: [string, string | undefined][] = [
    ["Status", loanerStatusLabel(l.status)],
    ["Company", l.vendor],
    ["Rep", rep || undefined],
    ["Alternate contact", l.altContact],
    ["Surgeon", l.surgeonName],
    ["Procedure", l.procedure],
    ["Facility", l.facilityName],
    ["Case date", when(l.caseDate)],
    ["Needed by", when(l.neededBy, true)],
    ["Rep's ETA", when(l.estimatedDelivery, true)],
    ["Sets expected", l.quantity ? String(l.quantity) : undefined],
    ["PO number", l.poNumber],
    ["Clinic contact", l.clinicContact],
    ["Requested by", l.requestedBy],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]?.trim());
}

/** The message text that travels with the files. */
export function loanerText(l: Loaner): string {
  const lines = [`Loaner request: ${l.description}`, ""];
  for (const [k, v] of loanerFacts(l)) lines.push(`${k}: ${v}`);
  if (l.sets.length) {
    lines.push("", "Sets:");
    for (const s of l.sets) lines.push(`• ${s.name} (${loanerStatusLabel(s.status)})`);
  }
  if (l.notes?.trim()) lines.push("", `Notes: ${l.notes.trim()}`);
  lines.push("", "Open the attached .orsync file in ORSync to update this request.");
  return lines.join("\n");
}

export async function loanerPdfBlob(l: Loaner, now = new Date()): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - MARGIN * 2;

  let y = MARGIN + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("LOANER REQUEST", MARGIN, y);
  y += 24;
  doc.setFontSize(20);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const title = doc.splitTextToSize(pdfSafe(l.description), usable) as string[];
  doc.text(title, MARGIN, y);
  y += (title.length - 1) * 22 + 10;
  doc.setDrawColor(INK.r, INK.g, INK.b);
  doc.setLineWidth(1.6);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 78 },
    body: loanerFacts(l).map(([k, v]) => [pdfSafe(k), pdfSafe(v)]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 10, cellPadding: { top: 4, bottom: 4, left: 0, right: 6 }, textColor: [INK.r, INK.g, INK.b] },
    columnStyles: { 0: { cellWidth: 110, textColor: [MUTED.r, MUTED.g, MUTED.b] }, 1: { fontStyle: "bold" } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;

  if (l.sets.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: 78 },
      head: [["Sets", "Status"]],
      body: l.sets.map((s) => [pdfSafe(s.name), pdfSafe(loanerStatusLabel(s.status))]),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 10, cellPadding: { top: 4, bottom: 4, left: 0, right: 6 }, textColor: [INK.r, INK.g, INK.b] },
      headStyles: { fontStyle: "bold", fontSize: 8, textColor: [MUTED.r, MUTED.g, MUTED.b] },
      columnStyles: { 1: { cellWidth: 110 } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  }

  if (l.notes?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("NOTES / SPECIAL CONSIDERATIONS", MARGIN, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(INK.r, INK.g, INK.b);
    const notes = doc.splitTextToSize(pdfSafe(l.notes.trim()), usable) as string[];
    doc.text(notes, MARGIN, y);
  }

  await drawStamp(doc, now, "Open the .orsync file in ORSync to update this request.");
  return doc.output("blob");
}
