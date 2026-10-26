import { describe, expect, it } from "vitest";
import { parseCardText } from "./parseCard";

// Two more real S3 printouts, as the iPhone reads them (two columns rebuilt
// left then right, table column gaps kept as 3 spaces).
const DC = `PREF CARD:   125 - Dilation & Curettage (D&C)
PROCEDURE:   Dilation & Curettage (D&C)
STAFF:   Generic Surgeon   LAST UPDATE:   UPDATE BY:
SERVICE:   OB/GYN   02/15/2018   1397543800a
GLOVES:   ASK
POSITION:   Lithotomy - Yellowfins/Arms on armboards
PREP:   Betadine - Vaginal
PULL BY:   PULL DATE:
Sterile Supplies Drapes
__ 1 DRAPE, LITHOTOMY PACK V.
__ 1 DRAPE, UNDER BUTTOCKS DRAPE (89415)
__ 2 DRAPE, HAND TOWEL (Avail)
Sterile Supplies, Needles, Syringes, IV Supplies
__ 1 NEEDLE, HYPO, 25GA 1 1/2 IN (305127).
Sterile Supplies
__ 1 BOWLS, BLUE (61200)
__ 1 CATHETER, 16FR, RED ROBIN
__ 1 COVER, CAMERA, GREEN (LT-C02)
__ 1 COVER, LIGHT HANDLE, GREEN (LT-R01)
__ 2 DRESSING, TELFA 2X3"
Sterile Supplies (cont)
__ 2 GOWN, SURGICAL X-LG (95321)
__ 1 SCRUB, TRAY, WET SKIN (50-002M.01)
__ 1 SPONGE, RAYTEX 4X8IN (7318)
Instruments
__ 1 SET, GYN, D & C SET
__ 1 SET, GYN, SPECULUM
Non Sterile Supplies
__ 1 DRESSING, MESH PANTIES
__ 1 DRESSING, PERI PAD
NOTES/SPECIAL INSTRUCTIONS
• Head of bed to foot.
•
• Surgeon may do vaginal exam prior to prep - Ask
•
• Straight cath with prep to drain bladder`;

