/**
 * app/(site)/privacy/page.tsx
 *
 * The privacy notice. What it says the app does is what the app does: keep it
 * true when either changes. The waiting list's sign-up form links here
 * ("What we keep"), so it is public before the site opens.
 */

import type { Metadata } from "next";
import Link from "next/link";

const description = "What Author Hunt keeps, what is public, what is emailed, and how to delete an account.";

export const metadata: Metadata = {
  title: "Privacy",
  description,
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Author Hunt: privacy", description, url: "/privacy" },
};

const CONTACT = "hello@authorhunt.com";

export default function Privacy() {
  return (
    <main className="wrap legal">
      <header className="page-head">
        <h1>Privacy</h1>
        <p>What Author Hunt keeps about you, who can see it, and how to remove it.</p>
      </header>

      <div className="prose">
        <h2>The short version</h2>
        <ul>
          <li>Reading Author Hunt needs no account and sets no tracking cookies.</li>
          <li>What an author puts on a page is public. What a reader cheers for and says is public. What a reader saves is private unless they share it.</li>
          <li>Your email address is never shown on the site and never sold.</li>
          <li>You can turn off any email yourself, and have your account deleted by asking.</li>
        </ul>

        <h2>What is public</h2>
        <ul>
          <li><b>An author&apos;s page:</b> the name, portrait, bio, city as the author states it, genres, links, works, the AI declaration, updates and launches.</li>
          <li><b>Launches:</b> their cheers as a count, their comments, and their place on the day&apos;s board.</li>
          <li><b>Comments:</b> the words, with your display name and picture.</li>
          <li><b>Follower counts,</b> as numbers.</li>
          <li><b>A collection</b> you have chosen to share.</li>
        </ul>
        <p>Public pages can be found by search engines and shown in link previews. Work marked Mature is left out of previews.</p>

        <h2>What is private</h2>
        <ul>
          <li>Your email address.</li>
          <li>Your collections, including Saved, unless you share one.</li>
          <li>Your notifications and your settings.</li>
          <li>Reports you make. The person reported is told what was reported, not by whom.</li>
          <li>An author&apos;s analytics, and whether an author has a membership.</li>
        </ul>

        <h2>What is emailed</h2>
        <ul>
          <li><b>Notifications</b> you have asked for: a comment or reply, your launch going live and finishing, an author you follow launching, a decision on a report. Several at once arrive as one email. Cheers, new followers and updates are kept for one summary in the evening.</li>
          <li><b>&ldquo;Tell me when it launches.&rdquo;</b> One email on the day, and the request is then deleted. If you left a bare address, it is deleted with it. Until then, an author with the member tools can see the list of people who asked about their own launch, so ask only if you are content for that author to have your address.</li>
          <li><b>The Sunday letter,</b> if you subscribed to it, or have an account and follow or have cheered for someone. Every letter says how to stop it.</li>
          <li><b>Emails from an author you follow,</b> sent through Author Hunt. The author never sees your address.</li>
          <li><b>Things we must tell you:</b> a decision about your account, a change to the terms, a receipt.</li>
        </ul>
        <p>Each kind can be turned off in <Link className="word" href="/settings">your settings</Link>. Apart from decisions, nothing is sent late at night.</p>

        <h2>The waiting list before opening</h2>
        <p>If you joined the list before Author Hunt opened, we kept your address, whether you said you were an author or a reader, and which link brought you. It is used for two emails: one asking you to confirm the address (with a single reminder if you didn&apos;t), and one on opening day inviting you to make your account. If the same address is entered again, it is sent a short email saying where it stands, at most once an hour. An address that is never confirmed is dropped. To be taken off the list, write to the address at the foot of this page.</p>

        <h2>Signing in</h2>
        <p>Author Hunt has its own accounts. The sign-in service (Clerk) holds your email address, your name and picture, and how you sign in. Your page, cheers, follows, comments and collections are kept in Author Hunt&apos;s own database.</p>
        <p>Author Hunt is made by the people who make Lorec, a writing app. The two are separate: an account here is not a Lorec account, and neither reads the other&apos;s data.</p>

        <h2>Page analytics, without cookies</h2>
        <p>Author Hunt counts page views and presses on outbound links itself, so authors can see how their pages are doing. A count records the page, the day, the site you came from and the link pressed. It records no name, no account, no IP address and no identifier that follows you from page to page, and it sets no cookie. That is why there is no cookie banner.</p>
        <p>The only cookies are the ones that keep you signed in, and one that remembers you have seen the site before it opened, if you were given a preview link.</p>
        <p>To stop misuse, requests are rate limited by IP address for a few minutes at a time. Those addresses aren&apos;t kept.</p>

        <h2>Payments</h2>
        <p>A membership is paid through Stripe. Author Hunt keeps the state of the membership (whether it is running, monthly or yearly, and when the paid period ends) and never sees your card number. Support links open another service; Author Hunt sees nothing of a gift.</p>

        <h2>Who else handles your data</h2>
        <p>Services that run Author Hunt for us, each only for its job: hosting (Vercel), the database (Supabase), sign-in (Clerk), payments (Stripe), email (Resend), rate limiting (Upstash). None of them may use your data for their own purposes. We don&apos;t sell personal data and show no advertising based on it.</p>

        <h2>How to delete an account</h2>
        <p>Write to the address below, from the address on the account. Your sign-in, page, works, launches, cheers, follows, comments, collections and notifications are deleted, and a running membership is cancelled.</p>
        <p>Deletion is permanent. Copies in backups go as the backups expire. A record that a decision was made about a banned page is kept, so the ban holds.</p>

        <h2>Your rights</h2>
        <p>Wherever you live, you can ask for a copy of what we hold about you, ask us to correct it, or ask us to delete it. Write to the address below and we will answer within thirty days.</p>

        <h2>Children</h2>
        <p>Author Hunt is not for children under 13, and work marked Mature is for adults only.</p>

        <h2>Contact</h2>
        <p><a className="word" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>

        <p className="dated">Last updated November 2026.</p>
      </div>
    </main>
  );
}
