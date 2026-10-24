import { describe, it, expect } from "vitest";
import { casesByRoom, reorderCase } from "./store";
import { buildSeed } from "./seed";
import type { AppState, CaseEntry } from "../types";

function entry(id: string, over: Partial<CaseEntry> = {}): CaseEntry {
  return { id, date: "2026-10-24", cardId: "c1", ...over };
}

function state(cases: CaseEntry[]): AppState {
  return { ...buildSeed(), cases };
}

describe("my day, the way a board reads", () => {
  const board = [
    entry("a", { room: "OR 2", time: "07:30" }),
    entry("b", { room: "OR 2" }), // to follow
    entry("c", { room: "OR 2" }), // to follow
    entry("d", { room: "OR 5", time: "10:15" }),
    entry("e", {}), // no room
  ];

  it("groups by room, first-start order, roomless last, followers in board order", () => {
    const groups = casesByRoom(state(board), "2026-10-24");
    expect(groups.map((g) => g.room)).toEqual(["OR 2", "OR 5", ""]);
    expect(groups[0].cases.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("reorders only untimed cases within their room", () => {
    const next = reorderCase(board, "c", -1);
    const or2 = casesByRoom(state(next), "2026-10-24")[0];
    expect(or2.cases.map((c) => c.id)).toEqual(["a", "c", "b"]);
    // Timed cases don't move; bounds are respected.
    expect(reorderCase(board, "a", 1)).toBe(board);
    expect(reorderCase(board, "b", -1)).toBe(board);
  });
});
