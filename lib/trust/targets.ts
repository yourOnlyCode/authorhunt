/**
 * lib/trust/targets.ts
 *
 * A report names its target as a kind and an id. This turns that pair into
 * what the owner needs to judge it: a title, where it is on the site, whose it
 * is, a few words of it, and whether anyone can see it right now.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { authors, collections, comments, images, launches, users, works, type AiUse, type Author, type LaunchStatus, type ReportTarget, type Standing } from "../db/schema";
import { launchDay } from "../ranking/day";
import { isUuid } from "./policy";

export type ResolvedTarget = {
  kind: ReportTarget;
  id: string;
  title: string;
  /** Null when the thing has no page of its own to open. */
  href: string | null;
  excerpt: string;
  /** In a word: live, pulled, removed, suspended. */
  state: string;
  hidden: boolean;
  liveToday: boolean;
  ownerUserId: string;
  ownerName: string;
  ownerStanding: Standing;
  author: Pick<Author, "id" | "handle" | "name" | "standing" | "aiUse" | "mature"> | null;
  /** The work the target is, or is a launch of: where a Mature mark, a content note or a declaration is fixed. */
  work: { id: string; slug: string; title: string; aiUse: AiUse | null; mature: boolean; contentNotes: string[]; contentNoteText: string } | null;
  /** The launch the target is, or sits on. */
  launchId: string | null;
  launchStatus: LaunchStatus | null;
};

const clip = (s: string, n = 280) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

async function ownerOf(userId: string) {
  const [u] = await db.select({ id: users.id, name: users.displayName, standing: users.standing }).from(users).where(eq(users.id, userId)).limit(1);
  const [a] = await db.select().from(authors).where(eq(authors.userId, userId)).limit(1);
  return { user: u ?? null, author: a ?? null };
}
const pickAuthor = (a: Author) => ({ id: a.id, handle: a.handle, name: a.name, standing: a.standing, aiUse: a.aiUse, mature: a.mature });
const pickWork = (w: typeof works.$inferSelect) => ({ id: w.id, slug: w.slug, title: w.title, aiUse: w.aiUse, mature: w.mature, contentNotes: w.contentNotes, contentNoteText: w.contentNoteText });

export async function resolveTarget(kind: ReportTarget, id: string, now: Date): Promise<ResolvedTarget | null> {
  if (!isUuid(id)) return null;
  const today = launchDay(now);

  if (kind === "author") {
    const [a] = await db.select().from(authors).where(eq(authors.id, id)).limit(1);
    if (!a) return null;
    const { user } = await ownerOf(a.userId);
    const [live] = await db.select({ id: launches.id }).from(launches).where(and(eq(launches.authorId, a.id), eq(launches.launchDay, today), eq(launches.status, "live"))).limit(1);
    return {
      kind, id, title: a.name, href: `/author/${a.handle}`, excerpt: clip(a.bio || a.tagline), state: a.standing === "good" ? (a.publishedAt ? "public" : "not public yet") : a.standing,
      hidden: a.standing !== "good" || !a.publishedAt, liveToday: Boolean(live), ownerUserId: a.userId, ownerName: user?.name ?? a.name, ownerStanding: user?.standing ?? "good",
      author: pickAuthor(a), work: null, launchId: null, launchStatus: null,
    };
  }

  if (kind === "work" || kind === "launch") {
    const [row] = kind === "work"
      ? await db.select({ work: works, author: authors, launch: launches }).from(works).innerJoin(authors, eq(works.authorId, authors.id)).leftJoin(launches, eq(launches.workId, works.id)).where(eq(works.id, id)).limit(1)
      : await db.select({ work: works, author: authors, launch: launches }).from(launches).innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id)).where(eq(launches.id, id)).limit(1);
    if (!row) return null;
    const { work, author: a, launch } = row;
    const { user } = await ownerOf(a.userId);
    const liveToday = Boolean(launch && launch.status === "live" && launch.launchDay === today);
    const pulled = launch?.status === "pulled";
    return {
      kind, id, title: work ? work.title : a.name, href: work ? `/work/${work.slug}` : `/author/${a.handle}`,
      excerpt: clip(work ? work.description || work.tagline : a.bio || a.tagline),
      state: a.standing !== "good" ? a.standing : launch ? `${launch.status}, ${launch.launchDay}` : "no launch",
      hidden: a.standing !== "good" || (kind === "launch" && pulled), liveToday, ownerUserId: a.userId, ownerName: user?.name ?? a.name, ownerStanding: user?.standing ?? "good",
      author: pickAuthor(a), work: work ? pickWork(work) : null, launchId: launch?.id ?? null, launchStatus: launch?.status ?? null,
    };
  }

  if (kind === "comment") {
    const [row] = await db.select({ comment: comments, launch: launches, launchAuthor: authors, work: works }).from(comments)
      .innerJoin(launches, eq(comments.launchId, launches.id)).innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id))
      .where(eq(comments.id, id)).limit(1);
    if (!row) return null;
    const { user, author } = await ownerOf(row.comment.userId);
    const on = row.work ? row.work.title : row.launchAuthor.name;
    const page = row.work ? `/work/${row.work.slug}` : `/author/${row.launchAuthor.handle}`;
    return {
      kind, id, title: `${user?.name ?? "Someone"}'s comment on ${on}`, href: `${page}#comment-${id}`, excerpt: clip(row.comment.body, 600),
      state: row.comment.removedAt ? "removed" : row.comment.hiddenAt ? "hidden by the author" : "showing",
      hidden: Boolean(row.comment.removedAt), liveToday: row.launch.status === "live" && row.launch.launchDay === today,
      ownerUserId: row.comment.userId, ownerName: user?.name ?? "Someone", ownerStanding: user?.standing ?? "good",
      author: author ? pickAuthor(author) : null, work: null, launchId: row.launch.id, launchStatus: row.launch.status,
    };
  }

  if (kind === "collection") {
    const [c] = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
    if (!c) return null;
    const { user, author } = await ownerOf(c.userId);
    return {
      kind, id, title: `${c.name}, a collection by ${user?.name ?? "someone"}`, href: c.isPublic ? `/collection/${c.id}` : null, excerpt: "",
      state: c.isPublic ? "public" : "private", hidden: !c.isPublic, liveToday: false,
      ownerUserId: c.userId, ownerName: user?.name ?? "Someone", ownerStanding: user?.standing ?? "good", author: author ? pickAuthor(author) : null, work: null, launchId: null, launchStatus: null,
    };
  }

  const [img] = await db.select().from(images).where(eq(images.id, id)).limit(1);
  if (!img) return null;
  const { user, author } = await ownerOf(img.ownerUserId);
  return {
    kind, id, title: `A ${img.kind === "gallery" ? "gallery picture" : img.kind} uploaded by ${user?.name ?? "someone"}`, href: img.url, excerpt: "",
    state: img.removedAt ? "removed" : "showing", hidden: Boolean(img.removedAt), liveToday: false,
    ownerUserId: img.ownerUserId, ownerName: user?.name ?? "Someone", ownerStanding: user?.standing ?? "good", author: author ? pickAuthor(author) : null, work: null, launchId: null, launchStatus: null,
  };
}
