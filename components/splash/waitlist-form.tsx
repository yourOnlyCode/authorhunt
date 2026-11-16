"use client";

import { useState } from "react";

type Side = "reader" | "author";

/** The waitlist form: your address, and what happened, said in place. Which side you're joining as comes from the switch above the headline. */
export function WaitlistForm({ side, src }: { side: Side; src?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending"); setError(null);
    try {
      const res = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), kind: side, website: form.get("website") || undefined, src }) });
      if (res.ok) { setState("done"); return; }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That didn't go through. Try again in a moment.");
    } catch { setError("That didn't go through. Try again in a moment."); }
    setState("idle");
  }

  if (state === "done") {
    return (
      <div role="status">
        <p className="done">You&apos;re on the list.</p>
        <p>Check your inbox for one email to confirm your address. We&apos;ll write again on January 8.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 id="join-h">Be part of the first launch!</h2>
      <p className="as">Joining as <b>{side === "reader" ? "a reader" : "an author"}</b>.</p>
      <form onSubmit={submit}>
        <div className="field">
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Your email address" />
          <button type="submit" disabled={state === "sending"}>Join the list</button>
        </div>
        <input className="visually-hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </form>
      {error && <p className="error-text" role="alert" style={{ marginTop: 10 }}>{error}</p>}
      <p className="fine">Free for readers, and free to launch. One email to confirm, one when we open. <a href="/privacy">What we keep</a>.</p>
    </div>
  );
}
