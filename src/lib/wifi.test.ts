import { describe, it, expect } from "vitest";
import { GUEST_WIFI, wifiQrPayload } from "./wifi";

describe("guest wifi", () => {
  it("builds the standard WIFI: payload for the guest network", () => {
    expect(wifiQrPayload()).toBe("WIFI:T:WPA;S:mshealthcenter Guest;P:CommonGround;;");
  });
  it("escapes reserved characters so odd passwords still scan", () => {
    expect(wifiQrPayload({ ssid: "Cafe;Guest", password: 'p:a,s"s\\1', security: "WPA" })).toBe(
      'WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:a\\,s\\"s\\\\1;;',
    );
  });
  it("has non-empty credentials", () => {
    expect(GUEST_WIFI.ssid.length).toBeGreaterThan(0);
    expect(GUEST_WIFI.password.length).toBeGreaterThan(0);
  });
});
