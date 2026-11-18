import { describe, expect, it } from "vitest";
import { dayProblem, earlyDays } from "@/lib/studio/days";

const opens = new Date("2027-01-08T17:00:00Z"); // noon Eastern on Friday, January 8
const before = new Date("2026-11-20T15:00:00Z");
const after = new Date("2027-02-01T15:00:00Z");

describe("the days an early author can launch on", () => {
  it("start on opening day and run four weeks", () => {
    const days = earlyDays(before, opens);
    expect(days[0]).toBe("2027-01-08");
    expect(days).toHaveLength(29);
    expect(days[days.length - 1]).toBe("2027-02-05");
  });
  it("are empty once the site is open, or when it has no opening set", () => {
    expect(earlyDays(after, opens)).toEqual([]);
    expect(earlyDays(before, null)).toEqual([]);
  });
});

describe("whether a day can take a launch", () => {
  it("before opening, refuses a day before the first board and one past the first four weeks", () => {
    expect(dayProblem("2026-11-21", before, opens)).toMatch(/first board/);
    expect(dayProblem("2027-01-07", before, opens)).toMatch(/first board/);
    expect(dayProblem("2027-01-08", before, opens)).toBeNull();
    expect(dayProblem("2027-02-05", before, opens)).toBeNull();
    expect(dayProblem("2027-02-06", before, opens)).toMatch(/Before opening/);
  });
  it("once open, takes today or later within the window, as before", () => {
    expect(dayProblem("2027-02-01", after, opens)).toBeNull();
    expect(dayProblem("2027-01-31", after, opens)).toMatch(/passed/);
    expect(dayProblem("2027-06-01", after, opens)).toMatch(/days ahead/);
    expect(dayProblem("not-a-day", after, opens)).toMatch(/date/);
  });
});
