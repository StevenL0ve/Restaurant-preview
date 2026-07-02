import type { AppState } from "../types";

// One search box that actually searches everything: messages, calendar,
// expenses, journal, and the info bank. Reviewers say OFW's search "hardly
// works" — this indexes every record and ranks by recency.

export interface SearchHit {
  type: "message" | "event" | "expense" | "journal" | "info";
  id: string;
  title: string;
  snippet: string;
  date: string;
  to: string; // route path
}

function highlightSnippet(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, 120);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + text.slice(start, i + q.length + 60);
}

export function search(state: AppState, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  const nameOf = (id: string) =>
    state.people.find((p) => p.id === id)?.name ?? "Unknown";

  for (const m of state.messages) {
    if (m.body.toLowerCase().includes(q)) {
      hits.push({
        type: "message", id: m.id,
        title: `Message from ${nameOf(m.fromId)}`,
        snippet: highlightSnippet(m.body, q),
        date: m.createdAt, to: "/messages",
      });
    }
  }
  for (const e of state.events) {
    if (`${e.title} ${e.notes ?? ""}`.toLowerCase().includes(q)) {
      hits.push({
        type: "event", id: e.id, title: e.title,
        snippet: e.notes ?? "Calendar event",
        date: e.start, to: "/calendar",
      });
    }
  }
  for (const x of state.expenses) {
    if (`${x.description} ${x.category} ${x.note ?? ""}`.toLowerCase().includes(q)) {
      hits.push({
        type: "expense", id: x.id, title: x.description,
        snippet: `${x.category} · paid by ${nameOf(x.paidById)}`,
        date: x.date, to: "/expenses",
      });
    }
  }
  for (const j of state.journal) {
    if (`${j.title} ${j.body}`.toLowerCase().includes(q)) {
      hits.push({
        type: "journal", id: j.id, title: j.title,
        snippet: highlightSnippet(j.body, q),
        date: j.createdAt, to: "/journal",
      });
    }
  }
  for (const r of state.info) {
    if (`${r.label} ${r.value}`.toLowerCase().includes(q)) {
      hits.push({
        type: "info", id: r.id,
        title: `${r.label}: ${r.value}`,
        snippet: `${nameOf(r.childId)} · Info Bank`,
        date: new Date().toISOString(), to: "/info",
      });
    }
  }

  return hits.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
