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
 *
 * Which side is chosen lives in the page's shared state (state.tsx), because
 * the rest of the page follows it too: the docked form, and the sections
 * below, which make each side its own case.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { Countdown } from "./countdown";
import { LocalTime } from "./local-time";
import { WaitlistForm } from "./waitlist-form";
import { slowScrollTo } from "./slow-scroll";
import { useSplash } from "./state";

type Side = "reader" | "author";
const WORDS: Record<Side, string> = { reader: "Find your", author: "Be their" };
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Letters({ text }: { text: string }) {
  return <>{text.split("").map((ch, i) => <span key={i} className="ch" style={{ "--i": i } as CSSProperties}>{ch}</span>)}</>;
}

export function SplashStage({ opensAt, initialNow, when, hour, logo, count, early }: { opensAt: number; initialNow: number; when: string; hour: string; logo: React.ReactNode; count: string | null; early: boolean }) {
  const { side, choose, said, status } = useSplash();
  const joined = status === "done";
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


  return (
    <div className="first" id="top" data-side={side}>
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
          <span className="l2">favorite author.</span>
        </h1>
        <p className="what" data-reveal>
          <span className="reader" aria-hidden={side !== "reader"}>A daily launch board for authors and their writing, from a single poem to a whole novel. New work goes up each morning, readers cheer for what they love, and <mark className="draw">every day ends with a ranking</mark>.</span>
          <span className="author" aria-hidden={side !== "author"}>A daily launch board for authors and their writing. Launch anything you&apos;ve finished, from flash fiction or an essay to a novel, to readers looking for someone new. <mark className="draw">It&apos;s free.</mark></span>
        </p>
        <p className="sr" role="status">{said}</p>
        <Countdown opensAt={opensAt} initialNow={initialNow} />
        <section className={`join ${joined ? "celebrate" : ""}`} id="join" aria-labelledby="join-h"><span className="paper" aria-hidden="true" /><WaitlistForm count={count} early={early} /></section>
        <a className="more" href="#why" onClick={(e) => { e.preventDefault(); slowScrollTo("why"); }}>{side === "reader" ? "Why read here" : "Why launch here"} <span aria-hidden="true">&darr;</span></a>
      </div>
    </div>
  );
}
