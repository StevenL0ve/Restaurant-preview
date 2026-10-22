import { describe, it, expect } from "vitest";
import { cartVerificationBlob, verificationFilename } from "./qcPdf";
import type { CaseCart, PrefCard } from "../types";

const card: PrefCard = {
  id: "c1", surgeonId: "sg1", procedure: "Lap Chole", specialty: "General Surgery",
  instruments: [], sutures: [], supplies: [], medications: [], equipment: [],
  favorite: false, updatedAt: "2026-10-22T00:00:00Z",
};
const cart: CaseCart = {
  id: "k1", cardId: "c1", date: "2026-10-22",
  pulls: { x: { by: "Priya", at: "2026-10-22T06:00:00Z" } },
  qc: { x: { by: "Jo", at: "2026-10-22T07:00:00Z" } },
  qcDone: "2026-10-22T07:10:00Z", qcBy: "Jo",
  missing: [{
    itemId: "y", name: "Endo stapler", sectionLabel: "Instruments & trays",
    supplyTracking: true, surgeonNotifiedAt: "2026-10-22", orderedAt: "2026-10-22",
    alternateItem: "Open stapler", qcCheckedAt: "2026-10-22T07:05:00Z", qcCheckedBy: "Jo",
  }],
  createdAt: "", updatedAt: "",
};

describe("case pull verification PDF", () => {
  it("renders a non-trivial single-page form", async () => {
    const blob = await cartVerificationBlob(card, cart);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("names the file after the case and day", () => {
    expect(verificationFilename("Lap Chole!", "2026-10-22")).toBe("case-pull-verification-lap-chole-2026-10-22.pdf");
  });
});
