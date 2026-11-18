/**
 * marketing/ads/build.mjs
 *
 * Draws the ad images for the waitlist, in the site's own parts (DESIGN.md:
 * a white page, indigo and madder, the marigold, pieces of the app instead
 * of stock pictures). Five ideas, each in the three shapes ad platforms ask
 * for: square (1080 x 1080), portrait (1080 x 1350) and story (1080 x 1920).
 * A story keeps its top and bottom clear, where the apps put their own buttons.
 *
 * Nothing here is generated artwork or a photograph: it is type and line,
 * rendered from this file. Run it again after changing the words:
 *
 *   node marketing/ads/build.mjs
 *
 * It needs Playwright's Chromium and a network connection (for one font).
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { readFile, writeFile } from "node:fs/promises";

// Playwright is a tool on the machine, not one of the app's dependencies, so it is found the way a global is.
const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const asset = (p) => "file://" + path.join(root, p);

// The ornament is carried inside the page: a browser will not use a picture from another file as a mask.
const marigold = "data:image/webp;base64," + (await readFile(path.join(root, "public/ornament/marigold.webp"))).toString("base64");

const SIZES = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] };

const cheer = (n, big = "") => `<span class="cheer ${big}"><svg viewBox="0 0 14 10"><path d="M7 0l7 10H0z"/></svg>${n}</span>`;
const row = (rank, color, title, by, n, cls = "") => `<div class="row ${cls}"><span class="rk">${rank}</span><span class="cv" style="background:${color}"></span><span class="tt">${title}<small>${by}</small></span>${cheer(n)}</div>`;
const cat = `<svg class="cat" viewBox="0 0 38 32"><path d="M5 3l8 6.5c3.5-1 8.5-1 12 0L33 3l-1 15c-.7 7-6.5 11-13 11S6.700 25 6 18z"/><circle cx="13.3" cy="17" r="4.3"/><circle cx="24.7" cy="17" r="4.3"/><circle class="f" cx="13.3" cy="17" r="1.25"/><circle class="f" cx="24.7" cy="17" r="1.25"/><path d="M17.6 17h2.8M9 17H6.3M29 17h2.7M1 21.5l4.3-.8M1.5 25.5l4.3-1.8M37 21.500l-4.3-.8M36.5 25.5l-4.3-1.8"/><path class="f" d="M17.7 23h2.600L19 24.700z"/></svg>`;

/** Each ad says one thing: a headline, a picture that shows it, and one line under. */
const ADS = {
  "a-favorite": {
    tone: "white",
    head: `<span class="blue">Be their</span><br>next favorite author.`,
    vis: `<div class="board">${row(1, "var(--blue)", "Your title", "by you", 61, "you")}${row(2, "#24503B", "Eleven Rooms", "A serial", 38)}${row(3, "#7A2533", "What the Tide Keeps", "A poem", 27)}</div>`,
    line: "A daily launch board for writers. Free to launch.",
  },
  "b-small-counts": {
    tone: "white",
    head: `A poem gets a row<br>like <span class="red">a novel.</span>`,
    vis: `<div class="board">${row(1, "var(--red)", "A poem", "launched this morning", 44)}${row(2, "var(--blue)", "A novel", "launched this morning", 38)}</div>`,
    line: "Launch everything you finish, not only the book.",
  },
  "c-fair": {
    tone: "white",
    head: `Rank can&rsquo;t be <span class="strike">bought.</span>`,
    vis: `<div class="fair">${cheer(61, "big")}<span class="coin">$</span></div>`,
    line: "Readers and writers cheer. That decides the day.",
  },
  "d-opens": {
    tone: "blue",
    head: `The first board opens <span class="boxed">January 8.</span>`,
    vis: `<div class="leaf"><b>JAN</b><span>8</span></div>`,
    line: "A launch day for writers. Be on the first one.",
  },
  "e-people": {
    tone: "white",
    head: `Written by <span class="mk">people.</span>`,
    vis: `<p class="proof">It was a <span class="del">dark<i class="ins">quiet</i></span> night<span class="del">,</span><i class="stop">.</i></p>`,
    line: "No AI-written work. A launch board for real writers.",
  },
};

/**
 * The panes that show the app itself, for the second, third and later frames of a carousel: a photograph of a
 * real page (shots.mjs takes them, at phone width, with the seed's sample authors), a few words above it and a
 * line below. They say the titles are samples.
 */
