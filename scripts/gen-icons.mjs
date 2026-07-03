// Generates every app icon from the master logo (public/brand/logo.png —
// white Common Ground lettering on brand green #56775f, opaque square).
// Outputs the PWA/web set and the iOS asset-catalog icon.
// Run: `node scripts/gen-icons.mjs` (or `npm run icons`).
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const iconsDir = new URL("../public/icons/", import.meta.url);
mkdirSync(iconsDir, { recursive: true });

const logo = readFileSync(new URL("../public/brand/logo.png", import.meta.url)).toString("base64");
const BG = "#56775f";

// `pad` insets the artwork (maskable icons need safe-zone margins).
function render(size, { pad = 0 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const off = Math.round((size - inner) / 2);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <image href="data:image/png;base64,${logo}" x="${off}" y="${off}"
         width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid slice"/>
</svg>`;
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

function write(url, size, opts) {
  writeFileSync(url, render(size, opts));
  console.log("wrote", url.pathname.split("/").slice(-2).join("/"), `${size}x${size}`);
}

write(new URL("icon-192.png", iconsDir), 192, {});
write(new URL("icon-512.png", iconsDir), 512, {});
write(new URL("icon-1024.png", iconsDir), 1024, {});
write(new URL("icon-maskable-512.png", iconsDir), 512, { pad: 0.08 });
write(new URL("apple-touch-icon-180.png", iconsDir), 180, {});
write(new URL("favicon-32.png", iconsDir), 32, {});
// iOS asset catalog (the icon that shows on the home screen)
write(new URL("../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", import.meta.url), 1024, {});
