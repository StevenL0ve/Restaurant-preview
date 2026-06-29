import { describe, it, expect } from "vitest";
import { buildSeed } from "./seed";
import { groupByArea, locationLabelOf, locationsForFacility } from "./store";
import { locationLabel } from "../types";

// These exercise the shared-location model directly on AppState (no React).

describe("per-facility locations", () => {
  it("seeds facilities and scopes locations to them", () => {
    const s = buildSeed();
    expect(s.facilities.length).toBeGreaterThanOrEqual(2);
    for (const loc of s.locations) {
      expect(s.facilities.some((f) => f.id === loc.facilityId)).toBe(true);
    }
  });

  it("deduplicates identical location strings within a facility", () => {
    const s = buildSeed();
    const mercy = s.facilities.find((f) => f.name === "Mercy General")!;
    const labels = locationsForFacility(s, mercy.id).map(locationLabel);
    // "Sterile store room, cabinet 7, shelf 3" is used by two items but is one location.
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("groups a card's items by area for the pull-list", () => {
    const s = buildSeed();
    const card = s.cards.find((c) => c.procedure.startsWith("Laparoscopic"))!;
    const groups = groupByArea(s, card);
    const areas = groups.map((g) => g.area);
    expect(areas).toContain("Lap cart");
    // Lap cart has several items (Veress, trocars, dissectors, tubing…).
    const lapCart = groups.find((g) => g.area === "Lap cart")!;
    expect(lapCart.rows.length).toBeGreaterThanOrEqual(4);
    // Every item on the card appears exactly once across all groups.
    const total = groups.reduce((n, g) => n + g.rows.length, 0);
    expect(total).toBe(
      card.instruments.length + card.sutures.length + card.supplies.length +
      card.medications.length + card.equipment.length,
    );
  });

  it("editing a location updates the label everywhere it's referenced", () => {
    const s = buildSeed();
    const card = s.cards.find((c) => c.procedure.startsWith("Laparoscopic"))!;
    const item = card.instruments.find((it) => it.locationId)!;
    const locId = item.locationId!;
    // Simulate updateLocation by mutating the shared entity…
    const loc = s.locations.find((l) => l.id === locId)!;
    loc.area = "Relocated cart";
    loc.spot = "bay 9";
    // …and every item pointing at it resolves to the new label, no per-card edits.
    expect(locationLabelOf(s, item.locationId)).toBe("Relocated cart, bay 9");
  });
});
