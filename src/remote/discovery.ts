import type { TvBrand, TvDevice } from "./types";

// Device discovery on a LAN uses SSDP (UDP multicast to 239.255.255.250:1900).
// A raw UDP socket isn't available in a browser/webview, so the actual multicast
// is performed by a platform transport (a Capacitor plugin on device, a small
// helper in tests). This module keeps the transport pluggable and provides the
// brand-detection + manual-entry logic that doesn't depend on the network.

/** A raw SSDP response, as captured by a platform transport. */
export interface SsdpResponse {
  /** The responder's IP address. */
  address: string;
  /** Raw headers from the SSDP NOTIFY/200 response, lower-cased keys. */
  headers: Record<string, string>;
}

/** Performs the actual SSDP M-SEARCH and yields raw responses. */
export interface DiscoveryTransport {
  search(timeoutMs: number): Promise<SsdpResponse[]>;
}

/** Infer a TV brand from SSDP response headers. */
export function brandFromSsdp(headers: Record<string, string>): TvBrand {
  const haystack = Object.values(headers).join(" ").toLowerCase();
  if (haystack.includes("roku")) return "roku";
  if (haystack.includes("samsung")) return "samsung";
  if (haystack.includes("webos") || haystack.includes("lg")) return "lg";
  if (haystack.includes("android") || haystack.includes("chromecast")) {
    return "android";
  }
  if (haystack.includes("fire") || haystack.includes("amazon")) return "fire";
  return "generic";
}

function deviceNameFromSsdp(
  headers: Record<string, string>,
  fallback: string,
): string {
  return (
    headers["friendlyname"] ||
    headers["server"]?.split("/")[0] ||
    headers["device-group"] ||
    fallback
  );
}

/** Turn raw SSDP responses into deduplicated TvDevice records. */
export function devicesFromSsdp(responses: SsdpResponse[]): TvDevice[] {
  const byHost = new Map<string, TvDevice>();
  for (const res of responses) {
    if (byHost.has(res.address)) continue;
    const brand = brandFromSsdp(res.headers);
    byHost.set(res.address, {
      id: `${brand}-${res.address}`,
      name: deviceNameFromSsdp(res.headers, `${brand} (${res.address})`),
      brand,
      host: res.address,
    });
  }
  return [...byHost.values()];
}

/** Discover devices on the LAN via the provided transport. */
export async function discoverDevices(
  transport: DiscoveryTransport,
  timeoutMs = 3000,
): Promise<TvDevice[]> {
  const responses = await transport.search(timeoutMs);
  return devicesFromSsdp(responses);
}

/** Build a device record from a manually-entered host (the always-works path). */
export function manualDevice(
  host: string,
  brand: TvBrand,
  name?: string,
): TvDevice {
  return {
    id: `${brand}-${host}`,
    name: name ?? `${brand} (${host})`,
    brand,
    host,
  };
}
