// TEMPORARY: deleted before finishing. Admin-only read/write of raw SQL for verification.
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/sql";
export async function POST(req: Request) {
  const v = await getViewer();
  if (!v?.isAdmin) return new NextResponse("Not found", { status: 404 });
  const q = await req.text();
  return NextResponse.json(rowsOf(await db.execute(sql.raw(q))));
}
