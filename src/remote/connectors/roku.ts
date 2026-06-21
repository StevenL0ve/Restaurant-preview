import type { TvConnector } from "../connector";
import { TvConnectionError } from "../connector";
import type {
  FetchLike,
  RemoteKey,
  TvApp,
  TvCapabilities,
  TvDevice,
} from "../types";

// Roku External Control Protocol (ECP) is a plain, unauthenticated HTTP API
// exposed by every Roku device on port 8060. This is the whole reason the
// incumbent "TV remote" apps are so cheap to out-build: the protocol is open
// and free, yet those apps gate every button behind a $5.99/mo paywall.
//
// Docs: https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md

const ROKU_DEFAULT_PORT = 8060;

/** Maps our universal keys to Roku ECP keypress names. */
const ROKU_KEYS: Record<RemoteKey, string> = {
  power_on: "PowerOn",
  power_off: "PowerOff",
  home: "Home",
  back: "Back",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  ok: "Select",
  volume_up: "VolumeUp",
  volume_down: "VolumeDown",
  mute: "VolumeMute",
  channel_up: "ChannelUp",
  channel_down: "ChannelDown",
  play: "Play",
  pause: "Play", // Roku uses a single Play/Pause toggle key
  play_pause: "Play",
  rewind: "Rev",
  forward: "Fwd",
  info: "Info",
  replay: "InstantReplay",
  enter: "Enter",
  backspace: "Backspace",
};

const ROKU_CAPABILITIES: TvCapabilities = {
  navigation: true,
  volume: true,
  media: true,
  appLaunch: true,
  textInput: true,
  powerOn: true,
};

/** Parse the `<apps>` XML from `GET /query/apps` into a list of apps. */
export function parseRokuApps(xml: string): TvApp[] {
  const apps: TvApp[] = [];
  const re = /<app id="([^"]+)"[^>]*>([^<]*)<\/app>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    apps.push({ id: match[1], name: decodeXmlText(match[2]).trim() });
  }
  return apps;
}

function decodeXmlText(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export class RokuConnector implements TvConnector {
  readonly brand = "roku" as const;
  readonly capabilities = ROKU_CAPABILITIES;

  private readonly base: string;

  constructor(
    device: TvDevice,
    private readonly fetchImpl: FetchLike,
  ) {
    const port = device.port ?? ROKU_DEFAULT_PORT;
    this.base = `http://${device.host}:${port}`;
  }

  async connect(): Promise<void> {
    // ECP is connectionless; a device-info probe verifies reachability.
    await this.request("GET", "/query/device-info");
  }

  async disconnect(): Promise<void> {
    // Nothing to tear down for a stateless HTTP protocol.
  }

  async sendKey(key: RemoteKey): Promise<void> {
    await this.request("POST", `/keypress/${ROKU_KEYS[key]}`);
  }

  async launchApp(appId: string): Promise<void> {
    await this.request("POST", `/launch/${encodeURIComponent(appId)}`);
  }

  async listApps(): Promise<TvApp[]> {
    const xml = await this.request("GET", "/query/apps");
    return parseRokuApps(xml);
  }

  async sendText(text: string): Promise<void> {
    // ECP types text one character at a time via `Lit_<urlencoded char>`.
    for (const char of [...text]) {
      await this.request("POST", `/keypress/Lit_${encodeURIComponent(char)}`);
    }
  }

  async setPower(on: boolean): Promise<void> {
    await this.sendKey(on ? "power_on" : "power_off");
  }

  private async request(method: string, path: string): Promise<string> {
    let res;
    try {
      res = await this.fetchImpl(`${this.base}${path}`, { method });
    } catch (err) {
      throw new TvConnectionError(
        `Could not reach Roku at ${this.base}: ${(err as Error).message}`,
      );
    }
    if (!res.ok) {
      throw new TvConnectionError(
        `Roku request ${method} ${path} failed with status ${res.status}`,
      );
    }
    return res.text();
  }
}
