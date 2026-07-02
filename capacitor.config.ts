import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS / Android wrapper configuration. The web build in `dist` is bundled
// into the native shells; run `npm run build && npx cap sync` after changes.
const config: CapacitorConfig = {
  appId: "com.commongroundprojects.cgp",
  appName: "CGP",
  webDir: "dist",
  backgroundColor: "#f6f4ec",
  ios: {
    contentInset: "always",
    backgroundColor: "#f6f4ec",
  },
  android: {
    backgroundColor: "#f6f4ec",
  },
};

export default config;
