/**
 * POST /api/studio/launches
 *
 * Puts the author's page, or one of their works, on a day's board
 * (docs/development.md, section 4). Launching is free and never asks about
 * membership (AGENTS.md rule 3). The page must be public and declared; a
 * page launches once and a work once; an author has one launch a day; the
 * day is today or later in New York (rule 6). Today's launch starts live.
 * A later one is scheduled, and the day's job makes it live and gives its
 * points then, so they aren't given here.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { launches, works, type Launch, type Work } from "@/lib/db/schema";
import { launchDay } from "@/lib/ranking/day";
import { dayProblem, dayTaken, notPublicReason, studioAuthor, wentLive } from "@/lib/studio/server";

const Body = z.object({
  kind: z.enum(["author", "work"]),
  workId: z.string().uuid().optional(),
  day: z.string(),
});

export async function POST(req: Request) {
  const who = await studioAuthor(req, { name: "studio-launch", max: 20, windowSec: 60 });
  if ("response" in who) return who.response;
  const { author } = who;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const { kind, workId, day } = body.data;
  const now = new Date();

  const blocked = notPublicReason(author);
  if (blocked) return fail(409, blocked);
  const wrongDay = dayProblem(day, now);
  if (wrongDay) return fail(400, wrongDay);

  let work: Work | null = null;
  if (kind === "work") {
    if (!workId) return fail(400, "Say which work to launch.");
    work = (await db.select().from(works).where(and(eq(works.id, workId), eq(works.authorId, author.id))).limit(1))[0] ?? null;
    if (!work) return fail(404, "That work wasn't found.");
    if (!work.aiUse) return fail(409, "Say how this was written first: the AI declaration on the work.");
    const [had] = await db.select({ id: launches.id }).from(launches).where(eq(launches.workId, work.id)).limit(1);
    if (had) return fail(409, "This has already been launched, or has a launch set. A work launches once.");
  } else {
    const [had] = await db.select({ id: launches.id }).from(launches).where(and(eq(launches.authorId, author.id), eq(launches.kind, "author"))).limit(1);
    if (had) return fail(409, "Your page has already been launched, or has a launch set. A page launches once.");
  }
  if (await dayTaken(author.id, day)) return fail(409, "You already have a launch on that day. One a day; choose another.");

  const status = day === launchDay(now) ? "live" as const : "scheduled" as const;
  let launch: Launch;
  try {
    launch = (await db.insert(launches).values({ kind, authorId: author.id, workId: work?.id ?? null, launchDay: day, status }).returning())[0]!;
  } catch {
    // The unique index on the work is the last word if two requests arrive together.
    return fail(409, "This has already been launched, or has a launch set.");
  }
  if (status === "live") await wentLive(author, launch, work, now);
  return json({ launch }, 201);
}
