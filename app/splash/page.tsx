/**
 * app/splash/page.tsx
 *
 * What authorhunt.com shows until it opens (docs/launch.md): everything
 * centred, a live countdown, what Author Hunt and a launch are, and the
 * waitlist. proxy.ts sends every page here while LAUNCH_AT is in the future.
 */

import type { Metadata } from "next";
import { launchAt } from "@/lib/env";
import { CatMark } from "@/components/ui/icons";
import { Countdown } from "@/components/splash/countdown";
import { WaitlistForm } from "@/components/splash/waitlist-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Author Hunt opens January 8, 2027",
  description: "A daily launch board for authors and their books. Join the list and be part of the first launch.",
  alternates: { canonical: "/" },
};

/** Midnight Eastern on January 8, 2027, when the first board's day begins. */
const DEFAULT_OPENING = Date.UTC(2027, 0, 8, 5, 0, 0);

export default async function Splash({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  const opens = launchAt()?.getTime() ?? DEFAULT_OPENING;
  const when = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(new Date(opens));
  return (
    <div className="splash">
      <div className="wrap">
        <header className="top"><span className="logo" style={{ fontSize: 34 }}><CatMark />Author Hunt</span></header>
        <section className="hero">
          <p className="when"><span className="hl">Opening {when}</span></p>
          <h1>Find your next favourite author.</h1>
          <p className="what">Author Hunt is a daily launch board for authors and their books. New work goes up each morning, readers cheer for what they love, and every day ends with a ranking.</p>
        </section>
        <Countdown opensAt={opens} initialNow={Date.now()} />
        <section className="join" id="join" aria-labelledby="join-h"><WaitlistForm src={src?.slice(0, 80)} /></section>
        <section className="launch" aria-labelledby="launch-h">
          <h2 id="launch-h">What a launch is</h2>
          <p className="lede">A launch is one day with your work in front of readers who came looking for something new.</p>
          <ol className="steps">
            <li><h3>You pick a day</h3><p>Your book, or your author page, goes on that day&apos;s board beside everything else launching that morning.</p></li>
            <li><h3>Readers respond</h3><p>They cheer, comment and follow. Cheers decide the day&apos;s order, and no one can pay for a place.</p></li>
            <li><h3>You keep what you earn</h3><p>Followers you can reach again, a page with links to wherever you sell and write, and your rank for the day, for good.</p></li>
          </ol>
        </section>
        <div className="last"><a href="#join">Join the list</a></div>
      </div>
      <div className="trim" aria-hidden="true" />
      <footer><div className="wrap" style={{ justifyContent: "center" }}>Ornament: William Morris, Marigold, 1875. Art Institute of Chicago, public domain.</div></footer>
    </div>
  );
}
