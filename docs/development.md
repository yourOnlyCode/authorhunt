# Author Hunt: development plan

What gets built, how it fits together, and in what order. Decisions marked
**Open** are the owner's to make; each has a default the build proceeds on.

## 1. What it is

A daily launch board for authors and books.

- **Authors** make a page, launch it, and launch each book. What they make
  and how the community responds earns Momentum, which decides where they
  sit in the feeds.
- **Readers** browse today's launches, filter the directory (genre, city,
  "for readers of", "inspired by"), follow authors, save them to
  collections, support them with a gift, and get a feed and a weekly email
  shaped by who they follow and cheer.
- **Lorec** runs it and takes the payments, and the two share a sign-in.
  Author Hunt has its own name, domain (authorhunt.com) and look.

The words for all of this are in [ontology.md](ontology.md). Read it before
naming anything.

## 2. Architecture

The same stack as Lorec, minus everything the desktop app forced on it.

| Part | Choice | Note |
|---|---|---|
| Framework | Next.js 16 App Router, React 19 | Server components and ISR for every public page. |
| Hosting | Vercel, functions in `iad1` | Same region as the database. |
| Database | Supabase Postgres, `us-east-1`, **its own project** | Drizzle schema, SQL migrations. |
| Auth | Clerk, **Lorec's instance**, as a satellite domain | See "Accounts" below. |
| Payments | Stripe, **Lorec's account**, own product and webhook | See "Billing". |
| Email | Resend, React Email | Launch-day mail and the weekly digest. |
| Rate limits | Upstash | Cheers, comments, sign-ups, public reads. |
| Images | Vercel Blob | Covers and portraits, resized on upload. |
| Jobs | Vercel Cron | Hourly momentum, daily board close, weekly digest. |
| Tests | Vitest | Pure logic first: ranking, access, link policy. |

```
app/
  (public)/            every page a reader can see signed out
    page.tsx           today's board
    day/[date]/        a past day
    author/[handle]/   an author's page
    book/[slug]/       a book's page
    authors/           the directory and its filters
    genre/[slug]/  city/[slug]/  for-readers-of/[slug]/  inspired-by/[slug]/
    pricing/
  (app)/               signed in
    for-you/  collections/  studio/ (the author's side)
  api/
    cheers/ follows/ comments/ launches/ updates/ collections/ gifts/ uploads/
    stripe/checkout/ stripe/portal/ stripe/webhook/
    cron/momentum/ cron/close-day/ cron/digest/
    badge/[handle]/    the embeddable badge (SVG)
    sticker/[handle]/  the picture for video (PNG)
  [handle]/            the short link, redirects to the author's page
  sitemap.ts  robots.ts
lib/
  db/schema/  ranking/  billing/  discover/  seo/  emails/  auth/
components/
  ui/  board/  author/  book/  studio/
```

### Accounts

One account type. Anyone can cheer, follow, save and give; an account
becomes an author when it creates a page. A person can be both.

**Sign-in is Lorec's Clerk instance** (the owner's call, November 2026), so
one account works on both. authorhunt.com is a different domain from
lorec.io, which makes it a Clerk *satellite domain*: lorec.io stays the
primary, holds the session, and authorhunt.com reads it.

- Clerk's pricing page lists satellite domains on the Pro plan at $10 a
  month each (checked November 2026; confirm on clerk.com/pricing).
- Setup: add the satellite in Clerk's dashboard, add the `clerk` CNAME on
  authorhunt.com, and set `isSatellite`, the domain and the primary's
  sign-in URL in Author Hunt's Clerk config. Sign-in happens on the primary
  and returns, so Lorec's sign-in pages need Author Hunt's URLs in their
  allowed redirects, and should say where the visitor is headed.
- **Sharing an instance means sharing its settings and its users.** Author
  Hunt never edits Clerk metadata Lorec reads (the plan, the ambassador
  code), and keeps its own under an `authorhunt` key. A reader who signs up
  on Author Hunt becomes a Clerk user Lorec's webhook also hears about:
  check that Lorec's `user.created` handler is content to make a free Lorec
  row for them, or skips sign-ups that came from Author Hunt.
- Author Hunt still has its own database. Its `users.id` is the Clerk id,
  so a Lorec account and an Author Hunt account are the same person by
  construction, with no matching by email.