const KNEE = `PREF CARD:   4434 - Arthroscopy, Meniscal Repair, Knee
PROCEDURES:   102 -- Arthroscopy, Debridement, Knee; Arthroscopy, Meniscal Repair, Knee; Arthroscopy, Lateral Release,
Knee
STAFF:   Smith, Thomas   LAST UPDATE:   UPDATE BY:
SERVICE:   Orthopedics   12/03/2024   Lowery, J.
GLOVES:   8 Blue/7.5 white x 2
POSITION:   Supine
PREP:   4x4 Gauze, alcohol, chloraprep
PULL BY:   PULL DATE:
Instruments
__ 1 CAMERA, 1688 STRYKER W/LIGHTCORD
__ 1 ORTHO, ARTHROSCOPY SET, ARTHREX
__ 1 ORTHO, SHAVER, STRYKER
__ 1 SCOPE, ORTHO, 4MM 30/70 DEG
__ 1 ORTHO, KNEE SCORPION, ARTHREX (Avail)
__ 1 ORTHO, ACL TRAY, ARTHREX (Avail)
__ 1 ORTHO, AWLS, MICROFRACTURE (Avail)
__ 1 ORTHO, HAND & FOOT (Avail)
__ 1 ORTHO, KNOT PUSHER, ARTHREX (Avail)
__ 1 ORTHO, ZONE SPECIFIC CANNULA SET (Avail)
__ 2 POWER, BATTERY, SYSTEM 8, STRYKER (Avail)
__ 1 POWER, DRILL, SYSTEM 8 (Avail)
__ 1 ORTHO, ARTHREX, ACL, ROOT REPAIR KIT (Avail)
Packs
__ 1 PACK, ARTHROSCOPY TRAY
Gowns/Gloves
__ 1 GLOVES, INDICATOR, 8
__ 2 GLOVES, OVER, 7.5
__ 1 GOWN, SURGICAL XX-LG (95331)
Blades/Bits/Burrs
__ 1 BLADE, #11 (REGULAR)
__ 2 BLADE, #15 (REGULAR) (Avail)
Needles, Syringes, IV
__ 1 HYPO, 22GA 1 1/2" (305159) (Avail)
Cautery
__ 1 ELECTROCAUTERY, SMOKE EVAC (0703046000) (Avail)
Dressing
__ 2 DRESSING, ABDOMINAL PAD
__ 1 DRESSING, ACE WRAP, 6" DOUBLE (DYNJ05158LF)
__ 1 DRESSING, COBAN 6"
__ 1 DRESSING, KERLIX (FLUFFS) (3085)
__ 1 DRESSING, XEROFORM 1X8"
__ 1 DRESSING, 4x4
__ 1 DRESSING, WEBRIL 6" (Avail)
Sterile Supplies
__ 1 COVER, HANDLE, CAMERA (LT-C02)
__ 1 COVER, HANDLE, LIGHT (LT-R01).
__ 2 TUBING, SUCTION
__ 1 TOURNIQUET, 30"(60707010500) (Avail)
__ 1 TOURNIQUET, 34" (60707010600) (Avail)
Drapes
__ 1 DRAPE, ARTHROSCOPY DRAPE (9414)
__ 2 DRAPE, HALF DRAPE (89534).
__ 1 DRAPE, LEGGINGS (89408)
__ 2 DRAPE, Impervious Split drapes
Ortho
__ 1 TUBING, ARTHROSCOPY PUMP, ARTHREX (AR64-10)
__ 1 NEEDLE, SCORPION MULTIFIRE (AR-13995N) (Avail)
__ 1 SHAVER, 3.5MM, AGGRESSIVE+ (375-534-000) (Avail)
__ 1 SHAVER, 4.0MM, TOMCAT (375-545-000) (Avail)
__ 1 VAPR COOLPULSE, DEPUY MITEK (228147) (Avail)
Suture Cart
__ 1 Nylon, 3-0
FLUID CART
__ 6 0.9% NORMAL SALINE, IRRG, 3000ML
Positioning Room
__ 1 ARMBOARDS
__ 1 LEG HOLDER, BLUE, ACUFLEX
__ 1 STIRRUPS, YELLOW FINS (Place on Non-Operative Leg)
OR Equipment
__ 1 ESU, BOVIE, CONMED
__ 1 PUMP, ARTHREX ARTHROSCOPY
__ 1 SCD
__ 1 TOURNIQUET
Clean Room
__ 1 ABSORBA-MAT
__ 1 WRAP, KNEE (POLAR CARE)
___
NOTES/SPECIAL INSTRUCTIONS
• PREOP: Ensure patient is shaved and both TED hose and SCD are placed on non-operative leg. Have
second TED HOSE for operative leg available for placement prior to leaving OR.
• POSITION: SUPINE. Turn middle PAD on bed around so hole is at top (lithotomy hole). Position patient so
knee is approx. 3" past break in bed (toward foot of bed). YELLOW FIN STIRRUP used for non-operative
side. BLUE O-RING for operative leg (on ortho positioning cart). TQ and 1015 placed prior to prepping and
lowering foot of bed.
• PREP: Chlorahexadine with alcohol, blue towel, 2x chloraprep.
• DRAPE: sticky blue, extremity arthroscopy drape, LEGGING FOR STIRRUP
• Dressing: xeroform, gauze, abd,webril, ace wrap, TED HOSE, Polar care
• MEDS: two amps of Epi 1:100000 in each 3L NS bag or irrigation.
• TECH:Have padded sterile mayo stand prepared for second half of case. It will be used forsupporting the
operative leg during graft insertion and incision closure.
• Postion pump suction on foot of bed or operable side.`;

const all = (p: ReturnType<typeof parseCardText>) => Object.values(p.sections).flat();
const names = (p: ReturnType<typeof parseCardText>, k: keyof ReturnType<typeof parseCardText>["sections"]) => p.sections[k].map((i) => i.name);

