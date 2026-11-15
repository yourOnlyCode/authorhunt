# Author Hunt

A daily launch board for authors and their books. Authors launch a page, then
each work; readers cheer, comment and follow; every day ends with a ranking.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Nothing else needs setting up: the first run makes
a local database with sample authors, and http://localhost:3000/sign-in lists
sample accounts (a reader, an author, a new account, the owner).

- `npm run db:reset` starts the sample data over.
- `npm run typecheck`, `npm run lint`, `npm test` are the checks before a push.
- To see the pre-launch splash page, set `LAUNCH_AT` to a future time in
  `.env.local` (see `.env.example`).

## Where things are

- `AGENTS.md`: the rules of the product and the codebase. Start here.
- `DESIGN.md`: the look and the voice.
- `docs/`: the plan (`development.md`), the words (`ontology.md`), how it maps
  to Product Hunt (`product-structure.md`), what's paid (`monetization.md`),
  what to wire up (`setup-checklist.md`), the launch (`launch.md`), and what
  the code already provides (`build-notes.md`).
- `docs/mockups/`: the approved designs.

## Going live

`docs/setup-checklist.md` lists every account, key and DNS record, in order.
`.env.example` lists the variables. The splash page needs only hosting, the
database and email; sign-in and payments can follow.
