/**
 * lib/cron/day.ts
 *
 * Opening and closing the board. The route runs every hour and each step
 * looks at what state the launches are in, so nothing depends on firing at
 * exactly midnight Eastern and daylight saving needs no second schedule:
 *
 *   1. scheduled launches whose day has come go live;
 *   2. readers who asked to be told about a live launch are told, once;
 *   3. live launches whose day is over are closed, with their final place.
 *
 * Every step changes a row's state first and acts on the rows it changed, so
 * a second run (or two at once) finds nothing left to do. If a run dies
 * between the change and the message, the message is lost rather than sent
 * twice: for mail, that is the better failure.
 *
 * The day is launchDay(now) and nothing else (AGENTS.md rule 6). Places come
 * from score alone (rule 2).
 */

import { and, eq, inArray, isNotNull, isNull, lt, lte } from "drizzle-orm";
import { db } from "../db";
import { authors, follows, launches, notifyRequests, works, type Author, type Launch, type Work } from "../db/schema";
import { notify } from "../actions/notify";
import { awardPoints } from "../actions/points";
import { sendEmail } from "../emails/send";
import { notifyRequestLive } from "../emails/templates";
import { formatDay, launchDay } from "../ranking/day";
import { count, inEmailQuietHours, placeWord, rankClosedDay, topThreeLine } from "./pure";

type Joined = { launch: Launch; author: Author; work: Work | null };

/** What a launch is called and where it lives. Shared with the mailer, which looks launches up again by id. */
export function launchFacts(row: Joined): { title: string; href: string; authorName: string } {
  return {
    title: row.work ? row.work.title : row.author.name,
    href: row.work ? `/work/${row.work.slug}` : `/author/${row.author.handle}`,
    authorName: row.author.name,
  };
}

export const joined = () => db.select({ launch: launches, author: authors, work: works }).from(launches)
  .innerJoin(authors, eq(launches.authorId, authors.id))
  .leftJoin(works, eq(launches.workId, works.id));

/**
 * Step 1. A launch on a suspended or banned page stays scheduled: the board
 * wouldn't show it, and its day shouldn't be spent while a case is open.
 * One that comes due late (the page was restored, or the job was down past
 * midnight) takes today's date, so it gets a whole day like any other.
 */
async function goLive(now: Date): Promise<{ live: number; followersTold: number }> {
  const today = launchDay(now);
  const due = await joined().where(and(eq(launches.status, "scheduled"), lte(launches.launchDay, today), eq(authors.standing, "good")));
  let live = 0;
  let followersTold = 0;
  for (const row of due) {
    const [changed] = await db.update(launches).set({ status: "live", launchDay: today })
      .where(and(eq(launches.id, row.launch.id), eq(launches.status, "scheduled"))).returning({ id: launches.id });
    if (!changed) continue;
    live += 1;
    const { title, href, authorName } = launchFacts(row);

    await awardPoints(row.author.id, row.launch.kind === "work" ? "launch_work" : "launch_page", { now, subject: row.launch.id });
    await notify({
      userId: row.author.userId, kind: "launch", title: `Your launch is live: ${title}`,
      body: `It is on the board for ${formatDay(today)}, until midnight Eastern.`, href, groupKey: `launch-live:${row.launch.id}`,
    });

    // A follower who also asked to be told hears once, from step 2.
    const asked = new Set((await db.select({ userId: notifyRequests.userId }).from(notifyRequests)
      .where(and(eq(notifyRequests.launchId, row.launch.id), isNotNull(notifyRequests.userId)))).map((r) => r.userId));
    const followers = await db.select({ userId: follows.userId }).from(follows).where(eq(follows.authorId, row.author.id));
    for (const f of followers) {
      if (f.userId === row.author.userId || asked.has(f.userId)) continue;
      await notify({
        userId: f.userId, kind: "followed_launch", title: `${authorName} launched ${row.work ? title : "their page"}`,
        body: "It is on today's board.", href, groupKey: `followed-launch:${row.launch.id}`,
      });
      followersTold += 1;
    }
  }
  return { live, followersTold };
}

/**
 * Step 2. "Tell me when it launches." An account is told through its
 * notifications, so its own settings and the mailer's quiet hours apply. A
 * bare address gets one email, held until the morning (the launch went live
 * at midnight). Either way the request row is deleted first and the telling
 * done for the rows that were deleted: once, and the address is not kept.
 */
