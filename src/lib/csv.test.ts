import { describe, it, expect } from "vitest";
import { messagesCSV, expensesCSV } from "./csv";
import { buildSeed } from "../state/seed";

describe("csv exports", () => {
  it("messagesCSV has a header row and one line per message", () => {
    const s = buildSeed();
    const lines = messagesCSV(s).split("\r\n");
    expect(lines[0]).toContain("Timestamp (UTC)");
    expect(lines.length).toBe(s.messages.length + 1);
  });

  it("messagesCSV escapes commas and quotes safely", () => {
    const s = buildSeed();
    s.messages = [
      {
        id: "m", fromId: s.meId, body: 'Hi, "Jordan", see notes',
        createdAt: new Date().toISOString(), readAt: null, tone: "calm", edited: false,
      },
    ];
    const csv = messagesCSV(s);
    // The quoted, comma-containing field must be wrapped and quotes doubled.
    expect(csv).toContain('"Hi, ""Jordan"", see notes"');
  });

  it("expensesCSV computes the other parent's owed share", () => {
    const s = buildSeed();
    const csv = expensesCSV(s);
    expect(csv).toContain("Other owes");
    // Soccer registration $90 at 50% -> 45.00 owed.
    expect(csv).toContain("45.00");
  });
});
