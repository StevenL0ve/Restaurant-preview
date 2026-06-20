import type { NavDirection, TvController } from "./controller";

// The agent command registry is the single source of truth for "what an AI can
// do to the TV." The MCP server (mcp.ts), the Siri/App-Intents metadata
// (intents.ts), and the Claude/ChatGPT natural-language adapter (nl.ts) are all
// generated from this one list — so adding a capability here exposes it to every
// agent surface at once. This is the "any agent can take over the screen" layer.

/** A tiny JSON Schema subset, enough to describe command parameters. */
export interface JsonSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "number" | "boolean";
      description: string;
      enum?: string[];
    }
  >;
  required: string[];
  additionalProperties: false;
}

export interface AgentCommandResult {
  ok: boolean;
  message: string;
}

export interface AgentCommand {
  /** Stable machine name (also the MCP tool name). */
  name: string;
  /** Human/agent-facing description used for tool selection. */
  description: string;
  /** Parameter schema (also the MCP/Claude tool input_schema). */
  parameters: JsonSchema;
  /** Execute against a controller with validated-ish input. */
  run(
    controller: TvController,
    input: Record<string, unknown>,
  ): Promise<AgentCommandResult>;
}

const EMPTY_SCHEMA: JsonSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
};

function str(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing or invalid "${key}"`);
  }
  return value;
}

const NAV_DIRECTIONS: NavDirection[] = [
  "up",
  "down",
  "left",
  "right",
  "ok",
  "back",
  "home",
];

/** The canonical command set. */
export const AGENT_COMMANDS: AgentCommand[] = [
  {
    name: "list_devices",
    description:
      "List the TVs/streaming devices found on the local network. Use this first to learn which screens are available.",
    parameters: EMPTY_SCHEMA,
    async run(controller) {
      const devices = controller.listDevices();
      if (devices.length === 0) {
        return { ok: true, message: "No devices found on the network." };
      }
      const list = devices
        .map((d) => `${d.name} [${d.brand}] (${d.id})`)
        .join(", ");
      return { ok: true, message: `Devices: ${list}` };
    },
  },
  {
    name: "select_device",
    description:
      "Choose which TV subsequent commands control, by name (e.g. 'living room') or id.",
    parameters: {
      type: "object",
      properties: {
        device: {
          type: "string",
          description: "Device name or id to control.",
        },
      },
      required: ["device"],
      additionalProperties: false,
    },
    async run(controller, input) {
      const device = await controller.selectDeviceByName(str(input, "device"));
      return { ok: true, message: `Now controlling ${device.name}.` };
    },
  },
  {
    name: "set_power",
    description: "Turn the active TV on or off.",
    parameters: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: "Desired power state.",
          enum: ["on", "off"],
        },
      },
      required: ["state"],
      additionalProperties: false,
    },
    async run(controller, input) {
      const state = str(input, "state");
      await controller.power(state === "on");
      return { ok: true, message: `Powered ${state}.` };
    },
  },
  {
    name: "navigate",
    description:
      "Move around the on-screen UI: up, down, left, right, ok (select), back, or home.",
    parameters: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          description: "Direction or action.",
          enum: NAV_DIRECTIONS,
        },
      },
      required: ["direction"],
      additionalProperties: false,
    },
    async run(controller, input) {
      const direction = str(input, "direction") as NavDirection;
      if (!NAV_DIRECTIONS.includes(direction)) {
        throw new Error(`Invalid direction "${direction}"`);
      }
      await controller.navigate(direction);
      return { ok: true, message: `Navigated ${direction}.` };
    },
  },
  {
    name: "set_volume",
    description: "Adjust the active TV's volume: up, down, or mute.",
    parameters: {
      type: "object",
      properties: {
        change: {
          type: "string",
          description: "Volume change.",
          enum: ["up", "down", "mute"],
        },
      },
      required: ["change"],
      additionalProperties: false,
    },
    async run(controller, input) {
      const change = str(input, "change") as "up" | "down" | "mute";
      await controller.volume(change);
      return { ok: true, message: `Volume ${change}.` };
    },
  },
  {
    name: "media_control",
    description: "Control playback: play, pause, play_pause, rewind, or forward.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Transport action.",
          enum: ["play", "pause", "play_pause", "rewind", "forward"],
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
    async run(controller, input) {
      const action = str(input, "action") as
        | "play"
        | "pause"
        | "play_pause"
        | "rewind"
        | "forward";
      await controller.media(action);
      return { ok: true, message: `Media: ${action}.` };
    },
  },
  {
    name: "open_app",
    description:
      "Launch a streaming app on the active TV by name (e.g. 'Netflix', 'YouTube').",
    parameters: {
      type: "object",
      properties: {
        app: { type: "string", description: "App name or id to launch." },
      },
      required: ["app"],
      additionalProperties: false,
    },
    async run(controller, input) {
      const app = await controller.openApp(str(input, "app"));
      return { ok: true, message: `Opened ${app.name}.` };
    },
  },
  {
    name: "type_text",
    description:
      "Type text into the currently focused field (search boxes, logins).",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to enter." },
      },
      required: ["text"],
      additionalProperties: false,
    },
    async run(controller, input) {
      const text = str(input, "text");
      await controller.typeText(text);
      return { ok: true, message: `Typed "${text}".` };
    },
  },
  {
    name: "search_in_app",
    description:
      "Open an app and search for something in one step (e.g. search 'Dune' in Netflix).",
    parameters: {
      type: "object",
      properties: {
        app: { type: "string", description: "App to search in." },
        query: { type: "string", description: "What to search for." },
      },
      required: ["app", "query"],
      additionalProperties: false,
    },
    async run(controller, input) {
      const app = await controller.searchInApp(
        str(input, "app"),
        str(input, "query"),
      );
      return {
        ok: true,
        message: `Searched "${str(input, "query")}" in ${app.name}.`,
      };
    },
  },
];

/** Look up a command by name. */
export function getCommand(name: string): AgentCommand | undefined {
  return AGENT_COMMANDS.find((c) => c.name === name);
}

/** Execute a named command, returning a structured result (never throws). */
export async function runCommand(
  controller: TvController,
  name: string,
  input: Record<string, unknown>,
): Promise<AgentCommandResult> {
  const command = getCommand(name);
  if (!command) {
    return { ok: false, message: `Unknown command: ${name}` };
  }
  try {
    return await command.run(controller, input);
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
