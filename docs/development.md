# Author Hunt: development plan

What gets built, how it fits together, and in what order. Decisions marked
**Open** are the owner's to make; each has a default the build proceeds on.

## 1. What it is

A daily launch board for authors and books.

- **Authors** make a page, launch it, and launch each book. What they make
  and how the community responds earns Momentum, which decides where they
  sit in the feeds.
- **Readers** browse today's launches, filter the directory (genre, city,
  "for readers of", "inspired by"), follow authors, keep a shelf, and get a
  feed and a weekly email shaped by who they follow and cheer.
- **Lorec** gets a front door: Author Hunt is free with the Writers Pass,
  shows which books were written in Lorec, and sends authors to both.

## 2. Architecture

The same stack as Lorec, minus everything the desktop app forced on it.

| Part | Choice | Note |
|---|---|---|
| Framework | Next.js 16 App Router, React 19 | Server components and ISR for every public page. |
| Hosting | Vercel, functions in `iad1` | Same region as the database. |
| Database | Supabase Postgres, `us-east-1`, **its own project** | Drizzle schema, SQL migrations. |
| Auth | Clerk | See "Accounts" below. |
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
    for-you/  shelf/  studio/ (the author's side)
  api/
    cheers/ follows/ comments/ launches/ updates/ shelf/
    stripe/checkout/ stripe/portal/ stripe/webhook/
    cron/momentum/ cron/close-day/ cron/digest/
    badge/[handle]/    the embeddable badge (SVG)
  sitemap.ts  robots.ts
lib/
  db/schema/  ranking/  billing/  discover/  seo/  emails/  auth/
components/
  ui/  board/  author/  book/  studio/
```

### Accounts

One account type. Anyone can cheer, follow and comment; an account becomes
an author when it creates a page. A person can be both.

**Open: one Clerk instance with Lorec, or two.** Default for the first
build: a separate Clerk application, with accounts matched to Lorec by
verified email where the two need to meet (the Writers Pass comp, "written
in Lorec"). It is the option that can't break Lorec's sign-in, and it takes
no configuration on Lorec's side. Sharing Lorec's instance would give one
sign-in across both, and is cheap if Author Hunt lives on a lorec.io
subdomain; on its own domain it needs Clerk's satellite-domain setup, whose
plan requirements should be checked before committing. Moving later means
migrating users, so decide before the public launch, not after.

**Open: the domain.** Default: its own domain. A launch on Product Hunt and
a brand readers remember both want one, and the site needs to earn its own
search authority either way.

## 3. Data model

```
users             id (Clerk), email, display_name, created_at
authors           id, user_id, handle, pen_name, bio, portrait_url, city, region,
                  country, website, links jsonb, site_verified_at, lorec_handle,
                  ai_disclosure, mature bool, trial_ends_at, momentum numeric,
                  follower_count, launched_at, created_at
books             id, author_id, slug, title, tagline, description, cover_url,
                  status (upcoming|out), pub_date, isbn, buy_links jsonb,
                  excerpt, made_with_lorec bool, mature bool
launches          id, kind (author|book), author_id, book_id null, launch_day date,
                  status (scheduled|live|closed), cheer_count, comment_count,
                  score numeric, rank_day int null, rank_week int null
cheers            user_id, launch_id, weight, created_at     unique (user_id, launch_id)
follows           user_id, author_id, created_at             unique
comments          id, launch_id, user_id, parent_id null, body, created_at, removed_at
updates           id, author_id, book_id null, kind, body, created_at
shelf_items       user_id, book_id, created_at               unique
notify_requests   email or user_id, launch_id                "tell me when it launches"
genres            id, slug, name, parent_id null
author_genres     author_id, genre_id
book_genres       book_id, genre_id
reference_authors id, slug, name            the well-known names: "Ursula K. Le Guin"
author_references author_id, reference_id, kind (readers_of|inspired_by)
point_events      id, author_id, kind, points, created_at    append-only ledger
subscriptions     author_id, stripe_customer_id, stripe_subscription_id, status,
                  interval, current_period_end
comps             email, reason (pass|admin|founding), until null
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
- **Shelf.** A reader saves a book. It's their list, and it is the signal
  the weekly email uses.
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
- **Free with the Writers Pass.** A row in `comps` with reason `pass`.

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

**Open: what lapsing takes away.** The table is the default. The alternative,
hiding the page, would break authors' links and shrink what readers find.

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

### The Writers Pass

The pass opens in summer 2027; today it is a wait list
(`writers_pass_waitlist` in Lorec). So "free with the pass" needs a decision
about now.

**Open: who gets the comp before passes open.** Default: every address with
a confirmed seat on the wait list. It gives the wait list something real
today and costs nothing. Until Lorec exposes a lookup, the owner exports
confirmed addresses into `comps`; the durable version is a small signed
endpoint on Lorec (`GET /api/integrations/authorhunt/pass?email=`) that
Author Hunt calls when an account verifies its email and once a day after.

The other direction is already built: the pass page records a link's `?src=`.
Every pass link on Author Hunt is `pass.lorec.io/?src=authorhunt`, and the
lapsed and pricing screens both offer it ("Free with the Writers Pass").
Adding Author Hunt to the pass page as a perk means a new key in `HERO_KEYS`
and its tile, per Lorec's AGENTS.md.

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

## 8. Trust and moderation

Enough for launch, and no more.

- **Cheers:** verified email to cheer, the unique index, per-account and
  per-IP rate limits, the new-account weight. Ring detection can wait until
  there is a ring.
- **Reports:** a "Report" word on every page, launch and comment; an admin
  queue that can hide a comment, pull a launch, or suspend a page.
- **Who's the author:** site verification above. A pen name is fine; using
  another living author's name is not, and is a report reason.
- **AI use:** each author states it once, shown on the page ("Written
  without AI", "AI-assisted", "AI-generated"), and readers can filter on it.
  Lorec's verified writing record, where an author has one, is shown beside
  it. This is the question readers of new authors ask first, and Lorec is
  the one company that can answer it with evidence.
- **Mature work:** a flag on author and book; flagged work is left out of
  the boards and feeds for signed-out visitors.
- **Covers and text** are the author's to upload; the terms say so, and a
  takedown address is published.

## 9. Build order

Each step ends with something that works on its own. The first four are the
hackathon cut; the rest follow in the order they add the most.

1. **Foundation.** Scaffold, tokens from DESIGN.md, Clerk, schema and
   migrations, `npm run db:seed` with thirty authors and sixty books so
   every page has something to show.
2. **Pages.** Author page and book page, public, with metadata, JSON-LD and
   the link policy.
3. **The board.** Today, a past day, cheer and follow, the launch score, the
   shuffled first hours.
4. **Studio.** Make and edit a page, add a book, schedule a launch.
5. **Momentum and the directory.** The ledger, the hourly job, `/authors`
   with filters, the four kinds of landing page.
6. **Billing.** Trial clock, checkout, portal, webhook, the lapsed state,
   comps.
7. **Comments and updates.**
8. **For you, shelf, the weekly email, coming-soon pages.**
9. **Verification, badge, reports queue, analytics for authors.**
10. **Launch week.** See docs/launch.md.

## 10. Not at launch

Named so nobody builds them by accident: native apps, direct messages,
reader reviews and star ratings, selling books or taking a cut, affiliate
links, paid placement of any kind, maps, a recommendation model, a public
API, importing from Goodreads or Amazon.
