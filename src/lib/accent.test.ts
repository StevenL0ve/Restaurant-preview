import { describe, it, expect } from "vitest";
import { accentFor } from "./accent";

describe("specialty accents", () => {
  it("gives known specialties their fixed hue", () => {
    expect(accentFor("Orthopedics")).toBe("#6366f1");
    expect(accentFor("OB/GYN")).toBe("#e11d48");
    expect(accentFor("ENT")).toBe("#d97706");
    expect(accentFor("General Surgery")).toBe("#0d9488");
  });

  it("is deterministic for unknown specialties", () => {
    const a = accentFor("Podiatry");
    expect(accentFor("Podiatry")).toBe(a);
    expect(a).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
