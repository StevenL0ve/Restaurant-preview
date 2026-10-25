import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const auth = {
  signIn: vi.fn(), signUp: vi.fn(), resetPassword: vi.fn(), continueAsGuest: vi.fn(),
  setBioEnabled: vi.fn(), bioAvailable: true, bioLabel: "Face ID",
};
vi.mock("../state/auth", () => ({ useAuth: () => auth }));
vi.mock("../components/Mascot", () => ({ Mascot: () => null }));

import { Login } from "./Login";

describe("sign-up form", () => {
  it("offers an Enable Face ID toggle (off by default) on a Face ID device", () => {
    const html = renderToStaticMarkup(<Login />);
    expect(html).toContain("Enable Face ID");
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
    expect(html).not.toContain("lock it with Face ID in Settings");
  });

  it("leaves the toggle out where there's no Face ID (the website)", () => {
    auth.bioAvailable = false;
    const html = renderToStaticMarkup(<Login />);
    expect(html).not.toContain("Enable Face ID");
    auth.bioAvailable = true;
  });
});
