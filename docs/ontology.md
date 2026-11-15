# Author Hunt ontology

The things this product is made of, what each one is called, and how they
relate. This is a living file: it is the first place a new noun, state or
relation is written down, and code follows it.

**How to keep it.** A PR that adds or renames a table, an enum value, a
state, a route for a new kind of thing, or a word a person reads in the UI
changes this file in the same PR. If the code and this file disagree, that
is a bug in one of them; fix it, don't leave it. Each entry gives the word
people see, the name in code, and what it must not be confused with.

Status marks: **built**, **planned** (designed, not built), **later**
(agreed in principle, after launch).

## People

| Term | In the UI | In code | What it is | Not |
|---|---|---|---|---|
| Account | (unnamed) | `users` | One signed-in person, from Clerk. Can cheer, follow, save, comment, give. | Not an author until it has a page. |
| Reader | reader | no table; any `users` row | Someone here to find authors. Never pays. | Not a separate account type. |
| Author | author | `authors` | An account that has made a page. One page per account. | Never "creator", "maker", "user". |
| Reference author | (the name itself) | `reference_authors` | A well-known writer used as a signpost: "for readers of Ursula K. Le Guin". Has no account and no page of their own. | Not an Author. Not an Unclaimed page. |
| Admin | (not shown) | `ADMIN_EMAILS` | The owner's accounts. | |

## Pages and works

| Term | In the UI | In code | What it is |
|---|---|---|---|
| Author page | page | `authors`, `/author/[handle]`, short link `/[handle]` | The author's public page. Outlives the plan that made it. |
| Handle | (in the URL) | `authors.handle` | The page's unique name in its address. Lowercase, letters, digits, hyphens. |
| Work | a novel, a story, a serial, an issue | `works` (`kind` = `book`, `short`, `serial`, `issue`), `/work/[slug]` | One thing an author or publication launches. The UI always says the specific word, never "work". |
| Publication | (its name) | `authors.kind = publication` | A magazine, journal or small press with a page of its own, launching issues. |
| Platform | Published through … | `platforms`, `work_platforms` | Where a work is published: KDP, IngramSpark, Lulu, Wattpad, the author's own site, and so on. Lorec is reserved and hidden until ready. |
| Update | update | `updates` | A short post by an author: progress, a cover, an event, an excerpt. |
| Particulars | Particulars | columns on `authors` | The facts on a page: genre, city, for readers of, inspired by, how it's written, links. Each value links to its filter. |
| Unclaimed page | Unclaimed | `authors.claim_state` | **Later.** A page Author Hunt made for an established author who hasn't joined. See development.md §9. |

## Launching and ranking

