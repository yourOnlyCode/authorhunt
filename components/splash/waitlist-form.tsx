"use client";

/**
 * components/splash/waitlist-form.tsx
 *
 * The waitlist form in the first view's box: your address, and what
 * happened, said in place. Which side you're joining as, the address and
 * whether you've joined live in the page's shared state (state.tsx), because
 * the same form also docks to the top of the page (dock.tsx).
 *
 * Joining is the one moment on the page worth celebrating, so it gets a
 * small one, and it is one continuous move: the form starts easing away the
 * instant the button is pressed, while the request is on its way, and the
 * answer rises in where the form was (the box keeps its height, so nothing
 * on the page moves) as paper squares in the brand's colors burst and fall.
 * If the request fails, the form eases back with the reason. All of it is
 * skipped under reduced motion. Under the answer, an invitation to pass the
 * page on (share.tsx), so the box grows downward once someone has joined.
 */

import { useLayoutEffect, useRef, useState } from "react";
import { Confetti, throwConfetti, type Piece } from "./confetti";
import { gazeProps, useSplash } from "./state";
import { ShareAsk } from "./share";

export function WaitlistForm({ count, early }: { count: string | null; early: boolean }) {
  const { side, email, setEmail, status, error, join, look, still } = useSplash();
  // Setting up a launch before opening is for authors only, and only once early access is switched on.
  const setUp = early && side === "author";
  const [pieces, setPieces] = useState<Piece[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const before = useRef<number | null>(null);

  // The box keeps the height it had with the form in it, and the message sits in the middle of that.
  // So nothing on the page moves when someone joins: not the countdown above, not the link below.
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    if (status !== "done") { before.current = el.offsetHeight; return; }
    if (before.current !== null) el.style.minHeight = `${before.current}px`;
  }, [status]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const honeypot = String(new FormData(e.currentTarget).get("website") ?? "");
    if (await join(honeypot) && !still) { setPieces(throwConfetti(36)); setTimeout(() => setPieces([]), 2200); }
  }

  return (
    <div className="join-body" ref={body}>
      {status === "done" ? (<>
        <div className="joined" role="status">
          <p className="done">You&apos;re on the list.</p>
          <p>Check your inbox for one email to confirm your address. If it isn&apos;t there in a minute, look in your junk folder. We&apos;ll write again on January 8.</p>
          <p className="fine">Already joined? Nothing has changed, and we&apos;ve sent your link again if you still needed it.</p>
        </div>
        {setUp && (
          <div className="early">
            <p className="early-ask">Don&apos;t wait for January. Set up your first launch now, pick its day, and be a founding author.</p>
            <p><a className="early-go" href="/sign-up?next=/start">Set up your first launch</a></p>
          </div>
        )}
        <ShareAsk side={side} />
      </>) : (
        <div className={`join-form ${status === "leaving" ? "leaving" : ""}`} aria-busy={status === "leaving"}>
          <h2 id="join-h">Be part of the first launch!</h2>
          <p className="as">Joining as <b>{side === "reader" ? "a reader" : "an author"}</b>.</p>
          <form onSubmit={submit}>
            <div className="field">
              <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} {...gazeProps(look)} />
              <button type="submit" disabled={status !== "idle"}>Join the list</button>
            </div>
            <input className="visually-hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          </form>
          {error && <p className="error-text" role="alert" style={{ marginTop: 10 }}>{error}</p>}
          <p className="fine">Free for readers, and free to launch. One email to confirm, one when we open. <a href="/privacy">What we keep</a>.</p>
          {count && <p className="count">{count}</p>}
          {setUp && <p className="early-link">Ready now? <a href="/sign-up?next=/start">Set up your first launch</a> and pick its day.</p>}
        </div>
      )}
      <Confetti pieces={pieces} />
    </div>
  );
}
