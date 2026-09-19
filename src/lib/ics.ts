import type { CalEvent, Person } from "../types";

// Export the shared calendar to a standard .ics file so it imports into
// Apple/Google/Outlook calendars. OurFamilyWizard reviewers specifically ask
// for phone-calendar sync and don't get it — this closes that gap.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toICSDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  if (allDay) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  }
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildICS(events: CalEvent[], people: Person[]): string {
  const nameOf = (id?: string) => people.find((p) => p.id === id)?.name ?? "";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CoParent//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    const summary = e.withId ? `${e.title} (with ${nameOf(e.withId)})` : e.title;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@coparently`,
      `DTSTAMP:${toICSDate(new Date().toISOString(), false)}`,
      e.allDay
        ? `DTSTART;VALUE=DATE:${toICSDate(e.start, true)}`
        : `DTSTART:${toICSDate(e.start, false)}`,
      e.allDay
        ? `DTEND;VALUE=DATE:${toICSDate(e.end, true)}`
        : `DTEND:${toICSDate(e.end, false)}`,
      `SUMMARY:${escapeText(summary)}`,
      e.notes ? `DESCRIPTION:${escapeText(e.notes)}` : "DESCRIPTION:",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
