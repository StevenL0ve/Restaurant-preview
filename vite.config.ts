import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base so the same build works at a domain root (Capacitor's
  // native shell) AND under a subpath (GitHub Pages). Safe with HashRouter.
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
} as never);
