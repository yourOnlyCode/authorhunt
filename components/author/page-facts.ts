/**
 * components/author/page-facts.ts
 *
 * Small facts the author page and the work page both state, kept in one place
 * so the two never word them differently: the AI declaration, an author's
 * place, a launch's line ("No. 2 today", "First of the day"), and whether the
 * Support button may show.
 */

import { and, eq } from "drizzle-orm";
import { isMember } from "@/lib/billing/server";
import { db } from "@/lib/db";
import { collectionItems, collections, follows, type AiUse, type Author, type Launch, type LinkItem } from "@/lib/db/schema";
import { boardFor } from "@/lib/queries/board";
import { formatDay, inQuietHours } from "@/lib/ranking/day";
import { safeUrl, supportUrlAllowed } from "@/lib/seo/links";

const AI_WORDS: Record<AiUse, string> = {
  none: "Without AI, as declared by the author.",
  assisted: "With AI assistance, as declared by the author.",
  generated: "By AI, as declared by the author.",
};
export function aiDeclaration(use: AiUse | null): string | null {
  return use ? AI_WORDS[use] : null;
}

/** "Raleigh, N.C." or "Aberdeen, United Kingdom": the city with its region, or else its country. */
export function placeOf(author: Pick<Author, "city" | "region" | "country">): string | null {
  if (!author.city) return author.country;
  return [author.city, author.region ?? author.country].filter(Boolean).join(", ");
}

/** Links an author typed in, with anything that isn't a web address dropped. */
export function cleanLinks(links: LinkItem[]): LinkItem[] {
  return links.flatMap((l) => {
    const url = safeUrl(l.url);
    return url ? [{ label: l.label.trim() || url, url }] : [];
  });
}

/**
 * The Support link, or null. Support is a member tool, so it shows only while
 * the author has the member tools, and only for a service we recognise. This
 * gates a tool; it decides nothing about the page being public or ranked.
 */
export async function supportLinkFor(author: Author, now: Date): Promise<string | null> {
  if (!author.supportUrl || !supportUrlAllowed(author.supportUrl)) return null;
  return (await isMember(author, now)) ? safeUrl(author.supportUrl) : null;
}

export const LONG_DAY: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

export type LaunchLine = { rank: string | null; when: string; live: boolean; quiet: boolean };

/**
 * How a launch is spoken of. A closed day's rank is the one written when it
 * closed; a live day's is the launch's place on the board as the board itself
 * orders it, and is held back with the counts during the quiet hours.
 */
export async function launchLine(launch: Launch, now: Date): Promise<LaunchLine> {
  const date = formatDay(launch.launchDay, LONG_DAY);
  if (launch.status === "scheduled") return { rank: null, when: `Launching ${date}`, live: false, quiet: false };
  const quiet = inQuietHours(now, launch.launchDay);
  if (launch.status === "closed") {
    const rank = launch.rankDay === 1 ? "First of the day" : launch.rankDay ? `No. ${launch.rankDay} of the day` : null;
    return { rank, when: rank === "First of the day" ? date : `Launched ${date}`, live: false, quiet: false };
  }
  let rank: string | null = null;
  if (launch.status === "live" && !quiet) {
    const board = await boardFor(launch.launchDay, { viewerId: null, now });
    const place = board.findIndex((c) => c.id === launch.id);
    if (place >= 0) rank = `No. ${place + 1} today`;
  }
  return { rank, when: `Launched ${date}`, live: launch.status === "live", quiet };
}

/** What the signed-in reader has already done with a page or a work. */
export async function viewerState(viewerId: string | null, target: { authorId: string; workId?: string }): Promise<{ following: boolean; saved: boolean }> {
  if (!viewerId) return { following: false, saved: false };
  const item = target.workId ? eq(collectionItems.workId, target.workId) : eq(collectionItems.authorId, target.authorId);
  const [[follow], [saved]] = await Promise.all([
    db.select({ userId: follows.userId }).from(follows).where(and(eq(follows.userId, viewerId), eq(follows.authorId, target.authorId))).limit(1),
    db.select({ id: collectionItems.id }).from(collectionItems).innerJoin(collections, eq(collectionItems.collectionId, collections.id))
      .where(and(eq(collections.userId, viewerId), eq(collections.slug, "saved"), item)).limit(1),
  ]);
  return { following: Boolean(follow), saved: Boolean(saved) };
}
