/**
 * components/comments/thread.tsx
 *
 * A launch's comments (docs/product-structure.md, section 2): the box to
 * write in, then the thread, best first with a switch to newest. Rendered on
 * the server so the conversation is on the page for readers and for search.
 */

import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { colorFor } from "@/lib/queries/board";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import { loadThread, type ThreadSort } from "./data";

type Props = {
  launchId: string;
  /** Scheduled launches take no comments yet. */
  open: boolean;
  count: number;
  launchAuthorUserId: string;
  viewer: Viewer | null;
  sort: ThreadSort;
  /** The page the thread is on, for the sort links. */
  path: string;
  now: Date;
};

export async function CommentThread({ launchId, open, count, launchAuthorUserId, viewer, sort, path, now }: Props) {
  const { comments, mentions } = open ? await loadThread(launchId, { viewerId: viewer?.id ?? null, launchAuthorUserId, sort, now }) : { comments: [], mentions: [] };
  const signedIn = Boolean(viewer);
  return (
    <section className="thread" id="comments">
      <header>
        <h2>{count === 1 ? "1 comment" : `${count} comments`}</h2>
        {open && (
          <nav className="sorts sc" aria-label="Order of comments">
            <Link href={`${path}#comments`} aria-current={sort === "best" ? "true" : undefined}>Best first</Link>
            <Link href={`${path}?sort=new#comments`} aria-current={sort === "new" ? "true" : undefined}>Newest</Link>
          </nav>
        )}
      </header>
      {!open ? <p className="thread-empty">Comments open when this launches.</p> : (
        <>
          <CommentForm launchId={launchId} signedIn={signedIn} me={viewer ? { name: viewer.displayName, pictureUrl: viewer.imageUrl, color: colorFor(viewer.id) } : null} />
          {comments.length === 0 && <p className="thread-empty">No comments yet. Ask the author something.</p>}
          {comments.map((c) => <CommentItem key={c.id} comment={c} launchId={launchId} topId={c.id} signedIn={signedIn} viewerIsLaunchAuthor={viewer?.id === launchAuthorUserId} mentions={mentions} />)}
        </>
      )}
    </section>
  );
}
