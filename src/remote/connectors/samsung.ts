import type { TvConnector } from "../connector";
import { TvConnectionError, UnsupportedOperationError } from "../connector";
import type { RemoteKey, TvApp, TvCapabilities, TvDevice } from "../types";

// Samsung Tizen TVs (2016+) accept remote commands over a WebSocket at
// wss://<ip>:8002/api/v2/channels/samsung.remote.control. The first connection
// prompts an on-screen "allow" dialog and returns a token that must be reused on
// later connections. We keep the *message-building* logic pure and testable, and
// take the actual socket via an injected factory so this works in browser,
// Capacitor (native WebSocket), and tests alike.

const SAMSUNG_DEFAULT_PORT = 8002;

/** Maps our universal keys to Samsung remote key codes. */
const SAMSUNG_KEYS: Partial<Record<RemoteKey, string>> = {
  power_off: "KEY_POWER",
  home: "KEY_HOME",
  back: "KEY_RETURN",
  up: "KEY_UP",
  down: "KEY_DOWN",
  left: "KEY_LEFT",
  right: "KEY_RIGHT",
  ok: "KEY_ENTER",
  volume_up: "KEY_VOLUP",
  volume_down: "KEY_VOLDOWN",
  mute: "KEY_MUTE",
  channel_up: "KEY_CHUP",
  channel_down: "KEY_CHDOWN",
  play: "KEY_PLAY",
  pause: "KEY_PAUSE",
  play_pause: "KEY_PLAY_BACK",
  rewind: "KEY_REWIND",
  forward: "KEY_FF",
  info: "KEY_INFO",
  enter: "KEY_ENTER",
};

const SAMSUNG_CAPABILITIES: TvCapabilities = {
  navigation: true,
  volume: true,
  media: true,
  appLaunch: false, // app launch needs the separate (often disabled) REST API
  textInput: true,
  powerOn: false, // Wake-on-LAN is required to power a Samsung TV back on
};

/** A minimal structural WebSocket, satisfied by the browser/RN/Capacitor type. */
export interface SocketLike {
  send(data: string): void;
  close(): void;
}

export type SocketFactory = (url: string) => Promise<SocketLike>;

/** Build the JSON a Samsung TV expects for a single key click. */
export function buildSamsungKeyMessage(keyCode: string): string {
  return JSON.stringify({
    method: "ms.remote.control",
    params: {
      Cmd: "Click",
      DataOfCmd: keyCode,
      Option: "false",
      TypeOfRemote: "SendRemoteKey",
    },
  });
}

/** Build the JSON a Samsung TV expects for entering free text. */
export function buildSamsungTextMessage(text: string): string {
  return JSON.stringify({
    method: "ms.remote.control",
    params: {
      Cmd: base64(text),
      DataOfCmd: "base64",
      TypeOfRemote: "SendInputString",
    },
  });
}

function base64(value: string): string {
  if (typeof btoa === "function") return btoa(value);
  // Node fallback for tests / SSR.
  return Buffer.from(value, "utf-8").toString("base64");
}

/** Build the channel URL, including the persisted pairing token when present. */
export function buildSamsungUrl(device: TvDevice, appName: string): string {
  const port = device.port ?? SAMSUNG_DEFAULT_PORT;
  const name = base64(appName);
  const tokenParam = device.token ? `&token=${device.token}` : "";
  return `wss://${device.host}:${port}/api/v2/channels/samsung.remote.control?name=${name}${tokenParam}`;
}

export class SamsungConnector implements TvConnector {
  readonly brand = "samsung" as const;
  readonly capabilities = SAMSUNG_CAPABILITIES;

  private socket?: SocketLike;

  constructor(
    private readonly device: TvDevice,
    private readonly socketFactory: SocketFactory,
    private readonly appName = "Universal Remote",
  ) {}

  async connect(): Promise<void> {
    this.socket = await this.socketFactory(
      buildSamsungUrl(this.device, this.appName),
    );
  }

  async disconnect(): Promise<void> {
    this.socket?.close();
    this.socket = undefined;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    const code = SAMSUNG_KEYS[key];
    if (!code) throw new UnsupportedOperationError(this.brand, `key ${key}`);
    this.requireSocket().send(buildSamsungKeyMessage(code));
  }

  async launchApp(): Promise<void> {
    throw new UnsupportedOperationError(this.brand, "launchApp");
  }

  async listApps(): Promise<TvApp[]> {
    throw new UnsupportedOperationError(this.brand, "listApps");
  }

  async sendText(text: string): Promise<void> {
    this.requireSocket().send(buildSamsungTextMessage(text));
  }

  async setPower(on: boolean): Promise<void> {
    if (on) throw new UnsupportedOperationError(this.brand, "power on");
    await this.sendKey("power_off");
  }

  private requireSocket(): SocketLike {
    if (!this.socket) {
      throw new TvConnectionError("Samsung connector is not connected");
    }
    return this.socket;
  }
}
