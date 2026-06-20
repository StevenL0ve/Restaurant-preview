import { describe, it, expect } from "vitest";
import { RokuConnector, parseRokuApps } from "./roku";
import { TvConnectionError } from "../connector";
import type { FetchLike, TvDevice } from "../types";

const device: TvDevice = {
  id: "roku-10.0.0.5",
  name: "Living Room",
  brand: "roku",
  host: "10.0.0.5",
};

/** A fetch mock that records calls and returns a canned body. */
function mockFetch(body = "", ok = true, status = 200) {
  const calls: { url: string; method?: string }[] = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method });
    return { ok, status, text: async () => body };
  };
  return { impl, calls };
}

describe("parseRokuApps", () => {
  it("extracts id and name from the apps XML", () => {
    const xml =
      '<apps><app id="12" type="appl" version="4.2">Netflix</app>' +
      '<app id="837" type="appl" version="2.1">YouTube</app></apps>';
    expect(parseRokuApps(xml)).toEqual([
      { id: "12", name: "Netflix" },
      { id: "837", name: "YouTube" },
    ]);
  });

  it("decodes XML entities in app names", () => {
    const xml = '<apps><app id="1" type="appl">Tom &amp; Jerry</app></apps>';
    expect(parseRokuApps(xml)[0].name).toBe("Tom & Jerry");
  });
});

describe("RokuConnector", () => {
  it("maps universal keys to ECP keypress endpoints", async () => {
    const { impl, calls } = mockFetch();
    const roku = new RokuConnector(device, impl);
    await roku.sendKey("home");
    await roku.sendKey("ok");
    await roku.sendKey("volume_up");
    expect(calls.map((c) => c.url)).toEqual([
      "http://10.0.0.5:8060/keypress/Home",
      "http://10.0.0.5:8060/keypress/Select",
      "http://10.0.0.5:8060/keypress/VolumeUp",
    ]);
    expect(calls.every((c) => c.method === "POST")).toBe(true);
  });

  it("uses a custom port when provided", async () => {
    const { impl, calls } = mockFetch();
    const roku = new RokuConnector({ ...device, port: 9000 }, impl);
    await roku.sendKey("back");
    expect(calls[0].url).toBe("http://10.0.0.5:9000/keypress/Back");
  });

  it("launches apps by id", async () => {
    const { impl, calls } = mockFetch();
    const roku = new RokuConnector(device, impl);
    await roku.launchApp("12");
    expect(calls[0]).toEqual({
      url: "http://10.0.0.5:8060/launch/12",
      method: "POST",
    });
  });

  it("types text one Lit_ keypress per character, url-encoded", async () => {
    const { impl, calls } = mockFetch();
    const roku = new RokuConnector(device, impl);
    await roku.sendText("a b");
    expect(calls.map((c) => c.url)).toEqual([
      "http://10.0.0.5:8060/keypress/Lit_a",
      "http://10.0.0.5:8060/keypress/Lit_%20",
      "http://10.0.0.5:8060/keypress/Lit_b",
    ]);
  });

  it("powers the device on and off via dedicated keys", async () => {
    const { impl, calls } = mockFetch();
    const roku = new RokuConnector(device, impl);
    await roku.setPower(true);
    await roku.setPower(false);
    expect(calls.map((c) => c.url)).toEqual([
      "http://10.0.0.5:8060/keypress/PowerOn",
      "http://10.0.0.5:8060/keypress/PowerOff",
    ]);
  });

  it("lists apps by querying and parsing the apps XML", async () => {
    const { impl } = mockFetch(
      '<apps><app id="551012" type="appl">Hulu</app></apps>',
    );
    const roku = new RokuConnector(device, impl);
    expect(await roku.listApps()).toEqual([{ id: "551012", name: "Hulu" }]);
  });

  it("raises a TvConnectionError on a non-ok response", async () => {
    const { impl } = mockFetch("", false, 403);
    const roku = new RokuConnector(device, impl);
    await expect(roku.sendKey("home")).rejects.toBeInstanceOf(
      TvConnectionError,
    );
  });

  it("raises a TvConnectionError when the device is unreachable", async () => {
    const impl: FetchLike = async () => {
      throw new Error("ECONNREFUSED");
    };
    const roku = new RokuConnector(device, impl);
    await expect(roku.connect()).rejects.toBeInstanceOf(TvConnectionError);
  });
});
