import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { ActionError, toggleFollow } from "@/lib/actions/cheer";

const Body = z.object({ authorId: z.string().uuid() });

/** Follow an author, or stop. */
export async function POST(req: Request) {
  const who = await signedIn(req, { name: "follow", max: 60, windowSec: 60 });
  if ("response" in who) return who.response;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  try {
    return json(await toggleFollow(who.viewer, body.data.authorId, new Date()));
  } catch (e) {
    if (e instanceof ActionError) return fail(e.status, e.message);
    throw e;
  }
}
