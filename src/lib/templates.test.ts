import { describe, it, expect } from "vitest";
import { TEMPLATES, templatesBySpecialty, templateItemCount } from "./templates";

describe("template library", () => {
  it("has a healthy set of unique, non-trivial starter cards", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(8);
    const names = TEMPLATES.map((t) => t.procedure);
    expect(new Set(names).size).toBe(names.length);
    for (const t of TEMPLATES) {
      expect(t.procedure.trim()).not.toBe("");
      expect(t.specialty.trim()).not.toBe("");
      expect(templateItemCount(t)).toBeGreaterThanOrEqual(6);
    }
  });

  it("uses structured qty/hold correctly and demonstrates both", () => {
    let sawQty = 0;
    let sawHold = 0;
    for (const t of TEMPLATES) {
      for (const arr of Object.values(t.sections)) {
        for (const item of arr ?? []) {
          expect(item.name.trim()).not.toBe("");
          if (item.qty !== undefined) {
            expect(item.qty).toBeGreaterThan(1); // qty 1 is implicit
            sawQty++;
          }
          if (item.hold) sawHold++;
        }
      }
    }
    expect(sawQty).toBeGreaterThan(3);
    expect(sawHold).toBeGreaterThan(3);
  });

  it("contains no em dashes anywhere user-facing", () => {
    expect(JSON.stringify(TEMPLATES)).not.toContain("—");
  });

  it("groups by specialty without losing templates", () => {
    const grouped = templatesBySpecialty();
    const total = grouped.reduce((n, [, list]) => n + list.length, 0);
    expect(total).toBe(TEMPLATES.length);
  });
});
