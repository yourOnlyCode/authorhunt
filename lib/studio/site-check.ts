/**
 * lib/studio/site-check.ts
 *
 * Reading an author's own website to look for a link back to their page
 * (docs/development.md, Verifying a site). The address comes from the author,
 * so this is a request a stranger can aim: it must never reach our own
 * network. Each hop is http or https on the usual ports, its name is looked
 * up once and every address refused if it is private, loopback or
 * link-local, and the request is then made to that checked address (not
 * looked up again, which would let a name change its answer between the
 * check and the fetch). Redirects are followed by hand, three at most, each
 * checked the same way. Eight seconds and one megabyte in all.
 */

import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
  ["::", 127], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8], ["2001:db8::", 32], ["64:ff9b::", 96], ["2002::", 16], ["2001::", 32],
] as const) blocked.addSubnet(net, bits, "ipv6");

/** Whether an address is one we must not call: private, loopback, link-local, or otherwise not the public internet. */
export function addressRefused(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) {
    // An IPv4 address written as IPv6 (::ffff:10.0.0.1) is judged as the IPv4 address it is.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return blocked.check(mapped[1]!, "ipv4");
    if (/^::ffff:/i.test(address)) return true;
    return blocked.check(address, "ipv6");
  }
  return true;
}

// Only for trying the check against a server on this machine in development: it lets loopback and a port through,
// and nothing else that is refused. Never in production.
const allowLocal = process.env.NODE_ENV !== "production" && process.env.VERIFY_SITE_ALLOW_LOCAL === "1";
const loopback = (address: string) => address === "::1" || /^127\./.test(address);
const refusedHere = (address: string) => addressRefused(address) && !(allowLocal && loopback(address));

export class SiteCheckError extends Error {}

type Target = { url: URL; address: string; family: 4 | 6 };

async function checked(raw: string): Promise<Target> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new SiteCheckError("That address couldn't be read."); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SiteCheckError("Only http and https addresses can be checked.");
  if (url.username || url.password) throw new SiteCheckError("An address with a password in it can't be checked.");
  if (url.port && !allowLocal) throw new SiteCheckError("Only sites on the usual web ports can be checked.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const refuse = () => new SiteCheckError("That address isn't on the public internet, so it can't be checked.");
  if (!allowLocal && (host === "localhost" || /\.(localhost|local|internal|lan|home|corp)$/.test(host) || !host.includes("."))) {
    if (isIP(host) === 0) throw refuse();
  }
  let found: { address: string; family: number }[];
  if (isIP(host)) found = [{ address: host, family: isIP(host) }];
  else {
    try { found = await lookup(host, { all: true }); } catch { throw new SiteCheckError("That site's name couldn't be found."); }
  }
  const first = found[0];
  if (!first) throw new SiteCheckError("That site's name couldn't be found.");
  // Every answer has to be public: a name with one private address among several is refused whole.
  if (found.some((a) => refusedHere(a.address))) throw refuse();
  return { url, address: first.address, family: first.family === 6 ? 6 : 4 };
}

type Reply = { status: number; location: string | null; body: string };

function request(target: Target, deadline: number, budget: { left: number }): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const ms = deadline - Date.now();
    if (ms <= 0) return reject(new SiteCheckError("That site took too long to answer."));
    const lib = target.url.protocol === "https:" ? https : http;
    const req = lib.request(target.url, {
      method: "GET",
      agent: false,
      headers: { "user-agent": "AuthorHuntBot/1.0 (site verification)", accept: "text/html,application/xhtml+xml", "accept-encoding": "identity" },
      // The connection goes to the address that was checked, whatever the name answers now.
      lookup: (_host, options, cb) => {
        const all = typeof options === "object" && options !== null && (options as { all?: boolean }).all;
        if (all) (cb as unknown as (e: null, list: { address: string; family: number }[]) => void)(null, [{ address: target.address, family: target.family }]);
        else (cb as unknown as (e: null, address: string, family: number) => void)(null, target.address, target.family);
      },
    }, (res) => {
      const status = res.statusCode ?? 0;
      const location = typeof res.headers.location === "string" ? res.headers.location : null;
      if (status >= 300 && status < 400) { res.destroy(); return resolve({ status, location, body: "" }); }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        budget.left -= chunk.length;
        if (budget.left < 0) { req.destroy(); reject(new SiteCheckError("That page is over a megabyte, which is more than we read.")); return; }
        chunks.push(chunk);
      });
      res.on("end", () => resolve({ status, location, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", () => reject(new SiteCheckError("That site couldn't be read.")));
    });
    const timer = setTimeout(() => { req.destroy(); reject(new SiteCheckError("That site took too long to answer.")); }, ms);
    req.on("close", () => clearTimeout(timer));
    req.on("error", () => reject(new SiteCheckError("That site couldn't be reached.")));
    req.end();
  });
}

/** The page at an address, read with the limits above. */
export async function fetchPublicPage(raw: string, opts: { timeoutMs?: number; maxBytes?: number; maxRedirects?: number } = {}): Promise<string> {
  const deadline = Date.now() + (opts.timeoutMs ?? 8000);
  const budget = { left: opts.maxBytes ?? 1_000_000 };
  let next = raw;
  for (let hop = 0; hop <= (opts.maxRedirects ?? 3); hop++) {
    const target = await checked(next);
    const reply = await request(target, deadline, budget);
    if (reply.status >= 300 && reply.status < 400) {
      if (!reply.location) throw new SiteCheckError("That site sent us on without saying where.");
      try { next = new URL(reply.location, target.url).toString(); } catch { throw new SiteCheckError("That site sent us to an address that couldn't be read."); }
      continue;
    }
    if (reply.status < 200 || reply.status >= 300) throw new SiteCheckError(`That site answered with an error (${reply.status}).`);
    return reply.body;
  }
  throw new SiteCheckError("That site sent us on too many times.");
}

const bare = (u: URL) => `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "").toLowerCase()}`;

/** Whether a page's HTML has a link to the author's page: /author/<handle> or the short link /<handle>. */
export function linksBack(html: string, appUrl: string, handle: string): boolean {
  let app: URL;
  try { app = new URL(appUrl); } catch { return false; }
  const host = app.hostname.replace(/^www\./, "").toLowerCase();
  const wanted = new Set([`${host}/author/${handle}`, `${host}/${handle}`]);
  for (const m of html.matchAll(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const href = (m[1] ?? m[2] ?? m[3] ?? "").replace(/&amp;/g, "&").trim();
    if (!/^https?:\/\//i.test(href)) continue;
    try { if (wanted.has(bare(new URL(href)))) return true; } catch { /* not an address */ }
  }
  return false;
}
