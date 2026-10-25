import { it, expect } from "vitest";
import { buildSeed } from "./seed";
it("seed ids are the same on every call", () => {
  const a = buildSeed(), b = buildSeed();
  expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id));
  expect(a.surgeons.map((c) => c.id)).toEqual(b.surgeons.map((c) => c.id));
  expect(a.carts.map((c) => c.id)).toEqual(b.carts.map((c) => c.id));
});
