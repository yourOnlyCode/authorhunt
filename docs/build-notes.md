# Build notes: what the foundation provides

For anyone (person or agent) adding to the app. AGENTS.md has the rules;
this lists what already exists so it gets used rather than rebuilt.

## Running it

```bash
npm install
npm run dev        # makes a local database with sample data the first time
```

No accounts are needed. Without `DATABASE_URL` the database is PGlite (real
Postgres in WebAssembly) in `.data/`. Without Clerk keys, `/sign-in` lists
sample accounts: `dev_reader` (June, a reader), `dev_author` (Maren, an
author with the member tools), `dev_new` (no page yet), `dev_admin` (the
owner). The cookie is `ah_dev_user`. `npm run db:reset` starts the data over.

Two dev servers can run side by side in one checkout if each has its own
database and build folders:

```bash
LOCAL_DB_DIR=.data/pg-x NEXT_DIST_DIR=.next-x npx tsx scripts/dev-db.ts
LOCAL_DB_DIR=.data/pg-x NEXT_DIST_DIR=.next-x npx next dev -p 3201
```

## What exists

| Where | What |
|---|---|
| `lib/db/schema/index.ts` | Every table and its types. `supabase/migrations/` is the SQL. |
| `lib/db/index.ts` | `db` (Drizzle). `lib/sql.ts` `rowsOf()` reads `db.execute` results from either driver. |
| `lib/auth/index.ts` | `getViewer()`, `getViewerAuthor()`, `requireViewer(next)`, `requireAdmin()`, `signInHref()`. |
| `lib/api.ts` | For route handlers: `signedIn(req, limit)`, `byIp(req, limit)`, `readBody(req, zodSchema)`, `json`, `fail`. |
| `lib/env.ts` | `appUrl`, which services are configured, `launchAt()`, `beforeLaunch()`. |
| `lib/ranking/` | `day.ts` (`launchDay`, `addDays`, `formatDay`, `dayStart`, quiet hours), `score.ts`, `points.ts`. Pure. |
| `lib/billing/access.ts`, `server.ts` | `authorAccess()` (pure), `accessFor(author)`, `isMember(author)`, `PRICE`, `FREE_LINK_LIMIT`. |
| `lib/seo/links.ts` | `relFor(kind, {siteVerified})`, `safeUrl()`, `supportUrlAllowed()`, `hostOf()`. |
| `lib/actions/` | `cheer.ts` (`toggleCheer`, `toggleFollow`, `recomputeLaunch`, `ActionError`), `points.ts` (`awardPoints`, `revokePoints`, `refreshMomentum`), `notify.ts` (`notify`, `NOTIFICATION_KINDS`). |
| `lib/queries/board.ts`, `lookups.ts` | `boardFor`, `topBetween`, `comingSoon`, `risingAuthors`, `toCards`, `LaunchCard`, `colorFor`; `lookups()`, `named()`. |
| `lib/emails/send.ts` | `sendEmail()`, `layout()`. Prints to the log when Resend isn't configured. |
| `lib/rate-limit.ts`, `lib/slug.ts` | `rateLimit`, `clientIp`; `slugify`, `validHandle`, `RESERVED_HANDLES`. |
| `components/ui/` | `Cover`, `Portrait`, `initials`; `UpIcon`, `SayIcon`, `SearchIcon`, `CatMark`. |
| `components/board/` | `LaunchRow` (variants `first`, `row`, `small`), `CheerButton` (variants `row`, `big`). |
| `components/social/` | `FollowButton`, `SaveButton`. |
| `components/trust/report-link.tsx` | `ReportLink`, `REPORT_REASONS`. |
| `components/site/` | `SiteHeader`, `SiteFooter`, `LetterForm`. |
| `app/globals.css` | Tokens and every component class from the mocks. Area styles go in `app/styles/*.css`. |
| `app/(site)/` | Pages that wear the header and footer. `app/splash`, `app/confirm` don't. |
| `proxy.ts` | The pre-launch gate (`LAUNCH_AT`, `PREVIEW_SECRET`) and Clerk's middleware when configured. |

## Areas built on the foundation

| Area | Where |
|---|---|
| Work and author pages, comments, day archives | `app/(site)/work`, `author`, `launches`; `components/comments`, `components/author`, `components/book`; `app/api/comments`, `notify-requests` |
| Short links, share images, badge, sticker, sitemap | `app/[handle]/route.ts`, `opengraph-image.tsx` files, `app/api/badge`, `app/api/sticker`, `app/sitemap.ts`, `robots.ts`, `llms.txt`; fonts for drawn images in `assets/fonts` (`lib/og-fonts.ts`) |
| Page analytics | `components/analytics` (`Track`, `OutLink`), `app/api/events` |
| Directory, filter pages, search | `lib/queries/directory.ts`, `lib/discover`, `components/discover`, `app/(site)/authors`, `genre`, `city`, `for-readers-of`, `inspired-by`, `platform`, `search` |
| Collections, For you, the reader's own pages | `app/(site)/collections`, `collection/[id]`, `for-you`, `you`, `notifications`, `settings`; `app/api/collections`, `settings`, `notifications` |
| The author studio | `app/(site)/studio`, `components/studio`, `lib/studio` (rules, validation), `lib/images/store.ts`, `app/api/studio`, `app/api/uploads` |
| Membership | `app/(site)/pricing`, `lib/billing/stripe.ts`, `app/api/stripe` |
| Scheduled jobs and email | `lib/cron` (`pure.ts` is tested), `app/api/cron`, `vercel.json`, `lib/emails/templates.ts`, `app/api/letter`, `app/letter/unsubscribe`, `scripts/invite-waitlist.ts` |
| Clerk webhook | `app/api/clerk/webhook` |
| Reports, cases, standing | `lib/trust`, `app/api/reports`, `app/api/admin`, `app/(site)/admin`, `app/(site)/standing` |
| Legal and about (drafts) | `app/(site)/terms`, `privacy`, `about` |

`npm run build` lists every route.

## Known gaps (November 2026)

- Live calls to Stripe, Clerk, Resend, Upstash and Vercel Blob have not been
  made: there were no keys. Each path runs without its key and was tested
  that way; the Stripe webhook was tested with locally signed events.
- A new account's comment containing a link is not held for review, and
  commenting does not yet require a verified email (that needs Clerk).
- "One email to followers a day" is kept by the rate limiter, so it is only
  durable with Upstash configured.
- The Sunday letter's sign-up has no confirming email.
- Un-banning does not restore the weight of cheers the account gave.
- Threads (the forum) and unclaimed pages are not built, as planned.
- Uploads go through the server (`app/api/uploads`), not straight to Blob.

## Routes that exist

`/` (the board), `/splash`, `/confirm`, `/sign-in`, `POST /api/cheers`,
`POST /api/follows`, `POST /api/collections/save`, `POST /api/waitlist`,
`POST /api/waitlist/confirm`, `POST /api/dev-auth`.

URLs the app links to: `/work/[slug]`, `/author/[handle]`, `/[handle]`
(short link), `/launches/[day]`, `/authors`, `/genre/[slug]`,
`/city/[slug]`, `/for-readers-of/[slug]`, `/inspired-by/[slug]`,
`/platform/[slug]`, `/search`, `/collections`, `/for-you`, `/you`,
`/notifications`, `/settings`, `/studio`, `/pricing`, `/about`, `/terms`,
`/privacy`, `/admin`.
