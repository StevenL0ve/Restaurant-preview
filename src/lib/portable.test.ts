import { describe, it, expect } from "vitest";
import { bundleCards, importBundle, asBundle, isCardBundle } from "./portable";
import { buildSeed } from "../state/seed";
import { totalItems } from "../state/store";

const NOW = "2026-06-27T00:00:00.000Z";

describe("portable card bundles", () => {
  it("bundles a card with only the entities it references", () => {
    const s = buildSeed();
    const card = s.cards.find((c) => c.procedure.startsWith("Total Knee"))!;
    const bundle = bundleCards(s, [card.id], NOW);
    expect(isCardBundle(bundle)).toBe(true);
    expect(bundle.cards).toHaveLength(1);
    expect(bundle.surgeons).toHaveLength(1); // only Dr. Chen
    expect(bundle.facilities).toHaveLength(1); // only Mercy General
    // Every location referenced by the card is included.
    const refIds = new Set(card.instruments.concat(card.supplies, card.equipment, card.sutures, card.medications).map((i) => i.locationId).filter(Boolean));
    expect(bundle.locations.length).toBe(refIds.size);
  });

  it("imports into an empty library, recreating facility/surgeon/locations", () => {
    const src = buildSeed();
    const card = src.cards.find((c) => c.procedure.startsWith("Total Knee"))!;
    const bundle = bundleCards(src, [card.id], NOW);

    const empty = { facilities: [], locations: [], surgeons: [], cards: [], loaners: [], cases: [], setups: {}, onCallPositions: [], onCallPeople: [], onCallShifts: [], carts: [] };
    const { state, added } = importBundle(empty, bundle);
    expect(added).toBe(1);
    expect(state.cards).toHaveLength(1);
    expect(state.facilities).toHaveLength(1);
    expect(state.surgeons).toHaveLength(1);
    // The imported card keeps all its items + resolvable locations.
    const imported = state.cards[0];
    expect(totalItems(imported)).toBe(totalItems(card));
    const loc = state.locations.find((l) => l.id === imported.instruments[0].locationId);
    expect(loc?.facilityId).toBe(state.facilities[0].id);
    // Fresh ids — independent copy.
    expect(imported.id).not.toBe(card.id);
  });

  it("skips a card that already exists (same surgeon + procedure + facility)", () => {
    const target = buildSeed(); // already has Dr. Chen's Total Knee @ Mercy General
    const card = target.cards.find((c) => c.procedure.startsWith("Total Knee"))!;
    const bundle = bundleCards(target, [card.id], NOW);
    const { state, added, skipped } = importBundle(target, bundle);

    expect(added).toBe(0);
    expect(skipped).toBe(1);
    expect(state.cards.length).toBe(target.cards.length); // nothing duplicated
    expect(state.facilities).toHaveLength(target.facilities.length);
    expect(state.surgeons).toHaveLength(target.surgeons.length);
  });

  it("imports a new procedure for an existing surgeon without duplicating them", () => {
    const target = buildSeed();
    const card = target.cards.find((c) => c.procedure.startsWith("Total Knee"))!;
    const bundle = bundleCards(target, [card.id], NOW);
    bundle.cards[0] = { ...bundle.cards[0], procedure: "Total Knee — Revision" }; // a different case (clone so the source card isn't mutated)
    const facBefore = target.facilities.length;
    const sgBefore = target.surgeons.length;
    const { state, added, skipped } = importBundle(target, bundle);

    expect(added).toBe(1);
    expect(skipped).toBe(0);
    expect(state.facilities).toHaveLength(facBefore); // matched, not duplicated
    expect(state.surgeons).toHaveLength(sgBefore);
  });


  it("maps every bundle card to a local id — fresh for added, existing for dups", () => {
    const src = buildSeed();
    const card = src.cards.find((c) => c.procedure.startsWith("Total Knee"))!;
    const bundle = bundleCards(src, [card.id], NOW);
    bundle.pullRequest = { date: "2026-08-25", count: 3, requestedBy: "Steven" };

    // Import into an empty library: the id is the fresh copy's.
    const empty = { facilities: [], locations: [], surgeons: [], cards: [], loaners: [], cases: [], setups: {}, onCallPositions: [], onCallPeople: [], onCallShifts: [], carts: [] };
    const fresh = importBundle(empty, bundle);
    expect(fresh.cardIds).toHaveLength(1);
    expect(fresh.state.cards[0].id).toBe(fresh.cardIds[0]);

    // Import into the source library (dup): the id is the EXISTING card's,
    // so a pull request can still attach carts to it.
    const dup = importBundle(src, bundle);
    expect(dup.added).toBe(0);
    expect(dup.cardIds).toEqual([card.id]);
    // The pull request itself round-trips through serialization.
    const parsed = JSON.parse(JSON.stringify(bundle));
    expect(parsed.pullRequest).toEqual({ date: "2026-08-25", count: 3, requestedBy: "Steven" });
  });

  it("coerces a full library export into a mergeable bundle", () => {
    const s = buildSeed();
    const bundle = asBundle(s, NOW);
    expect(bundle).not.toBeNull();
    expect(bundle!.cards.length).toBe(s.cards.length);
    expect(asBundle({ nope: true }, NOW)).toBeNull();
  });
});
