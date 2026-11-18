/**
 * app/splash/page.tsx
 *
 * What authorhunt.com shows until it opens (docs/launch.md). On a laptop the
 * whole first view fits without scrolling: who you are, the headline, the
 * count and the sign-up. Below it, each side gets its own case (why.tsx),
 * then one day on the board played as an example, the FAQ, and a closing
 * panel that says when the first board opens. The join form docks to the
 * top once its box is out of view. DESIGN.md, "The splash page", has the
 * rules; docs/mockups/splash-motion.html is the approved look. proxy.ts
 * sends every page here while LAUNCH_AT is in the future.
 */

import type { Metadata } from "next";
import { launchAt } from "@/lib/env";
import { CatMark } from "@/components/ui/icons";
import { SplashStage } from "@/components/splash/stage";
import { SplashProvider } from "@/components/splash/state";
import { Dock } from "@/components/splash/dock";
import { Why } from "@/components/splash/why";
import { ExampleDay } from "@/components/splash/example-day";
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

/** The closing panel's words, which rise into place one at a time when it comes into view. */
const CLOSING = ["The", "first", "board", "opens"];

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
  const day = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" }).format(at);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/New_York" }).format(at);
  const hour = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(at).replace(":00", "").replace("12 PM", "noon").replace("12 AM", "midnight");
  const logo = <span className="logo"><CatMark />Author Hunt</span>;
  return (
    <SplashProvider src={src?.slice(0, 80)}>
      <Dock logo={logo} />
      <SplashStage opensAt={opens} initialNow={serverNow()} when={when} hour={hour} logo={logo} />
      <div className="band" aria-hidden="true" />
      <Why />
      <div className="band" aria-hidden="true" />
      <section className="day" id="launch" aria-labelledby="launch-h">
        <div className="wrap">
          <p className="sc for-author">What a launch is</p><p className="sc for-reader">How you discover</p>
          <h2 id="launch-h">One day on the board</h2>
          <p className="lede for-author" data-reveal>Every launch gets one day. Here is how a day goes. <mark className="draw">Small counts.</mark></p>
          <p className="lede for-reader" data-reveal>Open the board, cheer for what you love, and see what the day chose. <mark className="draw">Small counts.</mark></p>
          <ExampleDay />
        </div>
      </section>
      <div className="band" aria-hidden="true" />
      <div className="below"><div className="wrap">
        <section className="faq" id="faq" aria-labelledby="faq-h">
          <h2 id="faq-h">FAQ</h2>
          {FAQ.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
        </section>
      </div></div>
      <section className="closing" aria-labelledby="closing-h" data-reveal>
        <div className="wrap">
          <h2 id="closing-h" className="big">{CLOSING.map((w, i) => <span key={w}><span className="w" style={{ "--i": i } as React.CSSProperties}><span>{w}</span></span>{" "}</span>)}<span className="w" style={{ "--i": CLOSING.length } as React.CSSProperties}><span className="boxed">{day}.</span></span></h2>
          <p className="small">{weekday}, at {hour} Eastern. Join the list and we&apos;ll write once, when it does.</p>
          <p><a className="btn-on-colour" href="#top">Join the list</a></p>
        </div>
      </section>
      <footer className="foot"><div className="wrap"><span className="plate">Ornament: William Morris, Marigold, 1875. Art Institute of Chicago, public domain.</span></div></footer>
      <Track />
    </SplashProvider>
  );
}
