# Launch plan: the splash page now, the site on January 8, 2027

The owner's working list. Tick a box by changing `[ ]` to `[x]`. Each item
says who does it: **You** (needs an account, a card or a DNS login) or
**Claude** (code, done in a session once your step before it is done).

`docs/setup-checklist.md` has the detail for each service (which settings,
which keys). This file is the order, the dates and the costs.

Written November 16, 2026: 53 days before opening.

---

## Part 1. Put the splash page live

Goal: authorhunt.com shows the countdown and takes sign-ups, and nothing
done to the main app can break it.

### 1.1 What "full sign-up" means here

The splash takes an email and "I'm an author / I'm a reader", stores it,
and sends one email to confirm the address. On January 8 each confirmed
address gets an invitation that makes their account in one click. That is
built and was tested locally.

It does not make a real account today. Doing that before opening would
send every visitor to a Lorec-branded sign-in page for a site that isn't
open (see docs/launch.md). If you want real accounts from day one of the
splash instead, say so: it means doing the Clerk step (2.3) first.

- [ ] **You.** Confirm: email list now, accounts by invitation at opening.

### 1.2 Accounts and wiring the splash needs

Only four services. Sign-in and payments are not needed yet.

- [ ] **You.** Buy **authorhunt.com** and note where its DNS is managed.
- [ ] **You.** **Vercel:** new project from `yourOnlyCode/authorhunt`,
      function region `iad1`. See the plan note in Part 3: the free Hobby
      plan will not do.
- [ ] **You.** In Vercel, set the **production branch to `production`**
      (not `main`). This is what protects the splash: see 1.4.
- [ ] **You.** Add `authorhunt.com` and `www` to the project and add the
      DNS records Vercel shows.
- [ ] **You.** **Supabase:** a new project for Author Hunt, `us-east-1`,
      separate from Lorec's. Copy the pooled connection string.
- [ ] **Claude.** Run the migrations against it (`npm run db:migrate`).
- [ ] **You.** **Resend:** add `authorhunt.com` as a sending domain and add
      its DNS records (SPF, DKIM), plus a DMARC record. Make an API key.
