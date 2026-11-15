/**
 * app/(site)/terms/page.tsx
 *
 * The terms, as a DRAFT for a lawyer's review (docs/setup-checklist.md §11).
 * The product rules here are the owner's and are settled (AGENTS.md rules 1
 * to 7); the legal wording around them is not. The notice at the top stays
 * until a lawyer has read the page.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PRICE, TRIAL_DAYS } from "@/lib/billing/access";

const description = "Author Hunt's terms: what the three AI declarations mean, who owns what you upload, the rules on cheers, and how a membership renews and is cancelled.";

export const metadata: Metadata = {
  title: "Terms",
  description,
  alternates: { canonical: "/terms" },
  openGraph: { title: "Author Hunt: terms", description, url: "/terms" },
};

const MONTHLY = `$${PRICE.monthly.toFixed(2)}`;
const YEARLY = `$${PRICE.yearly}`;
// Placeholders the owner fills in before opening.
const TAKEDOWN = "takedown@authorhunt.com";
const CONTACT = "hello@authorhunt.com";

export default function Terms() {
  return (
    <main className="wrap legal">
      <header className="page-head">
        <h1>Terms</h1>
        <p>The rules for using Author Hunt, in plain words.</p>
      </header>
      <p className="notice warn" role="note"><b>Draft.</b> This page is a draft waiting for a lawyer&apos;s review. It describes how Author Hunt is meant to work, and it is not yet the final agreement. The addresses on it are placeholders.</p>

      <div className="prose">
        <h2>1. What Author Hunt is</h2>
        <p>Author Hunt is a daily board where authors launch their pages and their work, and readers find them. Reading it is free and needs no account. An account is asked for when you do something: cheer, follow, save, comment, or make a page.</p>
        <p>By using Author Hunt you agree to these terms. If you don&apos;t agree, please don&apos;t use it.</p>

        <h2>2. Accounts</h2>
        <p>One person, one account. You are responsible for what is done with yours. You must be old enough to agree to these terms where you live, and at least 13. Work marked Mature is for adults only.</p>
        <p>An author is an account that has made a page. A page is one author&apos;s or one publication&apos;s. A pen name is fine. Using another living author&apos;s name, or passing yourself off as someone you are not, is not.</p>

        <h2>3. How your work was written: the AI declaration</h2>
        <p>Before a page can be made public, and before any work can be added, you choose one of three statements. It is shown on the page and readers can filter by it.</p>
        <dl>
          <div><dt>Written without AI</dt><dd>No AI model drafted, rewrote or translated any passage of the text. Spelling and grammar checkers don&apos;t count as AI here.</dd></div>
          <div><dt>Written with AI assistance</dt><dd>An AI model drafted, rewrote or translated passages of the text, and the work as a whole is yours.</dd></div>
          <div><dt>Written by AI</dt><dd>The text was mostly produced by an AI model.</dd></div>
        </dl>
        <p>You may change a declaration later. Changes are recorded.</p>
        <p><b>A false declaration ends in a ban.</b> If work is declared as written without AI, or with assistance, and that is found to be untrue, the page is banned, its launches are removed from the boards, and the account can&apos;t make another page.</p>
        <p>That decision is made by a person, on evidence a person can point to: your own statements, drafts you can or can&apos;t show, a writing record, model boilerplate left in the text. <b>The score of an AI detector is never the ground for a decision.</b> Before anything is decided you are told what was reported and have seven days to answer. Every step is logged. You have one appeal, in writing, within thirty days of the decision.</p>

        <h2>4. What you upload</h2>
        <p>Your work stays yours. Text, covers, portraits and anything else you put on Author Hunt remain your property, or the property of whoever licensed them to you.</p>
        <p>By uploading something you give Author Hunt permission to store it, show it on the site, resize it, and use it in the places a launch appears: boards, search results, link previews, the Sunday letter, and the stickers, cards and badges made for sharing. That permission ends when you delete the item or your account, apart from copies in backups for a short time and emails already sent.</p>
        <p>Only upload what you have the right to. That includes the cover, the excerpt and any photograph of a person.</p>

        <h2>5. Cheers, and what may not be done for them</h2>
        <p>A cheer is one account&apos;s support for one launch. It is free. Each account has one cheer per launch, and none for its own.</p>
        <p>Cheers decide the order of each day&apos;s board, so they must be honest. You may tell people that you have launched and where. You may not:</p>
        <ul>
          <li>ask for cheers in exchange for anything: money, gifts, reviews, cheers in return;</li>
          <li>buy, sell or trade cheers, follows or comments;</li>
          <li>use more than one account, or automated accounts, to cheer;</li>
          <li>organise groups whose purpose is to cheer for each other&apos;s launches.</li>
        </ul>
        <p>Cheers that break these rules are discounted. Doing it at scale is a reason for a ban.</p>
        <p><b>Rank can&apos;t be bought.</b> No membership, free period or Support link enters a score, and Author Hunt sells no place among launches.</p>

        <h2>6. The membership</h2>
        <p>Making a page, launching it and launching every work is free and stays free. A membership is optional. It adds tools around a launch: emailing your followers, the coming-soon list, full analytics, a Support button, unlimited links and the full share kit. The <Link className="word" href="/pricing">pricing page</Link> lists them.</p>
        <ul>
          <li><b>Price.</b> {MONTHLY} a month or {YEARLY} a year, in US dollars. Tax may be added where the law requires it.</li>
          <li><b>The first {TRIAL_DAYS} days.</b> A new page has the member tools free for {TRIAL_DAYS} days. No card is taken and nothing is charged when they end.</li>
          <li><b>Renewal.</b> A membership renews at the end of each month or year, at the price then current, until you cancel. If a price is going to change you are told by email before your next renewal.</li>
          <li><b>Cancelling.</b> You cancel from the pricing page, which opens the payment provider&apos;s portal. Cancelling stops the next renewal.</li>
          <li><b>What happens then.</b> The member tools stay on until the end of the period already paid for, then switch off. Nothing public disappears: your page, your work, your launches and their places, and your followers all stay. A Support link is kept and hidden until a membership resumes.</li>
          <li><b>Refunds.</b> Payments already made are not refunded for part of a period, except where the law says they must be.</li>
        </ul>
        <p>Payments are handled by Stripe. Author Hunt never sees or stores your card number.</p>

        <h2>7. Support links</h2>
        <p>A member may add one Support link to their own page on another service, such as Ko-fi or PayPal. The button opens that service in a new tab.</p>
        <p><b>A Support link leaves Author Hunt, and Author Hunt handles no money.</b> A gift is between the reader and the author, on the other service&apos;s terms. Author Hunt takes no part of it, can&apos;t refund it, and isn&apos;t responsible for the other service. Support never affects a launch&apos;s place.</p>

        <h2>8. Mature work and content notes</h2>
        <p><b>Mature</b> is a mark you must put on a page or a work that has explicit sex, graphic violence, or anything else not for under-18s. Marked work is blurred until a reader confirms they are an adult, and is left out of boards and feeds for signed-out visitors, of link previews and of the Sunday letter.</p>
        <p><b>Content notes</b> are your list of things a reader may want to know first. They are shown only when a reader asks to see them.</p>
        <p>A missing Mature mark or a missing note can be reported. The usual fix is to add it. Repeated refusal is a reason for a ban.</p>

        <h2>9. Comments and conduct</h2>
        <p>Say what you think of the work, and be civil to the person. No harassment, no hate, no threats, no spam, nobody else&apos;s private details. Plagiarism and impersonating another author are reasons for a ban.</p>

        <h2>10. Reports, suspensions and bans</h2>
        <p>Every page, launch and comment can be reported. A person reviews each report. Author Hunt may remove an item, take a launch off the board, suspend a page while a serious report is decided, or ban an account. You are told what was decided and why. A ban on Author Hunt is about Author Hunt only.</p>

        <h2>11. Copyright and takedowns</h2>
        <p>If something on Author Hunt is yours and is here without your permission, write to <a className="word" href={`mailto:${TAKEDOWN}`}>{TAKEDOWN}</a> (a placeholder address until opening). Say what the work is, where it appears on Author Hunt, how to reach you, and that you are the owner or act for them. The item is taken down while it is looked at, and the person who posted it is told and may answer.</p>

        <h2>12. The service</h2>
        <p>Author Hunt is provided as it is. It may change, and parts of it may stop. It is not promised to be free of faults or always available, and to the extent the law allows, Author Hunt is not liable for losses that follow from using it. Nothing here limits rights you have by law that can&apos;t be limited.</p>
        <p>You may delete your account at any time. The <Link className="word" href="/privacy">privacy page</Link> says what happens to your data.</p>

        <h2>13. Changes to these terms</h2>
        <p>If these terms change in a way that matters, people with accounts are told by email before the change takes effect.</p>

        <h2>14. Contact</h2>
        <p><a className="word" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>

        <p className="dated">Draft of November 2026. Not yet in force.</p>
      </div>
    </main>
  );
}
