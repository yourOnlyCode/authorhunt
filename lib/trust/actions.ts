/**
 * lib/trust/actions.ts
 *
 * Everything the owner can do to an item, a page or an account
 * (docs/product-structure.md, section 7). Each function is one decision by a
 * signed-in admin: it changes the rows, writes moderation_log (who, what,
 * about what, why) and tells the person it concerns. Nothing here is called
 * by a job, a score or a detector; AGENTS.md rule 7 makes a ban a person's
 * decision on evidence, and the note is where that evidence is written down.
 *
 * The admin's note is for the log. It is never sent to anyone, because it may
 * say who reported; the messages people get are worded here.
 */

import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { authors, cheers, comments, images, launches, moderationLog, users, works, type AiUse, type Author, type Standing } from "../db/schema";
import type { Viewer } from "../auth";
import { ActionError, recomputeLaunch } from "../actions/cheer";
import { notify } from "../actions/notify";
import { launchDay } from "../ranking/day";

export type LogTarget = { kind: string; id: string };

export async function logStep(admin: { id: string }, action: string, target: LogTarget, note: string): Promise<void> {
  await db.insert(moderationLog).values({ actorId: admin.id, action, targetKind: target.kind, targetId: target.id, note: note.trim() });
}

/** Suspend, ban, restore and closing an AI case need the reason written down; ten characters is a sentence, not a tick. */
export function requireNote(note: string | undefined | null): string {
  const text = (note ?? "").trim();
  if (text.length < 10) throw new ActionError(400, "Write a note first: what was looked at, and why this is the decision.");
  return text;
}

function assertAdmin(admin: Viewer) {
  if (!admin.isAdmin) throw new ActionError(404, "Not found.");
}

async function tell(userId: string, title: string, body = "") {
  await notify({ userId, kind: "decision", title, body, href: "/standing" });
}

async function authorById(id: string): Promise<Author> {
  const [a] = await db.select().from(authors).where(eq(authors.id, id)).limit(1);
  if (!a) throw new ActionError(404, "That page isn't here.");
  return a;
}

// ── One item ────────────────────────────────────────────────────────────────

export async function removeComment(admin: Viewer, id: string, note = ""): Promise<void> {
  assertAdmin(admin);
  const [c] = await db.update(comments).set({ removedAt: new Date() }).where(eq(comments.id, id)).returning();
  if (!c) throw new ActionError(404, "That comment isn't here.");
  await recomputeLaunch(c.launchId);
  await logStep(admin, "comment_removed", { kind: "comment", id }, note);
  await tell(c.userId, "A comment of yours was removed", "It was reported and a person reviewed it. Your account is unchanged.");
}

export async function restoreComment(admin: Viewer, id: string, note = ""): Promise<void> {
  assertAdmin(admin);
  const [c] = await db.update(comments).set({ removedAt: null }).where(eq(comments.id, id)).returning();
  if (!c) throw new ActionError(404, "That comment isn't here.");
  await recomputeLaunch(c.launchId);
  await logStep(admin, "comment_restored", { kind: "comment", id }, note);
  await tell(c.userId, "A comment of yours is back", "It was removed after a report, and has been put back.");
}

export async function pullLaunch(admin: Viewer, id: string, note = ""): Promise<void> {
  assertAdmin(admin);
  const [l] = await db.update(launches).set({ status: "pulled" }).where(eq(launches.id, id)).returning();
  if (!l) throw new ActionError(404, "That launch isn't here.");
  const a = await authorById(l.authorId);
  await logStep(admin, "launch_pulled", { kind: "launch", id }, note);
  await tell(a.userId, "A launch of yours was taken off the board", "It was reported and a person reviewed it. Your page stays up.");
}

/** Back to where its day puts it: live today, closed if the day has passed, scheduled if it hasn't come. */
export async function restoreLaunch(admin: Viewer, id: string, note = "", now = new Date()): Promise<void> {
  assertAdmin(admin);
  const [l] = await db.select().from(launches).where(eq(launches.id, id)).limit(1);
  if (!l) throw new ActionError(404, "That launch isn't here.");
  if (l.status !== "pulled") throw new ActionError(400, "That launch isn't pulled.");
  const today = launchDay(now);
  const status = l.launchDay === today ? "live" : l.launchDay < today ? "closed" : "scheduled";
  await db.update(launches).set({ status }).where(eq(launches.id, id));
  await recomputeLaunch(id);
  const a = await authorById(l.authorId);
  await logStep(admin, "launch_restored", { kind: "launch", id }, note);
  await tell(a.userId, "A launch of yours is back on the board");
}

