"use client";

/**
 * components/splash/state.tsx
 *
 * The splash page's one piece of state, shared by everything on it: which
 * side the visitor is on (reader or author), the address they are typing,
 * and whether they have joined. The join form appears in two places (the box
 * in the first view, and a bar that docks to the top once that box is out of
 * view: DESIGN.md, "The join form is always in reach"), and both are views of
 * this one state, so a half-typed address follows the visitor and joining in
 * either resolves both.
 *
 * The provider is also the page's root element. It carries the side as
 * `data-side`, which the styles use to show each side its own words, and it
 * turns the page's motion on (`.motion`) only when JavaScript is running and
 * the visitor hasn't asked for less: with neither, everything is simply
 * there. Things marked `data-reveal` get `.in` once, when they come into view.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export type Side = "reader" | "author";
export type JoinStatus = "idle" | "leaving" | "done";

type Splash = {
  side: Side;
  /** A person chose a side (as opposed to the page showing both on arrival). */
  choose: (side: Side) => void;
  /** The page showing the other side by itself; ignored once a person has chosen. */
  show: (side: Side) => void;
  said: string;
  email: string;
  setEmail: (value: string) => void;
  status: JoinStatus;
  error: string | null;
  /** Sends the address. Resolves true if the visitor is now on the list. */
  join: (honeypot?: string) => Promise<boolean>;
  /** Where the cat looks: how far along the address the caret is (0 to 1), or null when no field has focus. */
  look: (along: number | null) => void;
  still: boolean;
};

const Ctx = createContext<Splash | null>(null);
export function useSplash(): Splash {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSplash needs SplashProvider above it");
  return value;
}

/** Whether the visitor has asked for reduced motion. True on the server and until we know, so nothing moves by mistake. */
function useStill() {
  return useSyncExternalStore(
    (changed) => { const q = window.matchMedia("(prefers-reduced-motion: reduce)"); q.addEventListener("change", changed); return () => q.removeEventListener("change", changed); },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

const WORDS: Record<Side, string> = { reader: "Find your", author: "Be their" };
const FAILED = "That didn't go through. Try again in a moment.";

export function SplashProvider({ src, children }: { src?: string; children: React.ReactNode }) {
  const [side, setSide] = useState<Side>("reader");
  const [said, setSaid] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<JoinStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const still = useStill();
  const [gaze, setGaze] = useState<number | null>(null);
  const touched = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  const choose = useCallback((next: Side) => {
    touched.current = true;
    setSide((now) => {
      if (now !== next) setSaid(`${WORDS[next]} next favorite author. Joining as ${next === "reader" ? "a reader" : "an author"}.`);
      return next;
    });
  }, []);
  const show = useCallback((next: Side) => { if (!touched.current) setSide(next); }, []);

  // Motion is opt-in from here, so a page without JavaScript, or a visitor who asked for less, sees everything at rest.
  useEffect(() => {
    const el = root.current;
    if (!el || still) return;
    el.classList.add("motion");
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); }
    }, { threshold: 0.4 });
    el.querySelectorAll("[data-reveal]").forEach((node) => seen.observe(node));
    return () => seen.disconnect();
  }, [still]);

  const join = useCallback(async (honeypot?: string) => {
    setStatus("leaving"); setError(null);
    const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The form's exit and the request run side by side; whichever is slower sets the pace.
    const exit = new Promise((done) => setTimeout(done, quiet ? 0 : 240));
    try {
      const [res] = await Promise.all([
        fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, kind: side, website: honeypot || undefined, src }) }),
        exit,
      ]);
      if (res.ok) { setStatus("done"); return true; }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? FAILED);
    } catch { setError(FAILED); }
    setStatus("idle");
    return false;
  }, [email, side, src]);

  // The cat glances toward the chosen side, and follows the address as it is typed (--px and --py, read by the styles).
  const px = still ? 0 : gaze === null ? (side === "reader" ? -1.4 : 1.4) : -1.5 + gaze * 3;
  const py = still || gaze === null ? 0 : 1.3;

  const value = useMemo<Splash>(() => ({ side, choose, show, said, email, setEmail, status, error, join, look: setGaze, still }), [side, choose, show, said, email, status, error, join, still]);
  return (
    <Ctx.Provider value={value}>
      <div className="splash" ref={root} data-side={side} data-joined={status === "done" ? "" : undefined} style={{ "--px": px, "--py": py } as React.CSSProperties}>{children}</div>
    </Ctx.Provider>
  );
}

/** What an address field tells the cat: where the caret is while it has focus, and nothing when it doesn't. */
export function gazeProps(look: Splash["look"]) {
  const along = (el: HTMLInputElement) => Math.min(el.value.length, 28) / 28;
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => look(along(e.currentTarget)),
    onBlur: () => look(null),
    onInput: (e: React.FormEvent<HTMLInputElement>) => look(along(e.currentTarget)),
  };
}
