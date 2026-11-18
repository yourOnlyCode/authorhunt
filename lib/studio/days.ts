/**
 * lib/studio/days.ts
 *
 * Which day a launch may be set on. Pure: pass the day, the time and when
 * the site opens (docs/development.md, section 4; AGENTS.md rule 6: a day is
 * a date in New York, and lib/ranking/day.ts is the only place that makes one).
 */

import { addDays, formatDay, launchDay } from "../ranking/day";
import { LAUNCH_WINDOW_DAYS } from "./rules";

export function dayWords(day: string): string {
  return formatDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** How many days of boards a launch can be set on before the site opens: opening day and the four weeks after. */
export const EARLY_DAYS = 29;

/** The days an early author can choose from, opening day first. Empty once the site is open. */
export function earlyDays(now: Date, opensAt: Date | null): string[] {
  if (!opensAt || now >= opensAt) return [];
  const first = launchDay(opensAt);
  return Array.from({ length: EARLY_DAYS }, (_, i) => addDays(first, i));
}

/**
 * Whether a day can take a launch: a real date, today or later in New York, and not too far off. Before the
 * site opens there is no board today, so the first day is opening day, and the window is the first four weeks.
 */
export function dayProblem(day: string, now: Date, opensAt: Date | null = null): string | null {
  if (!DAY_PATTERN.test(day) || addDays(day, 0) !== day) return "That isn't a date.";
  if (opensAt && now < opensAt) {
    const days = earlyDays(now, opensAt);
    if (day < days[0]!) return `The first board is on ${dayWords(days[0]!)}. Choose that day or a later one.`;
    if (day > days[days.length - 1]!) return `Before opening, a launch can be set up to ${dayWords(days[days.length - 1]!)}.`;
    return null;
  }
  const today = launchDay(now);
  if (day < today) return "That day has passed. Days run midnight to midnight, New York time.";
  if (day > addDays(today, LAUNCH_WINDOW_DAYS)) return `A launch can be set up to ${LAUNCH_WINDOW_DAYS} days ahead.`;
  return null;
}

