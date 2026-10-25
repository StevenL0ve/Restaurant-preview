import { describe, it, expect } from "vitest";
import { applyProfileToRoster } from "./store";
import { buildSeed } from "./seed";
import type { AppState } from "../types";

const base = (): AppState => ({ ...buildSeed(), staff: [], onCallPeople: [], onCallPositions: [], onCallShifts: [] });
const steven = { uid: "u1", name: "Steven Nelson", email: "s@x.com", phone: "+12285550100", role: "tech" as const };

describe("account profile links to the OR's people records", () => {
  it("creates an on-call roster entry and staff entry for a new person", () => {
    const out = applyProfileToRoster(base(), steven);
    expect(out.onCallPeople).toHaveLength(1);
    expect(out.onCallPeople[0]).toMatchObject({ uid: "u1", name: "Steven Nelson", phone: "+12285550100", staffRole: "tech", role: "Surgical technologist", initials: "SN" });
    expect(out.staff[0]).toMatchObject({ name: "Steven Nelson", role: "tech" });
  });

  it("a phone change on the account updates the roster entry (matched by uid)", () => {
    const once = applyProfileToRoster(base(), steven);
    const twice = applyProfileToRoster(once, { ...steven, phone: "+12285550199" });
    expect(twice.onCallPeople).toHaveLength(1);
    expect(twice.onCallPeople[0].phone).toBe("+12285550199");
    expect(twice.staff).toHaveLength(1); // no duplicate staff entry
  });

  it("adopts an existing roster entry with the same name instead of duplicating", () => {
    const s = base();
    s.onCallPeople = [{ id: "oc1", name: "steven nelson", positionIds: ["pos1"], color: "#000", initials: "SN", phone: "+10000000000" }];
    const out = applyProfileToRoster(s, steven);
    expect(out.onCallPeople).toHaveLength(1);
    expect(out.onCallPeople[0]).toMatchObject({ id: "oc1", uid: "u1", name: "Steven Nelson", phone: "+12285550100", positionIds: ["pos1"] });
  });

  it("carries the profile photo onto the roster entry and removes it when cleared", () => {
    const withPhoto = applyProfileToRoster(base(), { ...steven, photo: "data:image/jpeg;base64,abc" });
    expect(withPhoto.onCallPeople[0].photo).toBe("data:image/jpeg;base64,abc");
    const cleared = applyProfileToRoster(withPhoto, { ...steven, photo: undefined });
    expect(cleared.onCallPeople[0].photo).toBeUndefined();
  });

  it("ignores an empty name and leaves the roster alone without a position", () => {
    const s = base();
    expect(applyProfileToRoster(s, { ...steven, name: "  " })).toBe(s);
    const out = applyProfileToRoster(s, { uid: "u2", name: "Kim Park", email: "k@x.com" });
    expect(out.staff).toHaveLength(0);
    expect(out.onCallPeople[0]).toMatchObject({ name: "Kim Park", uid: "u2" });
  });
});
