// Core domain types for the universal TV remote.
//
// The design goal is a single, brand-agnostic command vocabulary that the UI,
// the AI/agent layer (MCP, Siri, Claude/ChatGPT, etc.), and every per-brand
// connector all speak. A connector translates these universal commands into
// whatever wire protocol a given TV uses (Roku ECP, Samsung WebSocket, ...).

/** TV ecosystems we know how to talk to. `generic` is a manual/unknown device. */
export type TvBrand = "roku" | "samsung" | "lg" | "android" | "fire" | "generic";

/**
 * The universal remote-key vocabulary. Every connector maps these to its own
 * protocol's key names. Not every TV supports every key — see TvCapabilities.
 */
export type RemoteKey =
  | "power_on"
  | "power_off"
  | "home"
  | "back"
  | "up"
  | "down"
  | "left"
  | "right"
  | "ok"
  | "volume_up"
  | "volume_down"
  | "mute"
  | "channel_up"
  | "channel_down"
  | "play"
  | "pause"
  | "play_pause"
  | "rewind"
  | "forward"
  | "info"
  | "replay"
  | "enter"
  | "backspace";

/** What a given connector / device can actually do. */
export interface TvCapabilities {
  /** Can navigate a UI (D-pad + ok/back/home). */
  navigation: boolean;
  /** Volume up/down/mute. */
  volume: boolean;
  /** Transport controls (play/pause/seek). */
  media: boolean;
  /** Launch installed apps by id. */
  appLaunch: boolean;
  /** Enter free text (search boxes, logins). */
  textInput: boolean;
  /** Power the screen on as well as off (many TVs only support off). */
  powerOn: boolean;
}

/** An installed app/channel on a TV. */
export interface TvApp {
  id: string;
  name: string;
}

/**
 * A discovered or manually-added device. `id` is stable within a session and is
 * what the agent layer uses to address a specific screen ("the kitchen TV").
 */
export interface TvDevice {
  id: string;
  name: string;
  brand: TvBrand;
  /** Host or IP on the local network. */
  host: string;
  /** Protocol port (Roku 8060, Samsung 8002, ...). Connector picks a default. */
  port?: number;
  /** Opaque per-brand pairing/auth token, when the protocol needs one. */
  token?: string;
}

/** Minimal structural subset of `fetch` so connectors are easy to unit-test. */
export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
