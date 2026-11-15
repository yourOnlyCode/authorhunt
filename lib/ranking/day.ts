/**
 * lib/ranking/day.ts
 *
 * The only place that turns a moment into a launch day (AGENTS.md rule 6).
 * A day is a calendar date in America/New_York, written YYYY-MM-DD.
 */

export const DAY_ZONE = "America/New_York";

const parts = new Intl.DateTimeFormat("en-CA", { timeZone: DAY_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });

function read(at: Date) {
  const p = Object.fromEntries(parts.formatToParts(at).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

/** The launch day a moment falls in. */
export function launchDay(at: Date): string {
  return read(at).day;
}

/** Hours since the day began in New York, 0 to 23. */
export function hourOfDay(at: Date): number {
  return read(at).hour;
}

/** A day moved by whole days: addDays("2026-11-13", -1) is "2026-11-12". */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * For the day's first hours the board is shuffled and shows no counts, so the
 * earliest launch doesn't win on a head start (docs/development.md, section 4).
 */
export const QUIET_HOURS = 4;
export function inQuietHours(at: Date, day: string): boolean {
  return launchDay(at) === day && hourOfDay(at) < QUIET_HOURS;
}

/** "Friday, November 13" for a day string. */
export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

/** The moment a launch day begins in New York, whichever side of daylight saving it falls. */
export function dayStart(day: string): Date {
  for (const offset of ["-04:00", "-05:00"]) {
    const at = new Date(`${day}T00:00:00${offset}`);
    if (launchDay(at) === day && hourOfDay(at) === 0) return at;
  }
  return new Date(`${day}T05:00:00Z`);
}
