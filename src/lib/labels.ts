import type { LoanerTray } from "../types";
import { loanerSetLink } from "./links";

// Printable set labels: one QR per set in a request (plus one for the
// request itself when it has no sets yet), with the vendor, set name,
// procedure, case date, and facility. Stick one on each tray; a scan opens
// the live request so anyone can see where that set stands.
export async function printSetLabels(l: LoanerTray): Promise<void> {
  const QRCode = (await import("qrcode")).default;
  const targets = l.sets.length
    ? l.sets.map((s) => ({ id: s.id, name: s.name }))
    : [{ id: "request", name: l.description }];
  const cells: string[] = [];
  for (const t of targets) {
    const url = loanerSetLink(l.id, t.id);
    const png = await QRCode.toDataURL(url, { margin: 1, width: 220 });
    cells.push(`<div class="label">
      <img src="${png}" alt="" />
      <div class="t">
        <div class="v">${esc(l.vendor ?? "")}</div>
        <div class="n">${esc(t.name)}</div>
        <div class="m">${esc([l.procedure, l.caseDate ? l.caseDate.slice(0, 10) : "", l.facilityName].filter(Boolean).join(" · "))}</div>
        <div class="m">${esc(l.repName ? `Rep: ${l.repName}` : "")}</div>
        <div class="c">${esc(l.id.slice(-8).toUpperCase())}${t.id === "request" ? "" : `-${esc(t.id.slice(-4).toUpperCase())}`}</div>
      </div>
    </div>`);
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Set labels</title>
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 12mm; }
    .label { display: flex; gap: 8px; align-items: center; border: 1px dashed #999; border-radius: 6px; padding: 6px 8px; margin: 0 0 6mm; page-break-inside: avoid; width: 88mm; }
    img { width: 32mm; height: 32mm; }
    .v { font-weight: 700; font-size: 12pt; } .n { font-size: 11pt; } .m { font-size: 8.5pt; color: #444; } .c { font-family: monospace; font-size: 9pt; margin-top: 2px; }
    @media print { body { margin: 8mm; } }
  </style></head><body>${cells.join("")}<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
