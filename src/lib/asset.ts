// Resolve a public asset path against the app's base URL. Locally and in the
// native (Capacitor) build the base is "/", so this is a no-op; on a GitHub
// Pages project subpath (e.g. /Restaurant-preview/) it prefixes correctly so
// images and icons don't 404. Pass paths WITHOUT a leading slash.
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, "");
}
