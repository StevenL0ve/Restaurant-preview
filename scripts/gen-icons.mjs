// Generates My Cellar app icons by rasterizing the brand SVG mark with sharp.
// iOS launcher/store icons must be fully opaque, so they're composited on the
// cellar background; the maskable icon keeps generous padding for safe areas.
// Run: `node scripts/gen-icons.mjs` (or `npm run icons`).
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const iconsDir = new URL("../public/icons/", import.meta.url);
mkdirSync(iconsDir, { recursive: true });

// A wine bottle resting in a cellar arch — matches the in-app <LogoMark>.
function markSvg(pad = 0) {
  const o = pad; // viewBox padding so the mark sits inside maskable safe area
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${-o} ${-o} ${48 + o * 2} ${48 + o * 2}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a2230"/>
        <stop offset="1" stop-color="#160d12"/>
      </linearGradient>
    </defs>
    <rect x="-${o}" y="-${o}" width="${48 + o * 2}" height="${48 + o * 2}" fill="url(#bg)"/>
    <path d="M16 10h16v6a8 8 0 0 1-8 8 8 8 0 0 1-8-8z" fill="#7b1f2b"/>
    <rect x="22" y="22" width="4" height="11" fill="#e9c46a"/>
    <ellipse cx="24" cy="37" rx="9" ry="3" fill="#e9c46a" opacity="0.25"/>
    <circle cx="24" cy="15" r="2.2" fill="#e9c46a"/>
  </svg>`;
}

async function render(size, svg, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(new URL(out, iconsDir).pathname);
  console.log("wrote", out, size);
}

await render(1024, markSvg(0), "icon-1024.png");
await render(512, markSvg(0), "icon-512.png");
await render(192, markSvg(0), "icon-192.png");
await render(180, markSvg(0), "apple-touch-icon-180.png");
await render(32, markSvg(0), "favicon-32.png");
// Maskable: extra padding so the mark survives the platform's circular/rounded mask.
await render(512, markSvg(8), "icon-maskable-512.png");
