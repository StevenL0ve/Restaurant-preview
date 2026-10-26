import { describe, expect, it } from "vitest";
import { searchSurgeons, suggestCards, surgeonNamed, typedScore } from "./casePick";
import type { PrefCard, Surgeon } from "../types";

const sg = (id: string, name: string, specialty = "General Surgery"): Surgeon => ({ id, name, specialty, color: "#000", initials: "XX" });
const card = (id: string, procedure: string, surgeonId: string) => ({ id, procedure, surgeonId } as PrefCard);

const surgeons = [sg("s1", "Declan Feery"), sg("s2", "Dr. Fernando Ferrera", "Orthopedics"), sg("s3", "John Peterson")];
const cards = [
  card("c1", "Hernia Repair, Inguinal, Robotic Assisted", "s1"),
  card("c2", "Hernia Repair, Umbilical, Robotic Assisted", "s1"),
  card("c3", "Laparoscopic Cholecystectomy", "s1"),
  card("c4", "Arthroplasty, Total Shoulder", "s2"),
  card("c5", "Arthroplasty, Total Hip, Anterior", "s2"),
  card("c6", "Hernia Repair, Inguinal, Open", "s3"),
];

describe("surgeon search", () => {
  it("finds by any part of the name, ignoring Dr.", () => {
    expect(searchSurgeons(surgeons, "fer").map((s) => s.id)).toEqual(["s2"]);
    expect(searchSurgeons(surgeons, "fee").map((s) => s.id)).toEqual(["s1"]);
    expect(searchSurgeons(surgeons, "dr ferrera").map((s) => s.id)).toEqual(["s2"]);
    expect(searchSurgeons(surgeons, "ortho").map((s) => s.id)).toEqual(["s2"]);
    expect(searchSurgeons(surgeons, "smith")).toEqual([]);
  });
  it("knows an exact name", () => {
    expect(surgeonNamed(surgeons, "fernando ferrera")?.id).toBe("s2");
    expect(surgeonNamed(surgeons, "Ferrera")).toBeUndefined();
  });
});

describe("card suggestions", () => {
  it("half-typed words already match", () => {
    expect(typedScore("hern umb", cards[1])).toBeGreaterThan(0.5);
    expect(typedScore("hern umb", cards[0])).toBeLessThan(typedScore("hern umb", cards[1]));
  });
  it("schedule wording finds the card", () => {
    expect(suggestCards(cards, "Repair Umbilical Hernia Robot-Assisted (No Laterality)", "s1")[0].id).toBe("c2");
    expect(suggestCards(cards, "Arthroplasty Total Shoulder (Right)", "s2")[0].id).toBe("c4");
    expect(suggestCards(cards, "lap chole")[0].id).toBe("c3");
  });
  it("narrows to the surgeon once picked", () => {
    expect(suggestCards(cards, "inguinal hernia").map((c) => c.id).sort()).toEqual(["c1", "c6"]);
    expect(suggestCards(cards, "inguinal hernia", "s3").map((c) => c.id)).toEqual(["c6"]);
  });
  it("lists all of a surgeon's cards before anything is typed", () => {
    expect(suggestCards(cards, "", "s2").map((c) => c.id)).toEqual(["c5", "c4"]);
    expect(suggestCards(cards, "")).toEqual([]);
  });
});
