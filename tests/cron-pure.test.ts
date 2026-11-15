import { describe, expect, it } from "vitest";
import {
  batchByUser, chunks, collapse, cronAllowed, inEmailQuietHours, inEveningWindow, isSundayInNewYork, mailPlan, placeWord, rankClosedDay, topThreeLine,
  type PendingNotification,
} from "@/lib/cron/pure";

const n = (over: Partial<PendingNotification>): PendingNotification => ({
  id: "n1", userId: "u1", kind: "comment", title: "A comment", body: "", href: "/", groupKey: null, createdAt: new Date("2026-11-15T15:00:00Z"), ...over,
});

describe("cronAllowed", () => {
  it("takes the right bearer token", () => {
    expect(cronAllowed({ authorization: "Bearer s3cret", secret: "s3cret", nodeEnv: "production" })).toBe(true);
  });
  it("refuses a wrong or missing token in production", () => {
    expect(cronAllowed({ authorization: "Bearer nope", secret: "s3cret", nodeEnv: "production" })).toBe(false);
    expect(cronAllowed({ authorization: null, secret: "s3cret", nodeEnv: "production" })).toBe(false);
  });
  it("refuses everyone in production when no secret is set", () => {
    expect(cronAllowed({ authorization: null, secret: undefined, nodeEnv: "production" })).toBe(false);
    expect(cronAllowed({ authorization: "Bearer undefined", secret: undefined, nodeEnv: "production" })).toBe(false);
    expect(cronAllowed({ authorization: "Bearer ", secret: "", nodeEnv: "production" })).toBe(false);
  });
  it("runs locally with no secret, and checks one that is set", () => {
    expect(cronAllowed({ authorization: null, secret: undefined, nodeEnv: "development" })).toBe(true);
    expect(cronAllowed({ authorization: null, secret: "s3cret", nodeEnv: "development" })).toBe(false);
  });
});

describe("the clock in New York", () => {
  it("knows Sunday by New York's calendar, not UTC's", () => {
    // 03:00 UTC on Monday is still Sunday evening in New York.
    expect(isSundayInNewYork(new Date("2026-11-16T03:00:00Z"))).toBe(true);
    // 03:00 UTC on Sunday is still Saturday evening in New York.
    expect(isSundayInNewYork(new Date("2026-11-15T03:00:00Z"))).toBe(false);
    expect(isSundayInNewYork(new Date("2026-11-15T15:00:00Z"))).toBe(true);
  });
  it("keeps quiet from 9pm to 8am, in winter and in summer", () => {
    expect(inEmailQuietHours(new Date("2026-11-15T12:59:00Z"))).toBe(true); // 07:59 EST
    expect(inEmailQuietHours(new Date("2026-11-15T13:00:00Z"))).toBe(false); // 08:00 EST
    expect(inEmailQuietHours(new Date("2026-11-16T02:00:00Z"))).toBe(true); // 21:00 EST
    expect(inEmailQuietHours(new Date("2026-07-15T12:00:00Z"))).toBe(false); // 08:00 EDT
    expect(inEmailQuietHours(new Date("2026-07-15T11:59:00Z"))).toBe(true); // 07:59 EDT
  });
  it("has an evening window that ends where the quiet hours begin", () => {
    expect(inEveningWindow(new Date("2026-11-15T22:59:00Z"))).toBe(false); // 17:59 EST
    expect(inEveningWindow(new Date("2026-11-15T23:00:00Z"))).toBe(true); // 18:00 EST
    expect(inEveningWindow(new Date("2026-11-16T01:59:00Z"))).toBe(true); // 20:59 EST
    expect(inEveningWindow(new Date("2026-11-16T02:00:00Z"))).toBe(false); // 21:00 EST
  });
});

