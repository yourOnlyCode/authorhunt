import { describe, expect, it } from "vitest";
import { addDays, dayStart, formatDay, hourOfDay, inQuietHours, launchDay } from "@/lib/ranking/day";
import { decayed, momentum, stillEarns } from "@/lib/ranking/points";
import { cheerWeight, launchScore, quietOrder } from "@/lib/ranking/score";

describe("the launch day", () => {
  it("is a date in New York, not UTC", () => {
    // 03:30 UTC on the 14th is still the evening of the 13th in New York.
    expect(launchDay(new Date("2026-11-14T03:30:00Z"))).toBe("2026-11-13");
    expect(launchDay(new Date("2026-11-14T05:00:00Z"))).toBe("2026-11-14");
  });
  it("follows daylight saving", () => {
    // In July New York is four hours behind UTC, in January five.
    expect(launchDay(new Date("2026-07-02T03:59:00Z"))).toBe("2026-07-01");
    expect(launchDay(new Date("2026-07-02T04:00:00Z"))).toBe("2026-07-02");
    expect(dayStart("2026-07-02").toISOString()).toBe("2026-07-02T04:00:00.000Z");
    expect(dayStart("2027-01-08").toISOString()).toBe("2027-01-08T05:00:00.000Z");
  });
  it("counts hours and moves by days", () => {
    expect(hourOfDay(new Date("2026-11-13T05:00:00Z"))).toBe(0);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(formatDay("2026-11-13")).toBe("Friday, November 13");
  });
  it("is quiet for the day's first four hours only", () => {
    expect(inQuietHours(new Date("2026-11-13T06:00:00Z"), "2026-11-13")).toBe(true);
    expect(inQuietHours(new Date("2026-11-13T09:00:00Z"), "2026-11-13")).toBe(false);
    expect(inQuietHours(new Date("2026-11-13T06:00:00Z"), "2026-11-12")).toBe(false);
  });
});

describe("the launch score", () => {
  const now = new Date("2026-11-13T15:00:00Z");
  const old = new Date("2026-01-01T00:00:00Z");
  it("never counts a cheer on your own launch", () => {
    expect(cheerWeight({ isOwnLaunch: true, accountCreatedAt: old, hasOtherActivity: true, now })).toBe(0);
  });
  it("counts a brand-new, otherwise idle account at half", () => {
    const fresh = new Date("2026-11-12T00:00:00Z");
    expect(cheerWeight({ isOwnLaunch: false, accountCreatedAt: fresh, hasOtherActivity: false, now })).toBe(0.5);
    expect(cheerWeight({ isOwnLaunch: false, accountCreatedAt: fresh, hasOtherActivity: true, now })).toBe(1);
    expect(cheerWeight({ isOwnLaunch: false, accountCreatedAt: old, hasOtherActivity: false, now })).toBe(1);
  });
  it("adds two for each distinct commenter", () => {
    expect(launchScore({ cheerWeightSum: 10, distinctCommenters: 3 })).toBe(16);
  });
  it("shuffles the quiet hours the same way for everyone, and differently each day", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: `launch-${i}` }));
    const a = quietOrder(rows, "2026-11-13").map((r) => r.id);
    expect(quietOrder(rows, "2026-11-13").map((r) => r.id)).toEqual(a);
    expect(quietOrder(rows, "2026-11-14").map((r) => r.id)).not.toEqual(a);
    expect([...a].sort()).toEqual(rows.map((r) => r.id).sort());
  });
});

describe("Momentum", () => {
  const now = new Date("2026-11-13T00:00:00Z");
  it("halves every thirty days", () => {
    expect(decayed(50, now, now)).toBe(50);
    expect(decayed(50, new Date("2026-10-14T00:00:00Z"), now)).toBeCloseTo(25, 5);
    expect(decayed(50, new Date("2026-09-14T00:00:00Z"), now)).toBeCloseTo(12.5, 5);
  });
  it("lets an author active this month pass a bigger name gone quiet", () => {
    const quiet = momentum([{ points: 400, createdAt: new Date("2026-05-01T00:00:00Z") }], now);
    const active = momentum([{ points: 60, createdAt: new Date("2026-11-10T00:00:00Z") }], now);
    expect(active).toBeGreaterThan(quiet);
  });
  it("respects the limits on how often an act earns", () => {
    expect(stillEarns("launch_page", { today: 0, ever: 1 })).toBe(false);
    expect(stillEarns("post_update", { today: 1, ever: 9 })).toBe(false);
    expect(stillEarns("post_update", { today: 0, ever: 9 })).toBe(true);
    expect(stillEarns("support_others", { today: 10, ever: 50 })).toBe(false);
    expect(stillEarns("cheer_received", { today: 500, ever: 5000 })).toBe(true);
  });
});
