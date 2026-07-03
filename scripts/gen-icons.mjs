// Generates all ORSync app icons, the in-app logo mark, and the native
// icon/splash sources from the real brand logo (public/brand/logo-source.png —
// the "OR + EKG pulse" mark on a dark-navy tile). Uses @resvg/resvg-js.
// Run: `npm run icons`.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const iconsDir = new URL("../public/icons/", import.meta.url);
const brandDir = new URL("../public/brand/", import.meta.url);
const assetsDir = new URL("../assets/", import.meta.url);
[iconsDir, brandDir, assetsDir].forEach((d) => mkdirSync(d, { recursive: true }));

const SRC = fileURLToPath(new URL("../public/brand/logo-source.png", import.meta.url));
const srcPng = readFileSync(SRC);
const DATA = `data:image/png;base64,${srcPng.toString("base64")}`;
const SRC_W = 1254; // source is square

// The artwork: a rounded dark tile (~13.5%–86.5%) on pure black, ring at
// ~26%–74%. Cropping 18%–82% stays inside the tile, so the crop is a clean
// full-bleed square of tile color with the mark centered.
const CROP_FROM = 0.18;
const CROP_TO = 0.82;
const TILE = "#0e1521"; // sampled tile color
const SPLASH_DARK = "#05080f";

function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

// Full-bleed icon tile: the cropped logo square (iOS masks its own corners).
function tileSvg(size) {
  const cropW = (CROP_TO - CROP_FROM) * SRC_W;
  const scale = size / cropW;
  const off = -CROP_FROM * SRC_W * scale;
  const imgSize = SRC_W * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${TILE}"/>
    <image x="${off}" y="${off}" width="${imgSize}" height="${imgSize}" href="${DATA}"/>
  </svg>`;
}

// Splash: the tile as a rounded card centered on a near-black backdrop.
function splashSvg(size, bg) {
  const card = Math.round(size * 0.34);
  const x = (size - card) / 2;
  const r = Math.round(card * 0.22);
  const cropW = (CROP_TO - CROP_FROM) * SRC_W;
  const scale = card / cropW;
  const off = -CROP_FROM * SRC_W * scale;
  const imgSize = SRC_W * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <clipPath id="c"><rect x="${x}" y="${x}" width="${card}" height="${card}" rx="${r}"/></clipPath>
    <g clip-path="url(#c)">
      <rect x="${x}" y="${x}" width="${card}" height="${card}" fill="${TILE}"/>
      <image x="${x + off}" y="${x + off}" width="${imgSize}" height="${imgSize}" href="${DATA}"/>
    </g>
  </svg>`;
}

function write(url, name, png, size) {
  writeFileSync(new URL(name, url), png);
  console.log("wrote", name, `${size}x${size}`);
}

// App / PWA / store icons (opaque, full-bleed).
for (const size of [192, 512, 1024]) write(iconsDir, `icon-${size}.png`, render(tileSvg(1024), size), size);
write(iconsDir, "icon-maskable-512.png", render(tileSvg(1024), 512), 512);
write(iconsDir, "apple-touch-icon-180.png", render(tileSvg(1024), 180), 180);
write(iconsDir, "favicon-32.png", render(tileSvg(1024), 32), 32);

// In-app logo mark (CSS rounds the corners where needed).
write(brandDir, "logo-mark.png", render(tileSvg(1024), 256), 256);
write(brandDir, "splash-512.png", render(splashSvg(1024, SPLASH_DARK), 512), 512);

// Native icon/splash SOURCES for `npx capacitor-assets generate`.
write(assetsDir, "icon-only.png", render(tileSvg(1024), 1024), 1024);
write(assetsDir, "icon-foreground.png", render(splashSvg(1024, "rgba(0,0,0,0)"), 1024), 1024);
write(assetsDir, "icon-background.png", render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${TILE}"/></svg>`, 1024), 1024);
write(assetsDir, "splash.png", render(splashSvg(2732, SPLASH_DARK), 2732), 2732);
write(assetsDir, "splash-dark.png", render(splashSvg(2732, SPLASH_DARK), 2732), 2732);

console.log("done.");
