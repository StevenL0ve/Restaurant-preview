import { describe, it, expect } from "vitest";
import { parseStaffList } from "./staffImport";

describe("staff roster import", () => {
  it("parses names with loose role spellings", () => {
    const { members, errors } = parseStaffList(
      "Kim Park, RN\nMarcus Cole\tCST\nDr. Osei, CRNA\nJalen Lee, trainee 2\nSam Reyes, phase ii\n",
    );
    expect(errors).toEqual([]);
    expect(members).toEqual([
      { name: "Kim Park", role: "nurse", level: undefined },
      { name: "Marcus Cole", role: "tech", level: undefined },
      { name: "Dr. Osei", role: "anesthesia", level: undefined },
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
