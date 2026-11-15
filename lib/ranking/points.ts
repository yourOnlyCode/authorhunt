/**
 * lib/ranking/points.ts
 *
 * Momentum: an author's standing. Every creating or supporting act writes a
 * row to point_events; Momentum is the sum, each row halving every thirty
 * days, so an author active this month can pass a bigger name gone quiet.
 * The numbers are a first guess and live here so they can be tuned in one place.
 */

export const HALF_LIFE_DAYS = 30;

export const POINTS = {
  launch_work: { points: 50, perDay: 1 },
  launch_page: { points: 30, once: true },
  finish_page: { points: 20, once: true },
  post_update: { points: 10, perDay: 1 },
  follower: { points: 3 },
  cheer_received: { points: 2 },
  reply_on_own: { points: 2, perDay: 5 },
  support_others: { points: 1, perDay: 10 },
} as const satisfies Record<string, { points: number; perDay?: number; once?: boolean }>;

export type PointKind = keyof typeof POINTS;

const DAY_MS = 86_400_000;

export function decayed(points: number, at: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - at.getTime()) / DAY_MS);
  return points * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export function momentum(events: { points: number; createdAt: Date }[], now: Date): number {
  let sum = 0;
  for (const e of events) sum += decayed(e.points, e.createdAt, now);
  return Math.round(sum * 100) / 100;
}

/** Whether another event of this kind still earns points, given how many were already counted. */
export function stillEarns(kind: PointKind, counted: { today: number; ever: number }): boolean {
  const rule = POINTS[kind] as { points: number; perDay?: number; once?: boolean };
  if (rule.once && counted.ever > 0) return false;
  if (rule.perDay !== undefined && counted.today >= rule.perDay) return false;
  return true;
}
