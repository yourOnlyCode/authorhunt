import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { ActionError, toggleCheer } from "@/lib/actions/cheer";

const Body = z.object({ launchId: z.string().uuid() });

/** Cheer a launch, or take the cheer back. */
export async function POST(req: Request) {
  const who = await signedIn(req, { name: "cheer", max: 60, windowSec: 60 });
  if ("response" in who) return who.response;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  try {
    return json(await toggleCheer(who.viewer, body.data.launchId, new Date()));
  } catch (e) {
    if (e instanceof ActionError) return fail(e.status, e.message);
    throw e;
  }
}
