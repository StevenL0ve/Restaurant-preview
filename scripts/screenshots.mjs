// Captures phone-sized screenshots of the running app for the README and store
// listing. Usage: `npm run preview` in one shell, then `node scripts/screenshots.mjs`.
// Uses Playwright + the pre-installed Chromium (set CHROMIUM_PATH if needed).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:4173";
const outDir = new URL("../docs/screenshots/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
// Enter guest mode before any app code runs so every load skips the account
// gate, and mark the welcome sheet as seen so it doesn't cover the shots.
await ctx.addInitScript(() => {
  localStorage.setItem("orsync.guest.v1", "1");
  localStorage.setItem("orsync.welcomed.v1", "1");
});
const page = await ctx.newPage();

async function show(route) {
  await page.evaluate((r) => { window.location.hash = r; }, route);
  await page.waitForSelector(".page, .page-narrow", { timeout: 8000 });
  await page.waitForTimeout(350);
}

await page.goto(`${BASE}/#/cards`, { waitUntil: "networkidle" });
await page.waitForSelector(".pref-tile", { timeout: 8000 });
const firstId = await page.evaluate(() => JSON.parse(localStorage.getItem("orsync.v2")).cards[0].id);

const shots = [
  { name: "01-dashboard", route: "/" },
  { name: "02-cards", route: "/cards" },
  { name: "03-card-detail", route: `/cards/${firstId}` },
  { name: "04-setup", route: `/cards/${firstId}/setup`, tick: true },
  { name: "05-surgeons", route: "/surgeons" },
  { name: "06-facilities", route: "/facilities" },
  { name: "07-loaners", route: "/loaners" },
];

for (const s of shots) {
  await show(s.route);
  if (s.tick) {
    const boxes = page.locator(".check-row input");
    const count = Math.min(5, await boxes.count());
    for (let i = 0; i < count; i++) await boxes.nth(i).check();
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: new URL(`${s.name}.png`, outDir).pathname });
  console.log("captured", s.name);
}

await browser.close();
