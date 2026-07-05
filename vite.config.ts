import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// `base` defaults to "/" (native app, local dev, custom domain). The GitHub
// Pages preview build sets VITE_BASE=/Restaurant-preview/ so assets resolve on
// the project subpath.
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
} as never);
