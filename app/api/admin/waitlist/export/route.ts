/**
 * app/api/admin/waitlist/export/route.ts
 *
 * The waitlist as a CSV, for the owner only. It holds people's addresses, so
 * it is never cached, and anyone who isn't an admin gets the same 404 as for
 * a page that doesn't exist.
 */

import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

/** Quoted, and with a leading apostrophe before anything a spreadsheet would run as a formula. */
function cell(value: string | null): string {
  const v = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}
const iso = (d: Date | null) => (d ? d.toISOString() : "");

export async function GET() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return new NextResponse("Not found", { status: 404 });
  const rows = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
  const lines = ["email,kind,src,joined,confirmed,invited"];
  for (const r of rows) lines.push([cell(r.email), cell(r.kind), cell(r.src), cell(iso(r.createdAt)), cell(iso(r.confirmedAt)), cell(iso(r.invitedAt))].join(","));
  return new NextResponse(`${lines.join("\r\n")}\r\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="authorhunt-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
