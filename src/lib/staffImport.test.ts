import { describe, it, expect } from "vitest";
import { parseStaffList, guessRole } from "./staffImport";

describe("staff roster import", () => {
  it("parses names with loose role spellings", () => {
    const { members, errors } = parseStaffList(
      "Kim Park, RN\nMarcus Cole\tCST\nDr. Osei, CRNA\nJalen Lee, trainee 2\nSam Reyes, phase ii\n",
    );
    expect(errors).toEqual([]);
    expect(members).toEqual([
      { name: "Kim Park", role: "nurse", level: undefined },
      { name: "Marcus Cole", role: "tech", level: undefined },
      { name: "Dr. Osei", role: "crna", level: undefined },
      { name: "Jalen Lee", role: "trainee", level: 2 },
      { name: "Sam Reyes", role: "phase2", level: undefined },
    ]);
  });

  it("handles Last, First, role and trainee roman numerals", () => {
    const { members } = parseStaffList("Nelson, Steven, tech\nLee, Jalen, trainee III");
    expect(members[0]).toEqual({ name: "Nelson, Steven", role: "tech", level: undefined });
    expect(members[1]).toEqual({ name: "Lee, Jalen", role: "trainee", level: 3 });
  });

  it("reports bad lines and skips duplicates", () => {
    const { members, errors } = parseStaffList("JustAName\nKim Park, RN\nKim Park, nurse\nPat Q, astronaut");
    expect(members).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });
});

describe("role guessing for on-call filtering", () => {
  it("reads typed roles out of free-text labels", () => {
    expect(guessRole("RN, Charge")).toBe("nurse");
    expect(guessRole("CST")).toBe("tech");
    expect(guessRole("Surgical Tech")).toBe("tech");
    expect(guessRole("Anesthesiology")).toBe("anesthesia");
    expect(guessRole("CRNA")).toBe("crna");
    expect(guessRole("MD")).toBe("surgeon");
    expect(guessRole("Resident")).toBe("resident");
    expect(guessRole("Honeywell")).toBeNull();
    expect(guessRole(undefined)).toBeNull();
  });

  it("reads position names like Tech 2 and Charge RN", () => {
    expect(guessRole("Tech 2")).toBe("tech");
    expect(guessRole("On-call OR Tech")).toBe("tech");
    expect(guessRole("Charge RN")).toBe("nurse");
    expect(guessRole("Ortho Surgeon")).toBe("surgeon");
  });
});
