# Launching Author Hunt

Two launches: filling the board so it's worth visiting, and Product Hunt.
The first decides how the second goes.

## The cold start

A daily board with three launches on it looks abandoned. Before anyone
outside is invited:

- **Lorec's writers first.** Lorec already has public author pages
  (`lorec.io/author/<handle>`). "Bring your Lorec page" copies the portrait,
  bio, links and books into a new Author Hunt page in one step, matched by
  verified email. Announce it in the Commons and by email.
- **The Writers Pass wait list second.** Confirmed seats get Author Hunt
  free; the email says so and links straight to making a page.
- **Founding authors.** Pages made before the public launch carry "Founding
  author" on their catalogue card for good. It costs nothing and gives the
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
  says who it's for in four words. "Find your next favourite author, daily"
  speaks to readers. Lead with the first in the tagline and the second in
  the description.
- **The day.** Launch at 12:01am Pacific. Have that day's Author Hunt board
  full, since every visitor from Product Hunt lands on it. Ask for feedback
  and visits, never for upvotes: Product Hunt penalises the ask. Reply to
  every comment the same day.
- **The offer.** Anyone who makes a page during launch week is a founding
  author. No discount is needed on $5.
- **After.** The Product Hunt badge on the home page footer; a written
  account of the launch for Lorec's blog, which is also the first real link
  to the new domain.

## The name and the look

"Author Hunt" borrows a naming pattern, and the site should borrow nothing
else. No cat, no orange, no layout copied from Product Hunt, and the vote is
a cheer, not an upvote. DESIGN.md gives the site its own look for this
reason as much as for taste. Before buying ads or printing anything, have
the name checked for trademark conflicts, as was done for the pass's mark.

## Before launch, checked

- Terms, privacy notice (what's public, what's emailed, how to delete),
  and a takedown address.
- Stripe in live mode with a real $5 charge refunded, and Lorec's webhook
  confirmed to ignore it (docs/development.md, section 6).
- Every public page: title, description, canonical URL, Open Graph card,
  JSON-LD that passes Google's Rich Results test.
- Sitemap submitted in Search Console.
- The weekly email sent to the team for two weeks.
- A report filed and resolved end to end.
