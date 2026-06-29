// Generates all ORSync app icons, the in-app logo mark, and the native
// icon/splash sources from a single vector definition — no external logo file.
// Uses @resvg/resvg-js (prebuilt binary, no native toolchain needed).
// Run: `npm run icons`.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const iconsDir = new URL("../public/icons/", import.meta.url);
const brandDir = new URL("../public/brand/", import.meta.url);
const assetsDir = new URL("../assets/", import.meta.url);
[iconsDir, brandDir, assetsDir].forEach((d) => mkdirSync(d, { recursive: true }));

const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_LIGHT = "#14b8a6";

// The ORSync mark, drawn in a 1024 viewBox: a preference "card" with a few
// list lines and a bold check badge — "your card, ready". `card`/`line`/`badge`
// colors are themeable so the same mark works white-on-teal (icon) or
// teal-on-white (Android adaptive foreground).
function mark({ card, line, badgeBg, badgeTick }) {
  return `
    <g>
      <rect x="288" y="232" width="392" height="520" rx="48" fill="${card}"/>
      <rect x="356" y="330" width="256" height="40" rx="20" fill="${line}"/>
      <rect x="356" y="426" width="208" height="40" rx="20" fill="${line}"/>
      <rect x="356" y="522" width="160" height="40" rx="20" fill="${line}"/>
      <circle cx="672" cy="690" r="150" fill="${badgeBg}"/>
      <path d="M606 690 l44 46 l92 -104" fill="none" stroke="${badgeTick}"
            stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
}

function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

// Full app-icon tile: teal gradient rounded square + white mark.
function tileSvg(opaque = true) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${TEAL_LIGHT}"/>
        <stop offset="1" stop-color="${TEAL_DARK}"/>
      </linearGradient>
    </defs>
    ${opaque ? `<rect width="1024" height="1024" rx="224" fill="url(#g)"/>` : `<rect width="1024" height="1024" fill="url(#g)"/>`}
    ${mark({ card: "#ffffff", line: "#99f6e4", badgeBg: TEAL_DARK, badgeTick: "#ffffff" })}
  </svg>`;
}

// Mark only, no tile — teal on transparent, for Android adaptive foreground.
function foregroundSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    ${mark({ card: TEAL, line: "#ffffff", badgeBg: "#ffffff", badgeTick: TEAL })}
  </svg>`;
}

function splashSvg(bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <rect width="1024" height="1024" fill="${bg}"/>
    <g transform="translate(256 256) scale(0.5)">
      <rect width="1024" height="1024" rx="224" fill="${TEAL}"/>
      ${mark({ card: "#ffffff", line: "#99f6e4", badgeBg: TEAL_DARK, badgeTick: "#ffffff" })}
    </g>
  </svg>`;
}

function write(url, name, png, size) {
  writeFileSync(new URL(name, url), png);
  console.log("wrote", name, `${size}x${size}`);
}

const tile = tileSvg(true);

// App / PWA / store icons (opaque tile).
for (const size of [192, 512, 1024]) write(iconsDir, `icon-${size}.png`, render(tile, size), size);
write(iconsDir, "icon-maskable-512.png", render(tileSvg(false), 512), 512);
write(iconsDir, "apple-touch-icon-180.png", render(tile, 180), 180);
write(iconsDir, "favicon-32.png", render(tile, 32), 32);

// In-app logo mark (the teal tile reads well on the sidebar/auth surfaces).
write(brandDir, "logo-mark.png", render(tile, 256), 256);
write(brandDir, "splash-512.png", render(splashSvg("#f6f8fb"), 512), 512);

// Native icon/splash SOURCES for `npx capacitor-assets generate`.
write(assetsDir, "icon-only.png", render(tile, 1024), 1024);
write(assetsDir, "icon-foreground.png", render(foregroundSvg(), 1024), 1024);
write(assetsDir, "icon-background.png", render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#ffffff"/></svg>`, 1024), 1024);
write(assetsDir, "splash.png", render(splashSvg("#f6f8fb"), 2732), 2732);
write(assetsDir, "splash-dark.png", render(splashSvg("#0b1220"), 2732), 2732);

console.log("done.");
