/**
 * app/api/events/route.ts
 *
 * The site's own analytics: a page view or an outbound click, written to
 * site_events with the launch day it fell on. Signed-out readers send these,
 * so the limit is per address. Nothing about the reader is stored.
 */

import { z } from "zod";
import { byIp, json, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { siteEvents } from "@/lib/db/schema";
import { launchDay } from "@/lib/ranking/day";

const Body = z.object({
  kind: z.enum(["view", "click"]),
  path: z.string().min(1).max(300).regex(/^\//, "A path starts with a slash."),
  target: z.string().url().max(600).optional(),
  via: z.string().regex(/^[a-z0-9_-]{1,40}$/i).optional(),
  authorId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const limited = await byIp(req, { name: "events", max: 120, windowSec: 60 });
  if (limited) return limited;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const { kind, path, target, via, authorId } = body.data;
  await db.insert(siteEvents).values({ kind, path, target: target ?? null, via: via?.toLowerCase() ?? null, authorId: authorId ?? null, day: launchDay(new Date()) });
  return json({ ok: true });
}
