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

### 1.1 Decided (November 16)

- [x] **Sign-in is Author Hunt's own, not shared with Lorec** (decided
      November 16, later). An account here is not a Lorec account.
- [x] **The list is an email list, not accounts.** The splash takes an
      email and "I'm an author / I'm a reader", stores it, and sends one
      email to confirm the address. On opening day each confirmed address
      gets an invitation that makes their account in one click. This is
      also the cheaper way: the splash needs no Clerk at all, so Clerk's
      paid plan (about $35 a month) can wait until sign-in is being wired
      up in late November.
- [x] **The site opens at noon Eastern on Friday, January 8, 2027** (9am
      Pacific), not midnight. `LAUNCH_AT=2027-01-08T17:00:00Z`. The page
      shows the hour in each visitor's own time zone as well.
- Opening day's board is a half day: launches go live at noon and the day
  still closes at midnight Eastern. Every later day runs midnight to
  midnight.

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
      `LAUNCH_AT=2027-01-08T17:00:00Z`, `PREVIEW_SECRET` (long and random).
- [ ] **You.** Do **not** set `AUTH_DEV`, and do not set any Clerk or
      Stripe variable yet.

### 1.3 Code for the splash (Claude): done November 16

- [x] The countdown takes its time from the server, so a device whose
      clock is wrong still shows the right count. Checked with a
      simulated phone set five hours fast.
- [x] At zero, the page loads the open site.
- [x] A share image for authorhunt.com with the opening date.
- [x] A "What we keep" link under the form to the privacy page, which has
      a section on the list.
- [x] Visits are counted on the splash (no cookies).
- [x] Before opening, every scheduled job holds off except the waitlist's
      one reminder.
- [x] **Your view of the list:** visit `/?preview=<your secret>` once,
      then `/owner`. It shows how many joined and confirmed, by day and
      by link, and visits. Addresses themselves are in Supabase.
- [x] November 16, later: the first view fits one screen, with a reader /
      author switch above the headline that changes its first words, and an
      FAQ below. Checked for contrast, colour blindness, keyboard and
      screen-reader markup.
- [x] A test that loads the splash, checks every other page is held back,
      signs up, and confirms through the emailed link
      (`npm run smoke:splash`, 26 checks).

### 1.4 So the main app can't break the splash

The splash shares code with the app (the page frame, the database
connection, the pre-launch gate), so a bad change to any of those could
take it down. Three layers stop that:

- [ ] **You + Claude.** **A `production` branch that only moves on
      purpose.** authorhunt.com serves `production`. Work lands on `main`,
      which Vercel builds as a preview at its own address. `production` is
      moved forward only when you say so, after the checks pass.
- [x] **Claude.** **Checks on every change** (`.github/workflows/ci.yml`):
      typecheck, lint, tests, a production build, and the splash test.
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

### 1.6 Scheduled jobs while on Vercel's free plan

Vercel's Hobby plan refuses a deploy whose scheduled jobs run more than
once a day (the first deploy failed on this, November 16). Until opening
only the waitlist's reminder has work to do, and it runs once a day, so
`vercel.json` now lists that job alone and the deploy goes through.

- [ ] **You + Claude, before the dress rehearsal in late December:** move
      Vercel to Pro, then put the hourly jobs back in `vercel.json`:
      `/api/cron/day` at `0 * * * *`, `/api/cron/notifications` at
      `10 * * * *`, `/api/cron/momentum` at `20 * * * *`, and
      `/api/cron/letter` at `15 * * * 0`. Without them no launch goes
      live, no day closes and no email is sent after opening.

**Target: splash live by Monday, November 23.**

---

## Part 1.5. Early access: authors set up their first launch before opening

Built and switched off. Before opening, an author can make an account, set
up their page and first launch at `/start`, choose a day from January 8
on, and see their launch page as readers will. They become founding
authors, and their two months of member tools run from opening day.
Readers stay on the email list. Nothing they make is visible to anyone
else until the first board.

Turning it on, in order:

