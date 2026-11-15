/**
 * GET /api/studio/followers/export
 *
 * The coming-soon list as a CSV: a member tool (docs/monetization.md). It
 * holds the addresses of readers who pressed "tell me" on this author's own
 * launches and nobody else's. The query is tied to the author's id on the
 * launch, never to anything the request sends.
 */

import { desc, eq, sql } from "drizzle-orm";
import { fail } from "@/lib/api";
import { isMember } from "@/lib/billing/server";
import { db } from "@/lib/db";
import { launches, notifyRequests, users, works } from "@/lib/db/schema";
import { studioAuthor } from "@/lib/studio/server";

/** Quoted, and kept from being read as a formula when the file is opened in a spreadsheet. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const who = await studioAuthor(req, { name: "studio-export", max: 10, windowSec: 600 });
  if ("response" in who) return who.response;
  const { author } = who;
  if (!(await isMember(author))) return fail(403, "The coming-soon list is a member tool.");

  const rows = await db.select({
    email: sql<string | null>`coalesce(${notifyRequests.email}, ${users.email})`,
    title: works.title, kind: launches.kind, day: launches.launchDay, askedAt: notifyRequests.createdAt,
  }).from(notifyRequests)
    .innerJoin(launches, eq(launches.id, notifyRequests.launchId))
    .leftJoin(users, eq(users.id, notifyRequests.userId))
    .leftJoin(works, eq(works.id, launches.workId))
    .where(eq(launches.authorId, author.id))
    .orderBy(desc(notifyRequests.createdAt));

  const lines = [["email", "launch", "launch_day", "asked_on"].join(",")];
  for (const r of rows) {
    if (!r.email) continue;
    lines.push([cell(r.email), cell(r.title ?? (r.kind === "author" ? `${author.name} (page)` : "")), cell(String(r.day)), cell(new Date(r.askedAt).toISOString().slice(0, 10))].join(","));
  }
  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="coming-soon-${author.handle}.csv"`, "cache-control": "no-store" },
  });
}
