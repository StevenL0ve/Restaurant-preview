import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS / Android wrapper configuration. The web build in `dist` is bundled
// into the native shells; run `npm run build && npx cap sync` after changes.
const config: CapacitorConfig = {
  appId: "com.commongroundprojects.cgp",
  appName: "CGP",
  webDir: "dist",
  // Launch in brand green (matches the splash + logo background).
  backgroundColor: "#657e69",
  ios: {
    contentInset: "always",
    backgroundColor: "#657e69",
  },
  android: {
    backgroundColor: "#657e69",
  },
};

export default config;
