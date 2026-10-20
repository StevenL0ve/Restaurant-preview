import { describe, it, expect } from "vitest";
import { dayNotesFor } from "./store";
import { buildSeed } from "./seed";

describe("one-day special considerations", () => {
  it("returns only the card's notes for the given day", () => {
    const s = buildSeed();
    const seeded = s.dayNotes[0];
    expect(seeded).toBeTruthy();
    const hits = dayNotesFor(s, seeded.cardId, seeded.date);
    expect(hits.map((n) => n.id)).toContain(seeded.id);
    expect(dayNotesFor(s, seeded.cardId, "1999-01-01")).toHaveLength(0);
    expect(dayNotesFor(s, "card-nope", seeded.date)).toHaveLength(0);
  });

  it("seed demo note has no em dashes and is dated today-style", () => {
    const n = buildSeed().dayNotes[0];
    expect(n.text).not.toContain("\u2014");
    expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
