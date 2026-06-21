import type { RemoteKey, TvApp, TvBrand, TvCapabilities } from "./types";

/**
 * A connector is the brand-specific driver that turns universal remote commands
 * into a particular TV's wire protocol. Implementations live in ./connectors.
 *
 * Methods that a device can't do should throw `UnsupportedOperationError` rather
 * than fail silently, so the agent layer can report an honest error.
 */
export interface TvConnector {
  readonly brand: TvBrand;
  readonly capabilities: TvCapabilities;

  /** Establish/verify the connection (and complete pairing if required). */
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  /** Send a single remote key. */
  sendKey(key: RemoteKey): Promise<void>;

  /** Launch an installed app by its brand-specific id. */
  launchApp(appId: string): Promise<void>;

  /** List installed apps so names can be resolved to ids. */
  listApps(): Promise<TvApp[]>;

  /** Enter free text into the currently focused field. */
  sendText(text: string): Promise<void>;

  /** Power the screen on (when supported) or off. */
  setPower(on: boolean): Promise<void>;
}

/** Thrown when a device/protocol genuinely cannot perform a requested action. */
export class UnsupportedOperationError extends Error {
  constructor(brand: TvBrand, operation: string) {
    super(`${brand} connector does not support: ${operation}`);
    this.name = "UnsupportedOperationError";
  }
}

/** Thrown when the TV could not be reached or returned an error status. */
export class TvConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TvConnectionError";
  }
}
