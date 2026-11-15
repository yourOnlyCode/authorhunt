"use client";

/**
 * components/author/adult-gate.tsx
 *
 * What stands in front of work an author has marked Mature until the reader
 * says they are an adult (docs/product-structure.md, section 5). The answer
 * is kept on the account, so it is asked once; a signed-out reader is sent to
 * sign in first, since there is nowhere else to keep it.
 */

import { useState } from "react";

export function AdultGate({ signedIn, what }: { signedIn: boolean; what: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    const signIn = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
    if (!signedIn) { window.location.href = signIn; return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/settings/adult", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (res.status === 401) { window.location.href = signIn; return; }
      if (res.ok) { window.location.reload(); return; }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That didn't go through.");
    } catch { setError("That didn't go through."); }
    setBusy(false);
  }

  return (
    <div className="notice gate">
      <p><b>The author has marked {what} Mature.</b> It may hold explicit sex, graphic violence, or other things not meant for readers under 18.</p>
      <button className="btn solid" type="button" onClick={confirm} disabled={busy}>I&apos;m 18 or over, show it</button>
      {!signedIn && <p className="it fine">You&apos;ll be asked to sign in, so we only need to ask once.</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
