/**
 * GET /api/studio/days
 *
 * The days the signed-in author can set a launch on, each with how many
 * launches it has so far (lib/studio/day-counts.ts).
 */

import { json } from "@/lib/api";
import { launchDays } from "@/lib/studio/day-counts";
import { studioViewer } from "@/lib/studio/server";

export async function GET(req: Request) {
  const who = await studioViewer(req, { name: "studio-days", max: 60, windowSec: 60 });
  if ("response" in who) return who.response;
  return json({ days: await launchDays(new Date()) });
}
