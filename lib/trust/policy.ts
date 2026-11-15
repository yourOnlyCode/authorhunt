/**
 * lib/trust/policy.ts
 *
 * The parts of moderation that are arithmetic: how the queue is ordered, how
 * long an author has to answer, when an appeal can still be made. Pure, with
 * `now` passed in, so tests/trust.test.ts can check them without a database.
 *
 * Nothing here decides anything about a person. The order of the queue only
 * says what the owner looks at first; every sanction is a form a person
 * submits with a note (AGENTS.md rule 7).
 */

import type { ReportTarget, Standing } from "../db/schema";

/** Where a sanctioned person with no working sign-in writes. */
export const REPORTS_ADDRESS = process.env.REPORTS_EMAIL ?? "reports@authorhunt.com";

export const AI_ANSWER_DAYS = 7;
export const APPEAL_DAYS = 30;
const DAY_MS = 86_400_000;

export function answerDeadline(openedAt: Date): Date {
  return new Date(openedAt.getTime() + AI_ANSWER_DAYS * DAY_MS);
}
export function appealDeadline(decidedAt: Date): Date {
  return new Date(decidedAt.getTime() + APPEAL_DAYS * DAY_MS);
}

/**
 * One appeal, in writing, within thirty days of the decision
 * (docs/product-structure.md, section 7). `sanctionedAt` is the latest
 * suspension or ban; `appealsSince` counts appeals made after it.
 */
export function appealState(input: { standing: Standing; sanctionedAt: Date | null; appealsSince: number; now: Date }): "none_needed" | "open" | "used" | "late" {
  if (input.standing === "good") return "none_needed";
  if (input.appealsSince > 0) return "used";
  if (input.sanctionedAt && input.now > appealDeadline(input.sanctionedAt)) return "late";
  return "open";
}

/**
 * Reports are also a way to attack a rival's launch day, so a reporter whose
 * reports were mostly dismissed counts for less in the queue's order. It never
 * hides a report: the owner still sees every one.
 */
export function reporterWeight(history: { decided: number; dismissed: number }): number {
  if (history.decided < 3) return 1;
  return history.dismissed / history.decided >= 0.75 ? 0.25 : 1;
}

/** How much of the site can see the thing right now: a live launch today first, something already hidden last. */
export function visibility(input: { kind: ReportTarget; liveToday: boolean; hidden: boolean }): number {
  if (input.hidden) return 0;
  if (!input.liveToday) return 1;
  return input.kind === "comment" || input.kind === "collection" || input.kind === "image" ? 2 : 3;
}

export type QueueItem = { reporters: number; weight: number; visibility: number; oldest: Date };

/** Most separate accounts first (weighted), then the most visible, then the longest waiting. */
export function compareQueue(a: QueueItem, b: QueueItem): number {
  return b.weight - a.weight || b.reporters - a.reporters || b.visibility - a.visibility || a.oldest.getTime() - b.oldest.getTime();
}
export function orderQueue<T extends QueueItem>(items: T[]): T[] {
  return [...items].sort(compareQueue);
}

/** What a closed report says was decided. */
export const DECISIONS: Record<string, string> = {
  dismissed: "Dismissed: nothing was changed",
  removed: "Removed",
  pulled: "The launch was pulled",
  marked: "The Mature mark or content note was added",
  suspended: "The account was suspended",
  banned: "Banned",
  not_confirmed: "Undeclared AI: not confirmed",
  corrected: "Undeclared AI: confirmed, and the declaration corrected",
};
export function decisionLabel(key: string | null): string {
  return key ? DECISIONS[key] ?? key : "";
}

/** The words the log page shows for each action name written to moderation_log. */
export const ACTION_LABELS: Record<string, string> = {
  report_dismissed: "Reports dismissed",
  comment_removed: "Comment removed",
  comment_restored: "Comment restored",
  launch_pulled: "Launch pulled",
  launch_restored: "Launch restored",
  image_removed: "Picture removed",
  author_suspended: "Page suspended",
  author_restored: "Page restored",
  author_banned: "Page banned",
  user_suspended: "Account suspended",
  user_banned: "Account banned",
  user_restored: "Account restored",
  mature_marked: "Marked Mature",
  mature_unmarked: "Mature mark taken off",
  content_note_added: "Content note added",
  ai_declaration_corrected: "AI declaration corrected",
  ai_case_opened: "AI case: author told, seven days to answer",
  ai_case_answer: "AI case: the author's answer",
  ai_case_not_confirmed: "AI case: not confirmed",
  ai_case_confirmed: "AI case: confirmed",
  appeal: "Appeal received",
  appeal_decided: "Appeal decided",
  reference_approved: "Reference name approved",
  reference_renamed: "Reference name corrected",
  reference_merged: "Reference name merged",
};
export function actionLabel(key: string): string {
  return ACTION_LABELS[key] ?? key;
}

/** Log entries that record a step, not a decision about someone: left out when counting earlier decisions. */
export const NON_DECISIONS = ["ai_case_opened", "ai_case_answer", "appeal", "reference_approved", "reference_renamed", "reference_merged"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Report targets are stored as text; checked before one reaches a uuid column, where a bad value is a database error. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
