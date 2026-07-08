import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./state/store";
import { AuthProvider } from "./state/auth";
import { buildSeed } from "./state/seed";

// Runs in the jsdom environment (see vite.config.ts), so window + localStorage
// exist. renderToStaticMarkup walks the whole tree once, which surfaces any
// runtime crash in a page that a type-check alone would miss.
function renderAt(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// Skip the account gate by entering guest mode (the "use it now" path) and
// mark the one-time welcome sheet as seen so page markers aren't obscured.
function asGuest() {
  localStorage.setItem("orsync.guest.v1", "1");
  localStorage.setItem("orsync.welcomed.v1", "1");
}

describe("app smoke test", () => {
  beforeEach(() => localStorage.clear());

  it("shows the account screen when not signed in", () => {
    const html = renderAt("/");
    expect(html).toContain("Use it now");
    expect(html).toContain("ORSync");
  });

  it("renders the dashboard in guest mode with seeded cards", () => {
    asGuest();
    const html = renderAt("/");
    expect(html).toContain("Ready for your next case");
    // A seeded favorite card should appear on the dashboard.
    expect(html).toContain("Laparoscopic Cholecystectomy");
  });

  it.each([
    ["/today", "My day"],
    ["/cards", "Cards"],
    ["/cards/new", "New card"],
    ["/cards/scan", "Scan or paste a card"],
    ["/surgeons", "Surgeons"],
    ["/loaners", "Loaner trays"],
    ["/facilities", "Add a facility"],
    ["/search", "Search"],
    ["/settings", "Your data"],
    ["/upgrade", "ORSync Pro"],
  ])("renders %s without crashing", (path, marker) => {
    asGuest();
    const html = renderAt(path);
    expect(html).toContain(marker);
  });

  it("shows the one-time welcome sheet only until dismissed", () => {
    localStorage.setItem("orsync.guest.v1", "1");
    expect(renderAt("/")).toContain("Welcome to ORSync");
    localStorage.setItem("orsync.welcomed.v1", "1");
    expect(renderAt("/")).not.toContain("Welcome to ORSync");
  });

  it("renders a seeded card detail and its setup mode", () => {
    asGuest();
    const id = buildSeed().cards[0].id;
    const detail = renderAt(`/cards/${id}`);
    expect(detail).toContain("Start setup");
    const setup = renderAt(`/cards/${id}/setup`);
    expect(setup).toContain("Pull-list setup");
  });
});
