"use client";

/**
 * components/book/notify-form.tsx
 *
 * "Tell me when it launches", on a launch that is scheduled and not yet live.
 * Signed in it is one press; signed out it is an email field, since the
 * promise is one email on the morning and no account is needed to keep it.
 */

import { useState } from "react";

type Props = { launchId: string; signedIn: boolean; asked: boolean };

export function NotifyForm({ launchId, signedIn, asked }: Props) {
  const [done, setDone] = useState(asked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = signedIn ? undefined : String(new FormData(e.currentTarget).get("email") ?? "");
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/notify-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ launchId, email }) });
      if (res.ok) { setDone(true); return; }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That didn't go through.");
    } catch { setError("That didn't go through."); }
    finally { setBusy(false); }
  }

  if (done) return <p className="tellme-done" role="status">You&apos;ll get one email on the morning it launches.</p>;
  return (
    <form className="tellme" onSubmit={submit}>
      {!signedIn && <input className="input" type="email" name="email" required autoComplete="email" placeholder="you@example.com" aria-label="Your email address" />}
      <button className="btn solid" type="submit" disabled={busy}>Tell me when it launches</button>
      {error && <p className="error-text" role="alert">{error}</p>}
    </form>
  );
}
