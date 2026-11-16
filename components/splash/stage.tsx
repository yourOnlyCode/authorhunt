"use client";

/**
 * components/splash/stage.tsx
 *
 * The splash page's first view. One switch, "I'm a reader / I'm an author",
 * sits above the headline, and three things follow it: the headline's first
 * two words ("Find your" or "Be their"), the line under it, and which side
 * the form joins as. It says in one move that the site is for both.
 *
 * The change is a dissolve done in CSS on one attribute (app/globals.css), so
 * a second press mid-way simply turns it round. This component only flips
 * the attribute and keeps the changing words' width right, so the rest of
 * the headline glides instead of jumping. The headline is a fixed number of
 * lines at every width, so nothing below it moves.
 *
 * A screen reader gets the plain words, not the separate letters the
 * animation draws, and hears a change once.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Countdown } from "./countdown";
import { LocalTime } from "./local-time";
import { WaitlistForm } from "./waitlist-form";
import { slowScrollTo } from "./slow-scroll";

type Side = "reader" | "author";
const WORDS: Record<Side, string> = { reader: "Find your", author: "Be their" };
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Letters({ text }: { text: string }) {
  return <>{text.split("").map((ch, i) => <span key={i} className="ch" style={{ "--i": i } as CSSProperties}>{ch}</span>)}</>;
}

export function SplashStage({ opensAt, initialNow, when, hour, src, logo }: { opensAt: number; initialNow: number; when: string; hour: string; src?: string; logo: React.ReactNode }) {
  const [side, setSide] = useState<Side>("reader");
  const [said, setSaid] = useState("");
  const touched = useRef(false);
  const swap = useRef<HTMLSpanElement>(null);
  const phrases = useRef<Record<Side, HTMLSpanElement | null>>({ reader: null, author: null });

  const fit = useCallback((which: Side) => {
    const el = phrases.current[which];
    if (swap.current && el) swap.current.style.width = `${el.offsetWidth}px`;
  }, []);

  // Keep the changing words' box as wide as the phrase on show, including after the web font arrives and on resize.
  useIsoLayoutEffect(() => { fit(side); }, [side, fit]);
  useEffect(() => {
    const again = () => fit(side);
    void document.fonts?.ready.then(again);
    window.addEventListener("resize", again);
    return () => window.removeEventListener("resize", again);
  }, [side, fit]);

  // Shown once, unprompted and unannounced, and over within five seconds: nobody has to guess the words change.
  // Not if they've already pressed something, and not for a visitor who has asked for reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = setTimeout(() => { if (!touched.current) setSide("author"); }, 2000);
    const b = setTimeout(() => { if (!touched.current) setSide("reader"); }, 4400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  function choose(next: Side) {
    touched.current = true;
    if (next === side) return;
    setSide(next);
    setSaid(`${WORDS[next]} next favourite author. Joining as ${next === "reader" ? "a reader" : "an author"}.`);
  }

  return (
    <div className="first" data-side={side}>
      <div className="wrap">
        {logo}
        <p className="when"><span className="hl">Opening {when}</span> at {hour} Eastern.<LocalTime at={opensAt} /></p>
        <div className="side" role="group" aria-label="Which are you?">
          <button type="button" aria-pressed={side === "reader"} onClick={() => choose("reader")}>I&apos;m a reader</button>
          <button type="button" aria-pressed={side === "author"} onClick={() => choose("author")}>I&apos;m an author</button>
        </div>
        <h1>
          <span className="l1">
            <span className="sr">{WORDS[side]}</span>
            <span className="swap" ref={swap} aria-hidden="true" onClick={() => choose(side === "reader" ? "author" : "reader")}>
              <span className="ph reader" ref={(el) => { phrases.current.reader = el; }}><Letters text={WORDS.reader} /></span>
              <span className="ph author" ref={(el) => { phrases.current.author = el; }}><Letters text={WORDS.author} /></span>
            </span>{" "}next
          </span>{" "}
          <span className="l2">favourite author.</span>
        </h1>
        <p className="what">
          <span className="reader" aria-hidden={side !== "reader"}>A daily launch board for authors and their writing, from a single poem to a whole novel. New work goes up each morning, readers cheer for what they love, and every day ends with a ranking.</span>
          <span className="author" aria-hidden={side !== "author"}>A daily launch board for authors and their writing. Launch anything you&apos;ve finished, from flash fiction or an essay to a novel, to readers looking for someone new. It&apos;s free.</span>
        </p>
        <p className="sr" role="status">{said}</p>
        <Countdown opensAt={opensAt} initialNow={initialNow} />
        <section className="join" id="join" aria-labelledby="join-h"><WaitlistForm side={side} src={src} /></section>
        <a className="more" href="#launch" onClick={(e) => { e.preventDefault(); slowScrollTo("launch"); }}>What a launch is, and FAQ</a>
      </div>
    </div>
  );
}