/** The picture is marked removed, and its address is cleared from wherever it was showing. */
export async function removeImage(admin: Viewer, id: string, note = ""): Promise<void> {
  assertAdmin(admin);
  const [img] = await db.update(images).set({ removedAt: new Date() }).where(eq(images.id, id)).returning();
  if (!img) throw new ActionError(404, "That picture isn't here.");
  await db.update(authors).set({ portraitUrl: null }).where(eq(authors.portraitUrl, img.url));
  await db.update(works).set({ coverUrl: null }).where(eq(works.coverUrl, img.url));
  // A gallery is a small JSON list on the work; only the uploader's own works can hold the picture.
  const mine = await db.select({ id: works.id, gallery: works.gallery }).from(works).innerJoin(authors, eq(works.authorId, authors.id)).where(eq(authors.userId, img.ownerUserId));
  for (const w of mine) {
    if (w.gallery.some((g) => g.url === img.url)) await db.update(works).set({ gallery: w.gallery.filter((g) => g.url !== img.url) }).where(eq(works.id, w.id));
  }
  await logStep(admin, "image_removed", { kind: "image", id }, note);
  await tell(img.ownerUserId, "A picture of yours was removed", "It was reported and a person reviewed it. Your account is unchanged.");
}

// ── A page and its account ──────────────────────────────────────────────────

/**
 * The page and its launches are hidden by the board's and the pages' own
 * queries (they ask for standing "good"). The account is suspended with it,
 * so it can't post while the report is decided; lib/api's signedIn refuses it.
 */
export async function suspendAuthor(admin: Viewer, authorId: string, note: string): Promise<void> {
  assertAdmin(admin);
  const why = requireNote(note);
  const a = await authorById(authorId);
  if (a.standing === "banned") throw new ActionError(400, "That page is banned. Restore it first if the ban was wrong.");
  await db.update(authors).set({ standing: "suspended" }).where(eq(authors.id, authorId));
  await db.update(users).set({ standing: "suspended" }).where(and(eq(users.id, a.userId), eq(users.standing, "good")));
  await logStep(admin, "author_suspended", { kind: "author", id: authorId }, why);
  await tell(a.userId, "Your page is suspended while a report is reviewed", "It is hidden for now, and nothing has been decided. You can answer on the page this opens.");
}

/**
 * Lifts a suspension or a ban: the page and the account are in good standing
 * again. Launches a ban pulled stay pulled, and cheers it discounted stay
 * discounted; a launch is put back one at a time with restoreLaunch.
 */
export async function restoreAuthor(admin: Viewer, authorId: string, note: string): Promise<void> {
  assertAdmin(admin);
  const why = requireNote(note);
  const a = await authorById(authorId);
  if (a.standing === "good") throw new ActionError(400, "That page is already in good standing.");
  await db.update(authors).set({ standing: "good" }).where(eq(authors.id, authorId));
  await db.update(users).set({ standing: "good" }).where(eq(users.id, a.userId));
  await logStep(admin, "author_restored", { kind: "author", id: authorId }, why);
  // A banned account can't read its notifications until this has run, so the order matters.
  await tell(a.userId, "Your page is back", a.standing === "banned" ? "The ban has been lifted. Launches that were pulled stay off the board unless each is put back." : "The suspension has been lifted.");
}

/**
 * Page gone, launches pulled, the account closed to Author Hunt, and the
 * cheers that account gave discounted to nothing (the scores they fed are
 * recomputed). It does not touch the person's Lorec account.
 */
export async function banAuthor(admin: Viewer, authorId: string, note: string): Promise<void> {
  assertAdmin(admin);
  const why = requireNote(note);
  const a = await authorById(authorId);
  if (a.userId === admin.id) throw new ActionError(400, "You can't ban your own page.");
  // Tell them before the ban lands: notify() is the record they will see if the ban is lifted, and the email goes out either way.
  await tell(a.userId, "Your page has been removed from Author Hunt", "A person reviewed the reports and decided this. You can appeal once, in writing, within thirty days.");
  await db.update(authors).set({ standing: "banned" }).where(eq(authors.id, authorId));
  await db.update(launches).set({ status: "pulled" }).where(and(eq(launches.authorId, authorId), ne(launches.status, "pulled")));
  await banAccount(a.userId);
  await logStep(admin, "author_banned", { kind: "author", id: authorId }, why);
}

async function banAccount(userId: string): Promise<void> {
  await db.update(users).set({ standing: "banned" }).where(eq(users.id, userId));
  const given = await db.select({ launchId: cheers.launchId }).from(cheers).where(and(eq(cheers.userId, userId), ne(cheers.weight, 0)));
  if (given.length === 0) return;
  await db.update(cheers).set({ weight: 0 }).where(eq(cheers.userId, userId));
  for (const id of new Set(given.map((g) => g.launchId))) await recomputeLaunch(id);
}

// ── An account with no page ─────────────────────────────────────────────────

async function setUser(admin: Viewer, userId: string, standing: Standing, action: string, note: string) {
  assertAdmin(admin);
  const why = requireNote(note);
  if (userId === admin.id) throw new ActionError(400, "That's your own account.");
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw new ActionError(404, "That account isn't here.");
  const [page] = await db.select({ id: authors.id }).from(authors).where(eq(authors.userId, userId)).limit(1);
  if (page) throw new ActionError(400, "That account has a page. Use the page's controls, so the two stay in step.");
  return { u, why, action, standing };
}

