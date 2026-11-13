# Author Hunt: how it makes money

**Status: under discussion, November 2026.** The first plan made the $5
membership a condition of launching after thirty days. The owner's concern
is that a mandatory fee gives an empty app, and that the card fees on
Support are too high. This file sets out the options and a recommendation.
Nothing here is decided until the owner says so; when it is, the decision
moves into docs/development.md §6 and AGENTS.md's rules.

## 1. The membership

### Why mandatory is the wrong shape

The board is only worth visiting if it is full, and it is only full if
launching costs nothing. Product Hunt, which this follows, charges nothing
to launch; as far as public reporting shows, its money comes from promoted
placements and advertising, and it has tried paid extras on top. A fee at
the door also lands hardest on exactly the authors the site is for: new
ones with no sales yet.

### Recommended: free to launch, paid for the tools around a launch

| | Free, for good | Member ($5 a month, $40 a year) |
|---|---|---|
| Author page, books, images, links | yes | yes |
| Launch the page; launch each book | yes | yes |
| Cheers, comments, follows, threads | yes | yes |
| Appear in boards, the directory, filters, the letter | yes | yes |
| **Email your followers** on launch day and for updates | no | yes |
| **Coming-soon page** that collects "tell me" sign-ups, with the list exportable | a page, no list | yes |
| **Analytics:** views, where readers came from, which buy links were pressed | last 7 days, totals only | full, all time |
| **Launch tools:** schedule far ahead, reschedule, a second pinned comment, a launch-day checklist | basic | yes |
| **The page as a link-in-bio:** unlimited links, sections you can order, a newsletter sign-up box | 5 links | yes |
| **Share kit:** stickers, cards and badges in every shape | one of each | yes |
| **Support fee** (if Author Hunt processes gifts, see §2) | standard | reduced or none |
| Rank, Momentum, placement | never | never |

What decides it: nothing a reader sees first is paid for. A member gets
better tools for reaching the readers they have earned, and never a better
place on the board. Rule 2 (rank can't be bought) stays whole.

The strongest of these is the first row. An author's followers on Author
Hunt are an audience; emailing them is the thing an author will pay $5 for,
and it costs little to send.

Thirty days free still makes sense, as a trial of the member tools rather
than a countdown to a wall. No card is taken.

### Other shapes considered

- **Mandatory after thirty days** (the first plan). Simple, and empties the
  board. Not recommended.
- **Free page, pay per launch** ($3 to $5 a launch). Earns from the moment
  of highest intent, but puts a toll on the one act the site needs most.
- **Free for the first book, paid from the second.** Gentle, but punishes
  the most productive authors, who are the best content.
- **Free for everyone, with no membership at all,** living on §3 alone.
  Honest about being a funnel for Lorec; leaves the easiest money unasked
  for.

## 2. Support (gifts) and its fees

The card fee is the floor nobody escapes: about 2.9% + 30¢ on every card
payment in the US, whoever processes it. On a $3 gift that is 39¢ (13%); on
$5, 45¢ (9%). What can be changed is everything stacked on top of it.

| Option | Who processes | Author Hunt's cost | Author Hunt's work | Author Hunt can earn |
|---|---|---|---|---|
| **A. The author's own link** (Ko-fi, Buy Me a Coffee, PayPal, Venmo, Patreon, their own Stripe link) | the other service | nothing | a field and a button | nothing |
| **B. Stripe Connect, Stripe bills the author** (the author has a full Stripe account; the charge is made on it) | Stripe, on the author's account | nothing: no monthly or payout fees to the platform | medium: onboarding, a checkout, webhooks | an application fee per gift, if wanted |
| **C. Stripe Connect, Author Hunt bills** (the first plan: Express-style accounts, destination charges) | Stripe, on Lorec's account | about $2 per paid-out author per month, plus 0.25% + 25¢ per payout, plus liability for refunds and disputes | most | an application fee |
| **D. A stored balance** (readers load $10, give from it in small amounts) | Author Hunt | fewest card fees | holding other people's money: licensing and regulatory questions | float |

Notes:

- **A costs nothing and can ship at launch.** Ko-fi is reported to take no
  cut of one-time tips on its free plan; Buy Me a Coffee is reported at 5%
  (both checked November 2026 from third-party pages; the card fee applies
  on both). Many authors already have one. The reader leaves the site to
  give, and Author Hunt sees nothing of it, so there are no "supporters"
  to show and no fee to earn.
- **B removes the fees that made the first plan expensive.** Stripe's
  Connect pricing page says that when Stripe bills connected accounts
  directly there are "no fees for your platform": no per-account, payout or
  tax-reporting charge. The card fee comes out of the gift on the author's
  side. The price is onboarding: the author makes a real Stripe account
  (identity, bank, tax), and Stripe, not Lorec, carries the losses. In
  Stripe's terms: direct charges, the connected account pays Stripe's fees,
  Stripe is liable for negative balances, full dashboard.
- **C is what was planned, and it is the dear one.** It only pays for
  itself with a platform fee near 10% and payouts held to a threshold.
- **D is not worth it.** Holding balances for others brings money-
  transmission questions that a side feature shouldn't take on.
- **Lower-fee ways to pay** exist inside Stripe (bank debit is priced as a
  small percentage with no fixed 30¢, which suits small gifts), at the cost
  of slower settlement and a different failure pattern. Worth turning on
  under B or C once gifts are flowing; Stripe chooses which methods to show
  per customer if the integration leaves that to the Dashboard.
- Under any option, raising the minimum to $5 and letting the giver choose
  to cover the fee both help more than any change of processor.

**Recommended:** A at launch (a "Support" button that opens the author's
own link, with a line saying it leaves the site). B later, if authors ask
for gifts that stay on Author Hunt, with a small application fee that
members don't pay. C and D not at all.

## 3. Money that doesn't come from authors

In rough order of fit:

1. **Lorec itself.** Author Hunt is where authors and readers meet Lorec:
   "Written in Lorec" on a book, the writing record beside the AI
   declaration, and, once it opens, the Writers Pass. An author who joins
   Lorec is worth more than a year of $5. This may be the real business,
   with the rest paying for the servers.
2. **Promoted placements,** as Product Hunt sells them: a row in the board
   marked "Promoted", unranked, and the same in the Sunday letter. For
   services authors buy (editors, cover designers, retreats, printers,
   conferences), not for books, so no author can pay for a place among
   launches. Sold by hand at first.
3. **The Sunday letter's sponsor.** One per issue, labelled.
4. **Bookshop links.** An affiliate cut where a bookshop offers one,
   disclosed on the page, with every shop the author lists shown equally.
   Small money, and it must never reorder an author's own links.
5. **Later:** a paid listing for author services, featured "book of the
   month" picks chosen editorially and never sold.

## 4. What needs deciding

1. Free to launch, with the member tools above? (Recommended.)
2. Which rows of the table are member-only. The first three carry it.
3. Keep $5 and $40, or raise once the email tool exists.
4. Support: A now, B later? And the minimum, $3 or $5.
5. Promoted placements: allowed at launch, or held until there's traffic.
6. Once decided: rule 3 in AGENTS.md ("a page outlives its plan") becomes
   simpler, since no page ever depended on a plan, and `authorAccess()`
   turns from a gate into a feature check.
