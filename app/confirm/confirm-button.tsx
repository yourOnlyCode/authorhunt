"use client";

import { useState } from "react";
import { Confetti, throwConfetti, type Piece } from "@/components/splash/confetti";
import { adEvent } from "@/components/analytics/ad-pixels";

/** The one press that confirms a waitlist address. Confirming is the real finish line, so it gets the same small celebration as joining. */
export function ConfirmButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "missing">("idle");
  const [pieces, setPieces] = useState<Piece[]>([]);
  async function confirm() {
    setState("sending");
    try {
      const res = await fetch("/api/waitlist/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await res.json();
      if (data.ok) {
        setState("done");
        adEvent("confirmed");
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPieces(throwConfetti(36)); setTimeout(() => setPieces([]), 2200); }
      } else setState("missing");
    } catch { setState("idle"); }
  }
  if (state === "missing") return <p>That link isn&apos;t one we recognize. Join the list again from the front page.</p>;
  return (
    <div className="join-body">
      {state === "done"
        ? <div className="joined" role="status"><p className="done">Confirmed. You&apos;re on the list.</p><p>We&apos;ll write on January 8, at noon Eastern, when the first board opens.</p></div>
        : <button type="button" className="btn solid" onClick={confirm} disabled={state === "sending"}>{state === "sending" ? "Confirming…" : "Confirm my address"}</button>}
      <Confetti pieces={pieces} />
    </div>
  );
}
