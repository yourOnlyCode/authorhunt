"use client";

import { useState } from "react";

type Props = { authorId?: string; workId?: string; saved: boolean; signedIn: boolean };

/** Save an author or a work to the reader's "Saved" collection, in one press. Other collections are managed on /collections. */
export function SaveButton({ authorId, workId, saved, signedIn }: Props) {
  const [on, setOn] = useState(saved);
  const [busy, setBusy] = useState(false);
  async function press() {
    if (!signedIn) { window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`; return; }
    setBusy(true); setOn(!on);
    try {
      const res = await fetch("/api/collections/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ authorId, workId }) });
      const data = await res.json();
      setOn(res.ok ? data.saved : on);
    } catch { setOn(on); }
    setBusy(false);
  }
  return <button type="button" className="word" aria-pressed={on} onClick={press} disabled={busy}>{on ? "Saved" : "Save"}</button>;
}