- [ ] **You.** Somewhere to receive mail at `hello@authorhunt.com` (your
      registrar's forwarding is enough to start).
- [ ] **You.** **Upstash:** a Redis database (or Lorec's, shared: keys are
      prefixed `ah:`). Without it the sign-up form's rate limit is weak on
      Vercel, because each server instance counts separately.
- [ ] **You.** In Vercel, Production environment, set:
      `NEXT_PUBLIC_APP_URL=https://authorhunt.com`, `DATABASE_URL`,
      `RESEND_API_KEY`, `EMAIL_FROM`, `UPSTASH_REDIS_REST_URL`,
      `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET` (long and random),
      `LAUNCH_AT=2027-01-08T05:00:00Z`, `PREVIEW_SECRET` (long and random).
- [ ] **You.** Do **not** set `AUTH_DEV`, and do not set any Clerk or
      Stripe variable yet.

### 1.3 Code still to do for the splash (Claude)

- [ ] Countdown that doesn't trust the visitor's clock: it currently ticks
      from the device's time, so a phone set wrong shows the wrong count.
      Use the server's time as the reference.
- [ ] At zero, the page reloads itself into the open site.
- [ ] A share image for the home address, so a link to authorhunt.com in a
      post shows the name, the date and the cat, not a blank card.
- [ ] A link to the privacy page under the sign-up form, and a short
      privacy section for the list (two emails, how to be removed).
- [ ] Count visits and sign-ups on the splash, so you can see how it's
      doing (the site's own cookieless events, or Vercel Analytics).
- [ ] Make the scheduled jobs safe before opening: only the waitlist
      reminder should run; the day, letter and notification jobs do
      nothing until `LAUNCH_AT`.
- [ ] A way for you to see the list before sign-in exists: a count on a
      page behind the preview secret, plus the table in Supabase.
- [ ] A test that loads the splash, signs up and confirms, run
      automatically on every change (see 1.4).

### 1.4 So the main app can't break the splash

The splash shares code with the app (the page frame, the database
connection, the pre-launch gate), so a bad change to any of those could
take it down. Three layers stop that:

- [ ] **You + Claude.** **A `production` branch that only moves on
      purpose.** authorhunt.com serves `production`. Work lands on `main`,
      which Vercel builds as a preview at its own address. `production` is
      moved forward only when you say so, after the checks pass.
- [ ] **Claude.** **Checks on every change** (GitHub Actions): typecheck,
      lint, tests, a production build, and the splash test from 1.3.
      A change that breaks the splash can't be promoted.
- [ ] **You.** **A separate database for previews.** A second Supabase
      project (or branch) for `main`'s previews, so testing never touches
      the real waitlist. Set its `DATABASE_URL` in Vercel's Preview
      environment only.
- [ ] **Claude.** **Database changes are additive until opening.** No
      migration may drop or rename anything the splash uses (`waitlist`).
- [ ] **You.** Know where Vercel's **Instant Rollback** is (Deployments,
      the previous one, Promote). It undoes a bad release in seconds.
- [ ] **You.** A free uptime check on authorhunt.com that emails you
      (UptimeRobot or Better Stack).

### 1.5 Before telling anyone

- [ ] **You.** Open authorhunt.com on a phone and a laptop. The count
      matches on both.
- [ ] **You.** Sign up with a real address you own. The email arrives
      (check spam), the link opens, one press confirms.
- [ ] **You.** Sign up again with the same address: same friendly answer,
      no second email.
- [ ] **You.** Visit `authorhunt.com/authors`: it returns you to the
      splash. Visit `/?preview=<your secret>`: you see the real site.
- [ ] **You.** Paste the address into a message or a draft post and check
      the preview card.
- [ ] **You.** Run the name check (docs/launch.md): USPTO search for
      AUTHOR HUNT, AUTHORHUNT, BOOK HUNT, before the name is public.
- [ ] **You.** Decide the hour. `LAUNCH_AT` is midnight Eastern, when the
      first board's day begins. If you'd rather open at a waking hour (say
      8am Eastern), the count should end then; the first board still runs
      to midnight.

**Target: splash live by Monday, November 23.**

---

## Part 2. From splash to open on January 8

### 2.1 Every technology to wire and test

| # | Service | For | Needed for splash | Needed by Jan 8 | Tested live yet |
|---|---|---|---|---|---|
| 1 | Domain and DNS | the address, email records | yes | yes | no |
| 2 | GitHub | the code; checks on every change | yes | yes | pushes work |
| 3 | Vercel | hosting, scheduled jobs | yes | yes | no |
| 4 | Supabase | the database | yes | yes | no (local database only) |
| 5 | Resend | all email | yes | yes | no (printed to the log) |
| 6 | Upstash | rate limits | yes | yes | no (in-memory) |
| 7 | Clerk | sign-in, shared with Lorec | no | yes | no (sample accounts) |
| 8 | Vercel Blob | portraits and covers | no | yes | no (saved to disk) |
| 9 | Stripe | the $3.99 / $32 membership | no | yes | no (signed test events only) |
| 10 | Sentry | error reports | no | wanted | no |
| 11 | Search Console, Bing | getting indexed | no | yes, at opening | no |
| 12 | Uptime check | knowing it's down | yes | yes | no |
| 13 | A mailbox | hello@, reports@, takedown@ | hello@ | all three | no |

### 2.2 Week by week

**By November 23: the splash (Part 1).**

**November 24 to December 6: sign-in and images.**

- [ ] **You.** Clerk: confirm Lorec's plan allows satellite domains (Part
      3). Add `authorhunt.com` as a satellite in Lorec's Clerk instance and
      add the `clerk` DNS record. Keep Lorec's sign-in open and test it
      after each step.
- [ ] **You.** Clerk: allow redirects back to authorhunt.com; add the
      second webhook endpoint (`/api/clerk/webhook`) and copy its secret.
- [ ] **You.** Read Clerk's invitation email template. It will say Lorec.
      Decide the wording, since every waitlist address gets it on Jan 8.
- [ ] **Claude.** Read Lorec's Clerk webhook and report what it does with
      someone who signed up on Author Hunt; fix in Lorec if needed.
- [ ] **Claude.** Turn Clerk on in a preview, then test: sign up, sign in
      from each site, sign out, the webhook updating and deleting a user.
- [ ] **You.** Vercel Blob: create the store.
- [ ] **Claude.** Test uploads against Blob in a preview.
- [ ] **Claude.** Finish what the first build left out: hold a new
      account's comment with a link for review; require a verified email
      to comment; a confirming email for the Sunday letter; times and
      email hours in each person's own time zone.

**December 7 to 20: payments, moderation, and the first authors.**

- [ ] **You.** Stripe, in test mode first: the product, the two prices,
      a restricted key, the webhook endpoint, the customer portal
      (docs/setup-checklist.md, section 4).
- [ ] **Claude.** Read Lorec's Stripe webhook and confirm it ignores an
      Author Hunt subscription. Fix in Lorec if there's any doubt.
- [ ] **You + Claude.** A test-mode subscription end to end with both
      sites' webhooks listening: Lorec's test account must be unchanged.
- [ ] **You.** Repeat in live mode with a real $3.99 charge, then refund
      it. Check the receipt and statement say Author Hunt.
