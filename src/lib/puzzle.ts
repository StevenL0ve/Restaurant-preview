import type { CommunityPuzzle, PuzzlePlacement } from "../types";

// Pure helpers for the community café puzzle. The placements array is an
// append-only log — exactly the shape a Supabase realtime table takes in
// Phase 2, when everyone at the café works the same board live.

export const PUZZLE_COLS = 4;
export const PUZZLE_ROWS = 5;

export function puzzleSlots(p: CommunityPuzzle): number {
  return p.cols * p.rows;
}

export function placedIndices(p: CommunityPuzzle): Set<number> {
  return new Set(p.placed.map((x) => x.idx));
}

export function unplacedIndices(p: CommunityPuzzle): number[] {
  const done = placedIndices(p);
  const out: number[] = [];
  for (let i = 0; i < puzzleSlots(p); i++) if (!done.has(i)) out.push(i);
  return out;
}

// The board being worked on: the first puzzle in the rotation that isn't
// finished. Null when every puzzle is complete.
export function activePuzzle(list: CommunityPuzzle[]): CommunityPuzzle | null {
  return list.find((p) => !isComplete(p)) ?? null;
}

export function isComplete(p: CommunityPuzzle): boolean {
  return p.placed.length >= puzzleSlots(p);
}

// Who has placed pieces, most pieces first.
export function contributors(p: CommunityPuzzle): { name: string; pieces: number }[] {
  const counts = new Map<string, number>();
  for (const x of p.placed) counts.set(x.by, (counts.get(x.by) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, pieces]) => ({ name, pieces }))
    .sort((a, b) => b.pieces - a.pieces || a.name.localeCompare(b.name));
}

// A valid placement claims an empty slot exactly once.
export function place(p: CommunityPuzzle, idx: number, by: string): PuzzlePlacement | null {
  if (idx < 0 || idx >= puzzleSlots(p)) return null;
  if (placedIndices(p).has(idx)) return null;
  return { idx, by, at: new Date().toISOString() };
}

// CSS background math for rendering slot `idx` as its crop of the image.
export function pieceStyle(p: CommunityPuzzle, idx: number): {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
} {
  const c = idx % p.cols;
  const r = Math.floor(idx / p.cols);
  return {
    backgroundImage: `url(${p.image})`,
    backgroundSize: `${p.cols * 100}% ${p.rows * 100}%`,
    backgroundPosition: `${(c / (p.cols - 1)) * 100}% ${(r / (p.rows - 1)) * 100}%`,
  };
}
