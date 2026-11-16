/**
 * app/(site)/pricing/page.tsx
 *
 * What is free and what a membership adds (docs/monetization.md, decided
 * November 2026). The page has one thing to get across before any price:
 * launching is free for good, readers never pay, and a membership buys tools
 * and never position (AGENTS.md rules 1 to 3).
 *
 * A signed-in author sees where they stand, from accessFor(), and either the
 * two ways to start a membership or the way to manage one. With Stripe not
 * configured the page says so and offers no button.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getViewer, getViewerAuthor } from "@/lib/auth";
import { FREE_LINK_LIMIT, PRICE, TRIAL_DAYS, type Access } from "@/lib/billing/access";
import { accessFor } from "@/lib/billing/server";
import { checkoutReady } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { CheckoutButtons, PortalButton } from "./membership-buttons";

const MONTHLY = `$${PRICE.monthly.toFixed(2)}`;
const YEARLY = `$${PRICE.yearly}`;

const description = `Free for readers and free to launch, for good. ${MONTHLY} a month or ${YEARLY} a year adds tools around a launch, and never a better place on the board.`;

export const metadata: Metadata = {
  title: "Member tools and what they cost",
  description,
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Author Hunt: member tools and what they cost", description, url: "/pricing" },
};
export const dynamic = "force-dynamic";

const ROWS: { what: string; free: string; member: string; last?: boolean }[] = [
  { what: "Your page, your work, images and links", free: "Yes", member: "Yes" },
  { what: "Launch your page, and launch everything you write, short or long", free: "Yes", member: "Yes" },
  { what: "Cheers, comments and follows", free: "Yes", member: "Yes" },
  { what: "A place on the boards, in the directory, the filters and the Sunday letter", free: "Yes", member: "Yes" },
  { what: "Email your followers on launch day and for updates", free: "No", member: "Yes" },
  { what: "The coming-soon list: readers who asked to be told, as a list you can export", free: "The page, without the list", member: "Yes" },
  { what: "Analytics: views, where readers came from, which buy links were pressed", free: "The last 7 days, totals only", member: "Full, for all time" },
  { what: "A Support button linking to your own Ko-fi, PayPal or similar", free: "No", member: "Yes" },
  { what: "Links on your page", free: `${FREE_LINK_LIMIT} links`, member: "Unlimited" },
  { what: "The share kit: stickers, cards and badges", free: "One of each", member: "Every shape" },
  { what: "Rank, Momentum and placement", free: "Never", member: "Never", last: true },
];

const longDate = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(d);

export default async function Pricing() {
  const viewer = await getViewer();
  const author = viewer ? await getViewerAuthor() : null;
  const now = new Date();
  const ready = checkoutReady();

  let access: Access | null = null;
  let sub: typeof subscriptions.$inferSelect | undefined;
  if (author) {
    [access, [sub]] = await Promise.all([
      accessFor(author, now),
      db.select().from(subscriptions).where(eq(subscriptions.authorId, author.id)).limit(1),
    ]);
  }
  const ending = sub && (sub.status === "canceled" || sub.status === "past_due") && sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : null;

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: "Author Hunt membership",
    description: "Tools around a launch for authors on Author Hunt. Launching is free without it.",
    offers: [
      { "@type": "Offer", name: "Monthly", price: PRICE.monthly.toFixed(2), priceCurrency: "USD" },
      { "@type": "Offer", name: "Yearly", price: PRICE.yearly.toFixed(2), priceCurrency: "USD" },
    ],
  };

  return (
    <main className="wrap pricing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="page-head">
        <h1>Free to launch. <span className="it">For good.</span></h1>
        <p>Making a page, launching it and launching everything you write costs nothing and needs no membership. Readers never pay for anything. {MONTHLY} a month or {YEARLY} a year adds tools around a launch, and never a better place on the board.</p>
      </header>

      <section className="price-state" aria-label="Your membership">
        {!viewer || !author ? (
          <div className="stack">
            <p>A new page comes with the member tools free for {TRIAL_DAYS} days. No card is asked for, and nothing is charged when the {TRIAL_DAYS} days end: the tools switch off and the page stays as it is.</p>
            <div className="price-acts"><Link className="btn solid" href="/studio">Make your page</Link></div>
          </div>
        ) : access === "member" && sub ? (
          <div className="stack">
            <p>
              <b>You have a membership{sub.interval === "year" ? `, at ${YEARLY} a year` : sub.interval === "month" ? `, at ${MONTHLY} a month` : ""}.</b>{" "}
              {ending
                ? `The member tools stay on until ${longDate(ending)}. After that they switch off, and your page, your launches and your followers stay where they are.`
                : sub.currentPeriodEnd ? `It renews on ${longDate(sub.currentPeriodEnd)}.` : ""}
            </p>
            {ready ? <PortalButton /> : <p className="notice">Checkout isn&apos;t switched on yet, so the membership can&apos;t be changed from here today.</p>}
          </div>
        ) : access === "comp" ? (
          <p><b>You have the member tools, with nothing to pay.</b> There is no membership to start.</p>
        ) : (
          <div className="stack">
            <p>
              {access === "trial" && author.trialEndsAt
                ? <><b>You have the member tools free until {longDate(author.trialEndsAt)}.</b> No card is on file and nothing will be charged. When that day comes the tools switch off, and your page and launches stay as they are, unless you start a membership.</>
                : <><b>Your page is on the free tools.</b> Launching stays free. A membership adds the tools in the right-hand column.</>}
            </p>
            {ready
              ? <CheckoutButtons monthly={MONTHLY} yearly={YEARLY} />
              : <p className="notice">Checkout isn&apos;t switched on yet. Nothing can be charged today, and everything in the left-hand column works now.</p>}
          </div>
        )}
      </section>

      <section aria-labelledby="what-you-get">
        <h2 id="what-you-get" className="sc">What is free, and what a membership adds</h2>
        <div className="price-table">
          <table className="table">
            <thead>
              <tr><th scope="col"><span className="visually-hidden">What</span></th><th scope="col">Free, for good</th><th scope="col">Member, {MONTHLY} a month or {YEARLY} a year</th></tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.what} className={r.last ? "never" : undefined}>
                  <th scope="row">{r.what}</th><td>{r.free}</td><td>{r.member}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="price-notes prose">
        <h2 className="sc">How it works</h2>
        <p><b>Rank can&apos;t be bought.</b> Cheers from readers decide the order of each day&apos;s board. A membership, the {TRIAL_DAYS} free days and a Support button never enter a score, and no row on a board is paid for.</p>
        <p><b>{TRIAL_DAYS} days of the member tools come free with a new page.</b> No card. They are there so you can try emailing your followers and the rest around your first launch.</p>
        <p><b>When a membership ends, the tools switch off and nothing public disappears.</b> Your page, your work, your launches, their places and your followers stay. A Support link is kept and hidden until a membership resumes.</p>
        <p><b>Support is your own link.</b> The button opens your Ko-fi, PayPal or similar in a new tab. Author Hunt handles no money between readers and authors and takes no part of a gift.</p>
        <p><b>Cancel whenever you like,</b> from this page. The tools stay on to the end of the month or year already paid for. Prices are in US dollars.</p>
        <p>The fuller wording is in the <Link className="word" href="/terms">terms</Link>.</p>
      </section>
    </main>
  );
}
