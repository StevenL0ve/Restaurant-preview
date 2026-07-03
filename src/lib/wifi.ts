// Guest Wi-Fi for The Common Ground Projects. One place to change if the
// network or password ever rotates.

export const GUEST_WIFI = {
  ssid: "mshealthcenter Guest",
  password: "CommonGround",
  security: "WPA" as const,
};

// Escapes a value for the WIFI: QR payload (backslash first, then the
// special characters the format reserves).
function esc(v: string): string {
  return v.replace(/([\\;,:"])/g, "\\$1");
}

// Standard Wi-Fi QR payload — iPhones and Androids offer "Join Network"
// straight from the camera when they scan it.
export function wifiQrPayload(
  net: { ssid: string; password: string; security: string } = GUEST_WIFI,
): string {
  return `WIFI:T:${net.security};S:${esc(net.ssid)};P:${esc(net.password)};;`;
}
