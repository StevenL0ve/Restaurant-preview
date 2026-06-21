import type { TvConnector } from "../connector";
import { TvConnectionError } from "../connector";
import type { RemoteKey, TvApp, TvDevice } from "../types";

// The TvController is the single high-level surface that BOTH the touch UI and
// the AI/agent layer drive. Keeping one surface means a Siri shortcut, a Claude
// tool call, and a button tap all go through identical, tested logic.

export type ConnectorFactory = (device: TvDevice) => TvConnector;

/** Directions usable with `navigate`. */
export type NavDirection = "up" | "down" | "left" | "right" | "ok" | "back" | "home";

const NAV_KEYS: Record<NavDirection, RemoteKey> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  ok: "ok",
  back: "back",
  home: "home",
};

export class TvController {
  private readonly devices = new Map<string, TvDevice>();
  private active?: { device: TvDevice; connector: TvConnector };

  constructor(private readonly factory: ConnectorFactory) {}

  /** Register a discovered or manually-added device. */
  addDevice(device: TvDevice): void {
    this.devices.set(device.id, device);
  }

  addDevices(devices: TvDevice[]): void {
    for (const d of devices) this.addDevice(d);
  }

  listDevices(): TvDevice[] {
    return [...this.devices.values()];
  }

  getActiveDevice(): TvDevice | undefined {
    return this.active?.device;
  }

  /** Connect to and make active the device with the given id. */
  async selectDevice(deviceId: string): Promise<TvDevice> {
    const device = this.devices.get(deviceId);
    if (!device) throw new TvConnectionError(`Unknown device: ${deviceId}`);
    if (this.active && this.active.device.id !== deviceId) {
      await this.active.connector.disconnect();
    }
    const connector = this.factory(device);
    await connector.connect();
    this.active = { device, connector };
    return device;
  }

  /** Resolve a device by id or fuzzy name, then make it active. */
  async selectDeviceByName(query: string): Promise<TvDevice> {
    const match = this.findDevice(query);
    if (!match) throw new TvConnectionError(`No device matches "${query}"`);
    return this.selectDevice(match.id);
  }

  async power(on: boolean): Promise<void> {
    await this.connector().setPower(on);
  }

  async sendKey(key: RemoteKey): Promise<void> {
    await this.connector().sendKey(key);
  }

  async navigate(direction: NavDirection): Promise<void> {
    await this.sendKey(NAV_KEYS[direction]);
  }

  async volume(change: "up" | "down" | "mute"): Promise<void> {
    const key: RemoteKey =
      change === "up" ? "volume_up" : change === "down" ? "volume_down" : "mute";
    await this.sendKey(key);
  }

  async media(action: "play" | "pause" | "play_pause" | "rewind" | "forward"): Promise<void> {
    await this.sendKey(action);
  }

  async typeText(text: string): Promise<void> {
    await this.connector().sendText(text);
  }

  async listApps(): Promise<TvApp[]> {
    return this.connector().listApps();
  }

  /** Launch an app by name (fuzzy-matched against installed apps) or by id. */
  async openApp(nameOrId: string): Promise<TvApp> {
    const apps = await this.listApps();
    const app = matchApp(apps, nameOrId);
    if (!app) {
      throw new TvConnectionError(
        `No installed app matches "${nameOrId}"`,
      );
    }
    await this.connector().launchApp(app.id);
    return app;
  }

  /** Open an app's search box (if it has one) and enter a query. */
  async searchInApp(appName: string, query: string): Promise<TvApp> {
    const app = await this.openApp(appName);
    await this.sendKey("ok");
    await this.typeText(query);
    return app;
  }

  private connector(): TvConnector {
    if (!this.active) {
      throw new TvConnectionError(
        "No active TV. Select a device before sending commands.",
      );
    }
    return this.active.connector;
  }

  private findDevice(query: string): TvDevice | undefined {
    const q = query.toLowerCase().trim();
    const all = this.listDevices();
    return (
      all.find((d) => d.id.toLowerCase() === q) ||
      all.find((d) => d.name.toLowerCase() === q) ||
      all.find((d) => d.name.toLowerCase().includes(q)) ||
      all.find((d) => d.brand.toLowerCase() === q)
    );
  }
}

/** Fuzzy-match an app by exact id, exact name, then substring name. */
export function matchApp(apps: TvApp[], query: string): TvApp | undefined {
  const q = query.toLowerCase().trim();
  return (
    apps.find((a) => a.id.toLowerCase() === q) ||
    apps.find((a) => a.name.toLowerCase() === q) ||
    apps.find((a) => a.name.toLowerCase().includes(q))
  );
}
