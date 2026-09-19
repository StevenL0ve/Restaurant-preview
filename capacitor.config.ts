import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS / Android wrapper configuration. The web build in `dist` is bundled
// into the native shells; run `npm run build && npx cap sync` after changes.
const config: CapacitorConfig = {
  appId: "com.steven.coparent",
  appName: "CoParent",
  webDir: "dist",
  backgroundColor: "#f6f8fb",
  ios: {
    contentInset: "always",
    backgroundColor: "#f6f8fb",
  },
  android: {
    backgroundColor: "#f6f8fb",
  },
};

export default config;
