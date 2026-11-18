/**
 * app/splash/page.tsx
 *
 * What authorhunt.com shows until it opens (docs/launch.md). On a laptop the
 * whole first view fits without scrolling: who you are, the headline, the
 * count and the sign-up. What a launch is and the FAQ sit below. proxy.ts
 * sends every page here while LAUNCH_AT is in the future.
 */

import type { Metadata } from "next";
import { launchAt } from "@/lib/env";
import { CatMark } from "@/components/ui/icons";
import { SplashStage } from "@/components/splash/stage";
import { Track } from "@/components/analytics/track";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Author Hunt opens January 8, 2027",
  description: "A daily launch board for authors and their writing, from flash fiction to novels. Join the list and be part of the first launch.",
  alternates: { canonical: "/" },
};

/** Noon Eastern on January 8, 2027 (the owner's call: a waking hour on both coasts). LAUNCH_AT overrides it. */
const DEFAULT_OPENING = Date.UTC(2027, 0, 8, 17, 0, 0);

/** The server's clock, read once per request for the countdown's first frame. */
const serverNow = () => new Date().getTime();

/** The case for authors: why a launch here is worth their day. Each line is something the product does (AGENTS.md's rules). */
const WHY: { h: string; p: string }[] = [
  { h: "A day that's yours", p: "One day, your work on the board." },
  { h: "Readers come looking", p: "They open the board to find someone new." },
  { h: "Small counts", p: "Every piece gets a row, and every type its own ranking." },
  { h: "A fair order", p: "Cheers decide. No one pays for a place." },
  { h: "It lasts", p: "Your rank and your followers stay." },
  { h: "It's free", p: "Your page and every launch, for good." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "What happens when I join the list?", a: "You get one email asking you to confirm your address. On opening day you get one more: an invitation that makes your account in a single press. Nothing else is sent." },
  { q: "What do you keep about me?", a: "Your email address, whether you said you're an author or a reader, and which link brought you here. An address that is never confirmed is dropped. To be taken off the list, write to hello@authorhunt.com." },
  { q: "Is it free?", a: "Reading is free, always. Launching is free too, for good: your page and everything you write. An optional membership, $3.99 a month, adds tools such as emailing your followers and fuller analytics. It never buys a higher place." },
  { q: "Who can launch?", a: "Any author, with any finished piece of writing: flash fiction, a poem, an essay, a short story, a magazine article, a journal piece, fan fiction, a novella, a novel. Self-published or traditionally published, a first piece or a twentieth book. Small counts." },
  { q: "How is the ranking decided?", a: "By readers. Each person can cheer a launch once, and never their own. For the first hours of a day the board is shuffled and shows no counts, so the earliest launch doesn't win on a head start." },
  { q: "Do you accept AI-written work?", a: "No. Author Hunt does not accept work written by AI: books, stories, poems, magazines, journals, or anything else. Every author declares that a person wrote their work. If the community reports work and it is found to be AI-written, it is removed and the author's page is banned." },
  { q: "Do you sell or host the writing?", a: "No. Each page links to wherever the author publishes and sells: their own site, a magazine, a newsletter, any bookshop. Author Hunt favours no store." },
];

export default async function Splash({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  const opens = launchAt()?.getTime() ?? DEFAULT_OPENING;
  const at = new Date(opens);
  const when = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(at);
  const hour = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(at).replace(":00", "").replace("12 PM", "noon").replace("12 AM", "midnight");
  return (
    <div className="splash">
      <SplashStage opensAt={opens} initialNow={serverNow()} when={when} hour={hour} src={src?.slice(0, 80)} logo={<span className="logo"><CatMark />Author Hunt</span>} />
      <div className="below"><div className="wrap">
        <section id="launch" aria-labelledby="launch-h">
          <h2 id="launch-h">What a launch is</h2>
          <p className="lede">One day with your work in front of readers who came looking for something new.</p>
          <ol className="steps">
            <li><h3>You pick a day</h3><p>A piece of your writing, short or long, or your author page, goes on that day&apos;s board beside everything else launching that morning.</p></li>
            <li><h3>Readers respond</h3><p>They cheer, comment and follow. Cheers decide the day&apos;s order, and no one can pay for a place.</p></li>
            <li><h3>You keep what you earn</h3><p>Followers you can reach again, a page with links to wherever you sell, and your rank for the day, for good.</p></li>
          </ol>
        </section>
        <section id="why" aria-labelledby="why-h">
          <h2 id="why-h">Why launch here</h2>
          <ul className="steps why">
            {WHY.map((w) => <li key={w.h}><h3>{w.h}</h3><p>{w.p}</p></li>)}
          </ul>
        </section>
        <section className="faq" id="faq" aria-labelledby="faq-h">
          <h2 id="faq-h">FAQ</h2>
          {FAQ.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
        </section>
      </div></div>
      <div className="trim" aria-hidden="true" />
      <footer><div className="wrap" style={{ justifyContent: "center" }}>Ornament: William Morris, Marigold, 1875. Art Institute of Chicago, public domain.</div></footer>
      <Track />
    </div>
  );
}
