import type { AppState } from "../types";

// Court-ready record exports. People use co-parenting apps largely to keep an
// admissible record; OurFamilyWizard reviewers complain they can't get their
// data out. These produce clean, timestamped CSVs anyone can open in Excel,
// Google Sheets, or hand to an attorney.

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvEscape).join(","));
  // Prepend a UTF-8 BOM so Excel renders accented characters correctly.
  return "﻿" + lines.join("\r\n");
}

export function messagesCSV(s: AppState): string {
  const nameOf = (id: string) =>
    s.people.find((p) => p.id === id)?.name ?? "Unknown";
  const rows = [...s.messages]
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .map((m) => [
      new Date(m.createdAt).toISOString(),
      m.fromId === s.meId ? "You" : nameOf(m.fromId),
      m.body,
      m.tone,
      m.readAt ? new Date(m.readAt).toISOString() : "unread",
    ]);
  return toCSV(["Timestamp (UTC)", "From", "Message", "Tone", "Read at"], rows);
}

export function expensesCSV(s: AppState): string {
  const nameOf = (id: string) =>
    s.people.find((p) => p.id === id)?.name ?? "Unknown";
  const rows = [...s.expenses]
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .map((x) => [
      new Date(x.date).toISOString().slice(0, 10),
      x.description,
      x.category,
      x.paidById === s.meId ? "You" : nameOf(x.paidById),
      x.amount.toFixed(2),
      `${Math.round(x.splitOtherShare * 100)}%`,
      (x.amount * x.splitOtherShare).toFixed(2),
      x.status,
      x.receiptName ?? "",
    ]);
  return toCSV(
    ["Date", "Description", "Category", "Paid by", "Total", "Other share %", "Other owes", "Status", "Receipt"],
    rows,
  );
}
