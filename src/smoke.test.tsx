import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./state/auth";
import { StoreProvider } from "./state/store";

function renderApp() {
  return render(
    <HashRouter>
      <AuthProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </AuthProvider>
    </HashRouter>,
  );
}

describe("CGP smoke", () => {
  beforeEach(() => localStorage.clear());

  it("shows the sign-in gate when logged out", () => {
    renderApp();
    expect(screen.getByText("The Common Ground Projects")).toBeTruthy();
    expect(screen.getByRole("button", { name: /create account/i })).toBeTruthy();
  });

  it("shows the home screen for a signed-in member", () => {
    localStorage.setItem(
      "cgp.accounts.v1",
      JSON.stringify({ "sam@cgp.test": { name: "Sam", email: "sam@cgp.test", passHash: "x", createdAt: "2026-01-01" } }),
    );
    localStorage.setItem("cgp.session.v1", "sam@cgp.test");
    renderApp();
    expect(screen.getByText(/Everything under/)).toBeTruthy();
    expect(screen.getAllByText(/punch card/i).length).toBeGreaterThan(0);
  });
});
