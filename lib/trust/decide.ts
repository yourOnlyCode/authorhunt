/**
 * lib/trust/decide.ts
 *
 * What each form on the admin pages does, as one step each: the action from
 * actions.ts, then the open reports on that target closed with the decision,
 * and both sides told. The reporter hears what was decided about the thing;
 * the person reported hears what changed and never who reported.
 *
 * The undeclared-AI process is docs/product-structure.md, section 7, step for
 * step: the author is told and given seven days, the answer is recorded, a
 * person decides, and there is one appeal. A finding against the author can't
 * be entered until they were told and have answered or the seven days have
 * passed. Nothing in this file reads a detector or scores text.
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, type AiUse, type ReportTarget } from "../db/schema";
import type { Viewer } from "../auth";
import { appUrl } from "../env";
import { ActionError } from "../actions/cheer";
import { notify } from "../actions/notify";
import { layout, sendEmail } from "../emails/send";
import {
  addContentNote, AI_USE_LABELS, banAuthor, banUser, correctAiDeclaration, logStep, pullLaunch, removeComment, removeImage, requireNote,
  restoreAuthor, restoreComment, restoreLaunch, restoreUser, setMature, suspendAuthor, suspendUser, type MarkTarget,
} from "./actions";
import { aiCaseOn, authorOfUser, decideReports, historyFor, sanctionOf } from "./cases";
import { AI_ANSWER_DAYS, answerDeadline, appealDeadline, APPEAL_DAYS } from "./policy";
import { resolveTarget, type ResolvedTarget } from "./targets";

type Fields = (name: string) => string;
const fmt = (d: Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" }).format(d);

const OUTCOME: Record<string, string> = {
  dismissed: "A person looked at it and found nothing that breaks the rules, so nothing was changed.",
  removed: "It has been removed.",
  pulled: "The launch has been taken off the board.",
  marked: "The missing mark or note has been added.",
  banned: "The page has been removed from Author Hunt.",
  not_confirmed: "A person looked at what was reported and at the author's answer, and undeclared AI use was not confirmed. Nothing was changed.",
  corrected: "AI tools were used around the writing and not declared, though the text is the author's own. The declaration has been corrected, and this is on record as a first case.",
};

async function close(admin: Viewer, t: ResolvedTarget, decision: string): Promise<number> {
  return decideReports(admin, t.kind, t.id, decision, { title: `Your report about ${t.title} was reviewed`, body: OUTCOME[decision] ?? "" });
}

/** Where a Mature mark or a declaration is fixed for this target: the work if there is one, else the page. */
function markTarget(t: ResolvedTarget): MarkTarget {
  if (t.work) return { kind: "work", id: t.work.id };
  if (t.author && (t.kind === "author" || t.kind === "launch")) return { kind: "author", id: t.author.id };
  throw new ActionError(400, "That doesn't apply to this kind of thing.");
}

/** Suspend, restore or ban whoever a target belongs to: through the page if they have one, so page and account stay in step. */
export async function sanction(admin: Viewer, userId: string, action: "suspend" | "restore" | "ban", note: string): Promise<string> {
  const page = await authorOfUser(userId);
  if (action === "suspend") { await (page ? suspendAuthor(admin, page.id, note) : suspendUser(admin, userId, note)); return "Suspended. The page and its launches are hidden, and the account can't post."; }
  if (action === "ban") { await (page ? banAuthor(admin, page.id, note) : banUser(admin, userId, note)); return "Banned. The page is gone, its launches are pulled, and the cheers the account gave no longer count."; }
  await (page ? restoreAuthor(admin, page.id, note) : restoreUser(admin, userId, note));
  return "Restored to good standing. Launches that a ban pulled stay pulled, and cheers it discounted stay discounted; put a launch back from the page's admin view.";
}

