/**
 * lib/api.ts
 *
 * The order every mutation route follows (AGENTS.md, Routes): the session,
 * then the member check if it's a member tool, then the rate limit.
 */

import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getViewer, type Viewer } from "./auth";
import { clientIp, rateLimit } from "./rate-limit";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Limit = { name: string; max: number; windowSec: number };

/** A signed-in, rate-limited route. Returns the viewer, or the response to send instead. */
export async function signedIn(req: Request, limit: Limit): Promise<{ viewer: Viewer } | { response: NextResponse }> {
  const viewer = await getViewer();
  if (!viewer) return { response: fail(401, "Sign in to do that.") };
  if (viewer.standing !== "good") return { response: fail(403, "This account is suspended.") };
  const res = await rateLimit(limit.name, viewer.id, limit);
  if (!res.ok) return { response: fail(429, "That's a lot at once. Try again in a minute.") };
  void req;
  return { viewer };
}

/** A rate limit by address, for routes that take signed-out visitors. */
export async function byIp(req: Request, limit: Limit): Promise<NextResponse | null> {
  const res = await rateLimit(limit.name, clientIp(req), limit);
  return res.ok ? null : fail(429, "That's a lot at once. Try again in a minute.");
}

export async function readBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown;
  try { raw = await req.json(); } catch { return { response: fail(400, "That request couldn't be read.") }; }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { response: fail(400, parsed.error.issues[0]?.message ?? "Something in that request isn't right.") };
  return { data: parsed.data };
}
