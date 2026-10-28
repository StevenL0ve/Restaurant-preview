import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS / Android wrapper configuration. The web build in `dist` is bundled
// into the native shells; run `npm run build && npx cap sync` after changes.
const config: CapacitorConfig = {
  appId: "com.stevennelson.orsync",
  appName: "ORSync",
  webDir: "dist",
  backgroundColor: "#f6f8fb",
  ios: {
    contentInset: "never",
    backgroundColor: "#f6f8fb",
  },
  android: {
    backgroundColor: "#f6f8fb",
    // Every plugin except RevenueCat: Android has no Pro subscriptions yet,
    // and its bundled Play Billing 7 is now refused by Google Play (8+
    // needs a newer Capacitor). Add it back with Android purchases.
    includePlugins: [
      "@aparajita/capacitor-biometric-auth",
      "@capacitor/app",
      "@capacitor/filesystem",
      "@capacitor/haptics",
      "orsync-ocr",
    ],
  },
};

export default config;
