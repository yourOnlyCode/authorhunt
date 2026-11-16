import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** The server's clock, for the countdown: a visitor's device may be set wrong, and the count must not be. */
export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { "cache-control": "no-store" } });
}
