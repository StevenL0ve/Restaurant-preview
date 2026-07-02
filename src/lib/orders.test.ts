import { describe, it, expect } from "vitest";
import { orderStatus } from "./orders";

const T0 = new Date("2026-07-02T12:00:00Z").getTime();
const order = { createdAt: new Date(T0).toISOString() };
const min = 60_000;

describe("orderStatus", () => {
  it("is received right after checkout", () => {
    expect(orderStatus(order, T0)).toBe("received");
    expect(orderStatus(order, T0 + 1 * min)).toBe("received");
  });

  it("moves to preparing, then ready, then completed", () => {
    expect(orderStatus(order, T0 + 2 * min)).toBe("preparing");
    expect(orderStatus(order, T0 + 10 * min)).toBe("ready");
    expect(orderStatus(order, T0 + 30 * min)).toBe("completed");
  });
});
