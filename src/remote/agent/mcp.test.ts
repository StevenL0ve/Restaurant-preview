import { describe, it, expect } from "vitest";
import { createMcpTvServer, listMcpTools } from "./mcp";
import { AGENT_COMMANDS } from "./commands";
import { TvController } from "./controller";
import type { TvConnector } from "../connector";
import type { RemoteKey, TvApp, TvDevice } from "../types";

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
  async connect() {}
  async disconnect() {}
  async sendKey(key: RemoteKey) {
    this.keys.push(key);
  }
  async launchApp() {}
  async listApps(): Promise<TvApp[]> {
    return [];
  }
  async sendText() {}
  async setPower() {}
}

const device: TvDevice = {
  id: "roku-1",
  name: "Bedroom",
  brand: "roku",
  host: "10.0.0.9",
};

describe("MCP TV server", () => {
  it("exposes one MCP tool per agent command with valid schemas", () => {
    const tools = listMcpTools();
    expect(tools).toHaveLength(AGENT_COMMANDS.length);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("dispatches tools/call to the controller", async () => {
    const connector = new FakeConnector();
    const controller = new TvController(() => connector);
    controller.addDevice(device);
    const server = createMcpTvServer(controller);

    const select = await server.call("select_device", { device: "bedroom" });
    expect(select.isError).toBeFalsy();

    const nav = await server.call("set_volume", { change: "mute" });
    expect(nav.isError).toBeFalsy();
    expect(connector.keys).toEqual(["mute"]);
  });

  it("reports errors as MCP results with isError set", async () => {
    const controller = new TvController(() => new FakeConnector());
    const server = createMcpTvServer(controller);
    const result = await server.call("navigate", { direction: "up" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("No active TV");
  });
});