- [ ] **You.** Set up Clerk (Author Hunt's own application, production
      instance on authorhunt.com) and put its keys in Vercel. This is real
      sign-in, so it comes first. (It was planned for late November; it is
      now the first step here.)
- [ ] **You.** Turn on Vercel Blob and add its token in Vercel. Portraits
      and covers can't be saved without it.
- [ ] **You.** Run `npm run db:migrate` against production. Two migrations
      are waiting: the genres and platforms, and a work's word count with a
      launch's author note. Without the genres there is nothing to choose
      at step 1.
- [ ] **Claude.** With those in place, go through `/start` on production
      with a real account, start to finish.
- [ ] **You.** Set `EARLY_ACCESS=1` in Vercel and redeploy. The splash then
      offers "Set up your first launch" to the author's side.
- [ ] **Claude.** An email to authors already on the list, inviting them in.
- [ ] Before the trial's end (March 9, 2027): Stripe live, and reminder
      emails a week and a day before an author's tools switch off.

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
| 7 | Clerk | sign-in, Author Hunt's own application | no | yes | no (sample accounts) |
| 8 | Vercel Blob | portraits and covers | no | yes | no (saved to disk) |
| 9 | Stripe | the $3.99 / $32 membership | no | yes | no (signed test events only) |
| 10 | Sentry | error reports | no | wanted | no |
| 11 | Search Console, Bing | getting indexed | no | yes, at opening | no |
| 12 | Uptime check | knowing it's down | yes | yes | no |
| 13 | A mailbox | hello@, reports@, takedown@ | hello@ | all three | no |

### 2.2 Week by week

**By November 23: the splash (Part 1).**

**November 24 to December 6: sign-in and images.**

- [ ] **You.** Clerk: create Author Hunt's **own** application (not
      Lorec's; decided November 16), its production instance on
      authorhunt.com with the DNS records Clerk lists, and the webhook
      endpoint (`/api/clerk/webhook`). docs/setup-checklist.md, section 3.
- [ ] **You.** Word Clerk's invitation email. Every waitlist address gets
      it on January 8.
- [ ] **Claude.** Turn Clerk on in a preview, then test: sign up, sign in,
      sign out, the webhook updating and deleting a user.
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
- [ ] **You.** Terms and privacy: have the drafts reviewed. The AI rule
      is set (no AI-written work; docs/development.md). Still to settle:
      AI-made covers.
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

- [ ] **Claude.** At noon Eastern the gate lifts by itself. Run the day
      job by hand at once so the day's launches are live in the first
      minute, then check the board, sign-in and one cheer.
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
| **Clerk** | None expected. Author Hunt has its own Clerk application, so no satellite domain is needed; the free plan is reported to cover a production application on its own domain up to 50,000 users. | Stay on free. | $0 |
| **Resend** | Free allows one sending domain and 100 emails a day. Lorec's domain uses the one; a busy sign-up day or opening day passes 100. | **Pro**, before the splash is announced. | $20 a month (50,000 emails) |
| **Upstash** | Free allows one database and 500,000 commands a month. | Share Lorec's database (keys are prefixed), or pay as you go. Probably nothing at first. | $0 to a few dollars |
| **Vercel Blob** | Included amounts on the Vercel plan; not checked. | Covered by Vercel Pro at this size. | usage |
| **Stripe** | No tiers. | Nothing to upgrade. Card fees come out of each $3.99 or $32. | per charge |
| **Sentry** | A free plan exists; limits not checked. | Start free. | $0 |
| **Domain** | | Register it. | about $12 a year |
| **Mailbox** | | Forwarding from the registrar is free; a real inbox costs. | $0 to $7 a month |

**Roughly $65 to $100 a month** once everything is on (Clerk is no longer
part of it), of which about $20 to $40 (Vercel, and Resend if its free
limits bite) is needed for the splash itself.

One way to spend less at the start:

- **Starting the splash on Supabase's free plan** is fine if Lorec's
  organisation has a free slot, as long as you move to Pro before authors
  start making pages. A free project with no backups is not where to keep
  a hundred authors' work.

If Lorec's Vercel account is on Hobby today, note that Lorec itself (which
charges for plans) is under the same rule.
