/**
 * marketing/brand/banner.mjs
 *
 * Cover banners for Author Hunt's social pages: the wordmark, one line, the
 * opening date, and the marigold. No cat: the profile picture beside it
 * already carries the mark.
 *
 * Facebook's cover is 1640 x 924 here. A computer shows the middle 1640 x 624
 * of it and a phone shows nearly all of it, so the words stay in that middle
 * band and the marigold fills the edges a computer cuts off. The page's
 * profile picture covers the lower left corner on a computer, so nothing sits
 * there. `*-safe.png` draws those limits over the banner, to check by eye.
 *
 *   node marketing/brand/banner.mjs
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const b64 = async (p) => (await readFile(path.join(root, p))).toString("base64");
const marigold = "data:image/webp;base64," + (await b64("public/ornament/marigold.webp"));
const averia = "data:font/ttf;base64," + (await b64("assets/fonts/AveriaSerifLibre-Light.ttf"));
const averiaItalic = "data:font/ttf;base64," + (await b64("assets/fonts/AveriaSerifLibre-LightItalic.ttf"));

const W = 1640, H = 924, SAFE = 624;

/** [file, ground, the marigold's colour and strength, ink, accent, the date's mark] */
const BANNERS = [
  // White, with the marigold in madder above and below: the site, as a banner.
  ["banner-white", "#FFFFFF", ["#B23A2E", 1], "#111111", "#2B3F8C", "#FFD84D"],
  // Indigo, with the marigold in yellow: the bolder one, and it pairs with the indigo profile picture.
  ["banner-indigo", "#2B3F8C", ["#FFD84D", 0.9], "#FFFFFF", "#FFD84D", "#B23A2E"],
];

const page = ([, ground, [orn, ornAlpha], ink, accent, mark], guides) => `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=block">
<style>
@font-face { font-family: Averia; font-weight: 300; src: url("${averia}"); }
@font-face { font-family: Averia; font-weight: 300; font-style: italic; src: url("${averiaItalic}"); }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${ground}; color: ${ink}; -webkit-font-smoothing: antialiased; }
/* The marigold fills the two bands a computer crops away, and runs a little into the middle with an ink rule. */
.orn { position: absolute; left: 0; right: 0; height: ${(H - SAFE) / 2 + 46}px; }
.orn::before { content: ""; position: absolute; inset: 0; background: ${orn}; opacity: ${ornAlpha}; -webkit-mask: url("${marigold}") center / 620px auto; mask: url("${marigold}") center / 620px auto; }
.orn.top { top: 0; border-bottom: 4px solid ${ink}; } .orn.bottom { bottom: 0; border-top: 4px solid ${ink}; }
/* The words: a plate on a hard shadow, like the site's join box, so they never sit on the pattern. It is kept
   narrow enough (under 800px) that a profile picture over the lower left corner never reaches it. */
.plate { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 30px 64px 36px; background: ${ground}; border: 4px solid ${ink}; box-shadow: 18px 18px 0 ${ink}; text-align: center; white-space: nowrap; }
h1 { font: italic 300 126px/1 Averia, Georgia, serif; letter-spacing: -0.01em; }
p { margin-top: 14px; font: 500 38px/1.2 "Cormorant Garamond", Georgia, serif; }
p .a { color: ${accent}; }
.date { display: inline-block; margin-top: 18px; padding: 2px 14px; font: 600 26px/1.4 "Cormorant Garamond", Georgia, serif; letter-spacing: 0.16em; text-transform: uppercase; background: linear-gradient(transparent 50%, ${mark} 50%, ${mark} 92%, transparent 92%); }
/* the limits, drawn only on the checking copy */
.g { position: absolute; border: 4px dashed #00C2A8; pointer-events: none; }
</style></head><body>
<div class="orn top"></div><div class="orn bottom"></div>
<div class="plate">
  <h1>Author Hunt</h1>
  <p>A daily launch board for <span class="a">writing of every size.</span></p>
  <span class="date">Opens January 8, 2027</span>
</div>
${guides ? `<div class="g" style="left:0;right:0;top:${(H - SAFE) / 2}px;height:${SAFE}px"></div><div class="g" style="left:40px;bottom:${(H - SAFE) / 2}px;width:360px;height:220px;border-color:#E0457B"></div>` : ""}
</body></html>`;

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: W, height: H } });
for (const b of BANNERS) {
  for (const guides of [false, true]) {
    const file = path.join(os.tmpdir(), `authorhunt-${b[0]}${guides ? "-safe" : ""}.html`);
    await writeFile(file, page(b, guides));
    await tab.goto("file://" + file, { waitUntil: "networkidle" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: path.join(here, `${b[0]}${guides ? "-safe" : ""}.png`) });
  }
}
await browser.close();
console.log(`Drew ${BANNERS.length} banners (and a checking copy of each) in ${path.relative(root, here)}/`);
