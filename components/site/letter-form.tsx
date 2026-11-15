"use client";

import { useState } from "react";

/** The Sunday letter's sign-up. Says what happened in the same place, not in a toast. */
export function LetterForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    setState("sending");
    try {
      const res = await fetch("/api/letter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      setState(res.ok ? "done" : "error");
    } catch { setState("error"); }
  }
  if (state === "done") return <span className="said">You&apos;re on the list. The next one arrives Sunday.</span>;
  return (
    <form onSubmit={submit}>
      <input name="email" type="email" required placeholder="you@example.com" aria-label="Email address" autoComplete="email" />
      <button type="submit" disabled={state === "sending"}>{state === "error" ? "Try again" : "Subscribe"}</button>
    </form>
  );
}
