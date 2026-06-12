// Generates CoParent app icons from the real brand logo (public/brand/logo-source.png)
// using sharp. iOS app icons must be fully opaque, so launcher/store icons are
// composited on white; the in-app mark keeps transparency.
// Run: `node scripts/gen-icons.mjs` (or `npm run icons`).
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../public/brand/logo-source.png", import.meta.url));
const iconsDir = new URL("../public/icons/", import.meta.url);
const brandDir = new URL("../public/brand/", import.meta.url);
mkdirSync(iconsDir, { recursive: true });

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Trim the surrounding empty space, scale the logo to `1 - 2*pad` of the
// canvas, and center it on a `size` square with the given background.
async function makeIcon(size, { bg, pad = 0.12 }) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(SRC)
    .trim()
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .toBuffer();
  const base = sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  }).composite([{ input: logo, gravity: "center" }]);
  // App icons must be opaque; flatten removes any alpha.
  return (bg.alpha === 1 ? base.flatten({ background: bg }) : base).png().toBuffer();
}

async function write(name, dir, size, opts) {
  writeFileSync(new URL(name, dir), await makeIcon(size, opts));
  console.log("wrote", name, `${size}x${size}`);
}

// App / PWA / store icons — opaque white background (iOS requirement).
await write("icon-192.png", iconsDir, 192, { bg: WHITE });
await write("icon-512.png", iconsDir, 512, { bg: WHITE });
await write("icon-1024.png", iconsDir, 1024, { bg: WHITE });
await write("icon-maskable-512.png", iconsDir, 512, { bg: WHITE, pad: 0.2 });
await write("apple-touch-icon-180.png", iconsDir, 180, { bg: WHITE });
await write("favicon-32.png", iconsDir, 32, { bg: WHITE, pad: 0.06 });

// In-app logo mark — transparent so it sits on any surface (sidebar, dark mode).
await write("logo-mark.png", brandDir, 256, { bg: TRANSPARENT, pad: 0.04 });

// Splash — logo centered on the app background.
await write("splash-512.png", brandDir, 512, { bg: { r: 246, g: 248, b: 251, alpha: 1 }, pad: 0.28 });

// --- Native icon/splash SOURCES for @capacitor/assets ---------------------
// `npx capacitor-assets generate` reads these to populate the native iOS/Android
// icon catalogs and splash screens.
const assetsDir = new URL("../assets/", import.meta.url);
mkdirSync(assetsDir, { recursive: true });
const BRAND_LIGHT = { r: 246, g: 248, b: 251, alpha: 1 };
const BRAND_DARK = { r: 11, g: 18, b: 32, alpha: 1 };

await write("icon-only.png", assetsDir, 1024, { bg: WHITE, pad: 0.1 });
await write("icon-foreground.png", assetsDir, 1024, { bg: TRANSPARENT, pad: 0.26 });
// Android adaptive-icon background is a plain solid fill (no logo).
writeFileSync(
  new URL("icon-background.png", assetsDir),
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } })
    .flatten({ background: WHITE })
    .png()
    .toBuffer(),
);
console.log("wrote icon-background.png 1024x1024");
await write("splash.png", assetsDir, 2732, { bg: BRAND_LIGHT, pad: 0.36 });
await write("splash-dark.png", assetsDir, 2732, { bg: BRAND_DARK, pad: 0.36 });
