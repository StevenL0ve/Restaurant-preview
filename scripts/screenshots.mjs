// Captures phone-sized screenshots of the running app for store listings.
// Usage: start `npm run preview` first, then `node scripts/screenshots.mjs`.
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:4173";
const outDir = new URL("../docs/screenshots/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const shots = [
  { name: "01-home", route: "/" },
  { name: "02-menu", route: "/menu" },
  { name: "03-punchcard", route: "/rewards" },
  { name: "04-book", route: "/book" },
  { name: "05-waivers", route: "/waivers" },
];

const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

for (const s of shots) {
  await page.goto(`${BASE}/#${s.route}`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".page", { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: new URL(`${s.name}.png`, outDir).pathname });
  console.log("wrote", s.name);
}

await browser.close();
