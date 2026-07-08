import { describe, it, expect } from "vitest";
import { parseCardText, summarizeParse } from "./parseCard";

describe("parseCardText", () => {
  it("reads a labeled card with explicit sections", () => {
    const text = `
      Procedure: Laparoscopic Cholecystectomy
      Surgeon: Dr. Chen
      Specialty: General Surgery
      Position: Supine, arms tucked
      Skin prep: ChloraPrep
      Draping: Laparotomy drape
      Notes: Specimen back before closing

      Instruments
      - Lap chole tray
      - Maryland dissector

      Sutures:
      - Vicryl 0 — fascia

      Equipment
      - ESU unit (coag 30)
    `;
    const p = parseCardText(text);
    expect(p.procedure).toBe("Laparoscopic Cholecystectomy");
    expect(p.surgeonName).toBe("Dr. Chen");
    expect(p.specialty).toBe("General Surgery");
    expect(p.position).toBe("Supine, arms tucked");
    expect(p.prep).toBe("ChloraPrep");
    expect(p.draping).toBe("Laparotomy drape");
    expect(p.notes).toBe("Specimen back before closing");
    expect(p.sections.instruments.map((i) => i.name)).toEqual(["Lap chole tray", "Maryland dissector"]);
    expect(p.sections.sutures[0]).toEqual({ name: "Vicryl 0", detail: "fascia" });
    expect(p.sections.equipment[0]).toEqual({ name: "ESU unit", detail: "coag 30" });
    expect(p.itemCount).toBe(4);
  });

  it("uses the first line as the procedure when unlabeled", () => {
    const p = parseCardText("Total Knee Arthroplasty\nDr. Alvarez\n- Tourniquet\n- Cement");
    expect(p.procedure).toBe("Total Knee Arthroplasty");
    expect(p.surgeonName).toBe("Dr. Alvarez");
    // "Tourniquet" is equipment by keyword; "Cement" falls through to supplies.
    expect(p.sections.equipment.map((i) => i.name)).toContain("Tourniquet");
    expect(p.itemCount).toBe(2);
  });

  it("guesses sections by keyword for an unsectioned list", () => {
    const p = parseCardText([
      "Appendectomy",
      "Vicryl 2-0",
      "Bovie unit",
      "Kelly clamp",
      "Bacitracin irrigation",
      "Raytec x2",
    ].join("\n"));
    expect(p.sections.sutures.map((i) => i.name)).toContain("Vicryl 2-0");
    expect(p.sections.equipment.map((i) => i.name)).toContain("Bovie unit");
    expect(p.sections.instruments.map((i) => i.name)).toContain("Kelly clamp");
    expect(p.sections.medications.map((i) => i.name)).toContain("Bacitracin irrigation");
    // "Raytec x2" → supplies, qty split into detail.
    expect(p.sections.supplies.find((i) => i.name === "Raytec")?.detail).toBe("x2");
  });

  it("splits parenthetical and dash details", () => {
    const p = parseCardText("Supplies\n- ESU pencil (with holster)\n- Blade: #10");
    expect(p.sections.supplies[0]).toEqual({ name: "ESU pencil", detail: "with holster" });
    expect(p.sections.supplies[1]).toEqual({ name: "Blade", detail: "#10" });
  });

  it("summarizes what it found", () => {
    const p = parseCardText("Hernia Repair\nDr. Lee\nInstruments\n- Mesh tray");
    const s = summarizeParse(p);
    expect(s).toContain("Hernia Repair");
    expect(s).toContain("Dr. Lee");
    expect(s).toContain("1 item");
  });

  it("returns empty structure for empty text", () => {
    const p = parseCardText("   \n  \n");
    expect(p.itemCount).toBe(0);
    expect(p.procedure).toBeUndefined();
    expect(summarizeParse(p)).toContain("No title");
  });
});
