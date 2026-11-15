/**
 * POST /api/studio/verify-site
 *
 * The two-way link (docs/development.md, Verifying a site): the author puts
 * a link to their Author Hunt page on their own website, and this reads the
 * site to find it. Free for every author, and nothing to do with membership:
 * a followed link is earned this way, never bought (AGENTS.md rule 4).
 * lib/studio/site-check.ts holds the limits that keep the request from
 * reaching anything but the public internet.
 */

import { eq } from "drizzle-orm";
import { fail, json } from "@/lib/api";
import { db } from "@/lib/db";
import { authors } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { safeUrl } from "@/lib/seo/links";
import { fetchPublicPage, linksBack, SiteCheckError } from "@/lib/studio/site-check";
import { studioAuthor } from "@/lib/studio/server";

export async function POST(req: Request) {
  const who = await studioAuthor(req, { name: "studio-verify", max: 6, windowSec: 600 });
  if ("response" in who) return who.response;
  const { author } = who;
  const website = safeUrl(author.website);
  if (!website) return fail(400, "Add your website to your page and save it, then check again.");

  let html: string;
  try {
    html = await fetchPublicPage(website);
  } catch (e) {
    if (e instanceof SiteCheckError) return fail(422, e.message);
    throw e;
  }
  if (!linksBack(html, appUrl, author.handle)) {
    return fail(422, `We read ${new URL(website).hostname} and didn't find a link to ${appUrl}/author/${author.handle}. Add it to that page as an ordinary link, then check again.`);
  }
  const [saved] = await db.update(authors).set({ siteVerifiedAt: new Date() }).where(eq(authors.id, author.id)).returning();
  return json({ verified: true, siteVerifiedAt: saved?.siteVerifiedAt });
}
