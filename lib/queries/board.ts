/**
 * lib/queries/board.ts
 *
 * A day's launches as the cards a board row draws. One indexed query by
 * (launch_day, score), joined to the page and the work it launches.
 */

import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { authors, cheers, launches, works, type WorkKind } from "../db/schema";
import { inQuietHours, launchDay } from "../ranking/day";
import { quietOrder } from "../ranking/score";
import { rowsOf } from "../sql";
import { lookups, type Named } from "./lookups";

export type LaunchCard = {
  id: string;
  kind: "author" | "work";
  workKind: WorkKind | null;
  day: string;
  status: string;
  href: string;
  title: string;
  tagline: string;
  /** "by Maren Okafor-Lindqvist", or "An author's page". */
  byline: string;
  authorName: string;
  authorHandle: string;
  authorId: string;
  pictureUrl: string | null;
  color: string;
  genre: Named | null;
  city: string | null;
  citySlug: string | null;
  reference: (Named & { kind: "readers_of" | "inspired_by" }) | null;
  mature: boolean;
  cheerCount: number;
  commentCount: number;
  rank: number | null;
  cheered: boolean;
  /** True in the day's first hours, when counts are held back. */
  quiet: boolean;
};

export type BoardFilter = "all" | "author" | WorkKind;

const base = () => db.select({ launch: launches, author: authors, work: works }).from(launches)
  .innerJoin(authors, eq(launches.authorId, authors.id))
  .leftJoin(works, eq(launches.workId, works.id));

type Joined = Awaited<ReturnType<ReturnType<typeof base>["execute"]>>[number];

export async function toCards(rows: Joined[], viewerId: string | null, now: Date): Promise<LaunchCard[]> {
  const look = await lookups();
  const ids = rows.map((r) => r.launch.id);
  const mine = viewerId && ids.length
    ? new Set((await db.select({ id: cheers.launchId }).from(cheers).where(and(eq(cheers.userId, viewerId), inArray(cheers.launchId, ids)))).map((c) => c.id))
    : new Set<string>();
  return rows.map(({ launch, author, work }) => {
    const genreSlug = (work?.genres[0] ?? author.genres[0]) || null;
    const readers = author.readersOf[0];
    const inspired = author.inspiredBy[0];
    const reference = readers
      ? { kind: "readers_of" as const, slug: readers, name: look.references.get(readers) ?? readers }
      : inspired ? { kind: "inspired_by" as const, slug: inspired, name: look.references.get(inspired) ?? inspired } : null;
    return {
      id: launch.id, kind: launch.kind, workKind: work?.kind ?? null, day: launch.launchDay, status: launch.status,
      href: work ? `/work/${work.slug}` : `/author/${author.handle}`,
      title: work ? work.title : author.name,
      tagline: work ? work.tagline : author.tagline,
      byline: work ? `by ${author.name}` : author.kind === "publication" ? "A publication's page" : "An author's page",
      authorName: author.name, authorHandle: author.handle, authorId: author.id,
      pictureUrl: work ? work.coverUrl : author.portraitUrl,
      color: work ? work.coverColor : colorFor(author.handle),
      genre: genreSlug ? { slug: genreSlug, name: look.genres.get(genreSlug) ?? genreSlug } : null,
      city: author.city, citySlug: author.citySlug, reference,
      mature: work ? work.mature : author.mature,
      cheerCount: launch.cheerCount, commentCount: launch.commentCount, rank: launch.rankDay,
      cheered: mine.has(launch.id), quiet: inQuietHours(now, launch.launchDay),
    };
  });
}

const PALETTE = ["#1F3A5C", "#7A2533", "#24503B", "#4A3A78", "#9A6412", "#26262C", "#C24A2A"];
/** A steady colour for a page with no portrait, so it never shows a grey box. */
export function colorFor(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length] as string;
}

function visible(day: string, filter: BoardFilter) {
  const conds = [eq(launches.launchDay, day), ne(launches.status, "pulled"), eq(authors.standing, "good")];
  if (filter === "author") conds.push(eq(launches.kind, "author"));
  else if (filter !== "all") conds.push(eq(works.kind, filter));
  return and(...conds);
}

/** One day's board, best first; shuffled without counts during the quiet hours. */
export async function boardFor(day: string, opts: { viewerId: string | null; filter?: BoardFilter; limit?: number; now: Date }): Promise<LaunchCard[]> {
  const rows = await base().where(visible(day, opts.filter ?? "all")).orderBy(desc(launches.score), launches.createdAt).limit(opts.limit ?? 100);
  const cards = await toCards(rows, opts.viewerId, opts.now);
  return inQuietHours(opts.now, day) ? quietOrder(cards, day) : cards;
}

export async function boardCount(day: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(launches).innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id)).where(visible(day, "all"));
  return row?.n ?? 0;
}

/** The best launches across a span of days: last week's, last month's. */
export async function topBetween(from: string, to: string, opts: { viewerId: string | null; limit: number; now: Date }): Promise<LaunchCard[]> {
  const rows = await base().where(and(gte(launches.launchDay, from), lte(launches.launchDay, to), ne(launches.status, "pulled"), eq(authors.standing, "good")))
    .orderBy(desc(launches.score)).limit(opts.limit);
  return toCards(rows, opts.viewerId, opts.now);
}

/** Launches scheduled after today, soonest first. */
export async function comingSoon(now: Date, limit = 5): Promise<(LaunchCard & { waiting: number })[]> {
  const today = launchDay(now);
  const rows = await base().where(and(sql`${launches.launchDay} > ${today}`, eq(launches.status, "scheduled"), eq(authors.standing, "good"))).orderBy(launches.launchDay).limit(limit);
  const cards = await toCards(rows, null, now);
  if (!cards.length) return [];
  const counts = await db.execute(sql`select launch_id, count(*)::int as n from notify_requests where launch_id in (${sql.join(cards.map((c) => sql`${c.id}`), sql`, `)}) group by launch_id`);
  const list = rowsOf<{ launch_id: string; n: number }>(counts);
  const by = new Map(list.map((r) => [r.launch_id, Number(r.n)]));
  return cards.map((c) => ({ ...c, waiting: by.get(c.id) ?? 0 }));
}

/** Authors with the most Momentum, for the rail. */
export async function risingAuthors(limit = 3) {
  const look = await lookups();
  const rows = await db.select().from(authors).where(and(eq(authors.standing, "good"), sql`${authors.publishedAt} is not null`)).orderBy(desc(authors.momentum)).limit(limit);
  return rows.map((a) => ({ id: a.id, handle: a.handle, name: a.name, portraitUrl: a.portraitUrl, color: colorFor(a.handle), momentum: Math.round(a.momentum), city: a.city, genre: a.genres[0] ? look.genres.get(a.genres[0]) ?? a.genres[0] : null }));
}
