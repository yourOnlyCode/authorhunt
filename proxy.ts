/**
 * proxy.ts (what Next 15 called middleware.ts)
 *
 * Two jobs. Before the site opens (LAUNCH_AT in the future) every page shows
 * the splash; a visitor with the preview secret sees the real site. And when
 * Clerk is configured, its middleware runs so pages can read the session.
 * Whether a page needs sign-in is decided by the page (requireViewer), not here.
 */

import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { beforeLaunch, clerkEnabled, earlyAccess } from "./lib/env";

const PREVIEW_COOKIE = "ah_preview";
/** What stays reachable before opening: the splash itself, the waitlist's routes, and the legal pages. */
const OPEN_BEFORE_LAUNCH = [/^\/splash$/, /^\/confirm$/, /^\/owner$/, /^\/opengraph-image/, /^\/api\/waitlist/, /^\/api\/time$/, /^\/api\/events$/, /^\/api\/cron\//, /^\/api\/clerk\//, /^\/api\/stripe\//, /^\/privacy$/, /^\/terms$/];

/**
 * What early access adds before opening (EARLY_ACCESS=1): the setup, sign-in, the Studio and its routes, and the
 * addresses of a launch page and an author page. Those two pages show themselves only to their own author until
 * the site opens (lib/early.ts), so an author can see their launch as it will look and nobody else can.
 */
const OPEN_FOR_EARLY_AUTHORS = [/^\/start(\/|$)/, /^\/studio(\/|$)/, /^\/sign-in(\/|$)/, /^\/sign-up(\/|$)/, /^\/work\//, /^\/author\//, /^\/api\/studio\//, /^\/api\/uploads(\/|$)/, /^\/api\/dev-auth$/];

function gate(req: NextRequest): NextResponse {
  const { pathname, searchParams } = req.nextUrl;
  if (!beforeLaunch(new Date())) return pathname === "/splash" ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();

  const secret = process.env.PREVIEW_SECRET;
  if (secret && searchParams.get("preview") === secret) {
    const res = NextResponse.redirect(new URL(pathname, req.url));
    res.cookies.set(PREVIEW_COOKIE, secret, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
    return res;
  }
  if (secret && req.cookies.get(PREVIEW_COOKIE)?.value === secret) return NextResponse.next();
  if (OPEN_BEFORE_LAUNCH.some((re) => re.test(pathname))) return NextResponse.next();
  if (earlyAccess && OPEN_FOR_EARLY_AUTHORS.some((re) => re.test(pathname))) return NextResponse.next();
  if (pathname === "/") return NextResponse.rewrite(new URL(`/splash${req.nextUrl.search}`, req.url));
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Author Hunt isn't open yet." }, { status: 404 });
  return NextResponse.redirect(new URL("/", req.url));
}

export default clerkEnabled ? clerkMiddleware((_auth, req) => gate(req)) : gate;

export const config = {
  // Everything except Next's own files and anything with a file extension.
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
