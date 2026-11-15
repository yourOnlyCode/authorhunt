"use client";

/**
 * components/comments/comment-form.tsx
 *
 * The box a reader writes a comment in, at the top of a thread. Signed out it
 * is still there: pressing Comment asks for an account at the action, never
 * at the door. What went wrong is said beside the button.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Portrait } from "../ui/picture";

type Props = { launchId: string; signedIn: boolean; me: { name: string; pictureUrl: string | null; color: string } | null };

export async function sendComment(input: { launchId: string; body: string; parentId?: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, id: data.id } : { ok: false, error: data.error ?? "That didn't go through." };
  } catch { return { ok: false, error: "That didn't go through." }; }
}

export function CommentForm({ launchId, signedIn, me }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) { window.location.href = `/sign-in?next=${encodeURIComponent(`${window.location.pathname}#comments`)}`; return; }
    if (!body.trim()) { setError("Write something first."); return; }
    setBusy(true); setError(null);
    const res = await sendComment({ launchId, body });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setBody("");
    router.refresh();
  }

  return (
    <form className="say" onSubmit={submit}>
      <Portrait url={me?.pictureUrl ?? null} color={me?.color ?? "var(--cv-5)"} label={me?.name ?? "You"} />
      <div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="What would you ask the author?" aria-label="Your comment" />
        <div className="foot">
          {error ? <span className="error-text" role="alert">{error}</span> : <span>Be kind. Say something you&apos;d say to their face.</span>}
          <button className="btn solid" type="submit" disabled={busy}>Comment</button>
        </div>
      </div>
    </form>
  );
}
