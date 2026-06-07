import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./state/store";

// Runs in the jsdom environment (see vite.config.ts), so window + localStorage
// exist. renderToStaticMarkup walks the whole tree once, which surfaces any
// runtime crash in a page that a type-check alone would miss.
function renderAt(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  );
}

describe("app smoke test", () => {
  beforeEach(() => localStorage.clear());

  it("renders the dashboard with seeded data", () => {
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
    const html = renderAt(path);
    expect(html).toContain(marker);
  });
});
