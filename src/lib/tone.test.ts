import { describe, it, expect } from "vitest";
import { analyzeTone } from "./tone";

describe("analyzeTone", () => {
  it("rates neutral, polite text as calm", () => {
    const r = analyzeTone("Can you pick Ava up at 5 today? Thank you.");
    expect(r.level).toBe("calm");
    expect(r.suggestion).toBeNull();
  });

  it("flags hostile language and offers a calmer rewrite", () => {
    const r = analyzeTone("You are so selfish and you NEVER show up on time!!!");
    expect(r.level).toBe("hostile");
    expect(r.flagged.length).toBeGreaterThan(0);
    expect(r.suggestion).toBeTruthy();
    // The rewrite should not echo the loaded word back.
    expect(r.suggestion!.toLowerCase()).not.toContain("selfish");
  });

  it("treats demanding phrasing as tense", () => {
    const r = analyzeTone("You need to send me the schedule again.");
    expect(r.level).toBe("tense");
    expect(r.suggestion).toContain("could we");
  });

  it("rewards softeners", () => {
    const harsh = analyzeTone("You forgot the form again.");
    const softer = analyzeTone("I think you forgot the form again, sorry to ask — could we sort it? Thanks.");
    expect(softer.score).toBeLessThan(harsh.score);
  });

  it("returns calm for empty input", () => {
    expect(analyzeTone("   ").level).toBe("calm");
  });
});
