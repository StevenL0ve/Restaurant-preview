import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS / Android wrapper configuration. The web build in `dist` is bundled
// into the native shells; run `npm run build && npx cap sync` after changes.
const config: CapacitorConfig = {
  appId: "com.commongroundprojects.cgp",
  appName: "CGP",
  webDir: "dist",
  // The native window behind the web view. iOS occasionally exposes a sliver
  // of it below the page (e.g. after the keyboard or an overscroll settle), so
  // it matches the bottom nav's dark green and reads as part of the bar.
  // The splash overlay in index.html still paints the lighter brand green.
  backgroundColor: "#42543e",
  ios: {
    contentInset: "always",
    backgroundColor: "#42543e",
  },
  android: {
    backgroundColor: "#42543e",
  },
};

export default config;
