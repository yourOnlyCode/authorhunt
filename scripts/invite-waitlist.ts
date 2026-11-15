/**
 * scripts/invite-waitlist.ts
 *
 * Opening day: every confirmed waitlist address gets a Clerk invitation, so
 * one click makes the account with the email already verified
 * (docs/launch.md). Run once by hand, on January 8, 2027:
 *
 *   npx tsx scripts/invite-waitlist.ts --dry-run     # says what it would do
 *   npx tsx scripts/invite-waitlist.ts               # sends
 *   npx tsx scripts/invite-waitlist.ts --limit 50    # a first small batch
 *
 * It is safe to run again: a row is marked invited as soon as its invitation
 * is made, and only rows with invited_at null are picked up.
 *
 * The Clerk instance is Lorec's. This only creates invitations; it changes no
 * setting, and it never turns on Clerk's own waitlist mode, which would put
 * Lorec's sign-ups behind a waitlist too. The invitation email is Clerk's
 * "invitation" template and is worded by that instance: read it in the
 * dashboard before the first real run, since by default it says Lorec.
 * Check Clerk's current rate limits for invitations too; BATCH and PAUSE_MS
 * are deliberately slow.
 */

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { createClerkClient } from "@clerk/nextjs/server";

const BATCH = 10;
const PAUSE_MS = 2500;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitAt = args.indexOf("--limit");
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Clerk's "this address is already a user or already invited": nothing to send, and nothing to retry. */
function alreadyKnown(err: unknown): boolean {
  const errors = (err as { errors?: { code?: string }[] }).errors ?? [];
  return errors.some((e) => e.code === "duplicate_record" || e.code === "form_identifier_exists");
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    console.error("CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be set. Nothing was sent.");
    process.exit(1);
  }
  if (Number.isNaN(limit) || limit <= 0) {
    console.error("--limit needs a number above zero. Nothing was sent.");
    process.exit(1);
  }
  // Imported here so the refusal above needs no database.
  const { db } = await import("../lib/db");
  const { waitlist } = await import("../lib/db/schema");
  const { appUrl } = await import("../lib/env");
  if (!dryRun && appUrl.includes("localhost")) {
    console.error(`NEXT_PUBLIC_APP_URL is ${appUrl}. Invitations would send people to this machine. Nothing was sent.`);
    process.exit(1);
  }

  const clerk = createClerkClient({ secretKey, publishableKey });
  const all = await db.select({ id: waitlist.id, email: waitlist.email, kind: waitlist.kind }).from(waitlist)
    .where(and(isNotNull(waitlist.confirmedAt), isNull(waitlist.invitedAt))).orderBy(waitlist.confirmedAt);
  const rows = all.slice(0, limit);
  console.log(`${all.length} confirmed and not yet invited. ${dryRun ? "Dry run: would invite" : "Inviting"} ${rows.length}, ${BATCH} at a time.`);

  let invited = 0;
  let known = 0;
  const failed: string[] = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    for (const row of rows.slice(i, i + BATCH)) {
      // An author lands in Studio to make their page; a reader on the board.
      const redirectUrl = `${appUrl}${row.kind === "author" ? "/studio" : "/"}`;
      if (dryRun) { console.log(`  would invite ${row.email} (${row.kind}) -> ${redirectUrl}`); invited += 1; continue; }
      try {
        await clerk.invitations.createInvitation({ emailAddress: row.email, redirectUrl, notify: true });
        invited += 1;
      } catch (err) {
        if (!alreadyKnown(err)) {
          failed.push(row.email);
          console.error(`  failed: ${row.email}`, (err as { errors?: unknown }).errors ?? (err instanceof Error ? err.message : err));
          continue;
        }
        // They already have an account on the shared sign-in (a Lorec writer, say) or an invitation. Mark the row so it isn't tried again.
        known += 1;
      }
      await db.update(waitlist).set({ invitedAt: new Date() }).where(and(eq(waitlist.id, row.id), isNull(waitlist.invitedAt)));
    }
    if (!dryRun && i + BATCH < rows.length) await sleep(PAUSE_MS);
  }

  console.log(`\n${dryRun ? "Would have invited" : "Invited"}: ${invited}`);
  if (!dryRun) console.log(`Already had an account or an invitation (marked, no email sent): ${known}`);
  if (failed.length) console.log(`Failed, left for the next run: ${failed.length}\n  ${failed.join("\n  ")}`);
  if (all.length > rows.length) console.log(`Left for a later run by --limit: ${all.length - rows.length}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