export async function caseAction(admin: Viewer, kind: ReportTarget, id: string, action: string, f: Fields, now = new Date()): Promise<string> {
  const t = await resolveTarget(kind, id, now);
  if (!t) throw new ActionError(404, "That isn't here any more.");
  const note = f("note");

  switch (action) {
    case "dismiss": {
      const why = requireNote(note);
      const n = await close(admin, t, "dismissed");
      await logStep(admin, "report_dismissed", t, why);
      if (n > 0) await notify({ userId: t.ownerUserId, kind: "decision", title: `A report about ${t.title} was reviewed`, body: "Nothing was changed.", href: "/notifications" });
      return n > 0 ? "Dismissed, and both sides told." : "There were no open reports to dismiss. The note is in the log.";
    }
    case "remove": {
      if (kind === "comment") await removeComment(admin, id, note);
      else if (kind === "image") await removeImage(admin, id, note);
      else throw new ActionError(400, "Only a comment or a picture is removed. A launch is pulled; a page is suspended or banned.");
      await close(admin, t, "removed");
      return "Removed.";
    }
    case "restore_comment":
      if (kind !== "comment") throw new ActionError(400, "That isn't a comment.");
      await restoreComment(admin, id, note);
      return "The comment is back.";
    case "pull": {
      if (kind === "comment" || !t.launchId) throw new ActionError(400, "There is no launch here to pull.");
      await pullLaunch(admin, t.launchId, note);
      await close(admin, t, "pulled");
      return "The launch is off the board. The page stays.";
    }
    case "restore_launch":
      if (kind === "comment" || !t.launchId) throw new ActionError(400, "There is no launch here to put back.");
      await restoreLaunch(admin, t.launchId, note, now);
      return "The launch is back.";
    case "mature":
      await setMature(admin, markTarget(t), true, note);
      await close(admin, t, "marked");
      return "Marked Mature.";
    case "content_note": {
      if (!t.work) throw new ActionError(400, "Content notes belong to a work.");
      await addContentNote(admin, t.work.id, f("text"), note);
      await close(admin, t, "marked");
      return "Content note added.";
    }
    case "suspend": return sanction(admin, t.ownerUserId, "suspend", note);
    case "restore": return sanction(admin, t.ownerUserId, "restore", note);
    case "ban": {
      const said = await sanction(admin, t.ownerUserId, "ban", note);
      await close(admin, t, "banned");
      return said;
    }
    case "ai_open": return aiOpen(admin, t, f("message"), now);
    case "ai_answer": {
      const text = requireNote(f("answer"));
      const c = await aiCaseOn(kind, id);
      if (!c.opened || c.decision) throw new ActionError(400, "Tell the author first; an answer belongs to an open case.");
      await logStep(admin, "ai_case_answer", t, text);
      return "The answer is recorded.";
    }
    case "ai_decide": return aiDecide(admin, t, f("outcome"), note, f("value") as AiUse, f("lift") === "1", now);
    default: throw new ActionError(400, "That isn't an action.");
  }
}

async function aiOpen(admin: Viewer, t: ResolvedTarget, message: string, now: Date): Promise<string> {
  if (!t.author) throw new ActionError(400, "An AI declaration belongs to a page or a work.");
  if (message.length < 20) throw new ActionError(400, "Write to the author what was reported, in your own words, without naming who reported it.");
  const c = await aiCaseOn(t.kind, t.id);
  if (c.opened && !c.decision) throw new ActionError(400, "The author has already been told, and the case is open.");
  const deadline = answerDeadline(now);
  const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, t.ownerUserId)).limit(1);
  const title = `A report about how ${t.title} was written`;
  const lead = `A reader has reported that AI was used in ${t.title} and not declared. Nothing has been decided. You have ${AI_ANSWER_DAYS} days, until ${fmt(deadline)}, to answer.`;
  const how = "What helps: drafts, notes, a writing record, an account of how it was made. A person reads your answer and decides; no detector's score is used.";
  await notify({ userId: t.ownerUserId, kind: "decision", title, body: `${lead} ${message}`, href: "/standing" });
  if (owner?.email) {
    const mail = layout({ heading: title, paragraphs: [lead, message, how], action: { label: "Answer", url: `${appUrl}/standing` }, footer: "Author Hunt, authorhunt.com. You're getting this because it concerns your page." });
    await sendEmail({ to: owner.email, subject: title, ...mail });
  }
  await logStep(admin, "ai_case_opened", t, `Answer due by ${deadline.toISOString().slice(0, 10)} (${fmt(deadline)}). Sent to the author: ${message}`);
  return `The author has been told, and has until ${fmt(deadline)} to answer.`;
}

