// Generates CoParent app icons from the brand mark (scripts/logo.mjs) by
// rasterizing the SVG with resvg — no design tools required.
// Run: `node scripts/gen-icons.mjs` (or `npm run icons`).
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { buildMarkSVG } from "./logo.mjs";

const iconsDir = new URL("../public/icons/", import.meta.url);
const brandDir = new URL("../public/brand/", import.meta.url);
mkdirSync(iconsDir, { recursive: true });
mkdirSync(brandDir, { recursive: true });

function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

// In-app logo mark: transparent background, used in the sidebar/header.
writeFileSync(new URL("logo-mark.svg", brandDir), buildMarkSVG({ bg: "transparent" }));

// App / PWA icons: the mark on a white tile.
const jobs = [
  ["icon-192.png", 192, { bg: "#ffffff" }],
  ["icon-512.png", 512, { bg: "#ffffff" }],
  ["icon-1024.png", 1024, { bg: "#ffffff" }],
  ["icon-maskable-512.png", 512, { bg: "#ffffff", pad: 0.12 }],
  ["apple-touch-icon-180.png", 180, { bg: "#ffffff" }],
  ["favicon-32.png", 32, { bg: "#ffffff" }],
];
for (const [name, size, opts] of jobs) {
  writeFileSync(new URL(name, iconsDir), render(buildMarkSVG({ size, ...opts }), size));
  console.log("wrote icons/" + name, `${size}x${size}`);
}

// Splash image (mark centered on the brand background) for the native shells.
const splash = buildMarkSVG({ size: 512, bg: "#f6f8fb", pad: 0.18 });
writeFileSync(new URL("splash-512.png", brandDir), render(splash, 512));
console.log("wrote brand/splash-512.png");
