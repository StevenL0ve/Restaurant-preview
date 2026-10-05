// Straight-line distances between tagged points (storage sites, hospitals).
// Haversine is plenty here: the point is "which hospital is my stock closest
// to", not turn-by-turn directions.

export function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8; // earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatMiles(mi: number): string {
  if (mi < 0.2) return "right here";
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

/** One-tap "tag this spot": the device's current position. Works on iPhone
 *  (asks for permission the first time) and in desktop browsers. */
export function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) }),
      () => reject(new Error("Couldn't get your location. Check the app's location permission.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}

/** Apple Maps / Google Maps link for a tagged point, for driving there. */
export function mapsHref(lat: number, lng: number): string {
  return `https://maps.apple.com/?ll=${lat},${lng}&q=Pinned+location`;
}
