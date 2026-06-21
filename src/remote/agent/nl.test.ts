import { describe, it, expect } from "vitest";
import {
  ClaudeController,
  commandsToClaudeTools,
  extractPlan,
  runNaturalLanguage,
  type ClaudeResponse,
  type NaturalLanguageController,
  type PlannedCommand,
} from "./nl";
import { AGENT_COMMANDS } from "./commands";
import { TvController } from "./controller";
import type { FetchLike, RemoteKey, TvApp, TvDevice } from "../types";
import type { TvConnector } from "../connector";

describe("commandsToClaudeTools", () => {
  it("maps each command to an Anthropic tool definition", () => {
    const tools = commandsToClaudeTools();
    expect(tools).toHaveLength(AGENT_COMMANDS.length);
    expect(tools[0]).toHaveProperty("name");
    expect(tools[0]).toHaveProperty("description");
    expect(tools[0]).toHaveProperty("input_schema");
  });
});

describe("extractPlan", () => {
  it("returns tool_use blocks in order, ignoring text blocks", () => {
    const response: ClaudeResponse = {
      stop_reason: "tool_use",
      content: [
        { type: "text", text: "Sure." },
        { type: "tool_use", id: "a", name: "select_device", input: { device: "kitchen" } },
        { type: "tool_use", id: "b", name: "open_app", input: { app: "Netflix" } },
      ],
    };
    expect(extractPlan(response)).toEqual([
      { name: "select_device", input: { device: "kitchen" } },
      { name: "open_app", input: { app: "Netflix" } },
    ]);
  });
});

describe("ClaudeController", () => {
  it("posts the command registry as tools and the default model, then parses the plan", async () => {
    let captured: { url: string; body: string; headers?: Record<string, string> } = {
      url: "",
      body: "",
    };
    const fetchImpl: FetchLike = async (url, init) => {
      captured = { url, body: init?.body ?? "", headers: init?.headers };
      const response: ClaudeResponse = {
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "a", name: "set_power", input: { state: "on" } },
        ],
      };
      return { ok: true, status: 200, text: async () => JSON.stringify(response) };
    };

    const claude = new ClaudeController({ apiKey: "sk-test", fetchImpl });
    const plan = await claude.plan("turn the tv on");

    expect(plan).toEqual([{ name: "set_power", input: { state: "on" } }]);

    const sentBody = JSON.parse(captured.body);
    expect(sentBody.model).toBe("claude-opus-4-8");
    expect(sentBody.tools).toHaveLength(AGENT_COMMANDS.length);
    expect(sentBody.messages[0]).toEqual({
      role: "user",
      content: "turn the tv on",
    });
    expect(captured.headers?.["x-api-key"]).toBe("sk-test");
    expect(captured.headers?.["anthropic-version"]).toBe("2023-06-01");
  });

  it("honors a custom model and base url", async () => {
    let capturedUrl = "";
    let capturedModel = "";
    const fetchImpl: FetchLike = async (url, init) => {
      capturedUrl = url;
      capturedModel = JSON.parse(init?.body ?? "{}").model;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ content: [] } as ClaudeResponse),
      };
    };
    const claude = new ClaudeController({
      apiKey: "k",
      model: "claude-sonnet-4-6",
      baseUrl: "https://proxy.example/tv",
      fetchImpl,
    });
    await claude.plan("hello");
    expect(capturedUrl).toBe("https://proxy.example/tv");
    expect(capturedModel).toBe("claude-sonnet-4-6");
  });

  it("throws on a non-ok API response", async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 401,
      text: async () => "",
    });
    const claude = new ClaudeController({ apiKey: "bad", fetchImpl });
    await expect(claude.plan("x")).rejects.toThrow("status 401");
  });
});

// --- runNaturalLanguage end-to-end against a fake planner + fake TV ---

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
  power?: boolean;
  launched: string[] = [];
  async connect() {}
  async disconnect() {}
  async sendKey(_key: RemoteKey) {}
  async launchApp(appId: string) {
    this.launched.push(appId);
  }
  async listApps(): Promise<TvApp[]> {
    return [{ id: "12", name: "Netflix" }];
  }
  async sendText() {}
  async setPower(on: boolean) {
    this.power = on;
  }
}

class StubPlanner implements NaturalLanguageController {
  constructor(private readonly steps: PlannedCommand[]) {}
  async plan(): Promise<PlannedCommand[]> {
    return this.steps;
  }
}

const device: TvDevice = {
  id: "roku-1",
  name: "Living Room",
  brand: "roku",
  host: "10.0.0.5",
};

describe("runNaturalLanguage", () => {
  it("executes the planned commands in order against the TV", async () => {
    const connector = new FakeConnector();
    const controller = new TvController(() => connector);
    controller.addDevice(device);

    const planner = new StubPlanner([
      { name: "select_device", input: { device: "living room" } },
      { name: "set_power", input: { state: "on" } },
      { name: "open_app", input: { app: "Netflix" } },
    ]);

    const { planned, results } = await runNaturalLanguage(
      planner,
      controller,
      "turn on the living room tv and open netflix",
    );

    expect(planned).toHaveLength(3);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(connector.power).toBe(true);
    expect(connector.launched).toEqual(["12"]);
  });

  it("stops at the first failing step", async () => {
    const connector = new FakeConnector();
    const controller = new TvController(() => connector);
    controller.addDevice(device);

    // No select_device first → the power step fails, and we should not go on.
    const planner = new StubPlanner([
      { name: "set_power", input: { state: "on" } },
      { name: "open_app", input: { app: "Netflix" } },
    ]);

    const { results } = await runNaturalLanguage(planner, controller, "x");
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(connector.launched).toEqual([]);
  });
});
