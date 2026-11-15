# Author Hunt: setup checklist

Everything that has to be wired up outside the code, in the order that
unblocks the most. Each item says who does it: **You** (it needs an
account, a card or a DNS login only the owner has) or **Claude** (it can be
done from a coding session once the item before it is done).

Tick items here as they're done, and write the resulting ids next to them
(project refs, product ids). Never write a secret in this file: keys go in
Vercel's environment variables and a local `.env.local` that git ignores.

Details of other products' dashboards change. Where a step names a setting,
treat the name as a pointer and follow that product's current guide.

## 0. Before anything else

- [ ] **You.** Install the Claude GitHub App on `yourOnlyCode/authorhunt`
      (github.com/apps/claude/installations/select_target). Until this is
      done nothing in this repo has left the session that wrote it.
- [ ] **Claude.** Push `claude/adoring-ptolemy-63uagg`; open the first PR
      when asked.
- [ ] **You.** Register **authorhunt.com** and know where its DNS is
      managed. Most steps below add a record there.
- [ ] **You.** Decide the email addresses: a sending address
      (`hello@authorhunt.com`), a takedown and reports address, and the
      admin emails for `ADMIN_EMAILS`.

## 1. Hosting: Vercel

- [ ] **You.** New Vercel project from the GitHub repo, in the team Lorec
      uses. Framework: Next.js.
- [ ] **You.** Function region `iad1` (Washington, D.C.), to sit beside
      the database.
- [ ] **You.** Add `authorhunt.com` and `www.authorhunt.com` to the
      project and add the DNS records Vercel shows. Pick one as canonical
      and redirect the other.
- [ ] **You.** Create the environment variables in section 10, for
      Production and Preview separately. Preview gets test keys only.
- [ ] **Claude.** `vercel.json` with the cron schedule (section 8).

## 2. Database: Supabase

- [ ] **You.** New Supabase project, **separate from Lorec's**, region
      `us-east-1`. Note the project ref.
- [ ] **You.** Copy the pooled connection string (transaction pooler) for
      `DATABASE_URL`, and the project URL and keys.
- [ ] **You.** A second, free project (or a Supabase branch) for
      development and previews, so nothing tests against production.
- [ ] **Claude.** Drizzle schema, the first migration, and
      `requesting_user_id()` and RLS policies, following Lorec's pattern.
