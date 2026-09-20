import { Capacitor } from "@capacitor/core";

// "Tap the file, land in the app": when someone receives a .orsync card file
// in Messages or Mail and opens it with ORSync, iOS hands the app a file URL.
// This wires that up: read the file (on-device) and pass its JSON to the
// importer, whether the app was already running or is cold-launching from the
// tap. Does nothing on the plain web build.

const LOOKS_LIKE_CARD_FILE = /\.(orsync|json)(\?|#|$)/i;

function base64ToUtf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function initNativeFileOpen(onJson: (json: string) => void): void {
  if (!Capacitor.isNativePlatform()) return;
  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const { Filesystem } = await import("@capacitor/filesystem");

      const seen = new Set<string>();
      const handle = async (url?: string | null) => {
        if (!url || !url.startsWith("file") || !LOOKS_LIKE_CARD_FILE.test(url)) return;
        if (seen.has(url)) return; // launch URL can also arrive as an event
        seen.add(url);
        try {
          const res = await Filesystem.readFile({ path: url });
          if (typeof res.data === "string" && res.data) onJson(base64ToUtf8(res.data));
        } catch {
          /* unreadable file: the manual Settings import still works */
        }
      };

      void App.addListener("appUrlOpen", (e) => void handle(e.url));
      const launch = await App.getLaunchUrl();
      await handle(launch?.url);
    } catch {
      /* plugins unavailable: nothing to do */
    }
  })();
}
