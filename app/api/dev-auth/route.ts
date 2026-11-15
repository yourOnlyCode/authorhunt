import { NextResponse } from "next/server";
import { DEV_COOKIE } from "@/lib/auth";
import { devAuthEnabled } from "@/lib/env";

/** Development only: sign in as a sample account, or out. Not found once Clerk is configured. */
export async function POST(req: Request) {
  if (!devAuthEnabled) return new NextResponse("Not found", { status: 404 });
  const form = await req.formData();
  const user = String(form.get("user") ?? "");
  const nextRaw = String(form.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  if (user) res.cookies.set(DEV_COOKIE, user, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  else res.cookies.delete(DEV_COOKIE);
  return res;
}