async function tellRequesters(now: Date): Promise<{ accountsTold: number; addressesMailed: number; dropped: number }> {
  let accountsTold = 0;
  let addressesMailed = 0;

  // Requests for a launch that closed or was pulled before anyone was told have nothing to say.
  const over = db.select({ id: launches.id }).from(launches).where(inArray(launches.status, ["closed", "pulled"]));
  const dropped = (await db.delete(notifyRequests).where(inArray(notifyRequests.launchId, over)).returning({ id: notifyRequests.id })).length;

  const liveRows = await joined().where(eq(launches.status, "live"));
  const quiet = inEmailQuietHours(now);
  for (const row of liveRows) {
    const { title, href, authorName } = launchFacts(row);
    const accounts = await db.delete(notifyRequests)
      .where(and(eq(notifyRequests.launchId, row.launch.id), isNotNull(notifyRequests.userId))).returning({ userId: notifyRequests.userId });
    for (const userId of new Set(accounts.map((a) => a.userId))) {
      if (!userId || userId === row.author.userId) continue;
      await notify({ userId, kind: "notify_live", title: `${title} is live today`, body: `You asked to be told when ${title} by ${authorName} launched.`, href, groupKey: `notify-live:${row.launch.id}` });
      accountsTold += 1;
    }
    if (quiet) continue;
    const bare = await db.delete(notifyRequests)
      .where(and(eq(notifyRequests.launchId, row.launch.id), isNull(notifyRequests.userId))).returning({ email: notifyRequests.email });
    for (const email of new Set(bare.map((b) => b.email?.trim().toLowerCase()))) {
      if (!email) continue;
      await sendEmail({ to: email, ...notifyRequestLive({ title, authorName, href, account: false }) });
      addressesMailed += 1;
    }
  }
  return { accountsTold, addressesMailed, dropped };
}

/**
 * Step 3. Every live launch from a day that is over is closed in one
 * transaction, so a day is never half ranked. A launch whose page is no
 * longer in good standing closes without a place, as the board leaves it out.
 */
async function closeDays(now: Date): Promise<{ closed: number; days: string[] }> {
  const today = launchDay(now);
  const closed = await db.transaction(async (tx) => {
    const open = await tx.select({ launch: launches, author: authors, work: works }).from(launches)
      .innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id))
      .where(and(eq(launches.status, "live"), lt(launches.launchDay, today)));
    const byDay = new Map<string, Joined[]>();
    for (const row of open) byDay.set(row.launch.launchDay, [...(byDay.get(row.launch.launchDay) ?? []), row]);

    const done: { row: Joined; rank: number | null; of: number }[] = [];
    for (const rows of byDay.values()) {
      const ranked = rows.filter((r) => r.author.standing === "good");
      const places = rankClosedDay(ranked.map((r) => ({ id: r.launch.id, score: r.launch.score, createdAt: r.launch.createdAt })));
      for (const row of rows) {
        const rank = places.get(row.launch.id) ?? null;
        const [changed] = await tx.update(launches).set({ status: "closed", rankDay: rank })
          .where(and(eq(launches.id, row.launch.id), eq(launches.status, "live"))).returning({ id: launches.id });
        if (changed) done.push({ row, rank, of: ranked.length });
      }
    }
    return done;
  });

  for (const { row, rank, of } of closed) {
    if (rank === null) continue;
    const { title, href } = launchFacts(row);
    const top = topThreeLine(rank);
    await notify({
      userId: row.author.userId, kind: "launch",
      title: `${title} finished ${placeWord(rank)} of ${count(of, "launch", "launches")}`,
      body: `${formatDay(row.launch.launchDay)}, with ${count(row.launch.cheerCount, "cheer")}.${top ? ` ${top}` : ""}`,
      href, groupKey: `launch-closed:${row.launch.id}`,
    });
  }
  return { closed: closed.length, days: [...new Set(closed.map((c) => c.row.launch.launchDay))].sort() };
}

export async function runDay(now: Date) {
  // Close before opening, so a late launch moved to today can't be swept up as yesterday's.
  const closed = await closeDays(now);
  const opened = await goLive(now);
  const told = await tellRequesters(now);
  return { day: launchDay(now), ...closed, ...opened, ...told };
}

/** For the mailer: the launch a notification is about, with what its template needs. */
export async function launchForMail(launchId: string): Promise<{ title: string; href: string; authorName: string; day: string; rank: number | null; cheers: number; of: number } | null> {
  const [row] = await joined().where(eq(launches.id, launchId)).limit(1);
  if (!row) return null;
  const ranked = await db.select({ id: launches.id }).from(launches).where(and(eq(launches.launchDay, row.launch.launchDay), isNotNull(launches.rankDay)));
  return { ...launchFacts(row), day: row.launch.launchDay, rank: row.launch.rankDay, cheers: row.launch.cheerCount, of: ranked.length };
}

