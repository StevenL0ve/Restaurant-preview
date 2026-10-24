import { describe, it, expect } from "vitest";
import { userStamp, stampLine } from "./user";

describe("audit stamps", () => {
  it("signs as last name, first initial", () => {
    expect(userStamp("Steven Nelson")).toBe("Nelson, S.");
    expect(userStamp("kim park lee")).toBe("lee, K.");
    expect(userStamp("Nelson, Steven")).toBe("Nelson, S.");
    expect(userStamp("Cher")).toBe("Cher");
    expect(userStamp("")).toBe("");
    expect(userStamp(undefined)).toBe("");
  });

  it("builds a display line from whatever halves exist", () => {
    expect(stampLine("Steven Nelson", undefined)).toBe("Nelson, S.");
    expect(stampLine(undefined, undefined)).toBe("");
    const line = stampLine("Steven Nelson", "2026-10-24T16:32:00");
    expect(line.startsWith("Nelson, S. · ")).toBe(true);
    expect(line).toContain("Oct 24");
  });
});