| Term | In the UI | In code | What it is | Not |
|---|---|---|---|---|
| Launch | launch | `launches` | An author page or a book put on one day's board. A page launches once; a book launches once. | Never "post", "submission", "drop". |
| Board | Today, the day's launches | `launches` by `launch_day` | One day's launches in rank order. | Never "feed" (that's For you). |
| Day | the date | `launch_day`, `launchDay()` | A calendar date in `America/New_York`. | Never the visitor's local date. |
| Cheer | Cheer, Cheered | `cheers` | One account's support for one launch. Free. One each, never your own. | Never "upvote", "like", "vote". Not Support (money). |
| Launch score | (not shown) | `launches.score` | What orders a board: weighted cheers plus commenters. | |
| Rank | First of the day, I, II, III | `launches.rank_day` | A launch's final place once its day closes. | |
| Momentum | Momentum | `authors.momentum`, `point_events` | An author's standing: points for creating and for support received, halving every thirty days. Orders the directory. | Never affected by plan or by money given. |

Launch states: `scheduled` → `live` → `closed`. A removed launch is
`pulled` (by an admin) and keeps its row.

## Finding

| Term | In the UI | In code | What it is |
|---|---|---|---|
| Directory | Authors, Books | `/authors`, `/books` | Everything, filtered, ordered by Momentum. |
| Filter | Genre, City, For readers of, Inspired by | query parameters; `/genre/[slug]` and its siblings | A way to narrow the directory. Each value has its own page. |
| Genre | (its name) | `genres` | A fixed list kept by admins, with sub-genres. |
| City | (its name) | `authors.city`, `region`, `country`, `city_slug` | Where the author is based, as they state it. |
| For readers of | For readers of | `author_references.kind = readers_of` | "If you like this well-known writer, try me." Up to five. |
| Inspired by | Inspired by | `author_references.kind = inspired_by` | Whose work shaped the author's. Up to five. |
| Follow | Follow, Following | `follows` | A reader's standing interest in an author. Feeds For you and the Sunday letter. |
| Collection | collection | `collections`, `collection_items` | A named list a reader keeps, of authors and books. Private unless shared. Every account starts with one, "Saved". |
| Save | Save, Saved | a `collection_items` row | Putting an author or a book in a collection. |
| For you | For you | `/for-you`, `lib/discover/` | A signed-in reader's feed, built from follows, cheers and saves. |
| Sunday letter | the Sunday letter | `lib/emails/`, `cron/digest` | The weekly email. |

## Money

| Term | In the UI | In code | What it is | Not |
|---|---|---|---|---|
| Trial | thirty days free | `authors.trial_ends_at` | The author's first thirty days. No card. | |
| Membership | $3.99 a month, $32 a year | `subscriptions` | What an author pays for the member tools, including showing a Support link. Launching never needs it. | Never "Pro", "Premium", "upgrade". |
| Comp | (not shown) | `comps` | Access given without payment: `admin`, `founding`. | The Writers Pass comp isn't built and isn't mentioned in the app (development.md §6). |
| Access | (not shown) | `authorAccess()` → `trial`, `member`, `comp`, `lapsed` | Whether an author can act right now. | Never read from anywhere else. |
| Lapsed | (the author is told privately) | `authorAccess() = lapsed` | Trial or membership has ended. The page stays; launching stops. | Not shown to readers. |
| Support | Support | `authors.support_url` | A member's link to their own Ko-fi, PayPal or similar. Author Hunt handles no money. | Never "donation", never "tip". Never enters a score. |

## Trust

| Term | In the UI | In code | What it is |
|---|---|---|---|
| AI declaration | Written: without AI / with AI assistance / by AI | `authors.ai_use`, `books.ai_use` | The author's required statement of how the work was written. Asked before a page or book can be made public. |
| Verified site | Site verified | `authors.site_verified_at` | The author's website links back to their page, so we know the page is theirs. |
| Report | Report | `reports` | A reader's flag on a page, launch, book, comment or declaration. |
| Suspension, ban | (the author is told) | `authors.standing` = `good`, `suspended`, `banned` | A page hidden pending review, or removed for good. An undeclared use of AI ends in a ban. |
| Mature | (a filter) | `authors.mature`, `books.mature` | Work left out of boards and feeds for signed-out visitors. |

## Sharing

| Term | In the UI | In code | What it is |
|---|---|---|---|
| Short link | authorhunt.com/maren | `/[handle]` → the page | The address an author says aloud or puts in a profile. |
| Sticker | sticker | `/api/sticker/[handle]` | A picture with the short link, for laying over a video. A picture, not a link. |
| Card | (a link's preview) | `opengraph-image` | The picture a shared link shows. |
| Badge | Featured on Author Hunt | `/api/badge/[handle]` | A mark an author embeds on their own site, linking back. |

## Community and care

| Term | In the UI | In code | What it is |
|---|---|---|---|
| Comment | comment | `comments` | A reader's or author's words on a launch or a thread. Can be cheered, replied to, reported. |
| Author's note | (pinned, marked Author) | `comments.pinned` | The author's own first comment on their launch. |
| Thread | thread | `threads`, `rooms` | A discussion outside any launch. Later. |
| Notification | (the bell) | `notifications`, `notification_prefs` | Something that happened which a person asked to hear about. |
| Mature | Mature | `books.mature`, `authors.mature` | Not for under-18s. Blurred until confirmed. |
| Content notes | Content notes | `books.content_notes` | Things a reader may want to know first. Shown only when asked for. Never "trigger warnings" in the UI. |
| Standing | (told privately) | `standing` = `good`, `suspended`, `banned` | Whether an account or page may take part. |
| Case | (not shown) | `reports`, `moderation_log` | A report under review, and the record of what was decided. |
| Promoted | Promoted | `promotions` | A paid, unranked row for a service. Never a book or an author. Under discussion. |

## Before opening

| Term | In the UI | In code | What it is |
|---|---|---|---|
| Splash | (the page before January 8, 2027) | `LAUNCH_AT`, `app/(public)/splash/` | What authorhunt.com shows until opening. |
| Waitlist | the list | `waitlist` (email, kind = `author` or `reader`, confirmed_at, src, invited_at) | Addresses collected before opening. Each confirmed one gets a Clerk invitation on opening day. Not Clerk's waitlist mode, which would affect Lorec. |

## Relations

```
Account 1 ── 0..1 Author 1 ── * Work * ── * Platform
Author  1 ── * Update            Author 1 ── 0..1 Launch (kind = author)
Work    1 ── 0..1 Launch (kind = work)
Account * ── * Launch   through Cheer   (unique; never the author's own)
Account * ── * Author   through Follow
Account 1 ── * Collection * ── * (Author | Book)   through Save
Author  * ── * Genre
Author  * ── * Reference author   through For readers of | Inspired by
Author  1 ── 0..1 Membership     Author 1 ── 0..1 Payout account
```

## Words we don't use

upvote, like, vote, hunt (as a verb), hunter, maker, creator, user (to a
person's face), post (for a launch), feed (for a board), donation, tip,
Pro, Premium, upgrade, shelf (replaced by collection, November 2026).

## Changes

- 2026-11-15, the first build. In code, genres, reference authors and
  platforms are lookup tables keyed by slug, listed on a page or work in
  `text[]` columns (`genres`, `readers_of`, `inspired_by`, `platforms`);
  there are no join tables for them. `works` replaces `books`. Added
  `letter_subscribers` (the Sunday letter's readers without an account) and
  `comment_cheers`. Access states are `trial`, `member`, `comp`, `free`
  ("lapsed" is gone: nothing public depends on a plan).
- 2026-11-15. Opening date set: January 8, 2027. Splash and Waitlist added.
- 2026-11-14. Membership is $3.99 a month or $32 a year (was $5 and $40). Confirmed: a free author cannot show a Support link.
- 2026-11-13, later still. Decisions: launching is free; Membership buys
  tools; Support is a member's outside link (gifts and payout accounts
  removed). Book became Work with kinds; Publication and Platform added.
- 2026-11-13, later. Comments, the author's note, threads, notifications,
  content notes, standing, cases and Promoted added. Membership's meaning
  is under discussion (monetization.md): the Money table describes the
  first plan until that settles.
- 2026-11-13. First version. "Shelf" became "Collection" and now holds
  authors as well as books. Support, the AI declaration with bans, the
  sticker and Unclaimed pages added.
