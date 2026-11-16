"use client";

import { useState } from "react";

/** The waitlist form: who you are, your address, and what happened, said in place. */
export function WaitlistForm({ src }: { src?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending"); setError(null);
    try {
      const res = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), kind: form.get("who"), website: form.get("website") || undefined, src }) });
      if (res.ok) { setState("done"); return; }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That didn't go through. Try again in a moment.");
    } catch { setError("That didn't go through. Try again in a moment."); }
    setState("idle");
  }

  if (state === "done") {
    return (
      <div>
        <p className="done">You&apos;re on the list.</p>
        <p>Check your inbox for one email to confirm your address. We&apos;ll write again on January 8.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 id="join-h">Be part of the first launch!</h2>
      <p className="lede">Join the list and your account will be waiting on opening day. Authors who join now can have a launch on the very first board.</p>
      <form onSubmit={submit}>
        <div className="who" role="radiogroup" aria-label="I am">
          <label><input type="radio" name="who" value="author" defaultChecked />I&apos;m an author</label>
          <label><input type="radio" name="who" value="reader" />I&apos;m a reader</label>
        </div>
        <div className="field">
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Email address" />
          <button type="submit" disabled={state === "sending"}>Join the list</button>
        </div>
        <input className="visually-hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </form>
      {error && <p className="error-text" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      <p className="fine">Free for readers, and free to launch. One email to confirm, one when we open. <a href="/privacy" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>What we keep</a>.</p>
    </div>
  );
}
