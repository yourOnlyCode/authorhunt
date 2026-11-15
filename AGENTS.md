# Author Hunt: notes for agents and contributors

Author Hunt is a daily launch board for authors and their books, and a place
readers come to find their next favourite author. Authors launch a page, then
launch each book like a product. The community cheers, comments and follows,
and each day has a ranking. It lives at authorhunt.com, is a web app only,
and is built on the same stack as Lorec (github.com/yourOnlyCode/lorec),
with Lorec's sign-in and Lorec's Stripe account. It does not look like Lorec.

This file is the entry point. `CLAUDE.md` only imports it, so the two can't
drift apart.

| Read | For |
|---|---|
| [DESIGN.md](DESIGN.md) | Tokens, type, components, voice. Read before building any UI. |
| [docs/development.md](docs/development.md) | Architecture, data model, ranking, billing, SEO, build order. |
| [docs/ontology.md](docs/ontology.md) | Every noun, state and relation, and the word people see for it. Living. |
| [docs/product-structure.md](docs/product-structure.md) | How each part maps to Product Hunt; comments, notifications, content notes, reports, bans, the Clerk webhook. |
| [docs/monetization.md](docs/monetization.md) | What's free, what a membership buys, Support, promoted rows. Decided November 2026. |
| [docs/build-notes.md](docs/build-notes.md) | How to run it, and what the code already provides. Read before adding anything. |
| [docs/setup-checklist.md](docs/setup-checklist.md) | Every account, key and DNS record to wire up, in order, with who does it. |
| [docs/launch.md](docs/launch.md) | The Product Hunt launch, the cold start, and the name check. |
| [docs/mockups/](docs/mockups/) | The approved look. Port from it; don't reinterpret it. |

## The product in eight rules

These are the decisions most likely to be undone by accident. Each has its
reason; change one only when the owner says so, and change this file with it.

1. **Readers never pay and never hit a wall.** Every author page, book page,
   daily board and filter is public and server-rendered. An account is asked
   for at the action (cheer, follow, save, give), never at the door.
   *Why:* the site is worth something to authors only if readers are here.
2. **Rank can't be bought.** Plan, trial, comp status and Support (gifts)
   never enter a score. Scores come from `lib/ranking/` only, which reads no
   billing or gift data.
   *Why:* a board that sells position is an ad page, and readers can tell.
3. **Launching is free, for good. A membership buys tools, never position.**
   Making a page, launching it and launching every work costs nothing and
   needs no plan. $3.99 a month ($32 a year) adds tools around a launch (emailing followers,
   the coming-soon list, full analytics, the Support button, the full share
   kit: docs/monetization.md). When a membership ends those tools switch
   off and nothing public disappears. *Why:* the owner's call, November
   2026: a fee at the door gives an empty board.
4. **Followed links are earned, not sold.** See "Outbound links" in
   docs/development.md. Never make `rel` depend on plan. *Why:* selling
   followed links is a link scheme under Google's spam policies and would
   cost every author on the site their trust at once.
5. **One account, one cheer, and never your own launch.** Enforced by a
   unique index and in the route, not in the client.
6. **The day is a date in `America/New_York`.** `launchDay()` in
   `lib/ranking/day.ts` is the only place that turns a time into a day.
   Never call `new Date().toDateString()` for it.
7. **How a work was written is declared, and a false declaration is a ban.**
   No page or book goes public without its AI declaration. A ban is a
   person's decision on evidence, logged, never an AI detector's score.
   *Why:* the owner's rule; and a detector that's wrong about one honest
   author costs more trust than it buys.
8. **The Writers Pass isn't mentioned in this app** until it opens. The
   comp is a to-do recorded in docs/development.md, not a feature.

## Stack

