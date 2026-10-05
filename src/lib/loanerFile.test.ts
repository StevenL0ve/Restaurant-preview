import { describe, it, expect } from "vitest";
import { applyLoanerFile, buildLoanerFile, isLoanerFile, normalizeLoaner, LOANER_KIND } from "./loanerFile";
import type { AppState, LoanerTray } from "../types";

function emptyState(over: Partial<AppState> = {}): AppState {
  return {
    facilities: [], locations: [], surgeons: [], cards: [], loaners: [], cases: [], setups: {},
    onCallPositions: [], onCallPeople: [], onCallShifts: [], carts: [], repLocations: [], repStock: [],
    ...over,
  };
}

function mkLoaner(partial: Partial<LoanerTray> = {}): LoanerTray {
  return {
    id: "loaner-1",
    description: "Triathlon total knee set",
    status: "requested",
    sets: [],
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    history: [{ status: "requested", at: "2026-10-01T00:00:00Z" }],
    ...partial,
  };
}

const NOW = "2026-10-05T12:00:00Z";

describe("loaner file round trip (clinic → rep → clinic)", () => {
  it("resolves surgeon and facility ids to names for the wire", () => {
    const state = emptyState({
      surgeons: [{ id: "sg1", name: "Dr. Chen", specialty: "Ortho", color: "#000", initials: "DC" }],
      facilities: [{ id: "f1", name: "Mercy General" }],
      loaners: [mkLoaner({ surgeonId: "sg1", facilityId: "f1", clinicContact: "SPD +1 512", notes: "size 4 trials" })],
    });
    const file = buildLoanerFile(state, "loaner-1", NOW)!;
    expect(isLoanerFile(file)).toBe(true);
    expect(file.kind).toBe(LOANER_KIND);
    expect(file.loaner.surgeonName).toBe("Dr. Chen");
    expect(file.loaner.facilityName).toBe("Mercy General");
    expect(file.loaner.clinicContact).toBe("SPD +1 512");
    expect(file.loaner.notes).toBe("size 4 trials");
    expect((file.loaner as Record<string, unknown>).surgeonId).toBeUndefined();
  });

  it("creates the request on the rep's device, then merges the update back", () => {
    const clinic = emptyState({
      surgeons: [{ id: "sg1", name: "Dr. Chen", specialty: "Ortho", color: "#000", initials: "DC" }],
      facilities: [{ id: "f1", name: "Mercy General" }],
      loaners: [mkLoaner({ surgeonId: "sg1", facilityId: "f1", cardId: "card-9" })],
    });
    const request = buildLoanerFile(clinic, "loaner-1", NOW)!;

    // Rep side: import creates the request with the case context.
    const repImport = applyLoanerFile(emptyState(), request, NOW);
    expect(repImport.outcome).toBe("created");
    const repLoaner = repImport.state.loaners[0];
    expect(repLoaner.id).toBe("loaner-1");
    expect(repLoaner.surgeonName).toBe("Dr. Chen");
    expect(repLoaner.facilityName).toBe("Mercy General");

    // Rep confirms: contact card, ETA, two sets with statuses and a photo.
    const repState = {
      ...repImport.state,
      loaners: [{
        ...repLoaner,
        repName: "Mike R.", repPhone: "+15125550112", repEmail: "mike@stryker.com",
        altContact: "Sam K. +1 512 555 0177", vendor: "Stryker",
        estimatedDelivery: "2026-10-06", status: "confirmed" as const,
        sets: [
          { id: "s1", name: "Primary tray 1 of 2", photos: ["data:image/jpeg;base64,abc"], status: "in-transit" as const, history: [] },
          { id: "s2", name: "Trials", photos: [], status: "confirmed" as const, history: [] },
        ],
      }],
    };
    const update = buildLoanerFile(repState, "loaner-1", NOW)!;

    // Clinic side: the update merges into the original record.
    const back = applyLoanerFile(clinic, update, NOW);
    expect(back.outcome).toBe("merged");
    const merged = back.state.loaners.find((l) => l.id === "loaner-1")!;
    expect(merged.repName).toBe("Mike R.");
    expect(merged.repEmail).toBe("mike@stryker.com");
    expect(merged.altContact).toContain("Sam K.");
    expect(merged.estimatedDelivery).toBe("2026-10-06");
    expect(merged.status).toBe("confirmed");
    expect(merged.sets.map((s) => s.name)).toEqual(["Primary tray 1 of 2", "Trials"]);
    expect(merged.sets[0].photos).toHaveLength(1);
    // Local links survive the merge.
    expect(merged.surgeonId).toBe("sg1");
    expect(merged.facilityId).toBe("f1");
    expect(merged.cardId).toBe("card-9");
    expect(back.state.loaners).toHaveLength(1); // merged, not duplicated
  });

  it("keeps local photos when an incoming update was sent without them", () => {
    const withPhotos = emptyState({
      loaners: [mkLoaner({
        sets: [{ id: "s1", name: "Tray", photos: ["data:image/jpeg;base64,x"], status: "delivered", history: [] }],
      })],
    });
    const light = buildLoanerFile(withPhotos, "loaner-1", NOW)!;
    light.loaner.sets = light.loaner.sets.map((s) => ({ ...s, photos: [], status: "assembly" as const }));
    const merged = applyLoanerFile(withPhotos, light, NOW);
    expect(merged.state.loaners[0].sets[0].photos).toHaveLength(1);
    expect(merged.state.loaners[0].sets[0].status).toBe("assembly");
  });

  it("normalizes loaners from the old 6-step pipeline", () => {
    const old = mkLoaner({
      status: "ready" as never,
      history: [{ status: "in-use" as never, at: NOW }],
      sets: undefined as never,
    });
    const n = normalizeLoaner(old);
    expect(n.status).toBe("cooling");
    expect(n.history[0].status).toBe("in-room");
    expect(n.sets).toEqual([]);
  });
});
