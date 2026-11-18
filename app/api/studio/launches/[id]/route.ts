/**
 * PATCH and DELETE /api/studio/launches/[id]
 *
 * Moves a launch to another day, or cancels it, while it is still scheduled.
 * Once a launch is live it belongs to its day's board and can't be moved.
 * Moving one to today makes it live now, with what going live brings.
 */

import { launchAt } from "@/lib/env";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { launches, works } from "@/lib/db/schema";
import { launchDay } from "@/lib/ranking/day";
import { dayProblem, dayTaken, notPublicReason, studioAuthor, wentLive } from "@/lib/studio/server";

type Ctx = { params: Promise<{ id: string }> };

async function find(req: Request, ctx: Ctx) {
  const who = await studioAuthor(req, { name: "studio-launch", max: 20, windowSec: 60 });
  if ("response" in who) return who;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return { response: fail(404, "That launch wasn't found.") };
  const [launch] = await db.select().from(launches).where(and(eq(launches.id, id), eq(launches.authorId, who.author.id))).limit(1);
  if (!launch) return { response: fail(404, "That launch wasn't found.") };
  if (launch.status !== "scheduled") return { response: fail(409, "This launch has already gone live, so it stays on its day.") };
  return { ...who, launch };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const found = await find(req, ctx);
  if ("response" in found) return found.response;
  const { author, launch } = found;
  const body = await readBody(req, z.object({ day: z.string(), note: z.string().trim().max(2000, "Keep the note under 2,000 characters.").optional() }));
  if ("response" in body) return body.response;
  const now = new Date();
  const { day } = body.data;
  const blocked = notPublicReason(author);
  if (blocked) return fail(409, blocked);
  const wrongDay = dayProblem(day, now, launchAt());
  if (wrongDay) return fail(400, wrongDay);
  if (await dayTaken(author.id, day, launch.id)) return fail(409, "You already have a launch on that day. One a day; choose another.");
  const status = day === launchDay(now) ? "live" as const : "scheduled" as const;
  // The status is checked again in the update, so a launch the day's job has just made live isn't moved.
  const [saved] = await db.update(launches).set({ launchDay: day, status, ...(body.data.note === undefined ? {} : { note: body.data.note }) }).where(and(eq(launches.id, launch.id), eq(launches.status, "scheduled"))).returning();
  if (!saved) return fail(409, "This launch has already gone live, so it stays on its day.");
  if (status === "live") {
    const [work] = saved.workId ? await db.select().from(works).where(eq(works.id, saved.workId)).limit(1) : [];
    await wentLive(author, saved, work ?? null, now);
  }
  return json({ launch: saved });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const found = await find(req, ctx);
  if ("response" in found) return found.response;
  const gone = await db.delete(launches).where(and(eq(launches.id, found.launch.id), eq(launches.status, "scheduled"))).returning({ id: launches.id });
  if (gone.length === 0) return fail(409, "This launch has already gone live, so it stays on its day.");
  return json({ cancelled: true });
}
