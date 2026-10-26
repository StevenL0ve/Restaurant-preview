import { describe, expect, it } from "vitest";
import { parseCardText } from "./parseCard";

// An S3-style hospital printout, as the iPhone's text recognition reads it
// (two columns rebuilt left then right; column gaps kept as 3 spaces).
const SCAN = `PREF CARD:   Appendectomy, Laparoscopic
PROCEDURE:   26 -- Appendectomy, Laparoscopic
STAFF:   Debuysere, Sean   LAST UPDATE:   UPDATE BY:
SERVICE:   General Surgery   01/24/2024   Natividad, C
GLOVES:   8/8
POSITION:   Supine
PREP:   Chloraprep
PULL BY:   PULL DATE:
Instruments
__ 1 CAMERA, STRYKER W/LIGHT CORD
__ 1 GEN, LAPROSCOPIC SET, UNIVERSAL
__ 1 SCOPE, GEN, 5MM 0 DEG, SPECTRUM
__ 1 SCOPE, GEN, 5MM 30 DEG, SPECTRUM
Peel Packs
__ 1 GRASPER, LAPAROSCOPIC, HUNTER LONG (Avail)
__ 1 SUCTION, LAPARSCOPIC, STRYKER, LONG 5MM (Avail)
Packs
__ 1 PACK, MINOR BASIN
Gowns/Gloves
__ 1 GLOVES, INDICATOR, 8 (41680)
__ 1 GLOVES, OVER, 8, (41180)
__ 1 GOWN, SURGICAL X-LG (95321)
Blades/Bits/Burrs
__ 1 BLADE, #15 (REGULAR)
Needles, Syringes, IV
__ 1 HYPO, 22GA 1 1/2" (305159)
Dressing
__ 1 SPONGE, RAYTEC (7318)
__ 1 DRESSING, DERMABOND. (Avail)
Sterile Supplies
__ 1 COVER, HANDLE, CAMERA (LT-C02)
__ 2 COVER, HANDLE, LIGHT (LT-R01).
__ 1 SMOKE EVAC PENCIL (0703-046-000)
__ 1 CATHETER, FOLEY KIT (300416A) (Avail)
Drapes
__ 1 DRAPE, LAPAROSCOPIC/CHOLE (89223).
Laparoscopic
__ 1 CLARIFY VISUALIZATION SYSTEM
__ 1 ENDOCATCH POUCH 10MM (CD001) (AVAIL)
__ 1 INSUFFLATION TUBING
Laparoscopic (cont)
__ 1 LIGASURE, MARYLAND
__ 1 SCISSORS, LAPROSCOPIC, 5MM (CB030)
__ 2 TROCAR, BLADELESS 5MM, 100mm (B5LT).
__ 1 TROCAR, 12mm
__ 1 VERESS NEEDLE 120MM..
__ 1 CARTER-THOMASON II (CTI-1015P) (Avail)
__ 1 ENDO CLIP 5MM. (Avail)
__ 1 SUCTION IRRIGATOR WITH TIP, Stryker
(250-070-520). (Avail)
General
__ 1 STAPLER, ENDO, GIA, STANDARD 12MM (EGIAUSTND)
__ 2 RELOAD, ENDO GIA, 45MM TAN (EGIA45AVM) (Avail)
1 2 RELOAD, ENDO GIA, 60MM TAN (EGIA60AVM) (Avail)
Suture Cart
__ 2 MONOCRYL, 4-0, PS-2, 18Ảồi
__ 2 VICRYL, #0, UR-6, 37i
OR Equipment
__ 1 ESU, COVIDIEN/FORCE TRIAD
__ 1 SCD
__ 1 WARMING UNIT, BAIR HUGGER
Clean Room
__ 1 POSITIONER, PINK PAD (40581)
Medications
__ 1 20ml EXPAREL 1.3% (fridge)
__ 1 MARCAINE, 0.25% 20ml
__ 2 SODIUM CHLORIDE FLUSH
NOTES/SPECIAL INSTRUCTIONS
• ask if patient urinate/VOID prior to rolling or foley
• Will mix 20mL Exparel and 20mL Marcaine 0.25% (plain) AND 20ML INJECTABLE NORMAL SALINE for a total of 60mL
https://mahgaps3/aors/PCEditor/PCDisplay.cfm?pcid=4026&pcty=0   12/4/2020`;

describe("a real S3 printout, as scanned", () => {
  const p = parseCardText(SCAN);
  const find = (name: string) => Object.values(p.sections).flat().find((i) => i.name === name);
  const names = (k: keyof typeof p.sections) => p.sections[k].map((i) => i.name);

  it("reads the header block", () => {
    expect(p.procedure).toBe("Appendectomy, Laparoscopic");
    expect(p.surgeonName).toBe("Sean Debuysere");
    expect(p.specialty).toBe("General Surgery");
    expect(p.position).toBe("Supine");
    expect(p.prep).toBe("Chloraprep");
    expect(p.sourceUpdated).toBe("2024-01-24");
    expect(p.gloveSize).toBe("8");
  });

  it("keeps each line of the notes", () => {
    expect(p.notes?.split("\n")).toEqual([
      "Gloves: 8/8",
      "ask if patient urinate/VOID prior to rolling or foley",
      "Will mix 20mL Exparel and 20mL Marcaine 0.25% (plain) AND 20ML INJECTABLE NORMAL SALINE for a total of 60mL",
    ]);
  });

  it("puts catalog numbers in REF and drops trailing periods", () => {
    expect(find("GLOVES, OVER, 8")?.ref).toBe("41180");
    expect(find("COVER, HANDLE, LIGHT")).toMatchObject({ ref: "LT-R01", qty: 2 });
    expect(find("VERESS NEEDLE 120MM")).toBeTruthy();
    expect(find("BLADE, #15")?.detail).toBe("REGULAR");
    expect(find("20ml EXPAREL 1.3%")?.detail).toBe("fridge");
  });

  it("joins a wrapped catalog line, hold included", () => {
    expect(find("SUCTION IRRIGATOR WITH TIP, Stryker")).toMatchObject({ ref: "250-070-520", hold: true });
  });

  it("reads a checkbox misread as 1 ahead of the quantity", () => {
    expect(find("RELOAD, ENDO GIA, 60MM TAN")).toMatchObject({ qty: 2, ref: "EGIA60AVM", hold: true });
  });

  it("repairs inch marks on suture lengths", () => {
    expect(names("sutures")).toEqual(['MONOCRYL, 4-0, PS-2, 18"', 'VICRYL, #0, UR-6, 37"']);
  });

  it("continues a section marked (cont) instead of making it an item", () => {
    expect(JSON.stringify(p.sections)).not.toMatch(/"cont"|Laparoscopic \(cont/i);
    expect(find("SCISSORS, LAPROSCOPIC, 5MM")).toBeTruthy();
  });

  it("respects the card's own sections for supplies like Dermabond", () => {
    expect(names("supplies")).toContain("DRESSING, DERMABOND");
    expect(names("equipment")).toEqual(expect.arrayContaining(["ESU, COVIDIEN/FORCE TRIAD", "SCD", "WARMING UNIT, BAIR HUGGER"]));
    expect(names("medications")).toEqual(["20ml EXPAREL 1.3%", "MARCAINE, 0.25% 20ml", "SODIUM CHLORIDE FLUSH"]);
  });

  it("drops the URL footer", () => {
    expect(JSON.stringify(p)).not.toMatch(/mahgaps3|pcid/);
  });
});
