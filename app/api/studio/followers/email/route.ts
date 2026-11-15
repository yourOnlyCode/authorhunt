/**
 * POST /api/studio/followers/email
 *
 * "Write to your followers": a member tool (docs/monetization.md). The order
 * is the session, then the membership, then the limit (AGENTS.md, Routes).
 * One send a day for each author. A follower who has turned off email for
 * updates from authors they follow is left out, and every message says how
 * to stop them.
 */

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody } from "@/lib/api";
import { isMember } from "@/lib/billing/server";
import { db } from "@/lib/db";
import { follows, notificationPrefs, users } from "@/lib/db/schema";
import { layout, sendEmail } from "@/lib/emails/send";
import { appUrl } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { notPublicReason, studioAuthor } from "@/lib/studio/server";

const Body = z.object({
  subject: z.string().trim().min(3, "Give it a subject.").max(120).refine((s) => !/[\r\n]/.test(s), "A subject is one line."),
  body: z.string().trim().min(20, "Write a little more: a few sentences at least.").max(5000),
});

export async function POST(req: Request) {
  const who = await studioAuthor(req, { name: "studio-email-try", max: 10, windowSec: 600 });
  if ("response" in who) return who.response;
  const { author } = who;
  if (!(await isMember(author))) return fail(403, "Writing to your followers is a member tool.");
  const blocked = notPublicReason(author);
  if (blocked) return fail(409, blocked);
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;

  const rows = await db.select({ email: users.email, bell: notificationPrefs.email }).from(follows)
    .innerJoin(users, eq(users.id, follows.userId))
    .leftJoin(notificationPrefs, and(eq(notificationPrefs.userId, follows.userId), eq(notificationPrefs.kind, "followed_update")))
    .where(and(eq(follows.authorId, author.id), ne(users.standing, "banned"), ne(users.id, author.userId)));
  // `bell` here is the email column of the preference row: null when no preference was ever set, which means yes.
  const to = [...new Set(rows.filter((r) => r.bell !== false && /^[^@\s]+@[^@\s]+$/.test(r.email)).map((r) => r.email))];
  if (to.length === 0) return fail(409, "Nobody who follows you takes email yet, so nothing was sent.");

  // Counted only once there is something to send, so a mistake above doesn't use up the day's one.
  const limit = await rateLimit("studio-email", author.id, { max: 1, windowSec: 86_400 });
  if (!limit.ok) return fail(429, "You've written to your followers in the last day. One a day; try again tomorrow.");

  const mail = layout({
    heading: body.data.subject,
    paragraphs: [`From ${author.name}:`, ...body.data.body.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean)],
    action: { label: `${author.name} on Author Hunt`, url: `${appUrl}/author/${author.handle}` },
    footer: `You're getting this because you follow ${author.name} on Author Hunt. To stop these, unfollow, or turn off email for "An author you follow posts an update" at ${appUrl}/settings`,
  });
  let sent = 0;
  for (let i = 0; i < to.length; i += 10) {
    const results = await Promise.all(to.slice(i, i + 10).map((email) => sendEmail({ to: email, subject: `${author.name}: ${body.data.subject}`, ...mail }).catch(() => ({ ok: false }))));
    sent += results.filter((r) => r.ok).length;
  }
  return json({ sent, of: to.length });
}
