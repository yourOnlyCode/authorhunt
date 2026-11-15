"use client";

/**
 * components/comments/comment-item.tsx
 *
 * One comment and the replies under it. The cheer answers at once and
 * corrects itself; everything else (reply, edit, remove, pin, hide) asks the
 * server and then re-reads the page, so the thread is always what the
 * database holds. Feedback is said in the comment it is about.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReportLink } from "../trust/report-link";
import { UpIcon } from "../ui/icons";
import { Portrait } from "../ui/picture";
import { sendComment } from "./comment-form";
import type { CommentView } from "./data";
import { CommentText } from "./text";

type Props = {
  comment: CommentView;
  launchId: string;
  /** The top-level comment a reply is filed under: this comment, or its parent. */
  topId: string;
  isReply?: boolean;
  signedIn: boolean;
  /** The viewer is the launch's author, who can pin their own note and hide a comment. */
  viewerIsLaunchAuthor: boolean;
  mentions: string[];
};

async function call(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch { return { ok: false, data: {} }; }
}

export function CommentItem({ comment: c, launchId, topId, isReply, signedIn, viewerIsLaunchAuthor, mentions }: Props) {
  const router = useRouter();
  const toSignIn = () => router.push(`/sign-in?next=${encodeURIComponent(`${window.location.pathname}#comments`)}`);
  const [cheer, setCheer] = useState({ count: c.cheerCount, on: c.cheered });
  const [mode, setMode] = useState<"read" | "reply" | "edit" | "remove">("read");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const portrait = <Portrait url={c.pictureUrl} color={c.removed ? "var(--muted)" : c.color} label={c.removed ? "" : c.name} />;
  const replies = c.replies.map((r) => <CommentItem key={r.id} comment={r} launchId={launchId} topId={topId} isReply signedIn={signedIn} viewerIsLaunchAuthor={viewerIsLaunchAuthor} mentions={mentions} />);

  if (c.removed) {
    return (
      <div className={`cm ${isReply ? "reply" : ""}`} id={`comment-${c.id}`}>
        {portrait}
        <div><p className="it gone">This comment was removed.</p>{replies}</div>
      </div>
    );
  }

  async function pressCheer() {
    if (!signedIn) return toSignIn();
    const before = cheer;
    setCheer({ on: !before.on, count: before.count + (before.on ? -1 : 1) }); setError(null);
    const res = await call(`/api/comments/${c.id}/cheer`, "POST");
    if (!res.ok) { setCheer(before); setError((res.data.error as string) ?? "That didn't go through."); return; }
    setCheer({ on: Boolean(res.data.cheered), count: Number(res.data.count) });
  }

  function open(next: "reply" | "edit" | "remove") {
    if (!signedIn) return toSignIn();
    setError(null); setSaid(null);
    // A reply to a reply sits under the same parent, so it starts by naming who it answers.
    setDraft(next === "edit" ? c.body : next === "reply" && isReply && c.handle ? `@${c.handle} ` : "");
    setMode(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) { setError("Write something first."); return; }
    setBusy(true); setError(null);
    const res = mode === "edit"
      ? await call(`/api/comments/${c.id}`, "PATCH", { body: draft }).then((r) => (r.ok ? { ok: true as const } : { ok: false as const, error: (r.data.error as string) ?? "That didn't go through." }))
      : await sendComment({ launchId, body: draft, parentId: c.id });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setMode("read"); setDraft("");
    router.refresh();
  }

  async function act(url: string, method: string) {
    setBusy(true); setError(null);
    const res = await call(url, method);
    setBusy(false);
    if (!res.ok) { setError((res.data.error as string) ?? "That didn't go through."); return; }
    setMode("read");
    router.refresh();
  }

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}#comment-${c.id}`;
    try { await navigator.clipboard.writeText(url); setSaid("Link copied."); }
    catch { setSaid(url); }
  }

  const marks = [c.pinned ? "pinned" : null, c.ago, c.edited ? "edited" : null, c.hidden ? "hidden from the page" : null].filter(Boolean).join(" · ");

  return (
    <div className={`cm ${c.pinned && !isReply ? "pinned" : ""} ${isReply ? "reply" : ""} ${c.hidden ? "is-hidden" : ""}`} id={`comment-${c.id}`}>
      {portrait}
      <div>
        <div className="who">
          <b>{c.handle ? <Link href={`/author/${c.handle}`}>{c.name}</Link> : c.name}</b>
          {c.byLaunchAuthor && <span className="sc">Author</span>}
          <span>{marks}</span>
        </div>

        {mode === "edit" ? (
          <form className="cm-form" onSubmit={submit}>
            <textarea className="textarea" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} aria-label="Your comment" autoFocus />
            <div className="foot"><button className="btn solid" type="submit" disabled={busy}>Save</button><button className="word" type="button" onClick={() => setMode("read")}>Cancel</button></div>
          </form>
        ) : <CommentText body={c.body} mentions={mentions} />}

        <div className="do">
          <button className="up" type="button" aria-pressed={cheer.on} aria-label={`Cheer this comment, ${cheer.count} cheers`} onClick={pressCheer}><UpIcon /><span>{cheer.count}</span></button>
          {!c.hidden && <button type="button" onClick={() => open("reply")}>Reply</button>}
          <button type="button" onClick={share}>Share</button>
          {c.mine && <button type="button" onClick={() => open("edit")}>Edit</button>}
          {c.mine && <button type="button" onClick={() => open("remove")}>Remove</button>}
          {c.mine && viewerIsLaunchAuthor && !isReply && <button type="button" disabled={busy} onClick={() => act(`/api/comments/${c.id}/pin`, "POST")}>{c.pinned ? "Unpin" : "Pin first"}</button>}
          {!c.mine && viewerIsLaunchAuthor && <button type="button" disabled={busy} onClick={() => act(`/api/comments/${c.id}/hide`, c.hidden ? "DELETE" : "POST")}>{c.hidden ? "Show again" : "Hide"}</button>}
          {!c.mine && <span className="cm-report"><ReportLink targetKind="comment" targetId={c.id} signedIn={signedIn} /></span>}
          {said && <span role="status">{said}</span>}
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}

        {mode === "remove" && (
          <div className="cm-form">
            <p>Remove this comment? It can&apos;t be brought back.</p>
            <div className="foot"><button className="btn solid" type="button" disabled={busy} onClick={() => act(`/api/comments/${c.id}`, "DELETE")}>Remove it</button><button className="word" type="button" onClick={() => setMode("read")}>Keep it</button></div>
          </div>
        )}
        {mode === "reply" && (
          <form className="cm-form" onSubmit={submit}>
            <textarea className="textarea" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} aria-label={`Your reply to ${c.name}`} placeholder={`Reply to ${c.name}`} autoFocus />
            <div className="foot"><button className="btn solid" type="submit" disabled={busy}>Reply</button><button className="word" type="button" onClick={() => setMode("read")}>Cancel</button></div>
          </form>
        )}
        {replies}
      </div>
    </div>
  );
}
