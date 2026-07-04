import { describe, it, expect } from "vitest";
import { contributors, isComplete, place, pieceStyle, puzzleSlots, unplacedIndices } from "./puzzle";
import type { CommunityPuzzle } from "../types";

function mkPuzzle(placed: CommunityPuzzle["placed"] = []): CommunityPuzzle {
  return {
    id: "pz-t",
    title: "Test",
    image: "/img.jpeg",
    cols: 4,
    rows: 5,
    startedAt: "2026-07-01T00:00:00Z",
    startedBy: "Café",
    placed,
  };
}

describe("community puzzle", () => {
  it("a 4×5 board has 20 slots, all open at the start", () => {
    const p = mkPuzzle();
    expect(puzzleSlots(p)).toBe(20);
    expect(unplacedIndices(p)).toHaveLength(20);
    expect(isComplete(p)).toBe(false);
  });

  it("placing claims an empty slot once, with attribution", () => {
    const p = mkPuzzle();
    const placement = place(p, 7, "Steven");
    expect(placement).toMatchObject({ idx: 7, by: "Steven" });
    const p2 = mkPuzzle([placement!]);
    expect(place(p2, 7, "Mom")).toBeNull(); // taken
    expect(place(p2, 99, "Mom")).toBeNull(); // off the board
    expect(unplacedIndices(p2)).toHaveLength(19);
  });

  it("completes when every slot is placed", () => {
    const all = Array.from({ length: 20 }, (_, idx) => ({ idx, by: "Crew", at: "2026-07-01T01:00:00Z" }));
    expect(isComplete(mkPuzzle(all))).toBe(true);
  });

  it("ranks contributors by pieces placed", () => {
    const p = mkPuzzle([
      { idx: 0, by: "Mom", at: "t" },
      { idx: 1, by: "Steven", at: "t" },
      { idx: 2, by: "Mom", at: "t" },
    ]);
    expect(contributors(p)).toEqual([
      { name: "Mom", pieces: 2 },
      { name: "Steven", pieces: 1 },
    ]);
  });

  it("maps each slot to its crop of the image", () => {
    const p = mkPuzzle();
    expect(pieceStyle(p, 0).backgroundPosition).toBe("0% 0%");
    expect(pieceStyle(p, 19).backgroundPosition).toBe("100% 100%");
    expect(pieceStyle(p, 0).backgroundSize).toBe("400% 500%");
  });
});
