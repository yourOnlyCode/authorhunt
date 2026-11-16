/**
 * scripts/smoke-splash.mjs
 *
 * Proves the splash page works on a production build, start to finish: the
 * page loads with its countdown, every other page is held back, an address
 * can join the list, and the link in its email confirms it. CI runs this on
 * every change, so nothing that breaks the splash can be promoted.
 *
 * Run `npm run build` first. It starts its own server on a throwaway local
 * database; it needs no accounts and touches no real data.
 */

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = process.env.SMOKE_PORT ?? "3990";
const BASE = `http://localhost:${PORT}`;
const SECRET = "smoke-preview-secret";
const env = {
  ...process.env, PORT, NODE_ENV: "production", ALLOW_LOCAL_DB: "1", LOCAL_DB_DIR: join(mkdtempSync(join(tmpdir(), "ah-smoke-")), "pg"),
  LAUNCH_AT: new Date(Date.now() + 40 * 86_400_000).toISOString(), PREVIEW_SECRET: SECRET, NEXT_PUBLIC_APP_URL: BASE,
  DATABASE_URL: "", RESEND_API_KEY: "", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "",
};

let log = "";
// A server left over from an earlier run would answer in place of ours, with a log we can't read.
try { await fetch(`${BASE}/api/time`); console.error(`Something is already listening on port ${PORT}. Stop it, or set SMOKE_PORT.`); process.exit(1); } catch { /* free, as it should be */ }

// Started with node directly, not through npx, so stopping it stops the server itself.
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", PORT], { env, stdio: ["ignore", "pipe", "pipe"] });
server.stdout.on("data", (d) => { log += d; });
server.stderr.on("data", (d) => { log += d; });

const failures = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `: ${detail}`}`);
  if (!ok) failures.push(name);
}
const post = (path, body) => fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntilUp() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/api/time`); if (r.ok) return true; } catch { /* not yet */ }
    await sleep(500);
  }
  return false;
}

try {
  check("the server starts", await waitUntilUp(), log.slice(-600));

  const home = await fetch(BASE + "/");
  // React leaves empty comments between pieces of text; they are not part of what a reader sees.
  const html = (await home.text()).replaceAll("<!-- -->", "");
  check("the splash page loads", home.status === 200, String(home.status));
  check("it has the countdown", html.includes('role="timer"') && html.includes("Seconds"));
  check("it has the sign-up form", html.includes("Be part of the first launch") && html.includes('type="email"'));
  check("it says when it opens", /Opening \w+day, \w+ \d+, \d{4}/.test(html));
  check("it does not show the board", !html.includes("Top launches"));

  for (const path of ["/authors", "/studio", "/pricing", "/sign-in"]) {
    const r = await fetch(BASE + path, { redirect: "manual" });
    check(`${path} is held back before opening`, r.status >= 300 && r.status < 400 && new URL(r.headers.get("location") ?? "/x", BASE).pathname === "/", `${r.status} ${r.headers.get("location")}`);
  }
  const api = await post("/api/cheers", { launchId: "00000000-0000-0000-0000-000000000000" });
  check("the app's routes are closed before opening", api.status === 404, String(api.status));
  const privacy = await fetch(BASE + "/privacy");
  check("the privacy page is readable", privacy.status === 200, String(privacy.status));
  const card = await fetch(BASE + "/opengraph-image", { redirect: "manual" });
  check("the share image is served", card.status === 200 && (card.headers.get("content-type") ?? "").startsWith("image/"), `${card.status} ${card.headers.get("content-type")}`);

  const email = `smoke-${Date.now()}@example.com`;
  const bad = await post("/api/waitlist", { email: "not-an-address", kind: "author" });
  check("a bad address is refused", bad.status === 400, String(bad.status));
  const bot = await post("/api/waitlist", { email: `bot-${email}`, kind: "author", website: "http://spam.example" });
  check("a script filling the hidden field gets a polite nothing", bot.status === 200);
  const join1 = await post("/api/waitlist", { email, kind: "author", src: "smoke" });
  check("an address can join", join1.status === 200, String(join1.status));
  const join2 = await post("/api/waitlist", { email, kind: "author" });
  check("joining twice gets the same answer", join2.status === 200);
  await sleep(400);
  const sent = log.split(`To: ${email}`).length - 1;
  check("exactly one confirming email was written", sent === 1, `${sent} found`);
  check("the bot's address got no email", !log.includes(`To: bot-${email}`));

  const token = log.slice(log.indexOf(`To: ${email}`)).match(/\/confirm\?t=([A-Za-z0-9_-]+)/)?.[1];
  check("the email carries a confirmation link", Boolean(token));
  if (token) {
    const page = await fetch(`${BASE}/confirm?t=${token}`);
    check("the confirmation page opens", page.status === 200 && (await page.text()).includes("Confirm my address"));
    const done = await (await post("/api/waitlist/confirm", { token })).json();
    check("one press confirms the address", done.ok === true && done.kind === "author", JSON.stringify(done));
    const wrong = await (await post("/api/waitlist/confirm", { token: "definitely-not-a-real-token" })).json();
    check("a made-up link confirms nothing", wrong.ok === false);
  }

  const closedOwner = await fetch(BASE + "/owner");
  check("the owner's list is not found without the secret", closedOwner.status === 404, String(closedOwner.status));
  const withCookie = { headers: { cookie: `ah_preview=${SECRET}` } };
  const owner = await fetch(BASE + "/owner", withCookie);
  const ownerHtml = (await owner.text()).replaceAll("<!-- -->", "");
  check("the owner's list opens with the secret and shows the count", owner.status === 200 && ownerHtml.includes("1 joined") && ownerHtml.includes("1 confirmed"), String(owner.status));
  const real = await fetch(BASE + "/", withCookie);
  check("the secret shows the real site", (await real.text()).includes("Top launches"));

  const cron = await (await fetch(BASE + "/api/cron/day")).json().catch(() => ({}));
  check("scheduled jobs hold off before opening (or refuse without the secret)", cron.skipped !== undefined || cron.error !== undefined, JSON.stringify(cron));
} catch (err) {
  check("the test ran without crashing", false, String(err));
} finally {
  server.kill("SIGTERM");
  await sleep(300);
  if (server.exitCode === null) server.kill("SIGKILL");
}

if (failures.length) { console.error(`\n${failures.length} check(s) failed.`); process.exit(1); }
console.log("\nThe splash page works end to end.");
process.exit(0);
