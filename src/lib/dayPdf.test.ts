import { describe, expect, it } from "vitest";
import { currentAsOf, dayDate, dayPdfFilename, longDate } from "./dayPdf";

describe("day sheet wording", () => {
  it("writes the day out in full", () => {
    expect(longDate(dayDate("2026-10-26"))).toMatch(/^Monday, 26 October 2026$/);
  });
  it("stamps the date and time it was made", () => {
    expect(currentAsOf(new Date(2026, 9, 26, 14, 5))).toMatch(/^Current as of: Monday, 26 October 2026, 2:05\s?PM$/);
  });
  it("names the file by day", () => {
    expect(dayPdfFilename("2026-10-26")).toBe("orsync-day-2026-10-26.pdf");
  });
});
