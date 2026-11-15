"use client";

import { useState } from "react";

type Props = { authorId: string; following: boolean; signedIn: boolean; variant?: "solid" | "word"; isSelf?: boolean };

/** Follow, or stop following, an author. Signed out, it asks for an account at the action. */
export function FollowButton({ authorId, following, signedIn, variant = "solid", isSelf }: Props) {
  const [on, setOn] = useState(following);
  const [busy, setBusy] = useState(false);
  if (isSelf) return null;
  async function press() {
    if (!signedIn) { window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`; return; }
    setBusy(true); setOn(!on);
    try {
      const res = await fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ authorId }) });
      const data = await res.json();
      setOn(res.ok ? data.following : on);
    } catch { setOn(on); }
    setBusy(false);
  }
  return <button type="button" className={variant === "solid" ? `btn ${on ? "" : "solid"}` : "word"} aria-pressed={on} onClick={press} disabled={busy}>{on ? "Following" : "Follow"}</button>;
}
