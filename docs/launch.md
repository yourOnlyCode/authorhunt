# Launching Author Hunt

Two launches: filling the board so it's worth visiting, and Product Hunt.
The first decides how the second goes.

## The date, and the splash page

**Author Hunt opens at noon Eastern on Friday, January 8, 2027** (the
owner's call, November 2026: a waking hour on both coasts). The first
board is a half day, noon to midnight Eastern; every later day runs
midnight to midnight.

Until then authorhunt.com shows a splash page in place of the board
(`docs/mockups/splash.html`): everything centred, a live countdown, a short
account of what Author Hunt and a launch are, and a waitlist under "Be part
of the first launch!" (the owner's wording, exclamation mark included).

**The waitlist is Author Hunt's own table, turned into Clerk accounts at
opening.** The owner asked whether Clerk could hold the waitlist so that
people have accounts on day one. Three ways were weighed:

- *Clerk's own waitlist mode,* or *real sign-up now.* Either asks a visitor
  to make an account for a site that isn't open, which is more than
  someone leaving an address wants. (When this was weighed sign-in was
  going to be shared with Lorec, which ruled both out; sign-in is now
  Author Hunt's own, and an email list is still the lighter ask.)
- *An email now, an invitation at opening* (chosen). The page takes an
  address and whether the person is an author or a reader, into a
  `waitlist` table, with one confirming email. On January 8 each confirmed
  address is sent a Clerk invitation: one click makes the account with the
  email already verified. Check Clerk's current invitation API and its
  sending limits before relying on it for a large list.

Rules carried over from the Writers Pass wait list, which solved the same
problems: a honeypot and a per-IP limit on the form; the same answer
whether or not an address is already on the list, so the list can't be
probed; confirmation by a POST from the page, never by the link's GET, so
a mail scanner confirms nothing; one reminder after a day, never a second;
the link's `?src=` kept on the row.

Authors on the list are asked, in the weeks before opening, to set up
their page and pick a launch day through a private link, so the first
boards are full (see "The cold start").

The splash is a switch, not a branch: `LAUNCH_AT` in the environment. Before
it, `/` renders the splash and every other public route redirects there;
after it, the app is the app. Admins see the real site either way.

## The cold start

A daily board with three launches on it looks abandoned. Before anyone
outside is invited:

- **Lorec's writers first.** Lorec already has public author pages
  (`lorec.io/author/<handle>`). "Bring your Lorec page" copies the portrait,
  bio, links and books into a new Author Hunt page in one step, matched by
  verified email (the two sites have separate accounts). Announce it in the Commons and by email.
- **The Writers Pass wait list second,** as an invitation like any other.
  The pass comp isn't offered or mentioned until the pass opens.
- **Founding authors.** Pages made before the public launch carry "Founding
  author" under Particulars for good. It costs nothing and gives the
  first hundred a reason to be early.
- **Target before going public:** 100 pages, and at least 5 launches
  scheduled for each day of launch week. Schedule them with the authors;
  don't leave it to chance.
- Nothing is invented. No placeholder authors, no seeded cheers. The seed
  data in `npm run db:seed` never reaches production.

## Product Hunt

- **Before.** A "coming soon" page on Product Hunt three to four weeks out.
  A maker account with some history. Gallery: the board, an author page, a
  book launch, the filters, the phone view. A 30-second screen recording.
  A first comment from the maker that tells the story: Lorec builds tools
  for writers, and writers kept asking where to be found.
- **Tagline candidates.** "Product Hunt for authors" is the clearest and
  says who it's for in four words. "Find your next favorite author, daily"
  speaks to readers. Lead with the first in the tagline and the second in
  the description.
- **The day.** Launch at 12:01am Pacific. Have that day's Author Hunt board
  full, since every visitor from Product Hunt lands on it. Ask for feedback
  and visits, never for upvotes: Product Hunt penalises the ask. Reply to
  every comment the same day.
- **The offer.** Anyone who makes a page during launch week is a founding
  author. No discount is needed on $3.99.
- **After.** The Product Hunt badge on the home page footer; a written
  account of the launch for Lorec's blog, which is also the first real link
  to the new domain.

## The name and the look

"Author Hunt" borrows a naming pattern, and the site borrows nothing else:
no cat, no orange, no layout copied from Product Hunt, and the vote is a
cheer, not an upvote. DESIGN.md gives the site its own look.

### The name check (November 2026)

A first look, not a legal clearance. What was done: web searches for the
name as a product, app or mark, and a look at one trademark index.

- No product, app or site called "Author Hunt" or "AuthorHunt" turned up,
  and the first page of a trademark-index search for the phrase showed no
  mark by that name. The index returned thousands of partial matches and
  only the first ten were readable, so this doesn't rule one out.
- **Book Hunt** (bookhunt.org) exists and describes itself as a social
  platform where authors are discovered by readers. It is the nearest name
  doing the nearest thing, and the one to look at properly.
- No report was found of Product Hunt acting against another "… Hunt"
  site. Its marks are for "Product Hunt"; "hunt" on its own is a common
  word. That is a reading of search results, not a legal opinion.

Still to do, by the owner, before money goes into the name:

1. Search the USPTO's own database (tmsearch.uspto.gov) for AUTHOR HUNT,
   AUTHORHUNT and BOOK HUNT, live and dead, in classes 9, 35, 41 and 42.
   It takes ten minutes and couldn't be done from here.
2. Read Book Hunt's site and see whether it holds or has applied for a mark.
3. If the name is staying, have a trademark attorney run a clearance and
   file an application, as with the pass's mark. A free domain says nothing
   about whether a mark is free.

## Before launch, checked

- Terms that define the three AI declarations and say what a false one
  costs, and say gifts are not charitable donations and aren't refundable
  once paid out. Privacy notice (what's public, what's emailed, how to delete),
  and a takedown address.
- Stripe in live mode with a real $3.99 charge refunded, and Lorec's webhook
  confirmed to ignore it (docs/development.md, section 6).
- Every public page: title, description, canonical URL, Open Graph card,
  JSON-LD that passes Google's Rich Results test.
- Sitemap submitted in Search Console.
- The weekly email sent to the team for two weeks.
- A report filed and resolved end to end.