const shot = async (name) => `<figure class="shot"><img alt="" src="data:image/png;base64,${(await readFile(path.join(here, "shots", name + ".png"))).toString("base64")}"><figcaption>The app, with sample titles.</figcaption></figure>`;
Object.assign(ADS, {
  "p1-board": { tone: "white pane", head: `Every morning,<br>a <span class="blue">new board.</span>`, vis: await shot("board"), line: "Readers open it to see what launched today." },
  "p2-launch": { tone: "white pane", head: `Each piece gets<br><span class="red">a page of its own.</span>`, vis: await shot("work"), line: "Cheers, comments, and where to get it." },
  "p3-author": { tone: "white pane", head: `Your page <span class="mk">stays.</span>`, vis: await shot("author"), line: "Followers hear about your next launch." },
  "p4-add": { tone: "white pane", head: `Add it. Pick a day.<br><span class="blue">Launch.</span>`, vis: await shot("add"), line: "Free, for every piece you finish." },
});

const page = (ad, shape) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&display=block">
<style>
@font-face { font-family: Averia; font-weight: 300; src: url("${asset("assets/fonts/AveriaSerifLibre-Light.ttf")}"); }
@font-face { font-family: Averia; font-weight: 300; font-style: italic; src: url("${asset("assets/fonts/AveriaSerifLibre-LightItalic.ttf")}"); }
:root { --page: #fff; --ink: #111; --muted: #5C5C5C; --hair: #D4D4D4; --red: #B23A2E; --red-text: #9C2F25; --blue: #2B3F8C; --mark: #FFD84D;
  --display: Averia, Georgia, serif; --text: "Cormorant Garamond", Georgia, serif; --marigold: url("${marigold}"); }
