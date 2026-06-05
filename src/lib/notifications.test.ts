import { describe, it, expect } from "vitest";
import { buildNotifications } from "./notifications";
import { buildSeed } from "../state/seed";
import type { AppState } from "../types";

function seed(): AppState {
  return buildSeed();
}

describe("buildNotifications", () => {
  it("surfaces unread incoming messages, not my own", () => {
    const s = seed();
    const notes = buildNotifications(s);
    const msgNotes = notes.filter((n) => n.kind === "message");
    // Seed has one unread message from the co-parent.
    expect(msgNotes.length).toBe(1);
    expect(msgNotes[0].title).toContain("Jordan");
  });

  it("surfaces pending schedule requests", () => {
    const s = seed();
    const notes = buildNotifications(s);
    expect(notes.some((n) => n.kind === "request")).toBe(true);
  });

  it("surfaces unsettled expenses the co-parent paid", () => {
    const s = seed();
    const notes = buildNotifications(s);
    const expNotes = notes.filter((n) => n.kind === "expense");
    expect(expNotes.length).toBeGreaterThan(0);
    // Settled items must not appear.
    expect(expNotes.every((n) => !n.detail.includes("Winter coat"))).toBe(true);
  });

  it("returns nothing when everything is handled", () => {
    const s = seed();
    s.messages = s.messages.map((m) => ({ ...m, readAt: new Date().toISOString() }));
    s.events = s.events.map((e) => ({ ...e, requestStatus: "none" as const }));
    s.expenses = s.expenses.map((x) => ({ ...x, status: "settled" as const }));
    expect(buildNotifications(s)).toHaveLength(0);
  });

  it("sorts most recent first", () => {
    const notes = buildNotifications(seed());
    for (let i = 1; i < notes.length; i++) {
      expect(+new Date(notes[i - 1].when)).toBeGreaterThanOrEqual(+new Date(notes[i].when));
    }
  });
});
