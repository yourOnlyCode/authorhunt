/**
 * app/(site)/about/page.tsx
 *
 * What Author Hunt is, what a launch is, and how the order of a board is
 * decided, in plain words. The ranking section describes lib/ranking/ and
 * has to stay true to it: QUIET_HOURS and HALF_LIFE_DAYS are read from there.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PRICE } from "@/lib/billing/access";
import { QUIET_HOURS } from "@/lib/ranking/day";
import { HALF_LIFE_DAYS } from "@/lib/ranking/points";

const description = "Author Hunt is a daily launch board for authors and their writing, from flash fiction to novels. What a launch is, and how cheers, and nothing else, decide each day's order.";

export const metadata: Metadata = {
  title: "About",
  description,
  alternates: { canonical: "/about" },
  openGraph: { title: "About Author Hunt", description, url: "/about" },
};

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

export default function About() {
  const quiet = NUMBER_WORDS[QUIET_HOURS] ?? String(QUIET_HOURS);
  const jsonLd = { "@context": "https://schema.org", "@type": "AboutPage", name: "About Author Hunt", description };
  return (
    <main className="wrap legal">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="page-head">
        <h1>A daily board for authors <span className="it">and their writing</span></h1>
        <p>Author Hunt is where authors launch their work and readers find their next favourite author.</p>
      </header>

      <div className="prose">
        <h2>What it is</h2>
        <p>Each morning a new board opens. On it are the authors and the works launching that day: novels, short works, serials, issues of magazines and journals. Readers cheer for what they like the look of, leave a comment, follow an author, save a book for later. At midnight Eastern the day closes and its order is final.</p>
        <p>Every page, every board and every filter is open to read without an account. Readers never pay.</p>

        <h2>What a launch is</h2>
        <p>An author makes a page: who they are, what they write, who their work is for. They launch the page once, on a day they choose. After that, each work gets a launch of its own, on its own day.</p>
        <p>A launch is one day on the board. Before the day, it has a coming-soon page where a reader can ask to be told. On the day, it sits among that day&apos;s launches with its cover, a line about it, and the author&apos;s own note at the top of the comments. Afterwards it stays on that day&apos;s board for good, with the place it finished in.</p>
        <p>Author Hunt does not accept work written by AI: books, stories, poems, magazines, journals, or anything else. Every author declares that a person wrote their work before it can go public. Work that readers report and that is found to be AI-written is removed, and its author&apos;s page is banned.</p>

        <h2>How the order is decided</h2>
        <p><b>Cheers decide the order.</b> A cheer is one account&apos;s support for one launch. It is free, each account has one per launch, and nobody can cheer for their own. The launch with the most support is first. Readers who join the conversation count a little as well, and a cheer from an account made days ago with nothing else to its name counts for less, so a batch of new sign-ups can&apos;t carry a launch.</p>
        <p><b>Rank can&apos;t be bought.</b> Launching is free. A membership (${PRICE.monthly.toFixed(2)} a month or ${PRICE.yearly} a year) adds tools around a launch, such as emailing your followers, and never a better place. Nothing an author or a reader pays enters a score. The <Link className="word" href="/pricing">pricing page</Link> has the whole list.</p>
        <p><b>The first hours are shuffled, without counts.</b> For the first {quiet} hours of each day the board shows that day&apos;s launches in a shuffled order and hides the numbers. Otherwise the earliest launch would win on a head start, and authors in other time zones would never catch up. After that the board is in order of support.</p>
        <p><b>The day is New York&apos;s.</b> A day runs from midnight to midnight Eastern time, wherever you are reading from.</p>

        <h2>Momentum</h2>
        <p>Beside the daily boards, each author has a standing called Momentum. It orders the directory of authors. It comes from what an author makes and the support it earns: launching a page or a work, posting an update, a cheer received, a new follower, replying to readers.</p>
        <p><b>Momentum halves every {HALF_LIFE_DAYS} days.</b> Points earned today are worth half as much in {HALF_LIFE_DAYS} days, and half of that {HALF_LIFE_DAYS} days later. An author who is active this month can pass a bigger name who has gone quiet. Like rank, Momentum can&apos;t be bought.</p>

        <h2>Who makes it</h2>
        <p>Author Hunt is made by the people who make Lorec, a writing app. The two are separate: an account here is its own, and what you do here is kept here. The <Link className="word" href="/privacy">privacy page</Link> says what is kept.</p>

        <h2>The rules</h2>
        <p>They are short, and they are in the <Link className="word" href="/terms">terms</Link>: say how the work was written, don&apos;t ask for or trade cheers, mark what is Mature, and be civil.</p>
      </div>
    </main>
  );
}
