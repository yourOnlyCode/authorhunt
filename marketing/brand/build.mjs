/**
 * marketing/brand/build.mjs
 *
 * Profile pictures for Author Hunt's social pages, drawn from the cat mark
 * (components/ui/icons.tsx, CatMark) in the site's colours. Facebook shows a
 * profile picture as a circle, so the cat sits well inside it: nothing that
 * matters is in the corners a circle cuts off. 2048 x 2048, which every
 * platform accepts and scales down cleanly.
 *
 *   node marketing/brand/build.mjs
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const marigold = "data:image/webp;base64," + (await readFile(path.join(root, "public/ornament/marigold.webp"))).toString("base64");

// The mark as CatMark draws it, with its pupils. `line` is the stroke, `dot` the nose and pupils.
const cat = (line, dot) => `<svg viewBox="-2 -2 42 36" width="100%" height="100%" fill="none" stroke="${line}" stroke-width="2.1" stroke-linejoin="miter" stroke-linecap="square">
  <path d="M5 3l8 6.5c3.5-1 8.5-1 12 0L33 3l-1 15c-.7 7-6.5 11-13 11S6.7 25 6 18z"/>
  <circle cx="13.3" cy="17" r="4.3"/><circle cx="24.7" cy="17" r="4.3"/>
  <circle cx="13.3" cy="17" r="1.25" fill="${dot}" stroke="none"/><circle cx="24.7" cy="17" r="1.25" fill="${dot}" stroke="none"/>
  <path d="M17.6 17h2.8M9 17H6.3M29 17h2.7M1 21.5l4.3-.8M1.5 25.5l4.3-1.8M37 21.5l-4.3-.8M36.5 25.5l-4.3-1.8"/>
  <path d="M17.7 23h2.6L19 24.7z" fill="${dot}" stroke="none"/>
</svg>`;

/** [file, background, what sits behind the cat, the cat's line, its dots] */
const PICTURES = [
  // The everyday one: madder on white, as on the site.
  ["profile-white", "#FFFFFF", "", "#B23A2E", "#B23A2E"],
  // White on indigo: the strongest at the size of a comment avatar.
  ["profile-indigo", "#2B3F8C", "", "#FFFFFF", "#FFFFFF"],
  // The marigold behind, quiet, with a white disc for the cat: the most like the page.
  ["profile-marigold", "#FFFFFF", `<div class="paper"></div><div class="disc"></div>`, "#B23A2E", "#B23A2E"],
];

const SIZE = 2048;
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
for (const [name, bg, behind, line, dot] of PICTURES) {
  const file = path.join(os.tmpdir(), `authorhunt-${name}.html`);
  await writeFile(file, `<!doctype html><html><head><style>
    html, body { margin: 0; width: ${SIZE}px; height: ${SIZE}px; background: ${bg}; overflow: hidden; }
    .paper { position: absolute; inset: 0; background: #B23A2E; opacity: 0.4; -webkit-mask: url("${marigold}") center / 900px auto; mask: url("${marigold}") center / 900px auto; }
    .disc { position: absolute; left: 50%; top: 50%; width: 1500px; height: 1500px; margin: -750px 0 0 -750px; border-radius: 50%; background: #FFFFFF; }
    /* The cat takes about two thirds of the width, inside the circle a profile picture is cut to. Its line is a
       little heavier than on the site, so it holds at the size of a comment avatar, and it sits a touch low so
       its ears have room: the optical middle, not the measured one. */
    .cat { position: absolute; left: 50%; top: 50%; width: 1360px; height: 1166px; margin: -548px 0 0 -680px; }
  </style></head><body>${behind}<div class="cat">${cat(line, dot)}</div></body></html>`);
  await tab.goto("file://" + file);
  await tab.screenshot({ path: path.join(here, `${name}.png`) });
}
await browser.close();
console.log(`Drew ${PICTURES.length} profile pictures in ${path.relative(root, here)}/`);
