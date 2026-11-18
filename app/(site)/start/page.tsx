/**
 * /start: set up your first launch.
 *
 * A guided path through what the Studio already does, for an author arriving
 * before the site opens (docs/launch.md, "The cold start"): who you are, the
 * first thing you're launching and the day for it, a few more details, then
 * a look at it. It saves through the Studio's own routes, so everything it
 * makes is an ordinary page, work and launch, editable in the Studio after.
 *
 * It asks for an account at the door, which no public page does (AGENTS.md
 * rule 1): this is the author's side, like the Studio. Readers stay on the
 * waiting list and never see it.
 */

import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { getViewerAuthor, requireViewer } from "@/lib/auth";
import { TRIAL_DAYS, trialEnd } from "@/lib/billing/access";
import { db } from "@/lib/db";
import { genres, launches, referenceAuthors, works } from "@/lib/db/schema";
import { appUrl, beforeLaunch, launchAt } from "@/lib/env";
import { launchDays } from "@/lib/studio/day-counts";
import { EARLY_DAY_ROOM, firstDayWithRoom } from "@/lib/studio/days";
import { StartFlow, type StartData } from "@/components/start/flow";

export const metadata: Metadata = { title: "Set up your first launch", robots: { index: false, follow: false } };

const longDay = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(d);

export default async function Start() {
  const viewer = await requireViewer("/start");
  const author = await getViewerAuthor();
  const now = new Date();
  const [genreRows, referenceRows, days, firstWork] = await Promise.all([
    db.select().from(genres).orderBy(genres.name),
    db.select().from(referenceAuthors).orderBy(referenceAuthors.name),
    launchDays(now),
    author ? db.select().from(works).where(eq(works.authorId, author.id)).orderBy(works.createdAt).limit(1) : Promise.resolve([]),
  ]);
  const work = firstWork[0] ?? null;
  const [launch] = work && author ? await db.select().from(launches).where(and(eq(launches.workId, work.id), eq(launches.authorId, author.id))).limit(1) : [];
  const nameOf = new Map(referenceRows.map((r) => [r.slug, r.name]));

  const data: StartData = {
    page: author ? {
      name: author.name, handle: author.handle, kind: author.kind, tagline: author.tagline, bio: author.bio, portraitUrl: author.portraitUrl,
      city: author.city ?? "", region: author.region ?? "", country: author.country ?? "", website: author.website ?? "", links: author.links,
      genres: author.genres, readersOf: author.readersOf.map((s) => nameOf.get(s) ?? s), inspiredBy: author.inspiredBy.map((s) => nameOf.get(s) ?? s),
      mature: author.mature, aiUse: author.aiUse, supportUrl: author.supportUrl ?? "",
    } : null,
    pageExists: Boolean(author),
    published: Boolean(author?.publishedAt),
    viewerName: viewer.displayName,
    work: work ? {
      id: work.id, slug: work.slug, kind: work.kind, form: work.form, title: work.title, tagline: work.tagline, description: work.description, excerpt: work.excerpt,
      coverUrl: work.coverUrl, coverColor: work.coverColor, pages: work.pages, words: work.words, buyLinks: work.buyLinks, genres: work.genres, mature: work.mature,
    } : null,
    launch: launch ? { id: launch.id, day: launch.launchDay, note: launch.note, status: launch.status } : null,
    genres: genreRows.map((g) => ({ slug: g.slug, name: g.name })),
    knownNames: referenceRows.filter((r) => r.approved).map((r) => r.name),
    days,
    // Before opening an author is given the first board with room, and may choose a later one.
    defaultDay: firstDayWithRoom(days),
    room: beforeLaunch(now) ? EARLY_DAY_ROOM : null,
    appHost: new URL(appUrl).host,
    early: beforeLaunch(now),
    // What a page made now would get: its tools free until this day (two months from opening), and the founding mark.
    toolsUntil: longDay(author?.trialEndsAt ?? trialEnd(now, launchAt())),
    trialDays: TRIAL_DAYS,
    founding: author ? author.founding : beforeLaunch(now),
  };

  return (
    <main className="wrap start">
      <StartFlow data={data} />
    </main>
  );
}
