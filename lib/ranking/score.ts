/**
 * lib/ranking/score.ts
 *
 * What orders a day's board. Pure: no database, no clock of its own, and no
 * billing data (AGENTS.md rule 2: rank can't be bought).
 */

const DAY_MS = 86_400_000;

/**
 * What one cheer counts for. An account can't cheer its own launch; the route
 * refuses it, and it weighs nothing here as a second lock. A brand-new account
 * with no other activity counts half, so a batch of fresh sign-ups can't carry
 * a launch.
 */
export function cheerWeight(input: { isOwnLaunch: boolean; accountCreatedAt: Date; hasOtherActivity: boolean; now: Date }): number {
  if (input.isOwnLaunch) return 0;
  const ageDays = (input.now.getTime() - input.accountCreatedAt.getTime()) / DAY_MS;
  if (ageDays < 7 && !input.hasOtherActivity) return 0.5;
  return 1;
}

/** Weighted cheers, plus two for each distinct commenter who isn't the author. */
export function launchScore(input: { cheerWeightSum: number; distinctCommenters: number }): number {
  return input.cheerWeightSum + 2 * input.distinctCommenters;
}

/** A stable shuffle for the quiet hours: the same order all day for everyone. */
export function quietOrder<T extends { id: string }>(rows: T[], day: string): T[] {
  const key = (id: string) => {
    let h = 2166136261;
    for (const ch of id + day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  return [...rows].sort((a, b) => key(a.id) - key(b.id));
}
