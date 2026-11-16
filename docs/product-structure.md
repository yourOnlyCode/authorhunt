# Author Hunt: structure, after Product Hunt

The owner's direction, November 2026: follow Product Hunt's application
structure closely, and add what authors and books need. This file maps one
to the other, then specifies the community pieces taken straight from it
(comments, threads, notifications) and the ones that are Author Hunt's own
(content notes, the AI declaration, reports and bans).

What Product Hunt does was read from its home page and from guides to it in
November 2026. It changes; where a detail matters, look again before
building.

## 1. The map

| Product Hunt | Author Hunt | Difference |
|---|---|---|
| Home: "Top Products Launching Today", numbered rows, then "Yesterday's Top Products", then "Last Week's" | Home: "Top launches today", then yesterday's, then last week's | The same. The first row is drawn larger. |
| A row: thumbnail, name, tagline, topic tags, comment count, upvote count | A row: cover or portrait, title, tagline and byline, genre · city · for readers of, comment count, cheer with an up arrow at the right | Tags are our filters. A Mature mark where it applies. |
| "Promoted" rows in the list | "Promoted" rows, unranked, for services authors buy | Never a book or an author (docs/monetization.md §3). |
| Launch archive by day, week, month, year | `/launches/2026-11-13` for a day, `/launches` for the archive (weeks and months later) | The same. |
| A product's page, with its launches under it | An **author's page**, with their books and launches under it | The author is the lasting thing, as the product is there. |
| A launch page: thumbnail, name, tagline, Visit, upvote; gallery; description; makers; comments | A **launch page**: cover, title, tagline, byline, Get the book, cheer; pictures; description; excerpt; content notes; the author; comments | "Visit" becomes "Get the book", which opens the author's buy links. |
| Makers and hunters | The **author** only | No hunters: an author launches their own work. Unclaimed pages are later. |
| The maker's first comment | The **author's note**, pinned first | The same. |
| Comments: threaded, upvoted, maker badge | Comments: threaded, cheered, Author mark | The same (§2). |
| Topics | **Genres**, plus city, for readers of, inspired by | Each value has its own page. |
| Collections | **Collections** of authors and books | The same. |
| Forums ("Trending Forum Threads" on the home page) | **Threads**, in a few rooms: Writing life, Covers, For readers, Launch help | The same, fewer rooms (§3). |
| Product of the Day, Week, Month badges | **First of the day, week, month** for books and for authors, with an embeddable badge | The same. |
| Daily and weekly newsletter | The **Sunday letter**: the week's top launches, by genre | Weekly first; daily later if readers ask. |
| Launch day midnight to midnight Pacific; schedule up to a month ahead | Midnight to midnight Eastern; schedule ahead | Our day is `America/New_York` (rule 6). |
| Featured, chosen by staff, versus all launches | Every launch that passes the rules is on the board | No featuring at launch. One less judgement to make and defend. |
| Asking for upvotes is against the rules | Asking for cheers is against the rules; asking for readers is fine | The same. |
| Relaunch after about six months and a major change | A book launches once; a new edition may launch after six months | |
| Streaks, points leaderboard | **Momentum** and "Rising authors" | Ours counts creating, not only voting. |
| Notifications bell | The same (§4) | |
| Advertise | docs/monetization.md | |

**The header** carries a mark, search, three places (Launches, Authors,
Threads) and two actions (Sign in, Launch). Collections, For you, the
letter, notifications and settings live behind the account menu once
signed in. *Why:* the owner found the first header crowded.

## 2. Comments

As on Product Hunt:

- On every launch page. Threaded one level deep in the layout: a reply to
  a reply sits under the same parent, naming who it answers.
- Sorted best first (cheers on the comment, then recency), with a switch to
  newest.
- A comment can be cheered, replied to, shared by link, and reported. Its
  author can edit it (marked "edited") and delete it; a deleted comment
  with replies leaves "removed" in its place.
- The launch's author is marked **Author** on every comment, and can pin
  one comment of their own first: the author's note.
- Plain text with links, line breaks, and `@handle` mentions. Links are
  `rel="ugc nofollow"`. No images at launch.
- A signed-in account with a verified email. New accounts wait ten minutes
  and are rate limited; a comment from a brand-new account with a link is
  held for review.
- The author can hide a comment on their own launch from the public view;
  it goes to the review queue so hiding can't be used to bury fair
  criticism without anyone seeing.
- Commenters count toward a launch's score once each (rule in
  docs/development.md §4); comment cheers don't.

Tables: `comments (id, launch_id | thread_id, user_id, parent_id, body,
cheer_count, pinned, hidden_at, removed_at, edited_at, created_at)`,
`comment_cheers (user_id, comment_id)`.

## 3. Threads

Product Hunt's forums, cut down: a list of discussions in a handful of
rooms, each a title, a body and the same comment component. The home page
shows the three most active. Tables: `rooms`, `threads`. Not in the first
build; the home page's rail shows "Launching soon" in its place until then.

## 4. Notifications

A bell in the header, a page of them, and email for the ones that matter.
Each kind can be turned off for email and for the bell separately.

| Kind | Who gets it | Bell | Email by default |
|---|---|---|---|
| Someone commented on your launch | author | yes | yes |
| Someone replied to your comment, or mentioned you | anyone | yes | yes |
| Your launch is live; your launch finished (with its rank) | author | yes | yes |
| Your launch is tomorrow | author | yes | yes |
| Cheers on your launch | author | yes, grouped ("128 cheers today") | a single evening summary |
| A new follower | author | yes, grouped | weekly summary |
| An author you follow launched, or posted an update | reader | yes | yes for launches, no for updates |
| A book you asked about is live | reader | yes | yes |
| A gift arrived (if Author Hunt processes gifts) | author | yes | yes |
| A decision on a report you made, or about you | either | yes | yes |
| The Sunday letter | subscribers | no | yes |

