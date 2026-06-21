import type { TvConnector } from "../connector";
import type { RemoteKey, TvApp, TvBrand, TvDevice } from "../types";
import type { NaturalLanguageController, PlannedCommand } from "../agent/nl";

// Demo wiring so the remote UI is fully interactive WITHOUT a real TV on the
// network. The DemoConnector reports every action back to the UI as a log line,
// and DemoPlanner is a tiny offline natural-language parser that stands in for
// the Claude/ChatGPT path (which needs a backend proxy). Real connectors live in
// ../connectors; this file is only for the demo/preview screen.

export const DEMO_DEVICES: TvDevice[] = [
  { id: "roku-living", name: "Living Room", brand: "roku", host: "10.0.0.5" },
  { id: "samsung-bed", name: "Bedroom", brand: "samsung", host: "10.0.0.8" },
];

const DEMO_APPS: TvApp[] = [
  { id: "12", name: "Netflix" },
  { id: "837", name: "YouTube" },
  { id: "551", name: "Hulu" },
  { id: "291", name: "Disney+" },
  { id: "22", name: "Spotify" },
];

export class DemoConnector implements TvConnector {
  readonly brand: TvBrand;
  readonly capabilities = {
    navigation: true,
    volume: true,
    media: true,
    appLaunch: true,
    textInput: true,
    powerOn: true,
  };

  constructor(
    private readonly device: TvDevice,
    private readonly onEvent: (message: string) => void,
  ) {
    this.brand = device.brand;
  }

  async connect() {
    this.onEvent(`Connected to ${this.device.name} (${this.device.brand}).`);
  }
  async disconnect() {}
  async sendKey(key: RemoteKey) {
    this.onEvent(`Key → ${key}`);
  }
  async launchApp(appId: string) {
    const name = DEMO_APPS.find((a) => a.id === appId)?.name ?? appId;
    this.onEvent(`Launched ${name}`);
  }
  async listApps(): Promise<TvApp[]> {
    return DEMO_APPS;
  }
  async sendText(text: string) {
    this.onEvent(`Typed "${text}"`);
  }
  async setPower(on: boolean) {
    this.onEvent(`Power ${on ? "on" : "off"}`);
  }
}

const APP_PATTERN = /(netflix|youtube|hulu|disney\+?|spotify)/;

/**
 * A deliberately small, offline NL parser for the demo. It produces the same
 * PlannedCommand[] shape the real Claude adapter does, so the UI's "ask AI"
 * flow is identical — only the planner is swapped.
 */
export class DemoPlanner implements NaturalLanguageController {
  async plan(utterance: string): Promise<PlannedCommand[]> {
    const text = utterance.toLowerCase();
    const steps: PlannedCommand[] = [];

    if (text.includes("bedroom")) {
      steps.push({ name: "select_device", input: { device: "bedroom" } });
    } else if (text.includes("living")) {
      steps.push({ name: "select_device", input: { device: "living room" } });
    }

    if (/\b(turn on|power on|wake)\b/.test(text)) {
      steps.push({ name: "set_power", input: { state: "on" } });
    } else if (/\b(turn off|power off|shut)\b/.test(text)) {
      steps.push({ name: "set_power", input: { state: "off" } });
    }

    if (text.includes("mute")) {
      steps.push({ name: "set_volume", input: { change: "mute" } });
    } else if (/\b(louder|volume up|turn it up)\b/.test(text)) {
      steps.push({ name: "set_volume", input: { change: "up" } });
    } else if (/\b(quieter|volume down|turn it down)\b/.test(text)) {
      steps.push({ name: "set_volume", input: { change: "down" } });
    }

    if (text.includes("pause")) {
      steps.push({ name: "media_control", input: { action: "pause" } });
    }

    // "play/find/watch/search <title> on <app>"
    const search = text.match(
      /(?:search|find|watch|play)\s+(.+?)\s+(?:on|in)\s+(netflix|youtube|hulu|disney\+?|spotify)/,
    );
    if (search) {
      steps.push({
        name: "search_in_app",
        input: { app: search[2], query: search[1].trim() },
      });
    } else {
      const open = text.match(/(?:open|launch|start)\s+/);
      const app = text.match(APP_PATTERN);
      if (open && app) {
        steps.push({ name: "open_app", input: { app: app[1] } });
      }
    }

    return steps;
  }
}