async function aiDecide(admin: Viewer, t: ResolvedTarget, outcome: string, note: string, value: AiUse, lift: boolean, now: Date): Promise<string> {
  const why = requireNote(note);
  if (!t.author) throw new ActionError(400, "An AI declaration belongs to a page or a work.");
  const c = await aiCaseOn(t.kind, t.id);
  if (c.decision) throw new ActionError(400, "This case has been decided. A new report opens a new one.");

  if (outcome === "not_confirmed") {
    await logStep(admin, "ai_case_not_confirmed", t, why);
    await close(admin, t, "not_confirmed");
    await notify({ userId: t.ownerUserId, kind: "decision", title: `The report about ${t.title} is closed`, body: "Undeclared AI use was not confirmed. Nothing was changed.", href: "/standing" });
    if (lift && t.author.standing === "suspended") await restoreAuthor(admin, t.author.id, why);
    return "Closed as not confirmed. The author and the reporter have been told.";
  }

  // A finding against the author waits for their side: told, and either answered or out of time.
  if (!c.opened) throw new ActionError(400, "Tell the author what was reported first. They have seven days to answer before a finding.");
  if (c.answers.length === 0 && now < answerDeadline(c.opened.createdAt)) {
    throw new ActionError(400, `The author hasn't answered, and has until ${fmt(answerDeadline(c.opened.createdAt))}. Record their answer, or wait.`);
  }

  if (outcome === "corrected") {
    const history = await historyFor({ userId: t.ownerUserId, authorId: t.author.id });
    if (history.some((r) => r.action === "ai_case_confirmed")) throw new ActionError(400, "This author already has a confirmed case. A corrected declaration stands for a first case only.");
    if (value !== "assisted") throw new ActionError(400, "A corrected declaration can only be \"with AI as a tool\". Work whose text was written by AI is removed and the page banned.");
    await correctAiDeclaration(admin, markTarget(t), value, why);
    await logStep(admin, "ai_case_confirmed", t, `Confirmed; corrected to "${AI_USE_LABELS[value]}" and allowed to stand as a first case. ${why}`);
    await close(admin, t, "corrected");
    if (lift && t.author.standing === "suspended") await restoreAuthor(admin, t.author.id, why);
    return "Confirmed, and the declaration corrected. It stands as a first case.";
  }
  if (outcome === "ban") {
    await banAuthor(admin, t.author.id, why);
    await logStep(admin, "ai_case_confirmed", t, `Confirmed; banned. ${why}`);
    await close(admin, t, "banned");
    return `Confirmed and banned. The author can appeal once, until ${fmt(appealDeadline(now))}.`;
  }
  throw new ActionError(400, "Choose an outcome.");
}

/** An appeal that arrived by email is entered by the owner; one made on /standing is already in the log. */
export async function recordAppeal(admin: Viewer, userId: string, text: string, now = new Date()): Promise<string> {
  const body = requireNote(text);
  const page = await authorOfUser(userId);
  const s = await sanctionOf({ userId, authorId: page?.id ?? null });
  if (!s.sanction) throw new ActionError(400, "There is no suspension or ban to appeal.");
  if (s.appeals.length > 0) throw new ActionError(400, "An appeal is already on record. There is one.");
  if (now > appealDeadline(s.sanction.createdAt)) throw new ActionError(400, `The ${APPEAL_DAYS} days for an appeal ended on ${fmt(appealDeadline(s.sanction.createdAt))}.`);
  await logStep(admin, "appeal", page ? { kind: "author", id: page.id } : { kind: "user", id: userId }, `Received outside the site and entered by the owner: ${body}`);
  return "The appeal is on record.";
}

export async function decideAppeal(admin: Viewer, userId: string, outcome: string, note: string): Promise<string> {
  const why = requireNote(note);
  const page = await authorOfUser(userId);
  const s = await sanctionOf({ userId, authorId: page?.id ?? null });
  if (s.appeals.length === 0) throw new ActionError(400, "There is no appeal on record to decide.");
  if (s.appealDecision) throw new ActionError(400, "The appeal has been decided.");
  const target = page ? { kind: "author", id: page.id } : { kind: "user", id: userId };
  if (outcome === "overturned") {
    await logStep(admin, "appeal_decided", target, `Overturned. ${why}`);
    return `The decision is overturned. ${await sanction(admin, userId, "restore", why)}`;
  }
  if (outcome === "stands") {
    await logStep(admin, "appeal_decided", target, `The decision stands. ${why}`);
    await notify({ userId, kind: "decision", title: "Your appeal was read, and the decision stands", body: "A person read what you wrote. This was the one appeal.", href: "/standing" });
    return "The decision stands, and the person has been told.";
  }
  throw new ActionError(400, "Choose an outcome.");
}
