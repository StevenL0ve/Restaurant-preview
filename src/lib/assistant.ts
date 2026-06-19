import type { AppState } from "../types";
import { fullDate, time } from "./format";
import { search } from "./search";

// On-device assistant: answers natural-language questions over the user's own
// data — no network, no API key, fully private. It covers the highest-value
// intents (custody schedule, info bank, upcoming events, "did I message X
// about Y"), and falls back to global search for anything else.

export interface AssistantAnswer {
  text: string;
  detail?: string;
  route?: string;
}

const DOW: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3,
  thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
};
const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "do", "did", "does", "i", "we",
  "me", "my", "our", "to", "about", "with", "on", "at", "in", "of", "for", "and",
  "when", "what", "whats", "when's", "what's", "who", "whos", "who's", "size",
  "have", "has", "kids", "kid", "children", "child", "next", "this", "wear",
  "wears", "game", "the", "tell", "told", "message", "messaged", "text", "texted",
]);

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function cap(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

interface DateRange { start: Date; end: Date; label: string }

// Turn a phrase like "next Saturday" / "this weekend" / "next month" into a
// concrete date range. Returns null when no date is mentioned.
export function resolveDate(q: string, now = new Date()): DateRange | null {
  const today = startOfDay(now);
  if (/\btoday\b/.test(q)) return { start: today, end: addDays(today, 1), label: "today" };
  if (/\btomorrow\b/.test(q)) return { start: addDays(today, 1), end: addDays(today, 2), label: "tomorrow" };
  if (/\bweekend\b/.test(q)) {
    const sat = addDays(today, (6 - today.getDay() + 7) % 7);
    return { start: sat, end: addDays(sat, 2), label: "this weekend" };
  }
  if (/\bnext month\b/.test(q)) {
    return {
      start: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      end: new Date(today.getFullYear(), today.getMonth() + 2, 1),
      label: "next month",
    };
  }
  if (/\bnext week\b/.test(q)) {
    const mon = addDays(today, (1 - today.getDay() + 7) % 7 || 7);
    return { start: mon, end: addDays(mon, 7), label: "next week" };
  }
  for (const [name, dow] of Object.entries(DOW)) {
    const m = q.match(new RegExp(`\\b(next\\s+)?${name}\\b`));
    if (m) {
      const day = addDays(today, (dow - today.getDay() + 7) % 7);
      return { start: day, end: addDays(day, 1), label: (m[1] ? "next " : "") + cap(name) };
    }
  }
  return null;
}

function overlaps(startISO: string, endISO: string, r: DateRange): boolean {
  return new Date(startISO) < r.end && new Date(endISO) > r.start;
}

export function answerQuery(state: AppState, raw: string, now = new Date()): AssistantAnswer {
  const q = raw.toLowerCase().trim();
  if (!q) return { text: "Ask me about your schedule, your kids' details, events, or messages." };

  const nameOf = (id?: string) => state.people.find((p) => p.id === id)?.name ?? "your co-parent";
  const kids = state.people.filter((p) => p.role === "child");
  const childInQuery = kids.find((k) => q.includes(k.name.toLowerCase()));
  const tokens = q.replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter((t) => t && !STOP.has(t));

  // 1) Custody / parenting-time: "are the kids with me next Saturday?"
  const custodyAsk = /\bkids?\b|\bchild(ren)?\b|custody|parenting|with me|who has|have (the )?(kids|them)/.test(q);
  const range = resolveDate(q, now);
  if (custodyAsk && range) {
    const block = state.events.find(
      (e) => e.category === "parenting-time" && e.withId && overlaps(e.start, e.end, range),
    );
    if (!block) {
      return { text: `I don't see a parenting-time block scheduled for ${range.label}.`, route: "/calendar" };
    }
    const withYou = block.withId === state.meId;
    const swap = block.requestStatus === "pending" ? " (heads up: there's a pending swap request on that block)" : "";
    return {
      text: withYou
        ? `Yes — the kids are with you ${range.label}.${swap}`
        : `No — the kids are with ${nameOf(block.withId)} ${range.label}.${swap}`,
      route: "/calendar",
    };
  }

  // 2) Info bank: "what size shoes does Ava wear?"
  if (/\bsize\b|\bshoe\b|\ballerg|\bblood\b|\bteacher\b|\binsurance\b|\bbus\b|\bbirthday\b/.test(q) || (childInQuery && tokens.length)) {
    const recs = state.info.filter((r) => {
      if (childInQuery && r.childId !== childInQuery.id) return false;
      const hay = r.label.toLowerCase();
      return tokens.some((t) => hay.includes(t) || t.includes(hay.split(" ")[0]));
    });
    if (recs.length) {
      const r = recs[0];
      return {
        text: `${nameOf(r.childId)}'s ${r.label.toLowerCase()} is ${r.value}.`,
        detail: recs.length > 1 ? `+${recs.length - 1} more in the Info Bank` : undefined,
        route: "/info",
      };
    }
  }

  // 3) Upcoming events: "when's the soccer game?"
  if (/\bwhen\b|\bgame\b|\bpractice\b|\bappointment\b|\bdentist\b|\bschedule\b/.test(q)) {
    const upcoming = state.events
      .filter((e) => new Date(e.start) >= startOfDay(now))
      .filter((e) => tokens.some((t) => `${e.title} ${e.notes ?? ""}`.toLowerCase().includes(t)))
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
    if (upcoming.length) {
      const e = upcoming[0];
      return {
        text: `${e.title} — ${fullDate(e.start)}${e.allDay ? "" : ` at ${time(e.start)}`}.`,
        detail: e.notes,
        route: "/calendar",
      };
    }
  }

  // 4) Messages: "did I message Leya about the vacation?"
  if (/\bmessage\b|\btext\b|\btell\b|\btold\b|\bask(ed)?\b|\bmention/.test(q)) {
    const topics = tokens.filter((t) => !kids.some((k) => k.name.toLowerCase() === t));
    const hit = [...state.messages]
      .reverse()
      .find((m) => topics.some((t) => m.body.toLowerCase().includes(t)));
    if (hit) {
      const who = hit.fromId === state.meId ? "You" : nameOf(hit.fromId);
      return {
        text: `Yes — ${who} mentioned that on ${fullDate(hit.createdAt)}.`,
        detail: `"${hit.body}"`,
        route: "/messages",
      };
    }
    if (topics.length) {
      return { text: `I don't see any message about "${topics.join(" ")}".`, route: "/messages" };
    }
  }

  // Fallback: global search.
  const hits = search(state, tokens.join(" ") || q);
  if (hits.length) {
    return { text: `Here's the closest match I found:`, detail: `${hits[0].title} — ${hits[0].snippet}`, route: hits[0].to };
  }
  return {
    text: `I couldn't find that. Try asking about the custody schedule, a child's details, an event, or a message.`,
  };
}
