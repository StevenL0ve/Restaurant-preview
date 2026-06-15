import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./state/store";
import { AuthProvider } from "./state/auth";

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

function seedSession() {
  localStorage.setItem(
    "coparent.accounts.v1",
    JSON.stringify({
      "a@b.com": { name: "Test Parent", email: "a@b.com", passHash: "x", createdAt: new Date().toISOString() },
    }),
  );
  localStorage.setItem("coparent.session.v1", "a@b.com");
}

describe("app smoke test", () => {
  beforeEach(() => localStorage.clear());

  it("shows the login screen when signed out", () => {
    const html = renderAt("/");
    expect(html).toContain("Create account");
    expect(html).toContain("Sign in");
  });

  it("renders the dashboard once signed in", () => {
    seedSession();
    const html = renderAt("/");
    expect(html).toContain("CoParent");
    expect(html).toContain("Up next");
  });

  it.each([
    ["/messages", "Messages"],
    ["/calendar", "Calendar"],
    ["/expenses", "Expenses"],
    ["/journal", "Journal"],
    ["/info", "Info Bank"],
    ["/settings", "Delete account"],
  ])("renders %s without crashing", (path, marker) => {
    seedSession();
    const html = renderAt(path);
    expect(html).toContain(marker);
  });
});