* { box-sizing: border-box; margin: 0; padding: 0; border-radius: 0; }
html, body { width: 100%; height: 100%; }
body { background: var(--page); color: var(--ink); font: 500 40px/1.3 var(--text); -webkit-font-smoothing: antialiased; display: grid; grid-template-rows: auto 1fr auto; text-align: center; }
body.blue { background: var(--blue); color: #fff; }
/* the marigold, top and bottom: madder on white, or yellow on the indigo one */
.band { height: 64px; position: relative; background: var(--page); }
.band::before { content: ""; position: absolute; inset: 0; background: var(--red); -webkit-mask: var(--marigold) center / 420px auto; mask: var(--marigold) center / 420px auto; }
body.blue .band { background: var(--blue); } body.blue .band::before { background: var(--mark); opacity: 0.9; }
.band.top { border-bottom: 3px solid var(--ink); } .band.bottom { border-top: 3px solid var(--ink); }
body.story .band { height: 250px; } body.story .band.bottom { height: 330px; }
main { display: grid; align-content: center; justify-items: center; gap: 54px; padding: 40px 76px; }
/* one drawing, sized to each shape */
body.square main { zoom: 0.86; } body.portrait main { zoom: 1.04; gap: 68px; } body.story main { zoom: 1.1; gap: 76px; }
h1 { font: 300 104px/1.02 var(--display); letter-spacing: -0.015em; text-wrap: balance; }
.blue { color: var(--blue); } .red { color: var(--red-text); }
.mk { background: linear-gradient(transparent 56%, var(--mark) 56%, var(--mark) 93%, transparent 93%); padding-inline: 0.08em; }
.strike { position: relative; } .strike::after { content: ""; position: absolute; left: -4%; right: -4%; top: 54%; height: 0.08em; background: var(--red); }
.boxed { position: relative; white-space: nowrap; } .boxed::after { content: ""; position: absolute; inset: -0.02em -0.1em 0.02em; border: 0.05em solid var(--mark); }
.line { font-size: 44px; max-width: 18em; text-wrap: balance; }
body.blue .line { color: #fff; }
.foot { display: flex; align-items: center; justify-content: center; gap: 18px; font: italic 300 50px/1 var(--display); }
.foot b { font: 600 30px/1 var(--text); letter-spacing: 0.08em; padding: 14px 26px; background: var(--ink); color: var(--page); margin-left: 22px; }
body.blue .foot b { background: var(--mark); color: var(--ink); }
.cat { width: 70px; height: 59px; fill: none; stroke: var(--red); stroke-width: 1.7; stroke-linejoin: miter; overflow: visible; } .cat .f { fill: var(--red); stroke: none; }
body.blue .cat { stroke: #fff; } body.blue .cat .f { fill: #fff; }
/* a photograph of the app, framed like everything else here: an ink rule and a hard shadow */
body.pane main { gap: 34px; padding-block: 24px; } body.pane h1 { font-size: 80px; } body.pane .line { font-size: 40px; }
.shot { width: 640px; } .shot img { display: block; width: 100%; height: 520px; object-fit: cover; object-position: top; border: 3px solid var(--ink); box-shadow: 14px 14px 0 var(--ink); }
.shot figcaption { margin-top: 26px; font-size: 26px; color: var(--muted); }
body.pane.portrait .shot img { height: 700px; } body.pane.story .shot img { height: 760px; }
body.pane.square main { zoom: 0.9; } body.pane.portrait main { zoom: 0.96; gap: 30px; } body.pane.story main { zoom: 0.98; gap: 40px; }
body.pane .line { max-width: 22em; }
/* pieces of the app */
.board { width: 780px; border: 3px solid var(--ink); background: var(--page); box-shadow: 14px 14px 0 var(--ink); text-align: left; }
.row { display: grid; grid-template-columns: 1.4ch 62px 1fr auto; align-items: center; gap: 26px; padding: 22px 28px; border-bottom: 2px solid var(--hair); }
.row:last-child { border-bottom: 0; } .row.you { background: #FFF6C2; }
.rk { font: 300 56px/1 var(--display); color: var(--muted); } .row:first-child .rk { color: var(--red-text); }
.cv { width: 62px; height: 92px; border: 2px solid var(--ink); }
.tt { font: 300 46px/1.1 var(--display); } .tt small { display: block; margin-top: 4px; font: 500 30px/1.2 var(--text); color: var(--muted); }
.cheer { display: grid; justify-items: center; padding: 10px 16px; border: 3px solid var(--ink); background: var(--page); color: var(--ink); font: 700 34px/1.1 var(--text); }
.cheer svg { width: 26px; height: 19px; fill: var(--red); }
.fair { display: flex; align-items: center; gap: 64px; }
.cheer.big { padding: 26px 44px; font-size: 92px; box-shadow: 14px 14px 0 var(--ink); } .cheer.big svg { width: 70px; height: 50px; }
.coin { position: relative; width: 190px; height: 190px; border: 4px solid var(--muted); border-radius: 50%; display: grid; place-items: center; font: 300 110px/1 var(--display); color: var(--muted); }
.coin::after { content: ""; position: absolute; left: -24px; right: -24px; top: 50%; height: 9px; background: var(--red); transform: rotate(-38deg); }
.leaf { width: 300px; border: 3px solid var(--ink); background: var(--page); color: var(--ink); box-shadow: 14px 14px 0 var(--ink); }
.leaf b { display: block; background: var(--red); color: #fff; font: 600 44px/1 var(--text); letter-spacing: 0.14em; padding: 18px 0 14px; }
.leaf span { display: block; font: 300 190px/1.08 var(--display); }
.proof { position: relative; margin-top: 70px; font: 500 78px/1 var(--text); white-space: nowrap; }
.proof .del { position: relative; text-decoration: line-through; text-decoration-color: var(--red); text-decoration-thickness: 7px; }
.proof .ins { position: absolute; left: 50%; bottom: 1.05em; transform: translateX(-50%) rotate(-4deg); font: italic 300 92px/1 var(--display); color: var(--red-text); }
.proof .ins::after { content: ""; position: absolute; left: 50%; top: 100%; width: 30px; height: 30px; margin: 4px 0 0 -16px; border-left: 7px solid var(--red); border-top: 7px solid var(--red); transform: rotate(45deg) skew(8deg, 8deg); }
.proof .stop { font: italic 300 110px/0.6 var(--display); color: var(--red-text); }
</style></head>
<body class="${ad.tone} ${shape}">
  <div class="band top"></div>
  <main>
    <h1>${ad.head}</h1>
    ${ad.vis}
    <p class="line">${ad.line}</p>
    <p class="foot">${cat}Author Hunt<b>JOIN THE LIST</b></p>
  </main>
  <div class="band bottom"></div>
</body></html>`;

const browser = await chromium.launch();
for (const [name, ad] of Object.entries(ADS)) {
  for (const [shape, [w, h]] of Object.entries(SIZES)) {
    const tab = await browser.newPage({ viewport: { width: w, height: h } });
    // Written to a file and opened from there, so the page may read the fonts and the ornament beside it.
    const file = path.join(os.tmpdir(), `authorhunt-ad-${name}-${shape}.html`);
    await writeFile(file, page(ad, shape));
    await tab.goto("file://" + file, { waitUntil: "networkidle" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: path.join(here, `${name}-${shape}.png`) });
    await tab.close();
  }
}
await browser.close();
console.log(`Drew ${Object.keys(ADS).length * Object.keys(SIZES).length} images in ${path.relative(root, here)}/`);
