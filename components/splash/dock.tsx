"use client";

/**
 * components/splash/dock.tsx
 *
 * The join form, docked to the top of the page whenever the join box in the
 * first view is out of sight, so the form is in reach wherever the visitor
 * has scrolled (the owner's requirement; DESIGN.md, "The join form is always
 * in reach"). It is a second view of the page's one form (state.tsx): the
 * same address, the same side, the same answer.
 *
 * Rules that keep it from being a nuisance: it shows only while the real
 * box is off screen; it is `inert` while hidden, so it is never tabbed into
 * unseen; it never leaves while someone is typing in it; it has no close
 * button and never pulses; and once the visitor has joined it says so and
 * then goes for good.
 */

import { useEffect, useRef, useState } from "react";
import { gazeProps, useSplash } from "./state";

export function Dock({ logo }: { logo: React.ReactNode }) {
  const { side, email, setEmail, status, error, join, look } = useSplash();
  const [away, setAway] = useState(false);
  const [typing, setTyping] = useState(false);
  const [left, setLeft] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = document.getElementById("join");
    if (!box) return;
    const seen = new IntersectionObserver(([e]) => { if (e) setAway(!e.isIntersecting); }, { threshold: 0.2 });
    seen.observe(box);
    return () => seen.disconnect();
  }, []);

  // After joining, the bar says so for a moment and then goes for good.
  useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(() => setLeft(true), 2600);
    return () => clearTimeout(t);
  }, [status]);

  const on = !left && (away || typing);
  useEffect(() => { if (bar.current) bar.current.inert = !on; }, [on]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await join(String(new FormData(e.currentTarget).get("website") ?? ""));
  }

  return (
    <div className={`dock ${on ? "on" : ""}`} ref={bar}>
      <div className="wrap">
        <a className="dock-home" href="#top" aria-label="Author Hunt, back to the top">{logo}</a>
        {status === "done" ? <p className="done" role="status">You&apos;re on the list.</p> : (
          <>
            <p className="as">Joining as <b>{side === "reader" ? "a reader" : "an author"}</b>.</p>
            <form onSubmit={submit} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}>
              <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} {...gazeProps(look)} />
              <button type="submit" disabled={status !== "idle"}>Join the list</button>
              <input className="visually-hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            </form>
            {error && <p className="error-text" role="alert">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