describe("rankClosedDay", () => {
  const at = (h: number) => new Date(Date.UTC(2026, 10, 14, h));
  it("orders by score, best first", () => {
    const ranks = rankClosedDay([{ id: "a", score: 3, createdAt: at(1) }, { id: "b", score: 9, createdAt: at(2) }, { id: "c", score: 5, createdAt: at(3) }]);
    expect([ranks.get("b"), ranks.get("c"), ranks.get("a")]).toEqual([1, 2, 3]);
  });
  it("puts the earlier launch first on a tie, and gives no shared places", () => {
    const ranks = rankClosedDay([{ id: "late", score: 4, createdAt: at(5) }, { id: "early", score: 4, createdAt: at(1) }]);
    expect(ranks.get("early")).toBe(1);
    expect(ranks.get("late")).toBe(2);
  });
  it("is the same whatever order the rows arrive in", () => {
    const rows = [{ id: "a", score: 1, createdAt: at(1) }, { id: "b", score: 1, createdAt: at(1) }, { id: "c", score: 2, createdAt: at(1) }];
    expect([...rankClosedDay(rows)]).toEqual([...rankClosedDay([...rows].reverse())]);
  });
  it("handles an empty day", () => {
    expect(rankClosedDay([]).size).toBe(0);
  });
});

describe("places in words", () => {
  it("names the first three and numbers the rest", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(placeWord)).toEqual(["first", "second", "third", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  });
  it("has a line for the top three only", () => {
    expect(topThreeLine(1)).toMatch(/First of the day/);
    expect(topThreeLine(3)).toMatch(/top three/);
    expect(topThreeLine(4)).toBe("");
  });
});

describe("batching notifications", () => {
  const emailNow = (kind: string) => ["comment", "launch", "decision"].includes(kind);
  it("groups by person and splits prompt from evening", () => {
    const batches = batchByUser([
      n({ id: "1", userId: "u1", kind: "comment" }), n({ id: "2", userId: "u1", kind: "cheer" }),
      n({ id: "3", userId: "u2", kind: "follower" }), n({ id: "4", userId: "u1", kind: "launch" }),
    ], emailNow);
    expect(batches).toHaveLength(2);
    const u1 = batches.find((b) => b.userId === "u1");
    expect(u1?.now.map((r) => r.id)).toEqual(["1", "4"]);
    expect(u1?.evening.map((r) => r.id)).toEqual(["2"]);
    expect(batches.find((b) => b.userId === "u2")?.now).toEqual([]);
  });
  it("keeps a kind it doesn't know for the evening", () => {
    const [batch] = batchByUser([n({ kind: "something_new" })], emailNow);
    expect(batch?.evening).toHaveLength(1);
  });

  it("collapses rows that share a group key into one line with a count", () => {
    const lines = collapse([
      n({ id: "1", kind: "cheer", groupKey: "cheers:L1", title: "A cheer", createdAt: new Date("2026-11-15T15:00:00Z") }),
      n({ id: "2", kind: "cheer", groupKey: "cheers:L1", title: "The newest cheer", createdAt: new Date("2026-11-15T17:00:00Z") }),
      n({ id: "3", kind: "cheer", groupKey: "cheers:L1", title: "A cheer", createdAt: new Date("2026-11-15T16:00:00Z") }),
      n({ id: "4", kind: "follower", groupKey: null, title: "A follower", createdAt: new Date("2026-11-15T16:30:00Z") }),
    ]);
    expect(lines).toEqual([
      { title: "A follower", body: "", href: "/", times: 1 },
      { title: "The newest cheer", body: "", href: "/", times: 3 },
    ]);
  });
  it("never merges rows without a group key", () => {
    expect(collapse([n({ id: "1" }), n({ id: "2" })])).toHaveLength(2);
  });
});

describe("mailPlan", () => {
  const batch = { userId: "u1", now: [n({ id: "1", kind: "comment" }), n({ id: "2", kind: "decision" })], evening: [n({ id: "3", kind: "cheer" })] };
  it("sends prompt kinds by day and holds the summary until evening", () => {
    const plan = mailPlan(batch, { quiet: false, evening: false, summarySentToday: false });
    expect(plan.now.map((r) => r.id)).toEqual(["1", "2"]);
    expect(plan.evening).toEqual([]);
  });
  it("sends only decisions in the quiet hours", () => {
    const plan = mailPlan(batch, { quiet: true, evening: false, summarySentToday: false });
    expect(plan.now.map((r) => r.id)).toEqual(["2"]);
    expect(plan.evening).toEqual([]);
  });
  it("sends the summary in the evening, once", () => {
    expect(mailPlan(batch, { quiet: false, evening: true, summarySentToday: false }).evening.map((r) => r.id)).toEqual(["3"]);
    expect(mailPlan(batch, { quiet: false, evening: true, summarySentToday: true }).evening).toEqual([]);
  });
});

describe("chunks", () => {
  it("splits a list into runs", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([], 3)).toEqual([]);
  });
});