export async function suspendUser(admin: Viewer, userId: string, note: string): Promise<void> {
  const { why } = await setUser(admin, userId, "suspended", "user_suspended", note);
  await db.update(users).set({ standing: "suspended" }).where(eq(users.id, userId));
  await logStep(admin, "user_suspended", { kind: "user", id: userId }, why);
  await tell(userId, "Your account is suspended while a report is reviewed", "You can read as before, and can't post for now. You can answer on the page this opens.");
}

export async function banUser(admin: Viewer, userId: string, note: string): Promise<void> {
  const { why } = await setUser(admin, userId, "banned", "user_banned", note);
  await tell(userId, "Your account has been closed on Author Hunt", "A person reviewed the reports and decided this. You can appeal once, in writing, within thirty days.");
  await banAccount(userId);
  await logStep(admin, "user_banned", { kind: "user", id: userId }, why);
}

export async function restoreUser(admin: Viewer, userId: string, note: string): Promise<void> {
  const { u, why } = await setUser(admin, userId, "good", "user_restored", note);
  if (u.standing === "good") throw new ActionError(400, "That account is already in good standing.");
  await db.update(users).set({ standing: "good" }).where(eq(users.id, userId));
  await logStep(admin, "user_restored", { kind: "user", id: userId }, why);
  await tell(userId, "Your account is in good standing again");
}

// ── The usual fixes ─────────────────────────────────────────────────────────

export type MarkTarget = { kind: "author" | "work"; id: string };

async function ownerOfMark(target: MarkTarget): Promise<{ userId: string; title: string }> {
  if (target.kind === "author") {
    const a = await authorById(target.id);
    return { userId: a.userId, title: a.name };
  }
  const [row] = await db.select({ title: works.title, userId: authors.userId }).from(works).innerJoin(authors, eq(works.authorId, authors.id)).where(eq(works.id, target.id)).limit(1);
  if (!row) throw new ActionError(404, "That work isn't here.");
  return row;
}

export async function setMature(admin: Viewer, target: MarkTarget, mature: boolean, note = ""): Promise<void> {
  assertAdmin(admin);
  const owner = await ownerOfMark(target);
  if (target.kind === "author") await db.update(authors).set({ mature }).where(eq(authors.id, target.id));
  else await db.update(works).set({ mature }).where(eq(works.id, target.id));
  await logStep(admin, mature ? "mature_marked" : "mature_unmarked", target, note);
  await tell(owner.userId, mature ? `${owner.title} is now marked Mature` : `${owner.title} is no longer marked Mature`, mature ? "A reader reported the mark as missing and a person agreed. Nothing else has changed." : "");
}

/** Adds a line to the work's own note; the fixed list stays the author's to choose from. */
export async function addContentNote(admin: Viewer, workId: string, text: string, note = ""): Promise<void> {
  assertAdmin(admin);
  const line = text.trim();
  if (line.length < 3 || line.length > 200) throw new ActionError(400, "The content note is a few words, up to 200 characters.");
  const [w] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!w) throw new ActionError(404, "That work isn't here.");
  const next = w.contentNoteText.trim() ? `${w.contentNoteText.trim().replace(/[.;]$/, "")}; ${line}` : line;
  await db.update(works).set({ contentNoteText: next }).where(eq(works.id, workId));
  const owner = await ownerOfMark({ kind: "work", id: workId });
  await logStep(admin, "content_note_added", { kind: "work", id: workId }, `Added "${line}". ${note}`.trim());
  await tell(owner.userId, `A content note was added to ${owner.title}`, `"${line}". A reader reported it as missing and a person agreed. You can reword it in the Studio.`);
}

export const AI_USE_LABELS: Record<AiUse, string> = { none: "Written without AI", assisted: "Written with AI assistance", generated: "Written by AI" };

/**
 * The first-case path of an undeclared-AI finding: the declaration is put
 * right and allowed to stand. The log entry, with the old and new value, is
 * the mark that it was changed.
 */
export async function correctAiDeclaration(admin: Viewer, target: MarkTarget, value: AiUse, note: string): Promise<void> {
  assertAdmin(admin);
  const why = requireNote(note);
  if (!(value in AI_USE_LABELS)) throw new ActionError(400, "Choose one of the three declarations.");
  const owner = await ownerOfMark(target);
  let before: AiUse | null;
  if (target.kind === "author") {
    const a = await authorById(target.id);
    before = a.aiUse;
    await db.update(authors).set({ aiUse: value, aiDeclaredAt: new Date() }).where(eq(authors.id, target.id));
  } else {
    const [w] = await db.select({ aiUse: works.aiUse }).from(works).where(eq(works.id, target.id)).limit(1);
    before = w?.aiUse ?? null;
    await db.update(works).set({ aiUse: value }).where(eq(works.id, target.id));
  }
  await logStep(admin, "ai_declaration_corrected", target, `From "${before ? AI_USE_LABELS[before] : "not declared"}" to "${AI_USE_LABELS[value]}". ${why}`);
  await tell(owner.userId, `The declaration on ${owner.title} was corrected`, `It now reads "${AI_USE_LABELS[value]}". This is recorded as a first case; a second is a ban.`);
}
