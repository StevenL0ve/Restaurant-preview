import { describe, expect, it } from "vitest";
import { applyRelief, reliefFor, reliefSummary, reliefTimeline } from "./relief";
import type { RoomRelief } from "../types";

const at = "2026-10-27T09:14:00.000Z";
let n = 0;
const id = () => `rel-${++n}`;

describe("room relief", () => {
  it("sets a room's lunch reliefs and break, stamped", () => {
    const r = applyRelief([], "2026-10-27", "OR 1", {
      techLunch: { time: "11:30", name: "Angie Burks" },
      nurseLunch: { time: "12:00", name: "Julia Clarke" },
      nurseBreak: { time: "14:00" },
    }, "Steven Nelson", at, id)!;
    expect(r.reliefs).toHaveLength(1);
    expect(r.reliefs[0]).toMatchObject({ room: "OR 1", updatedBy: "Steven Nelson", updatedAt: at });
    expect(r.text).toBe("Relief OR 1, 2026-10-27: Tech lunch 11:30, relief Angie Burks · RN lunch 12:00, relief Julia Clarke · RN break 14:00");
  });
  it("edits in place, finds the room regardless of case, and ignores no-op saves", () => {
    const first = applyRelief([], "2026-10-27", "OR 1", { techLunch: { time: "11:30", name: "Angie" } }, "A", at, id)!;
    const edited = applyRelief(first.reliefs, "2026-10-27", "or 1", { techLunch: { time: "11:45", name: "Angie" } }, "B", at, id)!;
    expect(edited.reliefs).toHaveLength(1);
    expect(edited.reliefs[0].id).toBe(first.reliefs[0].id);
    expect(edited.reliefs[0]).toMatchObject({ techLunch: { time: "11:45" }, updatedBy: "B" });
    expect(applyRelief(edited.reliefs, "2026-10-27", "OR 1", { techLunch: { time: "11:45", name: "Angie " } }, "C", at, id)).toBeNull();
    expect(reliefFor(edited.reliefs, "2026-10-27", "OR 1 ")?.updatedBy).toBe("B");
    expect(reliefFor(edited.reliefs, "2026-10-28", "OR 1")).toBeUndefined();
  });
  it("blanking every slot removes the record", () => {
    const first = applyRelief([], "2026-10-27", "OR 2", { nurseBreak: { time: "14:00" } }, "A", at, id)!;
    const cleared = applyRelief(first.reliefs, "2026-10-27", "OR 2", { nurseBreak: { time: " " } }, "A", at, id)!;
    expect(cleared.reliefs).toEqual([]);
  });
  it("lists the day's reliefs in time order", () => {
    const rel = (room: string, extra: Partial<RoomRelief>) => ({ id: room, date: "d", room, updatedAt: at, ...extra }) as RoomRelief;
    const t = reliefTimeline([
      { room: "OR 2", relief: rel("OR 2", { techLunch: { time: "12:00", name: "B" }, nurseBreak: { time: "09:30" } }) },
      { room: "OR 10", relief: rel("OR 10", { nurseLunch: { time: "11:00", name: "C" } }) },
      { room: "OR 3" },
    ]);
    expect(t.map((x) => `${x.time} ${x.room} ${x.label}`)).toEqual(["09:30 OR 2 RN break", "11:00 OR 10 RN lunch", "12:00 OR 2 Tech lunch"]);
    expect(reliefSummary(undefined)).toBe("");
  });
});