- [ ] **Claude.** `npm run db:seed` for development only.
- [ ] **You.** Turn on daily backups (and point-in-time recovery when
      there's data worth it).
- [ ] **You, later.** Connect Supabase to Clerk as a third-party auth
      provider if the browser ever reads Supabase directly. The first
      build reads only through the server, so this can wait.

## 3. Sign-in: Clerk (Lorec's instance, as a satellite)

Do this with Lorec's sign-in open in another tab and test Lorec after each
step. A mistake here affects Lorec's users.

- [ ] **You.** Confirm Lorec's Clerk plan includes satellite domains.
      Clerk's pricing page listed them on Pro at $10 a month each
      (November 2026).
- [ ] **You.** In Lorec's Clerk application: Domains, Satellites, add
      `authorhunt.com`. Add the `clerk` CNAME it gives you to
      authorhunt.com's DNS and wait for it to verify.
- [ ] **You.** Add Author Hunt's URLs to the allowed redirect origins so
      sign-in on lorec.io can send people back to authorhunt.com.
- [ ] **You.** Decide what the sign-in page on lorec.io says to someone
      arriving from Author Hunt. Today it says Lorec.
- [ ] **Claude.** Satellite configuration in the app (the satellite flag,
      the domain, the primary's sign-in and sign-up URLs), per Clerk's
      satellite-domain guide.
- [ ] **You.** In the same Clerk instance: Webhooks, add a **second
      endpoint**, `https://authorhunt.com/api/clerk/webhook`, subscribed
      to user updated and deleted. Copy its signing secret.
- [ ] **Claude.** Read Lorec's own Clerk webhook handler and report what
      it does with a user who signed up on Author Hunt. Fix in Lorec if
      needed, in a Lorec PR.
- [ ] **You.** Development: Clerk's development instance has its own keys
      and doesn't need the DNS record. Use it for local work and previews.

## 4. Payments: Stripe (Lorec's account)

Do every step in **test mode** first, then repeat in live mode.

- [ ] **You.** Product "Author Hunt membership" with two recurring prices:
      **$3.99 a month** and **$32 a year**, USD. Put
      `app = authorhunt` in the product's metadata. Note both price ids.
- [ ] **You.** A **restricted API key** for Author Hunt (not Lorec's
      secret key), allowed to write Checkout Sessions, Customers,
      Subscriptions and the customer portal, and nothing else.
- [ ] **You.** Webhooks: add an endpoint,
      `https://authorhunt.com/api/stripe/webhook`, for checkout completed
      and subscription created, updated and deleted. Copy its signing
      secret.
- [ ] **You.** Customer portal: turn it on, allow cancel and switching
      between the two prices, and set the return URL to Author Hunt.
- [ ] **Claude.** Read Lorec's Stripe webhook
      (`app/api/billing/webhooks/route.ts`) and confirm it ignores a
      subscription on a price it doesn't know and a customer it has no
      user for. Add an early return on `metadata.app` in Lorec if there's
      any doubt.
- [ ] **You and Claude.** Prove it: a test-mode subscription to the
      Author Hunt price with both webhooks listening. Lorec's test account
      must be unchanged afterwards.
- [ ] **You.** Check the statement descriptor and receipt emails say
      Author Hunt, not Lorec, or cardholders will dispute a charge they
      don't recognise.
- [ ] **You.** Tax: decide whether Stripe Tax is on for this product, as
      it is or isn't for Lorec.

## 5. Email: Resend

- [ ] **You.** Add `authorhunt.com` as a sending domain in Resend and add
      the DNS records it lists (SPF, DKIM), plus a DMARC record.
- [ ] **You.** An API key limited to that domain.
- [ ] **You.** Somewhere to receive mail at `hello@` and the reports
      address (your mail host's MX records, or forwarding).
- [ ] **Claude.** Templates: notifications, launch-day mail, the Sunday
      letter. An unsubscribe link and a postal address in every
      non-transactional email (required by law in the US).
- [ ] **You.** Send the Sunday letter to yourself for two weeks before
      anyone else gets it.

## 6. Rate limits: Upstash

- [ ] **You.** A Redis database for Author Hunt (separate from Lorec's, so
      one site's traffic can't use up the other's limits), in a US East
      region. Copy the REST URL and token.
- [ ] **Claude.** Limits on cheers, comments, sign-up-adjacent forms,
      reports, uploads and signed-out reads.

## 7. Images: Vercel Blob

- [ ] **You.** Create a Blob store on the Vercel project. The token is
      added to the project automatically.
- [ ] **Claude.** Signed uploads, resizing, EXIF stripping
      (docs/development.md, Images).

## 8. Scheduled jobs: Vercel Cron

- [ ] **You.** A long random `CRON_SECRET`.
- [ ] **Claude.** Jobs, each refusing a call without the secret:
      hourly Momentum; 00:05 Eastern to close the day (two UTC entries or
      a check inside the job, since Eastern time shifts with daylight
      saving); the evening notification summary; the Sunday letter.
- [ ] **You.** Check the Vercel plan allows hourly crons.

## 9. Watching it: errors, search, analytics

- [ ] **You.** A Sentry project for Author Hunt (Lorec uses Sentry).
      Optional for the first deploy, wanted before launch.
- [ ] **You.** Google Search Console: verify authorhunt.com (a DNS TXT
      record) and submit the sitemap once pages exist. Bing Webmaster
      Tools likewise.
- [ ] **Claude.** `sitemap.ts`, `robots.ts`, `llms.txt`, per-page
      metadata and JSON-LD.
- [ ] **You.** Decide on page analytics: Lorec's own `site_events`
      approach ported here (no cookies, no consent banner) or Vercel's.

## 10. Environment variables

Names to create in Vercel. Values come from the steps above.

| Variable | From | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | you | `https://authorhunt.com` |
| `DATABASE_URL` | Supabase | the pooled connection string |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase | service key is server-only |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk | **the same instance as Lorec** |
| Clerk satellite settings | Clerk | names as in Clerk's satellite guide |
| `CLERK_WEBHOOK_SECRET` | Clerk | Author Hunt's endpoint's own secret |
| `STRIPE_SECRET_KEY` | Stripe | the **restricted** key |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Author Hunt's endpoint's own secret |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | Stripe | the two price ids |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend | |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash | |
| `BLOB_READ_WRITE_TOKEN` | Vercel | added with the Blob store |
| `CRON_SECRET` | you | |
| `ADMIN_EMAILS` | you | comma-separated |
| `SENTRY_DSN` | Sentry | optional at first |

Claude writes `.env.example` with these names and no values.

## 11. Words that have to exist before the public can sign up

- [ ] **You.** Terms: the three AI declarations defined, what a false one
      costs, who owns uploads, the rules on asking for cheers, how a
      membership renews and is cancelled.
- [ ] **You.** Privacy notice: what's public, what's emailed, how to
      delete an account, and that sign-in is shared with Lorec.
- [ ] **You.** A takedown address, published.
- [ ] **You.** The name check (docs/launch.md): USPTO search for AUTHOR
      HUNT, AUTHORHUNT and BOOK HUNT, and a look at the cat mark beside
      Product Hunt's.
- [ ] **Claude.** Draft all three documents for a lawyer to review, if
      asked. A draft is not legal advice.

## 11a. The splash page (live well before January 8, 2027)

Needs only sections 0 to 2, Resend (5) and Upstash (6). It does not need
Clerk or Stripe.

- [ ] **Claude.** Build the splash from `docs/mockups/splash.html`, the
      `waitlist` table, the form route and the confirming email.
- [ ] **You.** `LAUNCH_AT=2027-01-08T05:00:00Z` in Vercel (midnight Eastern).
- [ ] **You.** Do **not** turn on Clerk's waitlist mode: it would apply to
      Lorec's sign-ups.
- [ ] **You.** A short privacy line for the list (what's kept, that it's
      two emails, how to be removed), linked under the form.
- [ ] **Claude, at opening.** Send Clerk invitations to confirmed
      addresses, in batches, after checking Clerk's limits.

## 12. The order to do it in

1. Section 0, then Vercel and Supabase (sections 1 and 2). With those,
   Claude can build and deploy the public pages against seed data.
2. Clerk (section 3), so people can sign in, cheer and make pages.
3. Blob, Upstash and Resend (sections 5 to 7), so pages have pictures,
   forms are protected and mail goes out.
4. Stripe (section 4). Nothing depends on it, since launching is free.
5. Sections 8 to 11 before anyone outside is invited.
