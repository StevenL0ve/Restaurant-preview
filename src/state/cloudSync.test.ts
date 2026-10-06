import { describe, it, expect } from "vitest";
import { withOrd, fromDocs, diffDocs, stripLoanerPhotos, mergeLoanerPhotos } from "./cloudSync";
import type { LoanerTray } from "../types";

describe("cloud sync helpers", () => {
  it("round-trips array order through unordered docs", () => {
    const items = [{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "c", v: 3 }];
    const docs = withOrd(items);
    const shuffled = [docs[2], docs[0], docs[1]];
    expect(fromDocs(shuffled)).toEqual(items);
  });

  it("diffs only what changed, and what disappeared", () => {
    const a = { id: "a", v: 1, _ord: 0 };
    const b = { id: "b", v: 2, _ord: 1 };
    const lastKnown = new Map([
      ["a", JSON.stringify(a)],
      ["b", JSON.stringify(b)],
      ["gone", JSON.stringify({ id: "gone", _ord: 2 })],
    ]);
    const { changed, removedIds } = diffDocs(lastKnown, [a, { ...b, v: 99 }]);
    expect(changed.map((c) => c.id)).toEqual(["b"]);
    expect(removedIds).toEqual(["gone"]);
  });

  it("no changes means an empty diff (no write loop)", () => {
    const docs = withOrd([{ id: "a", v: 1 }]);
    const lastKnown = new Map(docs.map((d) => [d.id, JSON.stringify(d)]));
    const { changed, removedIds } = diffDocs(lastKnown, docs);
    expect(changed).toEqual([]);
    expect(removedIds).toEqual([]);
  });

  it("strips tray photos on the way up, restores them on the way down", () => {
    const local: LoanerTray = {
      id: "l1", description: "set", status: "confirmed",
      sets: [{ id: "s1", name: "Tray", photos: ["data:image/jpeg;base64,x"], status: "delivered", history: [] }],
      createdAt: "", updatedAt: "", history: [],
    };
    const up = stripLoanerPhotos(local);
    expect(up.sets[0].photos).toEqual([]);
    // Remote copy comes back without photos but with a newer status.
    const remote = { ...up, sets: [{ ...up.sets[0], status: "assembly" as const }] };
    const down = mergeLoanerPhotos([remote], [local]);
    expect(down[0].sets[0].photos).toHaveLength(1);
    expect(down[0].sets[0].status).toBe("assembly");
  });
});
