"use client";

import { useState } from "react";

/**
 * The presses that leave for Stripe: start a membership (monthly or yearly),
 * or open the portal to manage one. What went wrong is said beside the
 * button, in the server's own words.
 */

async function go(path: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && data.url) { window.location.assign(data.url); return null; }
    return data.error ?? "That didn't go through. Nothing has been charged.";
  } catch {
    return "That didn't go through. Nothing has been charged.";
  }
}

export function CheckoutButtons({ monthly, yearly }: { monthly: string; yearly: string }) {
  const [busy, setBusy] = useState<"month" | "year" | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function start(interval: "month" | "year") {
    setBusy(interval); setError(null);
    const said = await go("/api/stripe/checkout", { interval });
    if (said) { setError(said); setBusy(null); }
  }
  return (
    <div className="price-acts">
      <button type="button" className="btn solid" onClick={() => start("month")} disabled={busy !== null}>{monthly} a month</button>
      <button type="button" className="btn" onClick={() => start("year")} disabled={busy !== null}>{yearly} a year</button>
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}

export function PortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    setBusy(true); setError(null);
    const said = await go("/api/stripe/portal", {});
    if (said) { setError(said); setBusy(false); }
  }
  return (
    <div className="price-acts">
      <button type="button" className="btn solid" onClick={open} disabled={busy}>Manage membership</button>
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
