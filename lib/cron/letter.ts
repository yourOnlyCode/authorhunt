/**
 * lib/cron/letter.ts
 *
 * The Sunday letter: the week's top ten launches, what the authors a reader
 * follows launched, and what is coming next week. It goes to addresses that
 * subscribed from the home page and to accounts that have followed or
 * cheered for someone.
 *
 * The route is called hourly on Sundays and this decides whether to send: it
 * must be Sunday in New York, past the quiet hours, and not already sent
 * today.
 *
 * "Already sent" needs a marker, and the schema has no table for one and is
 * frozen. Of the tables that exist, site_events is the nearest fit: it is the
 * site's own log of things that happened on a path on a day, it has a `day`
 * column, and a row with no author is counted in no author's analytics. So
 * the marker is one site_events row a week: kind "view", path
 * "/_letter/<day>", via "cron". (notifications needs a person to belong to;
 * moderation_log is the audit trail of decisions about people and should hold
 * nothing else.) A small table of job runs would be the honest home for it, when the
 * schema next changes.
 *
 * The marker is written before the first email. If the run dies part-way the
 * rest of the list misses that week's letter; nobody gets it twice.
 *
 * Mature work is left out of the letter (docs/product-structure.md §5).
 */

import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { authors, follows, launches, letterSubscribers, siteEvents, works } from "../db/schema";
import { sendEmail, unsubscribeHeaders } from "../emails/send";
import { sundayLetter, type LetterItem } from "../emails/templates";
import { appUrl } from "../env";
import { comingSoon, topBetween, type LaunchCard } from "../queries/board";
import { addDays, launchDay } from "../ranking/day";
import { rowsOf } from "../sql";
import { inEmailQuietHours, isSundayInNewYork } from "./pure";

const markerPath = (day: string) => `/_letter/${day}`;

const item = (c: LaunchCard, extra: Partial<LetterItem> = {}): LetterItem => ({ title: c.title, byline: c.byline, tagline: c.tagline, href: c.href, ...extra });

export async function sendSundayLetter(now: Date, opts: { force?: boolean } = {}) {
  const today = launchDay(now);
  if (!opts.force) {
    if (!isSundayInNewYork(now)) return { sent: 0, skipped: "It isn't Sunday in New York." };
    if (inEmailQuietHours(now)) return { sent: 0, skipped: "It is Sunday, and too early or too late to write." };
  }
  const [already] = await db.select({ id: siteEvents.id }).from(siteEvents).where(and(eq(siteEvents.path, markerPath(today)), eq(siteEvents.day, today))).limit(1);
  if (already) return { sent: 0, skipped: "This Sunday's letter has gone." };
  await db.insert(siteEvents).values({ kind: "view", path: markerPath(today), via: "cron", day: today });

  // The seven days before today. Today's board is still open, so it isn't counted.
  const from = addDays(today, -7);
  const to = addDays(today, -1);
  const [topCards, soonCards] = await Promise.all([topBetween(from, to, { viewerId: null, limit: 20, now }), comingSoon(now, 12)]);
  const top = topCards.filter((c) => !c.mature && c.status !== "scheduled").slice(0, 10).map((c) => item(c, { cheers: c.cheerCount }));
  const soon = soonCards.filter((c) => !c.mature && c.day <= addDays(today, 7)).slice(0, 5).map((c) => item(c, { day: c.day }));

  // Accounts with at least one follow or cheer, minus anyone who turned the letter off in settings
  // (a notification_prefs row of kind "letter" with email false) and anyone not in good standing.
  const accounts = rowsOf<{ id: string; email: string }>(await db.execute(sql`
    select u.id, u.email from users u
    where u.standing = 'good' and u.email <> ''
      and (exists (select 1 from follows f where f.user_id = u.id) or exists (select 1 from cheers c where c.user_id = u.id))
      and not exists (select 1 from notification_prefs p where p.user_id = u.id and p.kind = 'letter' and p.email = false)`));

  // What each account's followed authors launched this week, in one query.
  const followed = new Map<string, LetterItem[]>();
  if (accounts.length) {
    const rows = await db.select({ userId: follows.userId, title: works.title, tagline: works.tagline, slug: works.slug, authorName: authors.name, authorTagline: authors.tagline, handle: authors.handle, cheers: launches.cheerCount })
      .from(follows).innerJoin(launches, eq(launches.authorId, follows.authorId)).innerJoin(authors, eq(authors.id, launches.authorId)).leftJoin(works, eq(works.id, launches.workId))
      .where(and(gte(launches.launchDay, from), lte(launches.launchDay, to), inArray(launches.status, ["live", "closed"]), eq(authors.standing, "good"), ne(authors.mature, true), sql`coalesce(${works.mature}, false) = false`))
      .orderBy(launches.launchDay);
    for (const r of rows) {
      const it: LetterItem = r.slug
        ? { title: r.title ?? "", byline: `by ${r.authorName}`, tagline: r.tagline ?? "", href: `/work/${r.slug}`, cheers: r.cheers }
        : { title: r.authorName, byline: "their page", tagline: r.authorTagline, href: `/author/${r.handle}`, cheers: r.cheers };
      followed.set(r.userId, [...(followed.get(r.userId) ?? []), it].slice(0, 8));
    }
  }

  // An address that unsubscribed stays unsubscribed, even if it later made an account.
  const subs = await db.select().from(letterSubscribers);
  const unsubscribed = new Set(subs.filter((s) => s.unsubscribedAt).map((s) => s.email.toLowerCase()));
  const seen = new Set<string>();
  let toAccounts = 0;
  let toAddresses = 0;

  for (const a of accounts) {
    const email = a.email.toLowerCase();
    if (unsubscribed.has(email) || seen.has(email)) continue;
    seen.add(email);
    const mine = followed.get(a.id) ?? [];
    if (!top.length && !mine.length && !soon.length) continue;
    await sendEmail({ to: a.email, ...sundayLetter({ weekOf: today, top, followed: mine, soon, unsubscribeUrl: null }) });
    toAccounts += 1;
  }
  if (top.length || soon.length) {
    for (const s of subs) {
      const email = s.email.toLowerCase();
      if (s.unsubscribedAt || seen.has(email)) continue;
      seen.add(email);
      await sendEmail({ to: s.email, ...sundayLetter({ weekOf: today, top, followed: [], soon, unsubscribeUrl: `${appUrl}/letter/unsubscribe?t=${encodeURIComponent(s.token)}` }), headers: unsubscribeHeaders(`${appUrl}/api/letter/unsubscribe?t=${encodeURIComponent(s.token)}`) });
      toAddresses += 1;
    }
  }
  return { sent: toAccounts + toAddresses, toAccounts, toAddresses, top: top.length, soon: soon.length, day: today };
}