Grouping matters: a launch day must not send a hundred emails. Nothing is
sent between 9pm and 8am in the recipient's time zone except decisions.

Tables: `notifications (id, user_id, kind, subject, group_key, read_at,
created_at)`, `notification_prefs (user_id, kind, bell, email)`. Written by
the routes that cause them; email goes through one queue so batching and
quiet hours are in one place.

## 5. Mature work and content notes

Two separate things, both the author's to state and both reportable.

- **Mature** is a mark on an author's page or a book: explicit sex, graphic
  violence, or anything not for under-18s. A marked row shows "Mature" on
  the board. Signed-out visitors and accounts that haven't said they are
  adults see the row with its cover blurred and open it by confirming.
  Mature work is left out of the Sunday letter's general edition and of
  link preview cards.
- **Content notes** are the author's list of things a reader may want to
  know first (death of a parent, self-harm, abuse). Chosen from a fixed
  list, with room for a line of the author's own. They are **shown only
  when asked for**: the launch page says "Content notes" with a Show
  control, because a note can itself spoil or distress. A reader can set
  "always show" in their settings.
- A missing Mature mark, or a missing note for something on the fixed
  list, is a report reason. The fix is usually to add it; a ban is for
  repeated refusal.

Fields: `books.mature`, `authors.mature`, `books.content_notes text[]`,
`books.content_note_text`, `users.adult_confirmed_at`,
`users.always_show_notes`.

## 6. Reports

A **Report** word on every launch, page, book, comment, thread, picture and
collection. One form:

| Reason | For |
|---|---|
| Spam or a scam | anything |
| Stolen or plagiarised work | a book, an excerpt, a picture |
| Not the real author; impersonation | a page |
| **Written by AI** | a page or a book |
| Missing Mature mark or content note | a page or a book |
| Harassment or hate | a comment, a thread, a page |
| Asking for or trading cheers | a launch, a comment |
| Something else | anything, with a required note |

- The reporter says why in a sentence, and for plagiarism or undeclared AI
  is asked what they are going on. A report without a reason isn't sent.
- Reports go to one queue, **reviewed by the owner** (the owner's call,
  November 2026), ordered by how many separate accounts reported the same
  thing and how visible it is. The queue shows the item, the reports, the
  account's history and earlier decisions.
- The reporter is never shown to the person reported. Both are told the
  outcome.
- Rate limits and a record per reporter: someone whose reports are
  repeatedly unfounded is weighted down, since reports are also a way to
  attack a rival's launch day.

Tables: `reports (id, reporter_id, target_kind, target_id, reason, note,
status, decided_by, decided_at, decision)`, `moderation_log` (append-only).

## 7. Suspensions and bans

Planned now; the working details (who covers when the owner is away, how
long a review may take) come later.

Standing is one field, `authors.standing` and `users.standing`:
`good` → `suspended` → `banned`, with `good` restorable from `suspended`.

| Action | Effect | Used for |
|---|---|---|
| Remove an item | The comment, picture or launch is gone; the account stays | One bad item |
| Pull a launch | Off the board; the page stays | A launch that broke the rules |
| Suspend | Page and launches hidden, account can't post, while a report is decided | Serious reports under review |
| Ban | Page gone from the site and from search, launches pulled, cheers given by the account discounted, the account and its email can't make another page | See below |

**What gets a ban:** AI-written work, confirmed; plagiarism; impersonating
another author; buying or trading cheers at scale; harassment after a
warning; evading a ban.

**The process for work reported as written by AI.** Author Hunt does not
accept AI-written work (AGENTS.md rule 7, made stricter November 16, 2026):

1. A report, or the owner's own doubt, opens a case. The page is suspended
   only if the evidence is already strong; otherwise it stays up.
2. The author is told what was reported and has seven days to answer:
   drafts, notes, a writing record, an account of how the book was made.
3. The owner decides, on what a person can point to. A detector's score may
   prompt a look and is never the ground for a decision.
4. Not confirmed: closed, noted, the reporter told. Found to be
   AI-written, in whole or in part: the work and its launches are removed
   and the author's page is banned. One narrower outcome for a first case:
   the text is the author's own but AI tools were used around it and not
   declared; the declaration is corrected to "with AI as a tool" and the
   page stays.
5. One appeal, in writing, within thirty days.
6. Every step is in `moderation_log`.

What a ban does not do: it doesn't touch the person's Lorec account, which
is a separate product with its own rules, though the two share a sign-in.
Author Hunt's standing is stored in Author Hunt's database only.

## 8. The Clerk webhook

Author Hunt uses Lorec's Clerk instance and has **its own webhook
endpoint** (the owner's call, November 2026): a second endpoint registered
in the same Clerk instance, at `authorhunt.com/api/clerk/webhook`, with its
own signing secret, writing only to Author Hunt's database.

Because the instance is shared, both endpoints hear every user event,
whichever site the person signed up on. So:

- Author Hunt's handler makes its own `users` row lazily, on a person's
  first signed-in request, not on `user.created`. Lorec-only users never
  get a row here.
- Lorec's handler will hear about people who signed up on Author Hunt.
  Read it before launch: it should either make them an ordinary free Lorec
  account, or skip sign-ups that carry Author Hunt's marker in their
  sign-up metadata. Neither handler writes metadata the other reads.
- `user.deleted` is honoured by both: each removes its own data.
