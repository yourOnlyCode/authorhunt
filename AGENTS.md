# Author Hunt: notes for agents and contributors

Author Hunt is a daily launch board for authors and their books, and a place
readers come to find their next favourite author. Authors launch a page, then
launch each book like a product. The community cheers, comments and follows,
and each day has a ranking. It is a web app only, built on the same stack as
Lorec (github.com/yourOnlyCode/lorec) and sold through Lorec's Stripe account.

This file is the entry point. `CLAUDE.md` only imports it, so the two can't
drift apart.

| Read | For |
|---|---|
| [DESIGN.md](DESIGN.md) | Tokens, type, components, voice. Read before building any UI. |
| [docs/development.md](docs/development.md) | Architecture, data model, ranking, billing, SEO, build order. |
| [docs/launch.md](docs/launch.md) | The Product Hunt launch and the cold-start plan. |
| [docs/mockups/](docs/mockups/) | The approved look. Port from it; don't reinterpret it. |

## The product in six rules

These are the decisions most likely to be undone by accident. Each has its
reason; change one only when the owner says so, and change this file with it.

1. **Readers never pay and never hit a wall.** Every author page, book page,
   daily board and filter is public and server-rendered. An account is asked
   for at the action (cheer, follow, comment, shelve), never at the door.
   *Why:* the site is worth something to authors only if readers are here.
2. **Rank can't be bought.** Plan, trial and comp status never enter a score.
   Scores come from `lib/ranking/` only, which reads no billing data.
   *Why:* a board that sells position is an ad page, and readers can tell.
3. **A page outlives its plan.** When a trial or membership ends, the author's
   page, books and past launches stay public and indexed. What stops is new
   launches, updates and the author's analytics. *Why:* a page that vanishes
   breaks every link pointing at it, the author's and ours.
4. **Followed links are earned, not sold.** See "Outbound links" in
   docs/development.md. Never make `rel` depend on plan. *Why:* selling
   followed links is a link scheme under Google's spam policies and would
   cost every author on the site their trust at once.
5. **One account, one cheer, and never your own launch.** Enforced by a
   unique index and in the route, not in the client.
6. **The day is a date in `America/New_York`.** `launchDay()` in
   `lib/ranking/day.ts` is the only place that turns a time into a day.
   Never call `new Date().toDateString()` for it.

## Stack

Next.js 16 (App Router, on Vercel `iad1`), React 19, TypeScript, Tailwind 3,
Clerk, Drizzle on Supabase Postgres (`us-east-1`), Stripe, Resend, Upstash
rate limiting, Vitest. No Tauri, no static export: this app can use server
components, ISR and route handlers freely, which Lorec's desktop build can't.

Next 16 differs from older versions (the request interceptor is `proxy.ts`,
not `middleware.ts`, and it runs on Node). Read the guide in
`node_modules/next/dist/docs/` before writing routing or caching code.

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
- RLS policies use `requesting_user_id()`, never `auth.uid()`, which is null
  for Clerk users. The server reads through Drizzle with the pooler
  (`prepare: false`); the browser never holds a service key.
- Counts shown on a page (`cheer_count`, `follower_count`, `momentum`) are
  columns kept by the write path or the hourly job, never a `COUNT(*)` at
  read time. The daily board is one indexed query.

## Routes

- Public pages are listed in `isPublicRoute` in `proxy.ts`. A page that isn't
  listed is signed-in only. Signed-out reads of public APIs are rate limited
  per IP.
- A public page is a server component that fetches its own data and exports
  `generateMetadata` (title, description, canonical, Open Graph) and its
  JSON-LD. A public page with no canonical URL fails review.
- Mutations are route handlers under `app/api/`, each of which checks the
  Clerk session, then the entitlement if it's an author action
  (`requireAuthorAccess`, `lib/billing/access.ts`), then the rate limit.
- Admin pages check `isAdminUser` (`ADMIN_EMAILS`) on the server and 404 for
  anyone else.

## Billing

- Author Hunt's product and prices live in **Lorec's Stripe account**. Every
  Stripe object Author Hunt creates carries `metadata.app = "authorhunt"`,
  and its webhook (`/api/stripe/webhook`) ignores any event whose object
  doesn't. It has its own webhook endpoint and signing secret.
- Never reuse a Lorec Stripe customer. An Author Hunt customer is created
  for the Author Hunt account, so Lorec's webhook never finds a user for it.
- Whether an author can act is one function: `authorAccess(author, now)` in
  `lib/billing/access.ts`. Nothing else reads `trial_ends_at`, the
  subscription or the comp.

## Writing code here

- Comments explain why, in plain sentences, at the top of a file or above a
  non-obvious block.
- Copy follows DESIGN.md's voice: calm, plain, no exclamation marks, no
  growth-speak. The product's words are Launch, Cheer, Follow, Shelf,
  Momentum. Don't coin others, and never say "upvote" or "hunt" as a verb
  in the UI.
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

A lane's session reads this file, DESIGN.md and its section of
docs/development.md, builds against the seeded database (`npm run db:seed`),
and stops at its own folders.
