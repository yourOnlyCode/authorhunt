"use client";

/**
 * components/splash/waitlist-form.tsx
 *
 * The waitlist form: your address, and what happened, said in place. Which
 * side you're joining as comes from the switch above the headline.
 *
 * Joining is the one moment on the page worth celebrating, so it gets a
 * small one, and it is one continuous move: the form starts easing away the
 * instant the button is pressed, while the request is on its way, and the
 * answer rises in where the form was (the box keeps its height, so nothing
 * on the page moves) as paper squares in the brand's colors burst and fall.
 * If the request fails, the form eases back with the reason. Waiting for the
 * server before moving anything is what made the first version feel
 * clunky. All of it is skipped under reduced motion.
 */

import { useLayoutEffect, useRef, useState } from "react";
import { Confetti, throwConfetti, type Piece } from "./confetti";

type Side = "reader" | "author";
export function WaitlistForm({ side, src, onJoined }: { side: Side; src?: string; onJoined?: () => void }) {
  const [state, setState] = useState<"idle" | "leaving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const before = useRef<number | null>(null);

  // The box keeps the height it had with the form in it, and the message sits in the middle of that.
  // So nothing on the page moves when someone joins: not the countdown above, not the link below.
  useLayoutEffect(() => {
    const el = body.current;
    if (state !== "done" || !el || before.current === null) return;
    el.style.minHeight = `${before.current}px`;
    before.current = null;
  }, [state]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setState("leaving"); setError(null);
    // The form's exit and the request run side by side; whichever is slower sets the pace.
    const exit = new Promise((done) => setTimeout(done, still ? 0 : 240));
    try {
      const [res] = await Promise.all([
        fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), kind: side, website: form.get("website") || undefined, src }) }),
        exit,
      ]);
      if (res.ok) {
        before.current = body.current?.offsetHeight ?? null;
        setState("done");
        onJoined?.();
        if (!still) { setPieces(throwConfetti(36)); setTimeout(() => setPieces([]), 2200); }
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That didn't go through. Try again in a moment.");
    } catch { setError("That didn't go through. Try again in a moment."); }
    setState("idle");
  }

  return (
    <div className="join-body" ref={body}>
      {state === "done" ? (
        <div className="joined" role="status">
          <p className="done">You&apos;re on the list.</p>
          <p>Check your inbox for one email to confirm your address. If it isn&apos;t there in a minute, look in your junk folder. We&apos;ll write again on January 8.</p>
          <p className="fine">Already joined? Nothing has changed, and we&apos;ve sent your link again if you still needed it.</p>
        </div>
      ) : (
        <div className={`join-form ${state === "leaving" ? "leaving" : ""}`} aria-busy={state === "leaving"}>
          <h2 id="join-h">Be part of the first launch!</h2>
          <p className="as">Joining as <b>{side === "reader" ? "a reader" : "an author"}</b>.</p>
          <form onSubmit={submit}>
            <div className="field">
              <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Your email address" />
              <button type="submit" disabled={state !== "idle"}>Join the list</button>
            </div>
            <input className="visually-hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          </form>
          {error && <p className="error-text" role="alert" style={{ marginTop: 10 }}>{error}</p>}
          <p className="fine">Free for readers, and free to launch. One email to confirm, one when we open. <a href="/privacy">What we keep</a>.</p>
        </div>
      )}
      <Confetti pieces={pieces} />
    </div>
  );
}
