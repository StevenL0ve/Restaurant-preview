// Generates the CGP app icon set from an inline SVG mark — a deep-green
// rounded square with the "CGP" monogram and a leaf accent, matching the
// brand palette in src/styles.css. Uses @resvg/resvg-js (no native deps).
// Run: `node scripts/gen-icons.mjs` (or `npm run icons`).
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";

const iconsDir = new URL("../public/icons/", import.meta.url);
mkdirSync(iconsDir, { recursive: true });

// `pad` insets the artwork for maskable icons so nothing is clipped.
function svg({ pad = 0, rounded = true } = {}) {
  const s = 512; // design space
  const r = rounded ? 116 : 0;
  const scale = 1 - pad * 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${r}" fill="#2f6b3f"/>
  <g transform="translate(${(s * (1 - scale)) / 2} ${(s * (1 - scale)) / 2}) scale(${scale})">
    <path d="M256 84c70 36 102 94 102 151 0 64-46 111-102 111s-102-47-102-111c0-57 32-115 102-151z"
          fill="#7cb389" opacity="0.55"/>
    <path d="M256 110v220" stroke="#e3f0e6" stroke-width="11" stroke-linecap="round" opacity="0.75"/>
    <text x="256" y="436" text-anchor="middle"
          font-family="DejaVu Sans, Helvetica, Arial, sans-serif"
          font-size="118" font-weight="800" letter-spacing="4" fill="#ffffff">CGP</text>
  </g>
</svg>`;
}

function png(size, opts) {
  const r = new Resvg(svg(opts), { fitTo: { mode: "width", value: size } });
  return r.render().asPng();
}

function write(name, size, opts) {
  writeFileSync(new URL(name, iconsDir), png(size, opts));
  console.log("wrote", name, `${size}x${size}`);
}

write("icon-192.png", 192, {});
write("icon-512.png", 512, {});
write("icon-1024.png", 1024, { rounded: false }); // App Store source: opaque, square
write("icon-maskable-512.png", 512, { pad: 0.1, rounded: false });
write("apple-touch-icon-180.png", 180, { rounded: false });
write("favicon-32.png", 32, {});
