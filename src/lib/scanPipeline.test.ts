import { describe, expect, it } from "vitest";
import { buildLines, cleanForOcr, type OcrLine } from "./ocr";
import { parseCardText } from "./parseCard";

const L = (text: string, x: number, y: number, w: number, h = 0.02): OcrLine => ({ text, x, y, w, h });

describe("reading order from recognized boxes", () => {
  it("joins cells on the same row left to right, keeping column gaps", () => {
    const out = buildLines([
      L("10", 0.8, 0.30, 0.04),
      L("Lap sponges", 0.1, 0.301, 0.3),
      L("Monocryl 4-0 PS-2", 0.1, 0.35, 0.35),
    ]);
    expect(out).toEqual(["Lap sponges   10", "Monocryl 4-0 PS-2"]);
  });

  it("reads a two-column card left column first, then right", () => {
    const left = ["INSTRUMENTS", "Lap chole tray", "Maryland dissector", "Hook cautery", "Clip applier"];
    const right = ["SUTURES", "Vicryl 0 UR-6", "Monocryl 4-0 PS-2", "MEDICATIONS", "Marcaine 0.25% 20ml"];
    const boxes: OcrLine[] = [L("UNIVERSAL PREFERENCE CARD", 0.2, 0.05, 0.6)];
    left.forEach((t, i) => boxes.push(L(t, 0.05, 0.15 + i * 0.05, 0.35)));
    right.forEach((t, i) => boxes.push(L(t, 0.55, 0.15 + i * 0.05, 0.35)));
    const out = buildLines(boxes);
    expect(out[0]).toBe("UNIVERSAL PREFERENCE CARD");
    expect(out.slice(1, 6)).toEqual(left);
    expect(out.slice(6)).toEqual(right);
  });
});

describe("parsing a clean scan into the five sections", () => {
  const scan = [
    "UNIVERSAL",
    "Procedure: Laparoscopic Cholecystectomy",
    "Surgeon: Dr. Chen",
    "Position: Supine, arms tucked",
    "Prep: ChloraPrep, prior to rolling or foley",
    "SUPPLIES",
    "1 Lap chole pack",
    "Lap sponges   10",
    "1 Monocryl 4-0 PS-2",
    "1 Marcaine 0.25% 20ml",
    "1 Ligasure 5mm",
    "1 Camera drape",
    "1 60 ml syringe",
    "INSTRUMENTS",
    "1 Lap chole tray",
    "1 Maryland dissector",
    "EQUIPMENT",
    "1 Insufflator",
    "https://hospital.example.org/prefcards/print?id=4138",
  ].join("\n");
  const p = parseCardText(scan);
  const names = (k: keyof typeof p.sections) => p.sections[k].map((i) => i.name);

  it("keeps header fields", () => {
    expect(p.procedure).toBe("Laparoscopic Cholecystectomy");
    expect(p.surgeonName).toBe("Dr. Chen");
  });
  it("moves plain sutures, drugs and devices out of the Supplies catch-all", () => {
    expect(names("sutures")).toContain("Monocryl 4-0 PS-2");
    expect(names("medications")).toContain("Marcaine 0.25% 20ml");
    expect(names("equipment")).toEqual(["Insufflator"]);
    expect(names("supplies")).toContain("Ligasure 5mm"); // a disposable handpiece, not the generator
  });
  it("leaves disposables in Supplies", () => {
    expect(names("supplies")).toEqual(expect.arrayContaining(["Lap chole pack", "Camera drape", "60 ml syringe", "Lap sponges"]));
  });
  it("respects explicit headers", () => {
    expect(names("instruments")).toEqual(["Lap chole tray", "Maryland dissector"]);
  });
  it("reads a quantity column", () => {
    expect(p.sections.supplies.find((i) => i.name === "Lap sponges")?.qty).toBe(10);
  });
  it("drops the URL footer", () => {
    expect(JSON.stringify(p.sections)).not.toContain("http");
  });
  it("sorts a header-less scan by keywords", () => {
    const q = parseCardText(["Hernia repair", "Vicryl 2-0 CT-1", "Lidocaine 1% 10ml", "Bovie", "Kelly clamp", "Raytec x2"].join("\n"));
    expect(q.sections.sutures.map((i) => i.name)).toEqual(["Vicryl 2-0 CT-1"]);
    expect(q.sections.medications.map((i) => i.name)).toEqual(["Lidocaine 1% 10ml"]);
    expect(q.sections.equipment.map((i) => i.name)).toEqual(["Bovie"]);
    expect(q.sections.instruments.map((i) => i.name)).toEqual(["Kelly clamp"]);
    expect(q.sections.supplies.map((i) => i.name)).toEqual(["Raytec"]);
  });
});

describe("image cleanup for the web engine", () => {
  it("turns gray text on an uneven background into black on white", () => {
    const w = 60, h = 20;
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bg = 120 + x * 2; // lighting gradient
      const ink = x >= 28 && x <= 31 && y >= 4 && y <= 15; // a vertical stroke
      const v = ink ? bg - 70 : bg;
      const p = (y * w + x) * 4;
      px[p] = px[p + 1] = px[p + 2] = v; px[p + 3] = 255;
    }
    const out = cleanForOcr(px, w, h);
    const at = (x: number, y: number) => out[(y * w + x) * 4];
    expect(at(29, 10)).toBe(0);
    expect(at(5, 10)).toBe(255);
    expect(at(55, 10)).toBe(255);
  });
});

describe("scan debris", () => {
  it("ignores table-rule remnants and broken header echoes", () => {
    const p = parseCardText(["Lap chole", "INSTRUMENTS", "INSTRU —", "1 Lap chole tray", "SUTURES _____", "1 Vicryl 0 UR-6"].join("\n"));
    expect(p.sections.instruments.map((i) => i.name)).toEqual(["Lap chole tray"]);
    expect(p.sections.sutures.map((i) => i.name)).toEqual(["Vicryl 0 UR-6"]);
    expect(p.itemCount).toBe(2);
  });
});
