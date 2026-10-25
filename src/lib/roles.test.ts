import { describe, it, expect } from "vitest";
import { roleMatches, TEAM_ROLES } from "../types";
import { guessRole, parseStaffList } from "./staffImport";

describe("OR roles", () => {
  it("covers the people who work in an OR", () => {
    const keys = TEAM_ROLES.map((r) => r.key);
    for (const k of ["surgeon", "crna", "anesthesiologist", "nurse", "tech", "resident", "oradmin", "scheduler", "spd"]) {
      expect(keys).toContain(k);
    }
  });

  it("any anesthesia provider can cover an anesthesia call; other calls match exactly", () => {
    expect(roleMatches("anesthesia", "crna")).toBe(true);
    expect(roleMatches("crna", "anesthesiologist")).toBe(true);
    expect(roleMatches("tech", "nurse")).toBe(false);
    expect(roleMatches("tech", "trainee")).toBe(false);
    expect(roleMatches(null, "spd")).toBe(true);
    expect(roleMatches("tech", null)).toBe(false);
  });

  it("reads the new roles out of free text and roster imports", () => {
    expect(guessRole("CRNA")).toBe("crna");
    expect(guessRole("Anesthesiologist, on call")).toBe("anesthesiologist");
    expect(guessRole("SPD tech")).toBe("spd");
    expect(guessRole("OR Manager")).toBe("oradmin");
    expect(guessRole("Scheduler")).toBe("scheduler");
    expect(guessRole("PGY-2 resident")).toBe("resident");
    expect(guessRole("Surgical technologist")).toBe("tech");
    const { members } = parseStaffList("Kim Park, CRNA\nJ. Ruiz, SPD tech\nA. Lee, resident\nM. Chen, scheduler");
    expect(members.map((m) => m.role)).toEqual(["crna", "spd", "resident", "scheduler"]);
  });
});
