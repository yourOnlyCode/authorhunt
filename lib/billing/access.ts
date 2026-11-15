/**
 * lib/billing/access.ts
 *
 * Whether an author has the member tools (AGENTS.md rule 3). It gates tools
 * only: emailing followers, the coming-soon list, full analytics, the Support
 * button, the full share kit. Nothing may call this to decide whether someone
 * can make a page, launch, comment or appear on a board.
 *
 * Pure: pass the facts and the time in.
 */

export type Access = "trial" | "member" | "comp" | "free";

export const PRICE = { monthly: 3.99, yearly: 32 } as const;
export const TRIAL_DAYS = 30;
export const FREE_LINK_LIMIT = 5;

export type AccessFacts = {
  trialEndsAt: Date | null;
  subscription: { status: string; currentPeriodEnd: Date | null } | null;
  comp: { until: Date | null } | null;
};

export function authorAccess(facts: AccessFacts, now: Date): Access {
  if (facts.comp && (facts.comp.until === null || facts.comp.until > now)) return "comp";
  const sub = facts.subscription;
  if (sub) {
    if (sub.status === "active" || sub.status === "trialing") return "member";
    // A cancelled or past-due subscription keeps its tools to the end of what was paid for.
    if ((sub.status === "canceled" || sub.status === "past_due") && sub.currentPeriodEnd && sub.currentPeriodEnd > now) return "member";
  }
  if (facts.trialEndsAt && facts.trialEndsAt > now) return "trial";
  return "free";
}

export function hasMemberTools(access: Access): boolean {
  return access !== "free";
}

export function trialEnd(createdAt: Date): Date {
  return new Date(createdAt.getTime() + TRIAL_DAYS * 86_400_000);
}