The domain is **authorhunt.com**.

## 3. Data model

```
users             id (Clerk), email, display_name, created_at
authors           id, user_id, handle, pen_name, bio, portrait_url, city, region,
                  country, website, links jsonb, site_verified_at, lorec_handle,
                  ai_use (none|assisted|generated), ai_declared_at,
                  standing (good|suspended|banned), claim_state (later),
                  mature bool, trial_ends_at, momentum numeric,
                  follower_count, launched_at, created_at
books             id, author_id, slug, title, tagline, description, cover_url,
                  status (upcoming|out), pub_date, isbn, buy_links jsonb,
                  excerpt, ai_use (none|assisted|generated), made_with_lorec bool,
                  mature bool
launches          id, kind (author|book), author_id, book_id null, launch_day date,
                  status (scheduled|live|closed), cheer_count, comment_count,
                  score numeric, rank_day int null, rank_week int null
cheers            user_id, launch_id, weight, created_at     unique (user_id, launch_id)
follows           user_id, author_id, created_at             unique
comments          id, launch_id, user_id, parent_id null, body, created_at, removed_at
updates           id, author_id, book_id null, kind, body, created_at
collections       id, user_id, name, slug, is_public, created_at
collection_items  collection_id, author_id null, book_id null, created_at
                  exactly one of author_id and book_id; unique per collection
gifts             id, from_user_id, author_id, launch_id null, amount_cents,
                  fee_cents, stripe_payment_intent_id, status, note, created_at
payout_accounts   author_id, stripe_account_id, charges_enabled, payouts_enabled
images            id, owner_user_id, kind (portrait|cover|update), blob_url,
                  width, height, bytes, removed_at
notify_requests   email or user_id, launch_id                "tell me when it launches"
genres            id, slug, name, parent_id null
author_genres     author_id, genre_id
book_genres       book_id, genre_id
reference_authors id, slug, name            the well-known names: "Ursula K. Le Guin"
author_references author_id, reference_id, kind (readers_of|inspired_by)
point_events      id, author_id, kind, points, created_at    append-only ledger
subscriptions     author_id, stripe_customer_id, stripe_subscription_id, status,
                  interval, current_period_end
comps             user_id, reason (admin|founding), until null
reports           id, reporter_id, target_kind, target_id, reason, resolved_at
site_events       the page's own analytics: views and outbound clicks per page
```

Notes:

- `reference_authors` is what makes "similar to" and "inspired by" filters
  and pages rather than free text. An author picks up to five of each, with
  type-ahead over the existing rows; a new name is added on save and checked
  by an admin before it gets a public page.
- City is stored as `city`, `region`, `country` plus a slug. No geocoding or
  maps at launch.
- `launches.score` and the rank columns are written by the ranking code, so
  the board is `WHERE launch_day = $1 ORDER BY score DESC` on one index.

## 4. Launches and the daily board

- **Launching a page.** Once the page has a portrait, a bio, a genre and at
  least one book or link, the author picks a day. Their page goes on that
  day's board. An author can launch their page once.
- **Launching a book.** Any number, at most one a day per author, and a book
  launches once. A scheduled launch has a public "coming soon" page where a
  reader leaves an address to be told (`notify_requests`); those readers get
  one email on the morning.
- **The day** runs midnight to midnight in `America/New_York`. At 00:05 the
  `close-day` job writes final ranks, awards the day's top three, and opens
  the next board.
- **The first four hours** show the day's launches in a shuffled order with
  no counts. *Why:* the earliest launch otherwise wins on a head start, and
  authors in other time zones never catch up.
- Weekly and monthly boards are queries over closed days, not new machinery.

### Launch score (one day)

```
score = Σ cheer.weight + 2 × (distinct commenters who aren't the author)

cheer.weight = 0    the author's own account
             = 0.5  an account under 7 days old with no other activity
             = 1    everyone else
```

### Momentum (the author's standing)

"The more they create, the more points their page gets." Every creating or
supporting act writes a row to `point_events`; Momentum is the decayed sum.

