import { describe, it, expect } from "vitest";
import { isAdminEmail } from "./auth";

describe("isAdminEmail", () => {
  it("grants staff on the CGP domain", () => {
    expect(isAdminEmail("events@thecommongroundprojects.com")).toBe(true);
    expect(isAdminEmail("OWNER@TheCommonGroundProjects.com")).toBe(true);
  });
  it("grants allowlisted demo admin", () => {
    expect(isAdminEmail("admin@cgp.test")).toBe(true);
  });
  it("denies regular members", () => {
    expect(isAdminEmail("sam@example.com")).toBe(false);
    expect(isAdminEmail("thecommongroundprojects.com@gmail.com")).toBe(false);
  });
});
