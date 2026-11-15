/**
 * POST /api/studio/works
 *
 * Adds a work to the signed-in author's page. Free, with no limit on how many
 * (AGENTS.md rule 3). The work's own AI declaration can wait until it
 * launches, where it is required.
 */

import { fail, json } from "@/lib/api";
import { db } from "@/lib/db";
import { works } from "@/lib/db/schema";
import { readInput, studioAuthor } from "@/lib/studio/server";
import { uniqueWorkSlug, WorkBody, workValues } from "@/lib/studio/work-input";

export async function POST(req: Request) {
  const who = await studioAuthor(req, { name: "studio-work", max: 30, windowSec: 60 });
  if ("response" in who) return who.response;
  const body = await readInput(req, WorkBody);
  if ("response" in body) return body.response;
  const checked = await workValues(body.data, who.viewer.id, null);
  if ("error" in checked) return fail(400, checked.error);
  const slug = await uniqueWorkSlug(body.data.title);
  const [work] = await db.insert(works).values({ ...checked.values, authorId: who.author.id, slug }).returning();
  return json({ work }, 201);
}
