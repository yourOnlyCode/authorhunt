"use client";

import { useState } from "react";

export function ConfirmButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "missing">("idle");
  async function confirm() {
    setState("sending");
    try {
      const res = await fetch("/api/waitlist/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await res.json();
      setState(data.ok ? "done" : "missing");
    } catch { setState("idle"); }
  }
  if (state === "done") return <><p className="done">Confirmed. You&apos;re on the list.</p><p>We&apos;ll write on January 8, when the first board opens.</p></>;
  if (state === "missing") return <p>That link isn&apos;t one we recognise. Join the list again from the front page.</p>;
  return <div className="last" style={{ paddingBlock: 0 }}><button type="button" className="btn solid" onClick={confirm} disabled={state === "sending"}>Confirm my address</button></div>;
}