| Act | Points | Limit |
|---|---|---|
| Launch a book | 50 | one a day |
| Launch the page | 30 | once |
| Finish the page (portrait, bio, genres, references, a link) | 20 | once |
| Post an update (a cover, an excerpt, an event, progress) | 10 | one a day counts |
| A reader follows | 3 | |
| A cheer received | 2 × its weight | |
| Reply to a reader on your own page | 2 | five a day |
| Cheer or comment on another author's launch | 1 | ten a day |

```
momentum = Σ points × 0.5 ^ (age_in_days / 30)
```

A thirty-day half-life means a newcomer who is active this month can pass a
bigger name who has gone quiet, which is the point of the product. The
hourly job recomputes `authors.momentum` for authors with events in the last
day and for anyone whose score is still decaying. The numbers are a first
guess: they live in one file (`lib/ranking/points.ts`) so they can be tuned
after a week of real use.

**Later, worth planning for:** writing in Lorec as a source of points (a
streak or a finished chapter from the writing record). It ties "the more you
create" to actual writing rather than posting, and it is a reason to use
Lorec that no competitor can copy.

## 5. Discovery

- **Directory filters** (`/authors`): genre, city, for readers of, inspired
  by, and "launched this month". Filters are query parameters on one
  server-rendered page, sorted by Momentum.
- **Landing pages** for each filter value: `/genre/cozy-fantasy`,
  `/city/raleigh-nc`, `/for-readers-of/ursula-k-le-guin`,
  `/inspired-by/shirley-jackson`. These are what a reader's search finds
  ("authors like Ursula K. Le Guin"), so each has its own title, intro line
  and canonical URL. One with fewer than five authors is `noindex` and left
  out of the sitemap until it fills.
- **For you** (signed in). No model, three SQL sources merged and ranked:
  1. new launches and updates from authors you follow;
  2. authors who share genres or reference authors with the ones you follow
     or have cheered, weighted by overlap and Momentum;
  3. authors cheered by readers who cheered what you cheered.
  A reader with no history gets asked for three genres and one or two
  authors they love (matched to `reference_authors`), which fills the feed
  from the first visit.
- **Collections.** A reader saves authors and books into named lists
  ("Fantasy to read", "Local authors"). Every account starts with one,
  "Saved", so Save is a single press; naming more is optional. A collection
  is private until its owner shares it, and a shared one has its own page
  and link. Saves feed For you and the weekly email. A save is not a cheer
  and earns no points: it's the reader's own list, not a public signal.
- **The weekly email** (Sunday morning): the week's top launches in your
  genres, new books from authors you follow, and what's coming. This is the
  main reason a reader returns, so it ships with the first version.

## 6. Billing

- **Thirty days free, no card.** `authors.trial_ends_at` is set when the
  page is created. Nothing in Stripe exists for an author until they choose
  to pay.
- **$5 a month or $40 a year.** One Stripe product ("Author Hunt") with two
  prices, in Lorec's account. Checkout is Stripe Checkout; managing and
  cancelling is the Stripe customer portal.

```ts
// lib/billing/access.ts: the only place that answers "can this author act?"
authorAccess(author, now) -> "trial" | "member" | "comp" | "lapsed"
```

| | Trial, member, comp | Lapsed |
|---|---|---|
| Page, books, past launches public and indexed | yes | yes |
| Links on the page | yes | yes |
| Launch, post updates, reply as the author | yes | no |
| Analytics (views, link clicks, where readers came from) | yes | no |
| Earn new Momentum from creating | yes | no (it decays) |

"Lapsed" is this document's word for an author whose thirty days ran out,
or who cancelled, and who isn't paying. The table is what they keep and
lose. Readers aren't told a page is lapsed.

**Open: confirm the table.** The alternative, hiding the page, would break
the author's links and shrink what readers find.

### Sharing Lorec's Stripe account safely

- Every customer, subscription and checkout session Author Hunt creates
  carries `metadata.app = "authorhunt"`. Author Hunt's webhook endpoint
  subscribes to the subscription and checkout events and drops any without
  it.
- Author Hunt never reuses a Lorec customer id.
- **Check before the first live charge:** Lorec's webhook
  (`app/api/billing/webhooks/route.ts`) receives every subscription event in
  the account and maps the price to a plan with `getPlanFromPriceId`. Read
  what it does with a price it doesn't know, and with a customer it has no
  user for, and add an early return on `metadata.app` if there is any doubt.
  This has not been verified yet. A test-mode subscription to the Author
  Hunt price, with Lorec's test webhook listening, settles it.

