import { describe, it, expect } from "vitest";
import { cardPdfBlob, cardPdfFilename } from "./cardPdf";
import { buildSeed } from "../state/seed";
import { locationLabel } from "../types";

describe("card PDF", () => {
  it("builds a real multi-section PDF from a seeded card", async () => {
    const s = buildSeed();
    const card = s.cards.find((c) => c.procedure.startsWith("Laparoscopic"))!;
    const surgeon = s.surgeons.find((x) => x.id === card.surgeonId);
    const facility = s.facilities.find((f) => f.id === card.facilityId);
    const locName = (id: string) => {
      const l = s.locations.find((x) => x.id === id);
      return l ? locationLabel(l) : undefined;
    };
    const blob = await cardPdfBlob(card, surgeon, facility, locName);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(3000); // a real document, not a stub
    // jsdom's Blob lacks arrayBuffer; go through FileReader.
    const head = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(new TextDecoder().decode((r.result as ArrayBuffer).slice(0, 5)));
      r.readAsArrayBuffer(blob.slice(0, 5));
    });
    expect(head).toBe("%PDF-");
  });

  it("names the file after the procedure", () => {
    expect(cardPdfFilename("Laparoscopic Cholecystectomy")).toBe("laparoscopic-cholecystectomy-preference-card.pdf");
  });
});
