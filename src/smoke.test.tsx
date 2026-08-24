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
    // The on-call strip shows who's reachable, with the unfilled position first.
    expect(html).toContain("On call now");
    expect(html).toContain("nobody set");
  });

  it.each([
    ["/today", "My day"],
    ["/cards", "Cards"],
    ["/cards/new", "New card"],
    ["/cards/scan", "Scan or paste a card"],
    ["/surgeons", "Surgeons"],
    ["/loaners", "Loaner trays"],
    ["/carts", "Case carts"],
    ["/carts/missing", "Missing — all carts"],
    ["/on-call", "On call"],
    ["/on-call/people", "everyone who can take call"],
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

  it("renders a seeded case cart with pull attribution and the done cart's missing list", () => {
    asGuest();
    const pull = renderAt("/carts/cart-seed-0");
    expect(pull).toContain("Case cart");
    expect(pull).toContain("pulled · "); // who pulled each checked item
    const done = renderAt("/carts/cart-seed-2");
    expect(done).toContain("Missing (1)");
    expect(done).toContain("In SPD being prepared");
    expect(done).toContain("Resolved — now in the cart:");
  });

  it("renders a card's print view with items and locations in the table", () => {
    asGuest();
    const id = buildSeed().cards[0].id;
    const html = renderAt(`/cards/${id}/print`);
    expect(html).toContain("print-sheet");
    expect(html).toContain("Lap chole tray");
    expect(html).toContain("Location"); // the location column exists
    expect(html).toContain("Print"); // toolbar button (hidden on paper)
  });
});
