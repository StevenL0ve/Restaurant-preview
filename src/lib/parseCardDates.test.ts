import { describe, it, expect } from "vitest";
import { parseCardText, parseGloves, parseLooseDate } from "./parseCard";

describe("card photo details", () => {
  it("reads glove size and type into their own fields", () => {
    expect(parseGloves("7.5 Biogel, latex-free")).toEqual({ size: "7.5", type: "Biogel, latex-free" });
    expect(parseGloves("Size 8")).toEqual({ size: "8", type: undefined });
  });

  it("reads the paper card's last-updated date in common formats", () => {
    expect(parseLooseDate("10/12/2025")).toBe("2025-10-12");
    expect(parseLooseDate("2025-03-04 14:22")).toBe("2025-03-04");
    expect(parseLooseDate("Oct 9, 2024")).toBe("2024-10-09");
    expect(parseLooseDate("9 October 2024")).toBe("2024-10-09");
    expect(parseLooseDate("soon")).toBeUndefined();
  });

  it("pulls header fields, gloves, and the date off a printed card", () => {
    const p = parseCardText([
      "PROCEDURE: Laparoscopic Appendectomy",
      "SURGEON: Dr. Mercy Example",
      "SERVICE: General Surgery",
      "POSITION: Supine, arms out",
      "PREP: ChloraPrep",
      "GLOVES: 7.5 Biogel",
      "LAST UPDATED: 09/30/2025",
      "SUPPLIES",
      "2 Raytec sponges",
      "INSTRUMENTS",
      "Lap chole tray",
    ].join("\n"));
    expect(p.procedure).toBe("Laparoscopic Appendectomy");
    expect(p.specialty).toBe("General Surgery");
    expect(p.position).toBe("Supine, arms out");
    expect(p.prep).toBe("ChloraPrep");
    expect(p.gloveSize).toBe("7.5");
    expect(p.gloveType).toBe("Biogel");
    expect(p.sourceUpdated).toBe("2025-09-30");
    expect(p.sections.supplies[0]).toMatchObject({ name: "Raytec sponges", qty: 2 });
    expect(p.sections.instruments.length).toBe(1);
  });
});
