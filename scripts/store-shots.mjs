// Composes App Store marketing screenshots (1290×2796 — the required 6.7"
// size) from the raw app captures in docs/screenshots: ambient gradient
// backdrop, big caption, device shot with rounded corners and a soft shadow.
// Usage: capture app screenshots first (scripts/screenshots.mjs), then
//   CHROMIUM_PATH=… node scripts/store-shots.mjs
// Output: docs/store/*.png — drag straight into App Store Connect.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const shotsDir = new URL("../docs/screenshots/", import.meta.url);
const outDir = new URL("../docs/store/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const FRAMES = [
  {
    src: "01-dashboard.png",
    out: "store-1-hero.png",
    title: "Every case.\nReady.",
    sub: "Your surgical preference cards — yours alone. No hospital login.",
    bg: ["#0d9488", "#134e4a"],
  },
  {
    src: "04-setup.png",
    out: "store-2-setup.png",
    title: "Pull the room,\ncart by cart",
    sub: "Grouped by location — check items off until you're case-ready.",
    bg: ["#6366f1", "#312e81"],
  },
  {
    src: "02-cards.png",
    out: "store-3-cards.png",
    title: "Every surgeon.\nEvery procedure.",
    sub: "Positioning, prep, trays, sutures, quirks — color-coded by specialty.",
    bg: ["#e11d48", "#881337"],
  },
  {
    src: "07-loaners.png",
    out: "store-4-loaners.png",
    title: "Loaner trays,\non time",
    sub: "Deadlines, sterile status, and one-tap call the rep.",
    bg: ["#d97706", "#78350f"],
  },
  {
    src: "08-dark.png",
    out: "store-5-dark.png",
    title: "Made for\ndark ORs",
    sub: "Offline-first, Face ID lock, and a gorgeous dark mode.",
    bg: ["#0f172a", "#020617"],
  },
];

function pageHtml(f, imgDataUri) {
  const [c1, c2] = f.bg;
  const title = f.title.replace(/\n/g, "<br/>");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body {
      width: 1290px; height: 2796px; overflow: hidden;
      font-family: -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, sans-serif;
      background:
        radial-gradient(900px 700px at 85% -5%, rgba(255,255,255,0.22), transparent 65%),
        radial-gradient(800px 700px at 0% 100%, rgba(0,0,0,0.35), transparent 70%),
        linear-gradient(150deg, ${c1}, ${c2});
      display: flex; flex-direction: column; align-items: center;
      padding: 150px 90px 0; color: #fff;
    }
    h1 { font-size: 128px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.04; text-align: center; }
    p  { margin-top: 42px; font-size: 46px; line-height: 1.4; text-align: center; color: rgba(255,255,255,0.88); max-width: 980px; }
    .device {
      margin-top: 96px; width: 1020px; border-radius: 88px; overflow: hidden;
      border: 10px solid rgba(255,255,255,0.28);
      box-shadow: 0 60px 140px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.15);
    }
    .device img { width: 100%; display: block; }
  </style></head><body>
    <h1>${title}</h1>
    <p>${f.sub}</p>
    <div class="device"><img src="${imgDataUri}" /></div>
  </body></html>`;
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1290, height: 2796 } });

for (const f of FRAMES) {
  const png = readFileSync(fileURLToPath(new URL(f.src, shotsDir)));
  const dataUri = `data:image/png;base64,${png.toString("base64")}`;
  await page.setContent(pageHtml(f, dataUri), { waitUntil: "networkidle" });
  await page.screenshot({ path: fileURLToPath(new URL(f.out, outDir)) });
  console.log("composed", f.out);
}

await browser.close();