- [ ] **You.** Terms and privacy: have the drafts reviewed. Settle what
      counts as "using AI" (grammar tools, translation, AI covers).
- [ ] **You.** Walk one report through the admin queue to a decision.
- [ ] **You.** Invite the first authors privately (Lorec's writers first)
      with the preview link, to make pages and pick launch days.
      Target: 100 pages, and 5 launches on each day of opening week.
- [ ] **Claude.** Fix what those authors find.

**December 21 to January 3: rehearsal.**

- [ ] **Claude.** Sentry on, and one deliberate error seen arriving.
- [ ] **You + Claude.** A full dress rehearsal in a preview with
      `LAUNCH_AT` set a few minutes ahead: the count reaches zero, the
      site opens, a scheduled launch goes live, the day closes with
      ranks, emails arrive.
- [ ] **Claude.** `scripts/invite-waitlist.ts --dry-run` against the real
      list; check the numbers.
- [ ] **You.** Send the Sunday letter to yourself two weeks running.
- [ ] **You.** Search Console and Bing: verify the domain.
- [ ] **You.** Decide whether the Product Hunt launch is January 8 itself
      or a week or two after, once the boards have filled. Later is safer:
      visitors from Product Hunt land on the board, and a thin one costs
      you the day.

**January 4 to 7: freeze.**

- [ ] **You + Claude.** No changes except fixes. `production` moves only
      for those.
- [ ] **You.** Confirm each opening-week launch with its author.
- [ ] **You.** Database backup taken and a restore tried once.

**January 8: open.**

- [ ] **Claude.** At `LAUNCH_AT` the gate lifts by itself. Check the
      board, sign-in and one cheer within minutes.
- [ ] **Claude.** Run the waitlist invitations in batches.
- [ ] **You.** Submit the sitemap in Search Console.
- [ ] **You.** Be at the reports queue and the inbox for the day.

---

## Part 3. What you'll likely have to pay for

Lorec is on free tiers for most of these. Author Hunt adds a second site
to each account, takes money, and sends bulk mail, and that is what the
free tiers exclude. Figures are from each company's pricing page or
third-party summaries read on November 16, 2026; **confirm each on the
company's own page before paying.**

| Service | Free tier's limit that bites | Likely move | About |
|---|---|---|---|
| **Vercel** | Hobby is for personal, non-commercial use, and its scheduled jobs may run only once a day. Author Hunt's run hourly: on Hobby the deploy fails. | **Pro**, before the splash goes live. | $20 a month per seat |
| **Supabase** | Free allows two projects per organisation, pauses a project after a week with no activity, and has no backups to restore from. Author Hunt needs a production and a preview project beside Lorec's. | **Pro** for the organisation by early December, before real pages exist. The splash can start on a free project if a slot is open. | $25 a month, plus roughly $10 for each extra project's compute |
| **Clerk** | Satellite domains (sharing Lorec's sign-in across a second domain) are not on the free plan. | **Pro** plus one satellite domain, by late November. | $25 a month ($20 billed yearly) + $10 a month |
| **Resend** | Free allows one sending domain and 100 emails a day. Lorec's domain uses the one; a busy sign-up day or opening day passes 100. | **Pro**, before the splash is announced. | $20 a month (50,000 emails) |
| **Upstash** | Free allows one database and 500,000 commands a month. | Share Lorec's database (keys are prefixed), or pay as you go. Probably nothing at first. | $0 to a few dollars |
| **Vercel Blob** | Included amounts on the Vercel plan; not checked. | Covered by Vercel Pro at this size. | usage |
| **Stripe** | No tiers. | Nothing to upgrade. Card fees come out of each $3.99 or $32. | per charge |
| **Sentry** | A free plan exists; limits not checked. | Start free. | $0 |
| **Domain** | | Register it. | about $12 a year |
| **Mailbox** | | Forwarding from the registrar is free; a real inbox costs. | $0 to $7 a month |

**Roughly $100 to $135 a month** once everything is on, of which about
$40 (Vercel and Resend) is needed for the splash itself.

Two ways to spend less, each with a cost of its own:

- **A separate, free Clerk application for Author Hunt** instead of
  sharing Lorec's saves about $35 a month. People would then have two
  accounts, one per site, and the Writers Pass link-up later gets harder.
  You chose shared sign-in; this is the fallback if the price matters.
- **Starting the splash on Supabase's free plan** is fine if Lorec's
  organisation has a free slot, as long as you move to Pro before authors
  start making pages. A free project with no backups is not where to keep
  a hundred authors' work.

If Lorec's Vercel account is on Hobby today, note that Lorec itself (which
charges for plans) is under the same rule.
