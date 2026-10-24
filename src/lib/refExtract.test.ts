import { describe, it, expect } from "vitest";
import { parseRefCandidates } from "./refExtract";

describe("REF extraction from packaging OCR", () => {
  it("ranks tokens on REF/CAT lines first", () => {
    const text = [
      "ETHICON Polypropylene Mesh",
      "STERILE EO  2026-04-01",
      "REF PRO-4521  LOT 88231A",
      "Made in USA 1-800-555-1234",
    ].join("\n");
    const out = parseRefCandidates(text);
    expect(out[0]).toBe("PRO-4521");
    expect(out).toContain("88231A");
  });

  it("filters dates, years, and plain words", () => {
    const out = parseRefCandidates("Mesh Device\n2026\n04/01/2026\nSTERILE\nCAT 443-B2");
    expect(out).toEqual(["443-B2"]);
  });

  it("returns empty for photo text with nothing ref-shaped", () => {
    expect(parseRefCandidates("single use only\ndo not resterilize")).toEqual([]);
  });
});
