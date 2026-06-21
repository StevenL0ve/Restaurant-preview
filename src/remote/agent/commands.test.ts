import { describe, it, expect } from "vitest";
import { TvController } from "./controller";
import { runCommand, AGENT_COMMANDS } from "./commands";
import type { TvConnector } from "../connector";
import type { RemoteKey, TvApp, TvDevice } from "../types";

// A fake connector that records every action, so we can assert that commands map
// to the right device operations without touching a real TV.
class FakeConnector implements TvConnector {
  readonly brand = "roku" as const;
  readonly capabilities = {
    navigation: true,
    volume: true,
    media: true,
    appLaunch: true,
    textInput: true,
    powerOn: true,
  };
  keys: RemoteKey[] = [];
  launched: string[] = [];
  typed: string[] = [];
  power?: boolean;
  connected = false;

  async connect() {
    this.connected = true;
  }
  async disconnect() {
    this.connected = false;
  }
  async sendKey(key: RemoteKey) {
    this.keys.push(key);
  }
  async launchApp(appId: string) {
    this.launched.push(appId);
  }
  async listApps(): Promise<TvApp[]> {
    return [
      { id: "12", name: "Netflix" },
      { id: "837", name: "YouTube" },
    ];
  }
  async sendText(text: string) {
    this.typed.push(text);
  }
  async setPower(on: boolean) {
    this.power = on;
  }
}

const device: TvDevice = {
  id: "roku-1",
  name: "Living Room",
  brand: "roku",
  host: "10.0.0.5",
};

function setup() {
  const connector = new FakeConnector();
  const controller = new TvController(() => connector);
  controller.addDevice(device);
  return { connector, controller };
}

describe("agent command registry", () => {
  it("has unique names and well-formed schemas", () => {
    const names = AGENT_COMMANDS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const command of AGENT_COMMANDS) {
      expect(command.parameters.type).toBe("object");
      expect(command.parameters.additionalProperties).toBe(false);
      for (const required of command.parameters.required) {
        expect(command.parameters.properties).toHaveProperty(required);
      }
    }
  });

  it("select_device connects to a TV by fuzzy name", async () => {
    const { connector, controller } = setup();
    const result = await runCommand(controller, "select_device", {
      device: "living room",
    });
    expect(result.ok).toBe(true);
    expect(connector.connected).toBe(true);
    expect(controller.getActiveDevice()?.id).toBe("roku-1");
  });

  it("set_power turns the active TV on and off", async () => {
    const { connector, controller } = setup();
    await controller.selectDevice("roku-1");
    await runCommand(controller, "set_power", { state: "off" });
    expect(connector.power).toBe(false);
  });

  it("navigate sends the matching D-pad key", async () => {
    const { connector, controller } = setup();
    await controller.selectDevice("roku-1");
    await runCommand(controller, "navigate", { direction: "down" });
    expect(connector.keys).toEqual(["down"]);
  });

  it("open_app resolves an app name to its id and launches it", async () => {
    const { connector, controller } = setup();
    await controller.selectDevice("roku-1");
    const result = await runCommand(controller, "open_app", { app: "netflix" });
    expect(result.ok).toBe(true);
    expect(connector.launched).toEqual(["12"]);
  });

  it("search_in_app opens, selects, and types the query", async () => {
    const { connector, controller } = setup();
    await controller.selectDevice("roku-1");
    await runCommand(controller, "search_in_app", {
      app: "youtube",
      query: "lofi",
    });
    expect(connector.launched).toEqual(["837"]);
    expect(connector.keys).toEqual(["ok"]);
    expect(connector.typed).toEqual(["lofi"]);
  });

  it("returns an error result (does not throw) for unknown commands", async () => {
    const { controller } = setup();
    const result = await runCommand(controller, "nope", {});
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Unknown command");
  });

  it("returns an error result when no device is selected", async () => {
    const { controller } = setup();
    const result = await runCommand(controller, "navigate", {
      direction: "up",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("No active TV");
  });

  it("validates enum-style parameters", async () => {
    const { controller } = setup();
    await controller.selectDevice("roku-1");
    const result = await runCommand(controller, "navigate", {
      direction: "diagonal",
    });
    expect(result.ok).toBe(false);
  });
});