describe("QC: Dilation & Curettage (D&C)", () => {
  const p = parseCardText(DC);
  it("header", () => {
    expect(p).toMatchObject({
      procedure: "Dilation & Curettage (D&C)", surgeonName: "Generic Surgeon", specialty: "OB/GYN",
      position: "Lithotomy - Yellowfins/Arms on armboards", prep: "Betadine - Vaginal", sourceUpdated: "2018-02-15",
    });
    expect(p.gloveSize).toBeUndefined(); // "ASK"
  });
  it("every item, nothing extra", () => {
    expect(p.itemCount).toBe(16);
    expect(all(p).map((i) => i.name)).not.toContain("Sterile Supplies, Needles, Syringes, IV Supplies");
  });
  it("sections", () => {
    expect(names(p, "instruments")).toEqual(["SET, GYN, D & C SET", "SET, GYN, SPECULUM"]);
    expect(p.sections.supplies).toHaveLength(14);
  });
  it("quantities, holds and REF numbers", () => {
    const f = (n: string) => all(p).find((i) => i.name === n);
    expect(f("DRAPE, HAND TOWEL")).toMatchObject({ qty: 2, hold: true });
    expect(f("NEEDLE, HYPO, 25GA 1 1/2 IN")?.ref).toBe("305127");
    expect(f("SCRUB, TRAY, WET SKIN")?.ref).toBe("50-002M.01");
    expect(f("GOWN, SURGICAL X-LG")).toMatchObject({ qty: 2, ref: "95321" });
    expect(f('DRESSING, TELFA 2X3"')?.qty).toBe(2);
  });
  it("notes without empty bullets", () => {
    expect(p.notes?.split("\n")).toEqual(["Gloves: ASK", "Head of bed to foot.", "Surgeon may do vaginal exam prior to prep - Ask", "Straight cath with prep to drain bladder"]);
  });
});

describe("QC: Arthroscopy, Meniscal Repair, Knee", () => {
  const p = parseCardText(KNEE);
  it("header", () => {
    expect(p).toMatchObject({
      procedure: "Arthroscopy, Meniscal Repair, Knee", surgeonName: "Thomas Smith", specialty: "Orthopedics",
      position: "Supine", prep: "4x4 Gauze, alcohol, chloraprep", sourceUpdated: "2024-12-03",
      gloveUnder: "8", gloveSize: "7.5", // blue indicator 8 under, white 7.5 over
    });
  });
  it("every item, nothing extra (the wrapped procedure list isn't an item)", () => {
    expect(p.itemCount).toBe(53);
    expect(all(p).map((i) => i.name)).not.toContain("Knee");
  });
  it("sections", () => {
    expect(p.sections.instruments).toHaveLength(13);
    expect(names(p, "sutures")).toEqual(["Nylon, 3-0"]);
    expect(names(p, "medications")).toEqual(["0.9% NORMAL SALINE, IRRG, 3000ML"]);
    expect(names(p, "equipment")).toEqual(["ARMBOARDS", "LEG HOLDER, BLUE, ACUFLEX", "STIRRUPS, YELLOW FINS", "ESU, BOVIE, CONMED", "PUMP, ARTHREX ARTHROSCOPY", "SCD", "TOURNIQUET"]);
  });
  it("quantities, holds, REF numbers and details", () => {
    const f = (n: string) => all(p).find((i) => i.name === n);
    expect(f("0.9% NORMAL SALINE, IRRG, 3000ML")?.qty).toBe(6);
    expect(f("POWER, BATTERY, SYSTEM 8, STRYKER")).toMatchObject({ qty: 2, hold: true });
    expect(f('TOURNIQUET, 30"')).toMatchObject({ ref: "60707010500", hold: true });
    expect(f("DRESSING, KERLIX (FLUFFS)")?.ref).toBe("3085");
    expect(f("SHAVER, 3.5MM, AGGRESSIVE+")).toMatchObject({ ref: "375-534-000", hold: true });
    expect(f("STIRRUPS, YELLOW FINS")?.detail).toBe("Place on Non-Operative Leg");
    expect(f("BLADE, #15")).toMatchObject({ qty: 2, detail: "REGULAR", hold: true });
  });
  it("wrapped notes stay whole", () => {
    const notes = p.notes!.split("\n");
    expect(notes[0]).toBe("Gloves: 8 Blue/7.5 white x 2");
    expect(notes[1]).toBe("PREOP: Ensure patient is shaved and both TED hose and SCD are placed on non-operative leg. Have second TED HOSE for operative leg available for placement prior to leaving OR.");
    expect(notes).toHaveLength(9);
    expect(notes[8]).toBe("Postion pump suction on foot of bed or operable side.");
  });
});
