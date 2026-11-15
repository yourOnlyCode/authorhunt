/**
 * components/comments/data.ts
 *
 * Reads a launch's thread and shapes it for the page: one level deep, the
 * pinned author's note first, then best first (cheers, then recency) or
 * newest. A hidden comment is left out for everyone but the launch's author
 * and its own writer; a removed one stays only while it has replies to hold.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { authors, commentCheers, comments, users } from "@/lib/db/schema";
import { colorFor } from "@/lib/queries/board";
import { mentionedHandles } from "./text";

export type CommentView = {
  id: string;
  name: string;
  /** The writer's own page, when they have a public one. */
  handle: string | null;
  pictureUrl: string | null;
  color: string;
  byLaunchAuthor: boolean;
  mine: boolean;
  body: string;
  removed: boolean;
  hidden: boolean;
  pinned: boolean;
  edited: boolean;
  cheerCount: number;
  cheered: boolean;
  ago: string;
  createdAt: string;
  replies: CommentView[];
};

export type ThreadSort = "best" | "new";

/** "just now", "12m", "9h", "3d", then the date. */
export function ago(at: Date, now: Date): string {
  const mins = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  if (mins < 60 * 24 * 30) return `${Math.floor(mins / (60 * 24))}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(at);
}

export async function loadThread(launchId: string, opts: { viewerId: string | null; launchAuthorUserId: string; sort: ThreadSort; now: Date }): Promise<{ comments: CommentView[]; mentions: string[] }> {
  const rows = await db.select({ comment: comments, user: { displayName: users.displayName, imageUrl: users.imageUrl }, page: { handle: authors.handle, name: authors.name, portraitUrl: authors.portraitUrl, publishedAt: authors.publishedAt, standing: authors.standing } })
    .from(comments).innerJoin(users, eq(comments.userId, users.id)).leftJoin(authors, eq(authors.userId, users.id))
    .where(eq(comments.launchId, launchId)).orderBy(comments.createdAt);
  if (!rows.length) return { comments: [], mentions: [] };

  const seesHidden = (userId: string) => opts.viewerId !== null && (opts.viewerId === opts.launchAuthorUserId || opts.viewerId === userId);
  const shown = rows.filter((r) => !r.comment.hiddenAt || seesHidden(r.comment.userId));
  const ids = shown.map((r) => r.comment.id);
  const cheered = opts.viewerId && ids.length
    ? new Set((await db.select({ id: commentCheers.commentId }).from(commentCheers).where(and(eq(commentCheers.userId, opts.viewerId), inArray(commentCheers.commentId, ids)))).map((c) => c.id))
    : new Set<string>();

  const handles = [...new Set(shown.filter((r) => !r.comment.removedAt).flatMap((r) => mentionedHandles(r.comment.body)))];
  const mentions = handles.length
    ? (await db.select({ handle: authors.handle }).from(authors).where(and(inArray(authors.handle, handles), eq(authors.standing, "good")))).map((a) => a.handle)
    : [];

  const view = (r: (typeof rows)[number]): CommentView => {
    const c = r.comment;
    const page = r.page && r.page.publishedAt && r.page.standing === "good" ? r.page : null;
    const removed = Boolean(c.removedAt);
    return {
      id: c.id, name: page?.name ?? r.user.displayName, handle: page?.handle ?? null,
      pictureUrl: removed ? null : page?.portraitUrl ?? r.user.imageUrl, color: colorFor(page?.handle ?? c.userId),
      byLaunchAuthor: c.userId === opts.launchAuthorUserId, mine: c.userId === opts.viewerId,
      // A removed comment's words are gone from the page, not only greyed out.
      body: removed ? "" : c.body, removed, hidden: Boolean(c.hiddenAt), pinned: c.pinned && !removed, edited: Boolean(c.editedAt),
      cheerCount: c.cheerCount, cheered: cheered.has(c.id), ago: ago(c.createdAt, opts.now), createdAt: c.createdAt.toISOString(), replies: [],
    };
  };

  const tops = new Map<string, CommentView>();
  for (const r of shown) if (!r.comment.parentId) tops.set(r.comment.id, view(r));
  // Replies are read oldest first, as a conversation.
  for (const r of shown) {
    if (!r.comment.parentId || r.comment.removedAt) continue;
    tops.get(r.comment.parentId)?.replies.push(view(r));
  }
  const list = [...tops.values()].filter((c) => !c.removed || c.replies.length > 0);
  const newest = (a: CommentView, b: CommentView) => b.createdAt.localeCompare(a.createdAt);
  list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || (opts.sort === "new" ? 0 : b.cheerCount - a.cheerCount) || newest(a, b));
  return { comments: list, mentions };
}
