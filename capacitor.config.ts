import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS / Android wrapper configuration. The web build in `dist` is bundled
// into the native shells; run `npm run build && npx cap sync` after changes.
const config: CapacitorConfig = {
  appId: "com.mycellar.app",
  appName: "My Cellar",
  webDir: "dist",
  backgroundColor: "#160d12",
  ios: {
    contentInset: "always",
    backgroundColor: "#160d12",
  },
  android: {
    backgroundColor: "#160d12",
  },
};

export default config;