Next.js 16 (App Router, on Vercel `iad1`), React 19, TypeScript, Tailwind 3,
Clerk (Lorec's instance, as a satellite domain), Drizzle on Supabase Postgres (`us-east-1`), Stripe, Resend, Upstash
rate limiting, Vitest. No Tauri, no static export: this app can use server
components, ISR and route handlers freely, which Lorec's desktop build can't.

Next 16 differs from older versions (the request interceptor is `proxy.ts`,
not `middleware.ts`, and it runs on Node). Read the guide in
`node_modules/next/dist/docs/` before writing routing or caching code.

## The ontology

[docs/ontology.md](docs/ontology.md) is the list of what exists here and
what it's called: in the UI, and in code. Read it before naming a table, a
type, a route or a button. **A PR that adds or renames a table, an enum
value, a state or a word people read changes that file in the same PR**,
and adds a line under its "Changes". If the code and the ontology disagree,
one of them has a bug.

## Checks before you push

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint, zero errors
npm test            # vitest
```

A change to `lib/ranking/`, `lib/billing/` or `lib/seo/links.ts` comes with a
test. Those three are pure functions with no database and no clock of their
own (pass `now` in), so the tests are cheap and there is no excuse.

## Database

- Schema is Drizzle in `lib/db/schema/`. Every change also needs a migration
  in `supabase/migrations/`, named `YYYYMMDDHHMMSS_what_it_does.sql`, safe to
  run twice (`IF NOT EXISTS`). A migration reaches production before the code
  that needs it; say so in the PR body.
- Author Hunt has **its own Supabase project**. Never point it at Lorec's
  database, and never write a migration that touches Lorec's tables.
- With no `DATABASE_URL`, development runs on PGlite (Postgres in
  WebAssembly) in `.data/`, migrated from the same SQL files and filled by
  `scripts/seed.ts`. Sample data never reaches a real database: the seed
  refuses to run against `DATABASE_URL`.
- Enumerations are text columns with a TypeScript union, not Postgres
  enums. Genres, reference authors and platforms are lookup tables keyed by
  slug, and a page or work lists its slugs in a `text[]` column.
- Row level security is on for every table with no policy: nothing is
  readable through Supabase's public API, and the app reads and writes on
  the server only.
- RLS policies use `requesting_user_id()`, never `auth.uid()`, which is null
  for Clerk users. The server reads through Drizzle with the pooler
  (`prepare: false`); the browser never holds a service key.
- Counts shown on a page (`cheer_count`, `follower_count`, `momentum`) are
  columns kept by the write path or the hourly job, never a `COUNT(*)` at
  read time. The daily board is one indexed query.

## Routes

- A page that needs a signed-in person says so itself, by calling
  `requireViewer("/its/path")` (`lib/auth`); everything else is public.
  `proxy.ts` only holds the pre-launch gate (`LAUNCH_AT`) and Clerk's
  middleware. Signed-out calls to public APIs are rate limited per IP
  (`byIp`, `lib/api.ts`).
- A public page is a server component that fetches its own data and exports
  `generateMetadata` (title, description, canonical, Open Graph) and its
  JSON-LD. A public page with no canonical URL fails review.
- Mutations are route handlers under `app/api/`, each of which checks the
  Clerk session, then the entitlement if it's a member tool
  (`requireMember`, `lib/billing/access.ts`), then the rate limit.
- The Clerk webhook is Author Hunt's own endpoint on Lorec's instance
  (docs/product-structure.md §8). It makes no row on `user.created`.
- Admin pages check `isAdminUser` (`ADMIN_EMAILS`) on the server and 404 for
  anyone else.

## Billing

- Author Hunt's product and prices live in **Lorec's Stripe account**. Every
  Stripe object Author Hunt creates carries `metadata.app = "authorhunt"`,
  and its webhook (`/api/stripe/webhook`) ignores any event whose object
  doesn't. It has its own webhook endpoint and signing secret.
- Never reuse a Lorec Stripe customer. An Author Hunt customer is created
  for the Author Hunt account, so Lorec's webhook never finds a user for it.
- Author Hunt signs in through **Lorec's Clerk instance**. Never change a
  Clerk setting, a sign-in page or user metadata that Lorec reads; Author
  Hunt's own metadata lives under an `authorhunt` key.
- **Author Hunt processes no gifts.** Support is a member's own outside
  link (Ko-fi, PayPal and the like), opened in a new tab. No Stripe Connect.
- Whether an author has the member tools is one function:
  `authorAccess(author, now)` in `lib/billing/access.ts`. It gates tools
  only. Nothing may call it to decide whether someone can make a page,
  launch, comment or appear on a board.

## Writing code here

- Comments explain why, in plain sentences, at the top of a file or above a
  non-obvious block.
- Copy follows DESIGN.md's voice: calm, plain, no exclamation marks, no
  growth-speak. The product's words are in docs/ontology.md, with the ones
  we don't use. Don't coin others.
- Keep a change to what it's for. Spotted something else? Note it in the PR.
- When review corrects a design or product choice, the rule lands in
  DESIGN.md or here in the same PR, with a one-line reason.

## Working in parallel

The first build is split into lanes so several sessions can work at once
without editing the same files. A lane owns its folders; anything shared
(`lib/db/schema/`, `app/globals.css`, `proxy.ts`) changes in the Foundation
lane first, and later through a small PR of its own.

| Lane | Owns | Depends on |
|---|---|---|
| Foundation | scaffold, `lib/db/`, `proxy.ts`, `app/layout.tsx`, `app/globals.css`, `components/ui/` | nothing |
| Ranking | `lib/ranking/`, `app/api/cron/momentum/` | schema |
| Board | `app/(public)/page.tsx`, `app/(public)/day/`, `components/board/` | Foundation, Ranking |
| Pages | `app/(public)/author/`, `app/(public)/book/`, `components/author/`, `components/book/`, `lib/seo/` | Foundation |
| Discover | `app/(public)/authors/`, `/genre`, `/city`, `/for-readers-of`, `/for-you`, `lib/discover/` | Foundation |
| Studio | `app/(app)/studio/` (the author's side: edit page, launch, updates) | Foundation |
| Billing | `lib/billing/`, `app/api/stripe/`, `app/(public)/pricing/` | schema |
| Email | `lib/emails/`, `app/api/cron/digest/` | schema |
| Uploads | `lib/images/`, `app/api/uploads/` | Foundation |
| Share | `app/[handle]/`, `app/api/sticker/`, `app/api/badge/`, Open Graph images | Pages |
| Support | the support-link field in Studio and its button (`components/author/support-link.tsx`) | Billing |
| Trust | `lib/trust/` (declaration, reports, standing), the admin queue | schema |

A lane's session reads this file, DESIGN.md and its section of
docs/development.md, builds against the seeded database (`npm run db:seed`),
and stops at its own folders.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
