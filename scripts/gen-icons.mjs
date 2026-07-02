// Generates the CGP app icon set from the real Common Ground logo
// (public/brand/logo.jpeg — white gooey lettering on sage #657e69).
// The logo is composited cover-style onto a matching sage square so every
// icon size is full-bleed with no seams. Uses @resvg/resvg-js (no native deps).
// Run: `node scripts/gen-icons.mjs` (or `npm run icons`).
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const iconsDir = new URL("../public/icons/", import.meta.url);
mkdirSync(iconsDir, { recursive: true });

const logo = readFileSync(new URL("../public/brand/logo.jpeg", import.meta.url)).toString("base64");
const SAGE = "#657e69"; // sampled from the logo background

// `pad` insets the artwork (maskable icons need safe-zone margins).
function svg(size, { pad = 0 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const off = Math.round((size - inner) / 2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${SAGE}"/>
  <image href="data:image/jpeg;base64,${logo}" x="${off}" y="${off}"
         width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid slice"/>
</svg>`;
}

function write(name, size, opts) {
  const png = new Resvg(svg(size, opts), { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(new URL(name, iconsDir), png);
  console.log("wrote", name, `${size}x${size}`);
}

write("icon-192.png", 192, {});
write("icon-512.png", 512, {});
write("icon-1024.png", 1024, {}); // App Store source (opaque, square)
write("icon-maskable-512.png", 512, { pad: 0.08 });
write("apple-touch-icon-180.png", 180, {});
write("favicon-32.png", 32, {});
