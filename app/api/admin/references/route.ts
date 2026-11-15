/**
 * app/api/admin/references/route.ts
 *
 * A name an author typed under "for readers of" or "inspired by" is usable at
 * once and gets a public page only when the owner approves it. Here the owner
 * approves it, fixes its spelling, or folds a duplicate into the name that
 * already exists. The lookups held in memory are dropped after each, so pages
 * show the change at once.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { referenceAuthors } from "@/lib/db/schema";
import { forgetLookups } from "@/lib/queries/lookups";
import { logStep } from "@/lib/trust/actions";
import { adminForm } from "@/lib/trust/form";

export async function POST(req: Request) {
  return adminForm(req, async ({ admin, str, back }) => {
    const slug = str("slug");
    const action = str("action");
    const [ref] = await db.select().from(referenceAuthors).where(eq(referenceAuthors.slug, slug)).limit(1);
    if (!ref) return back("That name isn't here any more.", "error");
    const target = { kind: "reference", id: slug };

    if (action === "approve") {
      await db.update(referenceAuthors).set({ approved: true }).where(eq(referenceAuthors.slug, slug));
      await logStep(admin, "reference_approved", target, ref.name);
      forgetLookups();
      return back(`${ref.name} is approved, and has its page.`);
    }
    if (action === "rename") {
      const name = str("name");
      if (name.length < 2 || name.length > 120) return back("Write the name as it should read.", "error");
      await db.update(referenceAuthors).set({ name }).where(eq(referenceAuthors.slug, slug));
      await logStep(admin, "reference_renamed", target, `From "${ref.name}" to "${name}".`);
      forgetLookups();
      return back(`Now reads ${name}. The address keeps its slug.`);
    }
    if (action === "merge") {
      const into = str("into");
      const [keep] = await db.select().from(referenceAuthors).where(eq(referenceAuthors.slug, into)).limit(1);
      if (!keep || keep.slug === slug) return back("Choose the name to merge it into.", "error");
      // Every page that listed the duplicate now lists the kept name, once and in the order the author gave: replace, then drop a repeat the replace may have made.
      for (const col of [sql`readers_of`, sql`inspired_by`]) {
        await db.execute(sql`update authors set ${col} = (
          select coalesce(array_agg(x.s order by x.o), '{}') from (
            select u.s, min(u.o) as o from unnest(array_replace(${col}, ${slug}::text, ${into}::text)) with ordinality as u(s, o) group by u.s
          ) x
        ) where ${slug}::text = any(${col})`);
      }
      await db.delete(referenceAuthors).where(eq(referenceAuthors.slug, slug));
      await logStep(admin, "reference_merged", target, `"${ref.name}" merged into "${keep.name}" (${into}).`);
      forgetLookups();
      return back(`${ref.name} is merged into ${keep.name}.`);
    }
    return back("That isn't an action.", "error");
  });
}
