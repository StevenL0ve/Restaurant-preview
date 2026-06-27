import { describe, it, expect } from "vitest";
import { cardToText } from "./share";
import { buildSeed } from "../state/seed";

describe("cardToText", () => {
  const state = buildSeed();
  const card = state.cards.find((c) => c.procedure.startsWith("Laparoscopic"))!;
  const surgeon = state.surgeons.find((s) => s.id === card.surgeonId);
  const text = cardToText(card, surgeon);

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

  it("works without a surgeon", () => {
    const t = cardToText(card);
    expect(t).toContain("LAPAROSCOPIC CHOLECYSTECTOMY");
    expect(t).not.toContain("Gloves:");
  });
});
