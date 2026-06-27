import { describe, it, expect } from "vitest";
import { cardToText } from "./share";
import { buildSeed } from "../state/seed";
import { locationLabel } from "../types";

describe("cardToText", () => {
  const state = buildSeed();
  const card = state.cards.find((c) => c.procedure.startsWith("Laparoscopic"))!;
  const surgeon = state.surgeons.find((s) => s.id === card.surgeonId);
  const locName = (id: string) => {
    const l = state.locations.find((x) => x.id === id);
    return l ? locationLabel(l) : undefined;
  };
  const text = cardToText(card, surgeon, locName);

  it("leads with the procedure and surgeon", () => {
    expect(text).toContain("LAPAROSCOPIC CHOLECYSTECTOMY");
    expect(text).toContain("Dr. Alvarez");
  });

  it("includes glove size and section headers", () => {
    expect(text).toContain("Gloves: 7.0");
    expect(text).toContain("INSTRUMENTS & TRAYS");
    expect(text).toContain("SUTURES");
  });

  it("renders items with their detail", () => {
    expect(text).toMatch(/Vicryl 0 — fascia/);
  });

  it("includes the location for items that have one", () => {
    expect(text).toContain("📍 Sterile store room, cabinet 7, shelf 3");
  });

  it("works without a surgeon or location resolver", () => {
    const t = cardToText(card);
    expect(t).toContain("LAPAROSCOPIC CHOLECYSTECTOMY");
    expect(t).not.toContain("Gloves:");
    expect(t).not.toContain("📍");
  });
});
