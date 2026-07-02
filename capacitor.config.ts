import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS / Android wrapper configuration. The web build in `dist` is bundled
// into the native shells; run `npm run build && npx cap sync` after changes.
const config: CapacitorConfig = {
  appId: "com.commongroundprojects.cgp",
  appName: "CGP",
  webDir: "dist",
  backgroundColor: "#efecdd",
  ios: {
    contentInset: "always",
    backgroundColor: "#efecdd",
  },
  android: {
    backgroundColor: "#efecdd",
  },
};

export default config;
