// One-off: screenshot the demo remote screen for review.
import puppeteer from "puppeteer";

const BASE = process.env.BASE || "http://localhost:4173";
const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(`${BASE}/#/remote`, { waitUntil: "networkidle0" });
await page.waitForSelector(".remote-app", { timeout: 5000 });

// Drive the AI bar so the screenshot shows the agent flow in action.
await page.type(".ai-bar input", "play Dune on Netflix in the bedroom");
await page.click(".ai-send");
await new Promise((r) => setTimeout(r, 600));

await page.screenshot({ path: "docs/screenshots/remote-demo.png" });
console.log("captured docs/screenshots/remote-demo.png");
await browser.close();
