// Captures phone-sized screenshots of the running app for store listings.
// Usage: start `npm run preview` first, then `node scripts/screenshots.mjs`.
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:4173";
const outDir = new URL("../docs/screenshots/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const shots = [
  { name: "01-dashboard", route: "/" },
  { name: "02-messages", route: "/messages", type: "You ALWAYS drop her off late and never tell me!" },
  { name: "03-calendar", route: "/calendar" },
  { name: "04-expenses", route: "/expenses" },
];

const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

for (const s of shots) {
  await page.goto(`${BASE}/#${s.route}`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".page, .page-tight", { timeout: 5000 });
  if (s.type) {
    // Type a tense message so the on-device tone check is visible in the shot.
    await page.type(".composer-row textarea", s.type, { delay: 8 });
    await new Promise((r) => setTimeout(r, 400));
  }
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: new URL(`${s.name}.png`, outDir).pathname });
  console.log("captured", s.name);
}

await browser.close();
