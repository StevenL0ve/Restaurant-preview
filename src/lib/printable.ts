import type { AppState } from "../types";

// A clean, printable record of the full message thread. The legal record is the
// main reason families use these apps; this renders a self-contained document
// the user can print or "Save as PDF" from the browser dialog and hand to an
// attorney or the court.

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function messagesPrintHTML(s: AppState): string {
  const nameOf = (id: string) =>
    s.people.find((p) => p.id === id)?.name ?? "Unknown";
  const me = nameOf(s.meId);
  const co = nameOf(s.coParentId);
  const generated = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const rows = [...s.messages]
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .map((m) => {
      const when = new Date(m.createdAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const sender = m.fromId === s.meId ? me : nameOf(m.fromId);
      const toneTag =
        m.tone !== "calm"
          ? `<span class="tone ${m.tone}">${m.tone}</span>`
          : "";
      return `
        <tr>
          <td class="ts">${escapeHTML(when)}</td>
          <td class="from">${escapeHTML(sender)}</td>
          <td class="body">${escapeHTML(m.body)} ${toneTag}</td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>CoParent — Message Record</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 4px; }
  .cert { font-size: 11px; color: #444; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc;
          padding: 8px 0; margin: 14px 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; border-bottom: 2px solid #333; padding: 6px 8px; font-size: 11px;
       text-transform: uppercase; letter-spacing: 0.04em; }
  td { vertical-align: top; padding: 7px 8px; border-bottom: 1px solid #e3e3e3; }
  td.ts { white-space: nowrap; color: #555; width: 150px; }
  td.from { white-space: nowrap; font-weight: bold; width: 90px; }
  .tone { font-size: 10px; text-transform: uppercase; border: 1px solid #999; border-radius: 3px;
          padding: 0 4px; margin-left: 4px; color: #666; }
  .footer { margin-top: 18px; font-size: 10.5px; color: #777; }
  @media print { body { margin: 0.5in; } }
</style></head>
<body>
  <h1>CoParent — Message Record</h1>
  <div class="meta">Parties: ${escapeHTML(me)} &amp; ${escapeHTML(co)}</div>
  <div class="meta">Generated: ${escapeHTML(generated)} · ${s.messages.length} messages</div>
  <div class="cert">
    This record was generated from CoParent. Messages are stored with the
    timestamp recorded at the time they were sent and cannot be edited or
    deleted after sending. Tone labels reflect an automated, on-device analysis
    captured at send time and are informational only.
  </div>
  <table>
    <thead><tr><th>Timestamp</th><th>From</th><th>Message</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">End of record — ${escapeHTML(generated)}</div>
</body></html>`;
}

// Open the printable record in a new window and trigger the print/save dialog.
export function printMessageLog(s: AppState): boolean {
  const w = window.open("", "_blank");
  if (!w) return false; // popup blocked
  w.document.write(messagesPrintHTML(s));
  w.document.close();
  w.focus();
  w.print();
  return true;
}
