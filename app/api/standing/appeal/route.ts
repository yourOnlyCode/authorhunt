/**
 * app/api/standing/appeal/route.ts
 *
 * From /standing: an author's answer to a report of undeclared AI, or a
 * suspended person's one appeal. It is
 * written to moderation_log as they wrote it and the owner is told. It can't
 * use lib/api's signedIn, which refuses a suspended account: this is the one
 * thing a suspended account must still be able to send.
 *
 * A plain form post, sent back to /standing with what happened.
 */

import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { notify } from "@/lib/actions/notify";
import { rateLimit } from "@/lib/rate-limit";
import { logStep } from "@/lib/trust/actions";
import { adminUserIds, authorOfUser, openAiCasesFor, sanctionOf } from "@/lib/trust/cases";
import { appealState } from "@/lib/trust/policy";

export async function POST(req: Request) {
  const back = (kind: "done" | "error", message: string) => {
    const url = new URL("/standing", req.url);
    url.searchParams.set(kind, message);
    return NextResponse.redirect(url, 303);
  };
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/sign-in?next=%2Fstanding", req.url), 303);
  const limit = await rateLimit("appeal", viewer.id, { max: 5, windowSec: 3600 });
  if (!limit.ok) return back("error", "That's a lot at once. Try again in an hour.");

  const form = await req.formData().catch(() => null);
  const raw = form?.get("text");
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text.length < 20) return back("error", "Write a few sentences: what you want looked at again, and why.");
  if (text.length > 5000) return back("error", "Keep it under 5,000 characters.");

  const page = await authorOfUser(viewer.id);
  const owner = { userId: viewer.id, authorId: page?.id ?? null };
  const tellAdmins = async (title: string, href: string) => {
    for (const adminId of await adminUserIds()) await notify({ userId: adminId, kind: "decision", title, body: text.slice(0, 300), href, fromUserId: viewer.id });
  };

  // An answer to an open undeclared-AI case goes on that case, and isn't the appeal.
  const caseId = form?.get("caseId");
  if (typeof caseId === "string" && caseId) {
    const open = (await openAiCasesFor(owner)).find((c) => c.id === caseId && c.kind === form?.get("caseKind"));
    if (!open) return back("error", "That report is closed, or isn't about anything of yours.");
    await logStep(viewer, "ai_case_answer", { kind: open.kind, id: open.id }, text);
    await tellAdmins(`${page?.name ?? viewer.displayName} has answered a report of undeclared AI`, `/admin/reports/${open.kind}/${open.id}`);
    return back("done", "Sent. A person will read it, and you'll be told what is decided.");
  }

  const standing = page && page.standing !== "good" ? page.standing : viewer.standing;
  const s = await sanctionOf(owner);
  const state = appealState({ standing, sanctionedAt: s.sanction?.createdAt ?? null, appealsSince: s.appeals.length, now: new Date() });
  if (state === "none_needed") return back("error", "Your account is in good standing. There is nothing to answer.");
  if (state === "used") return back("error", "Your answer is already with us. There is one appeal, and it is being read.");
  if (state === "late") return back("error", "The thirty days for an appeal have passed.");

  await logStep(viewer, "appeal", page ? { kind: "author", id: page.id } : { kind: "user", id: viewer.id }, text);
  await tellAdmins(`${page?.name ?? viewer.displayName} has answered a ${standing === "banned" ? "ban" : "suspension"}`, page ? `/admin/authors/${page.id}` : "/admin/log");
  return back("done", "Sent. A person will read it, and you'll be told what is decided.");
}