### The Writers Pass: a to-do for the pass, not for this app

The owner's call, November 2026: Writers Pass members get Author Hunt at no
charge, in full, **from the day the pass opens and not before**. Until
then Author Hunt says nothing about it: no line on the pricing page, no
"free with the pass", no comp for the wait list.

To do when the pass opens (summer 2027), recorded here so it isn't lost:

- Add `pass` as a `comps.reason`. Because sign-in is shared, a pass member
  is the same Clerk user here, so the comp is granted by user id.
- Lorec tells Author Hunt when a membership starts or ends: a signed
  webhook from Lorec's billing code, or a daily read of a small signed
  Lorec endpoint. A member who is already paying $5 has their Author Hunt
  subscription cancelled at period end, and is told.
- Add Author Hunt to the pass page as a perk (a key in `HERO_KEYS` and its
  tile, per Lorec's AGENTS.md), and only then mention the pass here.

## 6a. Support (gifts to authors)

A reader, or another author, can give an author money from the author's
page and from a launch on the board.

- **Stripe Connect, Express accounts,** on Lorec's Stripe account. An
  author who wants Support turns it on in Studio and completes Stripe's
  onboarding (identity, bank, tax details). Until `payouts_enabled`, no
  Support button shows on their page. Stripe handles the tax forms.
- **A gift is a destination charge** with an application fee: the giver
  pays, Stripe takes its card fee, Author Hunt takes its fee, the rest goes
  to the author's connected account. `metadata.app = "authorhunt"` and
  `metadata.kind = "gift"` on every one.
- **Amounts:** $3, $5, $10, or the giver's own from **$3** up to $500. The
  floor is $3 because the card fee has a fixed 30¢ in it: on $2 that is
  18% gone before anyone is paid; on $3 it is 13%; on $5, 9%.
- **The page says what the author receives** before the giver pays ("Of $5,
  Maren receives about $4.30"), and an optional box lets the giver cover
  the fees.
- **Support is never Cheer.** A gift doesn't move a launch's score or an
  author's Momentum, and a giver's name is shown only if they choose.
  *Why:* rule 2. If money moved rank, rank would be for sale.
- Givers need an account with a verified email, and gifts are rate limited
  per account, card and IP. Small open payment forms are what card thieves
  use to test stolen numbers; Stripe Radar is on, and an author's first
  gifts are held for a few days before payout.
- A lapsed author keeps receiving Support. The page stays, so the button
  stays.

**Open: the platform fee.** The figures in the mock assume 5%. What Stripe
charges the platform matters here (from Stripe's Connect pricing as
reported in November 2026; confirm on stripe.com/connect/pricing): about $2
for each connected account in a month when it's paid out, plus 0.25% + 25¢
per payout. An author who receives one $3 gift in a month would cost more
to pay than the fee earns. So pay out monthly, and only once a balance
passes about $25, and set the fee with that in mind: 5% roughly breaks even
on small accounts; 8 to 10% covers them.

**Open: where it works.** Connect payouts depend on the author's country.
Launch with the United States, then add countries as authors ask.

## 7. Outbound links and search

Authors link wherever they sell and write: their own site, any bookshop,
any newsletter, any social account. Author Hunt favours no store.

What a backlink from Author Hunt is, said plainly: a link from a new domain
is worth little on day one and grows as the site earns its own standing.
What the site can do from the start is make each page a clean, crawlable
record of who the author is, and link out honestly.

- **Every public page** is server-rendered at a stable URL, in the sitemap,
  with a canonical URL, a real title and description, and an Open Graph card
  generated per author and per book.
- **Structured data.** An author page carries `ProfilePage` and `Person`
  JSON-LD with `sameAs` listing their site and profiles; a book page carries
  `Book` with author, ISBN and offers. This is how search engines and AI
  assistants connect a pen name to its site and its books.
- **Link policy** (`lib/seo/links.ts`, one pure function, tested):

| Link | `rel` |
|---|---|
| Author's website, once verified | followed |
| Author's website, unverified | `nofollow` |
| Author's other profiles (newsletter, social) | `me nofollow` until verified, then `me` |
| Buy links to bookshops | followed |
| Any link inside a comment or an update's text | `ugc nofollow` |

- **Verifying a site** is the two-way link: the author adds a link to their
  Author Hunt page (or the badge) on their site, and we check for it. That
  proves the page is theirs, lets us follow the link back, and gives Author
  Hunt a link from a real author's site. It's the same exchange Product Hunt
  makes with its badges.
- **`rel` never depends on plan.** A followed link is for a verified site,
  whatever the author pays. See rule 4 in AGENTS.md.
- **Outbound clicks are counted with a beacon, not a redirect.** Links are
  plain `<a href>` to the real address; a click sends `navigator.sendBeacon`
  to `site_events`. A `/out?url=` redirect would be easier to count and
  would throw away the link.
- **The badge** (`/api/badge/[handle]`): "Featured on Author Hunt", and
  "#1 of the day" for those who earn it. An SVG the author embeds with a
  link to their page.
- `robots.ts` allows everything public; `llms.txt` describes the site for AI
  crawlers.

### Sharing a page on video

What an author wants is the link sticker a shop gets on a TikTok or a
Reel. What the platforms allow today, as far as could be confirmed in
November 2026 (they change often; test in the apps before promising it):

- **Instagram Stories:** the link sticker takes any URL, on any account.
  This works now.
- **Instagram Reels and TikTok videos:** no sticker that links to an
  outside site. TikTok's product stickers are for TikTok Shop. Links in
  captions aren't clickable. The link a viewer can press is the one in the
  profile.

So Author Hunt gives the author the three things that do work:

1. **A short link,** `authorhunt.com/<handle>`, that is easy to read aloud,
   type from a video, and put in a profile. The author page is laid out to
   work as that profile link: books, buy links, Support and Follow on one
   phone screen.
2. **A sticker to lay over the video:** a transparent PNG with the short
   link and the portrait, in two shapes, made at `/api/sticker/[handle]`.
   It's a picture, so it isn't clickable, and the screen that offers it
   says so. For a Story, the same screen gives the link to paste into
   Instagram's own sticker.
3. **A card for every link:** the page's Open Graph picture, so a pasted
   link looks finished anywhere.

Share opens the phone's share sheet (`navigator.share`), with Copy link as
the fallback. A link shared from Author Hunt carries `?via=<platform>` so
the author's analytics show where readers came from.

## 8. Trust and moderation

Enough for launch, and no more.

- **Cheers:** verified email to cheer, the unique index, per-account and
  per-IP rate limits, the new-account weight. Ring detection can wait until
  there is a ring.
- **Reports:** a "Report" word on every page, launch and comment; an admin
  queue that can hide a comment, pull a launch, or suspend a page.
- **Who's the author:** site verification above. A pen name is fine; using
  another living author's name is not, and is a report reason.
- **AI use must be declared, and an undeclared use ends in a ban** (the
  owner's rule, November 2026). See "The AI declaration" below.
- **Mature work:** a flag on author and book; flagged work is left out of
  the boards and feeds for signed-out visitors.
- **Covers and text** are the author's to upload; the terms say so, and a
  takedown address is published.

### The AI declaration

- **Required, not optional.** A page can't be made public, and a book can't
  be added, until the author has chosen one: *written without AI*, *written
  with AI assistance*, or *written by AI*. The page shows it under
  Particulars and readers can filter on it. Changing it later is allowed
  and logged.
- **The terms define the three,** in plain words, because the rule can't be
  enforced without them. A starting point for the owner to settle: spelling
  and grammar checkers don't count; AI that drafted, rewrote or translated
  passages of the text is "assistance"; a text mostly produced by a model
  is "by AI". Whether an AI-made **cover** has to be declared is a separate
  line on the book, and needs its own answer.
- **Enforcement is a person's decision on evidence.** A report, or an
  admin's own doubt, opens a review. The page is suspended while it's
  open, the author is told what was reported and can answer, and an admin
  decides. Found undeclared: the page is banned, its launches are pulled,
  and the account can't make another. One appeal, to a second admin where
  there is one.
- **A detector's score is never the evidence.** AI-text detectors wrongly
  flag human writing often enough, and more often for people writing in a
  second language, that a ban resting on one would be unjust and would not
  survive a public complaint. Evidence is what a person can point to: the
  author's own statements, drafts they can or can't show, a Lorec writing
  record, model boilerplate left in the text.
- Every decision is written to an audit log: who, when, what was looked at.
- Lorec's verified writing record, where an author has one, is shown beside
  the declaration. It is the one positive proof on offer.

### Images

Portraits, covers, and pictures on updates.

- **Upload:** the browser asks the server for a signed upload URL and sends
  the file straight to Vercel Blob; the server then records it in `images`
  and ties it to the page or book. JPEG, PNG or WebP, up to 8 MB.
- **Processing** (sharp, on the server): strip EXIF data, which can carry
  the place a photo was taken; resize to the sizes pages use (portrait 4:5
  at 320 and 800 wide; cover 2:3 at 240, 480 and 960); store WebP. Pages
  serve them through `next/image`. A cover that isn't 2:3 is fitted, never
  stretched, with a crop the author can adjust.
- **Limits:** signed-in accounts only, a per-account daily count, and the
  type is checked from the file's own bytes, not its name.
- **Review:** a newly uploaded image is live at once and reportable. The
  terms say the author must hold the rights to what they upload; a takedown
  address is published. Automatic screening for explicit images is worth
  adding before the Product Hunt launch, since covers are on the home page.
- Removing an image removes the file, not only the row.

## 9. Unclaimed pages (after launch)

Not in the first version (the owner's call, November 2026): it needs a
review process that isn't worth building until authors are arriving on
their own. Recorded so the schema and the words leave room for it.

- An **unclaimed page** is one Author Hunt makes for an established author
  who hasn't joined, from public facts: name, books, genres. It is marked
  "Unclaimed" wherever it appears, has no launches, no Support and no
  updates, earns no Momentum, and never tops a board.
- **Claiming** is a request from an account, verified by something only
  the author controls: a link back from their official site, a message
  from the address on that site, or their agent or publisher. An admin
  reviews every claim. A claimed page becomes an ordinary author page.
- **The author can also ask for it to be taken down,** and that request is
  honoured without a review of who is asking beyond the same proof.
- What to settle before building it: who chooses which authors get one;
  where the facts and any picture come from, and the rights to them; what
  the page may say about a living person who didn't ask to be listed; and
  how a wrong claim is undone. Photos and biographies written by others
  are the legal risk, so an unclaimed page starts with a name and a list
  of books and nothing else.
- `authors.claim_state` (`claimed`, `unclaimed`, `pending`) is reserved in
  the schema, and every new page is `claimed`. `authors.user_id` becomes
  nullable only when this is built.

## 10. Build order

Each step ends with something that works on its own. The first four are the
hackathon cut; the rest follow in the order they add the most.

1. **Foundation.** Scaffold, tokens from DESIGN.md, Clerk, schema and
   migrations, `npm run db:seed` with thirty authors and sixty books so
   every page has something to show.
2. **Pages.** Author page and book page, public, with metadata, JSON-LD and
   the link policy. Image upload for portraits and covers.
3. **The board.** Today, a past day, cheer and follow, the launch score, the
   shuffled first hours.
4. **Studio.** Make and edit a page, add a book, schedule a launch.
5. **Momentum and the directory.** The ledger, the hourly job, `/authors`
   with filters, the four kinds of landing page.
6. **Billing.** Trial clock, checkout, portal, webhook, the lapsed state,
   comps.
7. **Comments and updates.**
8. **For you, collections, the weekly email, coming-soon pages.**
9. **Sharing:** short links, cards, the sticker.
10. **Support:** Connect onboarding, gifts, payouts.
11. **Verification, badge, reports queue, analytics for authors.**
12. **Launch week.** See docs/launch.md.

Images are part of step 1 (the upload path) and step 4 (Studio uses it).
The AI declaration is part of step 4: a page can't be published without it.

## 11. Not at launch

Named so nobody builds them by accident: native apps, direct messages,
unclaimed pages, any mention of the Writers Pass, reader reviews and star
ratings, selling books or taking a cut of sales, affiliate
links, paid placement of any kind, maps, a recommendation model, a public
API, importing from Goodreads or Amazon.
