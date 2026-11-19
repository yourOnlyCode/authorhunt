# Ads for the waiting list

Five ideas, each drawn in three shapes, to bring writers to the list before
the first board opens on January 8, 2027. The images are type and line in
the site's own parts (DESIGN.md), drawn by `build.mjs`: no photographs, no
generated artwork. Change the words in that file and run
`node marketing/ads/build.mjs` to draw them again.

| File | Says | Shape |
|---|---|---|
| `a-favorite-*` | Be their next favorite author. | square, portrait, story |
| `b-small-counts-*` | A poem gets a row like a novel. | square, portrait, story |
| `c-fair-*` | Rank can't be bought. | square, portrait, story |
| `d-opens-*` | The first board opens January 8. | square, portrait, story |
| `e-people-*` | Written by people. | square, portrait, story |

## Panes that show the app

For the second, third and later frames of a carousel, so a writer sees the
thing before clicking. Each is a photograph of a real page of the app at
phone width (`shots.mjs` takes them), showing the sample authors from
`npm run db:seed`, and each says "The app, with sample titles."

| File | Says | Shows |
|---|---|---|
| `p1-board-*` | Every morning, a new board. | The day's board, with its filter by type |
| `p2-launch-*` | Each piece gets a page of its own. | A launch page: cover, First of the day, View the book |
| `p3-author-*` | Your page stays. | An author page, with followers and Support |
| `p4-add-*` | Add it. Pick a day. Launch. | The Studio's "Add a work" form |

**A carousel that works as a set:** one of the five ideas first (A or B),
then `p1`, `p2`, `p3`, `p4`, then `d-opens` to close on the date. Six
frames. Use the square or the portrait files for all six: a carousel wants
one shape throughout.

Square is 1080 x 1080 (feeds), portrait is 1080 x 1350 (feeds, the most
room on a phone), story is 1080 x 1920 (stories and reels; its top and
bottom are pattern only, where the apps put their own buttons).

## The link

Send every ad to the front page with a `src`, so the owner's list
(`/owner`) shows which ad and which platform each sign-up came from:

    https://www.authorhunt.com/?src=meta-a
    https://www.authorhunt.com/?src=reddit-c

Use the platform, a hyphen, and the ad's letter. Keep it under 80 characters.

## The words beside the picture

Every claim here is something the product does (AGENTS.md's rules). These
are drafts: put them in your own voice before they run.

**A. Be their next favorite author**
- Text: Author Hunt is a daily launch board for writers. Launch a poem, an essay, a story or a novel, and readers cheer for what they love. The first board opens January 8. Free to launch.
- Headline: A launch day for your writing
- Button: Sign up

**B. A poem gets a row like a novel**
- Text: You don't need a finished book to have a launch. On Author Hunt every piece gets a day on the board, and every type has its own ranking. Opens January 8. Free to launch.
- Headline: Launch everything you finish
- Button: Sign up

**C. Rank can't be bought**
- Text: No ads in the ranking and no paid placement. Readers and writers cheer, and that decides the day. Author Hunt opens January 8, and launching is free for good.
- Headline: A fair board for writers
- Button: Sign up

**D. The first board opens January 8**
- Text: Author Hunt is a new daily launch board for authors and their writing. Join the list to be part of the first launch, at noon Eastern on Friday, January 8.
- Headline: Be on the first board
- Button: Sign up

**E. Written by people**
- Text: Author Hunt does not accept AI-written work. Every author declares that a person wrote theirs. A launch board for real writers opens January 8.
- Headline: No AI-written work
- Button: Sign up

## Words for a carousel

One text above the whole carousel, and a short headline under each frame.
The frames already carry their own big line, so the headline under a frame
adds a fact instead of repeating it.

Text above (pick one, and test them against each other):

1. You finished something. Give it a launch day. Author Hunt is a daily board where writers launch their work, a poem as much as a novel, and readers cheer for what they love. Swipe to see inside. Opens January 8, free to launch.
2. Most writing gets posted once and sinks. On Author Hunt each piece gets a day on the board, a page of its own, and readers who came looking for something new. Have a look inside.
3. No ads in the ranking, no paid placement, no AI-written work. A launch board for writers opens January 8. Here is what it looks like.

Headline under each frame:

| Frame | Headline | Description |
|---|---|---|
| A or B (first) | A launch day for your writing | Free to launch |
| `p1-board` | A new board every morning | Ranked by readers' cheers |
| `p2-launch` | A page for every piece | With a link to wherever you sell |
| `p3-author` | An author page that lasts | Followers hear about your next launch |
| `p4-add` | Launching takes a few minutes | Free, for every piece |
| `d-opens` (last) | Be on the first board | Opens January 8 at noon Eastern |

Button on every frame: Sign up.

What makes these read well, so the same holds when you rewrite them:
- The first sentence is about the writer, not about Author Hunt.
- One idea in each text; the next idea is the next frame.
- A plain fact ends each one: the date, or that it is free.
- Nothing is promised that the product doesn't do: no "get discovered", no reader numbers we don't have yet.

## Where to run them

Start with two places and one small test in each; let `/owner` say which
ad earns its keep before spending more.

- **Facebook and Instagram.** The widest reach and the best tools for a
  small budget. Aim at interests such as creative writing, self-publishing,
  poetry, fiction writing, NaNoWriMo, Wattpad and Kindle Direct Publishing.
  Run all five and let the platform find the winners.
- **Reddit.** Writers gather by subject there, and an ad can be aimed at
  the people who read particular communities (writing, self-publishing,
  poetry, fan fiction, short stories). The audience distrusts hype, so C
  and E, which are plain promises, should suit it best. Reply to comments
  on the ad as yourself.

Worth trying after those:

- **Newsletters for writers.** A paid mention in a newsletter that indie
  authors already read often does better than any feed ad, because the
  reader trusts the sender.
- **X.** There is a real writing community, but ad results there are
  uneven. Post as yourself first, and pay only if posts get a response.
- **TikTok and Reels.** BookTok is large, but it wants video. The example
  day on the board would make a short clip; that is a later job.
- **Pinterest.** Writers save craft advice there. Low cost, slow burn.

Not yet: BookBub and Goodreads sell books to readers, which matters once
there is a board to send readers to.

## The outcome angle (November 19, 2026)

Lead with what a launch gets an author, not with how the board works. No
promise of sales, no "get discovered", no invented counts.

| Headline | Body |
|---|---|
| Your writing deserves more than one post. | Give it a launch day: a day on the board, and one button to where you sell it. |
| You posted it once and it sank. | Launch it instead, in front of readers looking for someone new. Free for authors. |
| A launch day for the thing you just finished. | Poem, story or novel. Readers cheer, follow, and go on to your work. |

The sample square is in docs/mockups/splash-outcomes.html. The launch-page
shot (`p2-launch-*`) still shows the old button words, "Get the book", and
needs retaking before it runs again.
