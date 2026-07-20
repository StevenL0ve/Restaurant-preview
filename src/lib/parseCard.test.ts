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

// A condensed transcript of a real hospital-system printout (AORS/Genesis
// style) — labeled header block, many fine-grained sections, quantity
// prefixes, catalog numbers, "(Avail)" flags, wrapped lines, and a
// NOTES/SPECIAL INSTRUCTIONS page.
const HOSPITAL_CARD = `
PREF CARD: 4138 - Osteotomy, Lefort I, 2-Piece; Bilateral Sagittal Split
PROCEDURE: MAXILLARY MANDIBULAR ADVANCEMENT
STAFF: Wagner, Chad
SERVICE: Oral-Maxillofacial
GLOVES: Dr. Wagner 8 over/8 under
POSITION: Supine, rotate bed 180*, arms tucked
PREP: Brush teeth w/ Peridex/beta scrub & 5% beta face
LAST UPDATE: 05/18/2026
UPDATE BY: Wagner
PULL BY:
Page 1 of 2

Instruments
_ 1 ORAL, BILATERAL SAGITTAL SPLIT OSTEOTOMY
_ 1 ORAL, LEFORT
_ 1 ORAL, PLATING SYSTEM, ORTHOGNATHIC MATRIX,
SYNTHES
_ 1 POWER, ORAL, DRILL, HANDPIECE

Peel Packs
_ 1 HEMOSTATS, TOWEL CLIP, NON-PERFORATING,
SMALL
_ 1 SCISSORS MAYO 5" CURVED (Avail)

Gowns/Gloves
_ 2 GLOVES, OVER, 8
_ 2 GOWN, SURGICAL X-LG

Blades/Bits/Burrs
_ 3 BLADE, #15 (NON-SAFETY)

Sterile Supplies
_ 2 BOWLS, BLUE (61200)
_ 1 ELECTROCAUTERY PENCIL, SMOKE EVAC
(0703-046-000)
_ 1 SUCTION TIP, FRAZIER 12FR

Suture Cart
_ 2 CHROMIC, 3-0, PS-2, 27" (Avail)
_ 2 VICRYL, 3-0, CT-2 (Avail)

OR Equipment
_ 1 DRILL, SYSTEM, UNIVERSAL, XOMED (XPS 3000)
_ 1 ESU, BOVIE, CONMED

Medications
_ 1 AFRIN NASAL SPRAY
_ 1 LIDOCAINE 2% W/EPINEPHRINE 1:20,0000

https://mahgs3app.med.ds.osd.mil/aors/PCEditor/PCDisplay.cfm?pcid=4138&pcty=0
3/10/2022

PREF CARD: 4138 - Osteotomy, Lefort I, 1-Piece; Bilateral Sagittal Split
Page 2 of 2

Clinic - Dental
_ 1 BIO-GIDE (Avail)
_ 1 COLLAGEN PLUG (Avail)

NOTES/SPECIAL INSTRUCTIONS
• Pt needs to complete peridex rinse in APU/have pt use the restroom prior to bringing to the room
• 1) Have a gel pad on the bed (megadyne works fine)
• 12) Bring OMFS cart in the rm that has the Stryker on top, plug in Stryker
`;

describe("hospital-system printout (AORS/Genesis style)", () => {
  const p = parseCardText(HOSPITAL_CARD);

  it("takes the PREF CARD line as the title, stripping the card number", () => {
    expect(p.procedure).toBe("Osteotomy, Lefort I, 2-Piece; Bilateral Sagittal Split");
  });

  it("reads staff/service/position/prep from the header block", () => {
    expect(p.surgeonName).toBe("Wagner");
    expect(p.specialty).toBe("Oral-Maxillofacial");
    expect(p.position).toContain("rotate bed 180");
    expect(p.prep).toContain("Peridex");
  });

  it("keeps the gloves line and the special instructions as notes", () => {
    expect(p.notes).toContain("Gloves: Dr. Wagner 8 over/8 under");
    expect(p.notes).toContain("Have a gel pad on the bed (megadyne works fine)");
    expect(p.notes).toContain("peridex rinse");
  });

  it("stitches wrapped lines back onto their item", () => {
    const names = p.sections.instruments.map((i) => i.name);
    expect(names).toContain("ORAL, PLATING SYSTEM, ORTHOGNATHIC MATRIX, SYNTHES");
    expect(names).toContain("HEMOSTATS, TOWEL CLIP, NON-PERFORATING, SMALL");
    const pencil = p.sections.supplies.find((i) => i.name.startsWith("ELECTROCAUTERY PENCIL"));
    expect(pencil?.detail).toContain("0703-046-000");
  });

  it("maps hospital sections into the app's five sections", () => {
    expect(p.sections.instruments.map((i) => i.name)).toContain("ORAL, LEFORT");
    expect(p.sections.instruments.map((i) => i.name)).toContain("SCISSORS MAYO 5\" CURVED"); // Peel Packs
    expect(p.sections.supplies.map((i) => i.name)).toContain("GLOVES, OVER, 8"); // Gowns/Gloves
    expect(p.sections.supplies.map((i) => i.name)).toContain("BLADE, #15"); // Blades/Bits/Burrs
    expect(p.sections.supplies.map((i) => i.name)).toContain("BIO-GIDE"); // Clinic - Dental
    expect(p.sections.sutures.map((i) => i.name)).toContain("VICRYL, 3-0, CT-2"); // Suture Cart
    expect(p.sections.equipment.map((i) => i.name)).toContain("ESU, BOVIE, CONMED"); // OR Equipment
    expect(p.sections.medications.map((i) => i.name)).toContain("AFRIN NASAL SPRAY");
  });

  it("carries quantity, catalog number, and Avail flags into detail", () => {
    const bowls = p.sections.supplies.find((i) => i.name === "BOWLS, BLUE");
    expect(bowls?.detail).toBe("×2 · 61200");
    const chromic = p.sections.sutures.find((i) => i.name.startsWith("CHROMIC"));
    expect(chromic?.detail).toContain("×2");
    expect(chromic?.detail).toContain("Avail");
    const drill = p.sections.equipment.find((i) => i.name.startsWith("DRILL, SYSTEM"));
    expect(drill?.detail).toContain("XPS 3000");
  });

  it("drops print junk — URLs, dates, page markers, audit fields", () => {
    const everything = JSON.stringify(p);
    expect(everything).not.toContain("mahgs3app");
    expect(everything).not.toContain("3/10/2022");
    expect(everything).not.toContain("Page 1");
    expect(everything).not.toContain("05/18/2026");
    expect(everything).not.toContain("UPDATE BY");
  });
});
