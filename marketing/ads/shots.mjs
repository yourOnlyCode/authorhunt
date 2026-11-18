/**
 * marketing/ads/shots.mjs
 *
 * Takes the photographs of the app that the "inside the app" ad panes use
 * (build.mjs frames them). They are real pages of this codebase, at phone
 * width, showing the sample authors from `npm run db:seed`: nothing is
 * mocked up, and the panes say the titles are samples.
 *
 * To take them again, start the app opened and seeded, then run this:
 *
 *   LOCAL_DB_DIR=.data/pg-ads npm run db:seed
 *   LOCAL_DB_DIR=.data/pg-ads LAUNCH_AT= npx next dev -p 3112
 *   node marketing/ads/shots.mjs
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SHOTS_BASE ?? "http://localhost:3112";

/** [file, address, the heading to bring to the top of the picture (or none, for the top of the page)] */
const PAGES = [
  ["board", "/", "Top launches"],
  ["work", "/work/meltwater", null],
  ["author", "/author/maren", null],
  ["add", "/studio/works/new", "Add a work"],
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 430, height: 640 }, deviceScaleFactor: 2 });
// Signed in as the sample author, so the Studio opens (the development sign-in; lib/auth).
await context.addCookies([{ name: "ah_dev_user", value: "dev_author", url: BASE }]);
const tab = await context.newPage();
for (const [name, url, top] of PAGES) {
  await tab.goto(BASE + url, { waitUntil: "networkidle", timeout: 120000 });
  // The framework's own development badge is not part of the app.
  await tab.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await tab.evaluate((text) => {
    const el = text && [...document.querySelectorAll("h1, h2")].find((e) => e.textContent.includes(text));
    // 84px leaves room for the header, which stays at the top of the page.
    window.scrollTo(0, el ? Math.max(0, el.getBoundingClientRect().top + scrollY - 84) : 0);
  }, top);
  await tab.waitForTimeout(500);
  await tab.screenshot({ path: path.join(here, "shots", `${name}.png`) });
  console.log(name, await tab.title());
}
await browser.close();
