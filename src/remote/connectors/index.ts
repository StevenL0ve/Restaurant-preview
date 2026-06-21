import type { TvConnector } from "../connector";
import type { FetchLike, TvBrand, TvDevice } from "../types";
import { RokuConnector } from "./roku";
import { SamsungConnector, type SocketFactory } from "./samsung";

export { RokuConnector, parseRokuApps } from "./roku";
export {
  SamsungConnector,
  buildSamsungKeyMessage,
  buildSamsungTextMessage,
  buildSamsungUrl,
} from "./samsung";
export type { SocketFactory, SocketLike } from "./samsung";

/** Transports the connectors need, injected so the core stays testable. */
export interface ConnectorDeps {
  /** HTTP client for REST protocols (Roku). Defaults to global fetch. */
  fetchImpl?: FetchLike;
  /** WebSocket factory for socket protocols (Samsung). */
  socketFactory?: SocketFactory;
}

/** Brands we can build a working connector for today. */
export const SUPPORTED_BRANDS: TvBrand[] = ["roku", "samsung"];

/**
 * Build the right connector for a device. Throws if the brand isn't supported
 * or a required transport wasn't provided.
 */
export function createConnector(
  device: TvDevice,
  deps: ConnectorDeps = {},
): TvConnector {
  switch (device.brand) {
    case "roku": {
      const fetchImpl = deps.fetchImpl ?? defaultFetch();
      return new RokuConnector(device, fetchImpl);
    }
    case "samsung": {
      if (!deps.socketFactory) {
        throw new Error(
          "Samsung connector requires a socketFactory (WebSocket transport)",
        );
      }
      return new SamsungConnector(device, deps.socketFactory);
    }
    default:
      throw new Error(`No connector available for brand: ${device.brand}`);
  }
}

function defaultFetch(): FetchLike {
  if (typeof fetch === "function") {
    return fetch as unknown as FetchLike;
  }
  throw new Error("No fetch implementation available; pass deps.fetchImpl");
}
