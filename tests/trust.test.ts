/**
 * tests/trust.test.ts
 *
 * The parts of moderation that are plain logic: which reasons apply to which
 * kind of thing, the order of the queue, and the two deadlines. No database.
 */

import { describe, expect, it } from "vitest";
import { REPORT_REASONS } from "@/components/trust/report-link";
import { REASONS, reasonAllowed, reasonLabel, reasonsFor, TARGET_KINDS } from "@/lib/trust/reasons";
import { answerDeadline, appealDeadline, appealState, compareQueue, isUuid, orderQueue, reporterWeight, visibility } from "@/lib/trust/policy";

const at = (iso: string) => new Date(iso);

describe("report reasons", () => {
  it("are the same list the form offers", () => {
    expect(REASONS).toEqual(REPORT_REASONS);
  });

  it("apply to the kinds the product names", () => {
    expect(reasonAllowed("launch", "undeclared_ai")).toBe(true);
    expect(reasonAllowed("work", "undeclared_ai")).toBe(true);
    expect(reasonAllowed("comment", "undeclared_ai")).toBe(false);
    expect(reasonAllowed("comment", "harassment")).toBe(true);
    expect(reasonAllowed("launch", "harassment")).toBe(false);
    expect(reasonAllowed("image", "stolen")).toBe(true);
    expect(reasonAllowed("author", "impersonation")).toBe(true);
    expect(reasonAllowed("collection", "cheer_trading")).toBe(false);
  });

  it("offer spam and something else for everything", () => {
    for (const kind of TARGET_KINDS) {
      const keys = reasonsFor(kind).map((r) => r.key);
      expect(keys).toContain("spam");
      expect(keys).toContain("other");
    }
  });

  it("refuse a reason that doesn't exist", () => {
    expect(reasonAllowed("launch", "looks_like_ai_to_a_detector")).toBe(false);
    expect(reasonLabel("undeclared_ai")).toBe("Written by AI");
  });
});

describe("the queue's order", () => {
  const item = (name: string, reporters: number, vis: number, oldest: string, weight = reporters) => ({ name, reporters, weight, visibility: vis, oldest: at(oldest) });

  it("puts the most reported first, then the most visible, then the longest waiting", () => {
    const ordered = orderQueue([
      item("one report, old page", 1, 1, "2026-11-01T12:00:00Z"),
      item("one report, live today", 1, 3, "2026-11-10T12:00:00Z"),
      item("three reports, hidden", 3, 0, "2026-11-12T12:00:00Z"),
      item("one report, live today, older", 1, 3, "2026-11-09T12:00:00Z"),
    ]);
    expect(ordered.map((o) => o.name)).toEqual(["three reports, hidden", "one report, live today, older", "one report, live today", "one report, old page"]);
  });

  it("counts a reporter with mostly unfounded reports for less, without dropping them", () => {
    expect(reporterWeight({ decided: 2, dismissed: 2 })).toBe(1);
    expect(reporterWeight({ decided: 4, dismissed: 3 })).toBe(0.25);
    expect(reporterWeight({ decided: 4, dismissed: 2 })).toBe(1);
    const piledOn = item("two discounted reporters", 2, 3, "2026-11-10T12:00:00Z", 0.5);
    const single = item("one ordinary reporter", 1, 1, "2026-11-10T12:00:00Z", 1);
    expect(compareQueue(single, piledOn)).toBeLessThan(0);
  });

  it("ranks a live launch above a comment on it, and anything hidden last", () => {
    expect(visibility({ kind: "launch", liveToday: true, hidden: false })).toBeGreaterThan(visibility({ kind: "comment", liveToday: true, hidden: false }));
    expect(visibility({ kind: "comment", liveToday: true, hidden: false })).toBeGreaterThan(visibility({ kind: "author", liveToday: false, hidden: false }));
    expect(visibility({ kind: "launch", liveToday: true, hidden: true })).toBe(0);
  });
});

describe("deadlines", () => {
  it("give seven days to answer and thirty to appeal", () => {
    expect(answerDeadline(at("2026-11-15T15:00:00Z")).toISOString()).toBe("2026-11-22T15:00:00.000Z");
    expect(appealDeadline(at("2026-11-15T15:00:00Z")).toISOString()).toBe("2026-12-15T15:00:00.000Z");
  });

  it("allow one appeal, in time", () => {
    const sanctionedAt = at("2026-11-15T15:00:00Z");
    expect(appealState({ standing: "good", sanctionedAt: null, appealsSince: 0, now: at("2026-11-16T00:00:00Z") })).toBe("none_needed");
    expect(appealState({ standing: "banned", sanctionedAt, appealsSince: 0, now: at("2026-12-01T00:00:00Z") })).toBe("open");
    expect(appealState({ standing: "banned", sanctionedAt, appealsSince: 1, now: at("2026-12-01T00:00:00Z") })).toBe("used");
    expect(appealState({ standing: "suspended", sanctionedAt, appealsSince: 0, now: at("2026-12-16T00:00:00Z") })).toBe("late");
  });
});

describe("target ids", () => {
  it("are checked before they reach a uuid column", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e7b-8f10-2c5d6e7f8a9b")).toBe(true);
    expect(isUuid("dev_reader")).toBe(false);
    expect(isUuid("3f2b8c1e-9a4d-4e7b-8f10-2c5d6e7f8a9b' or 1=1")).toBe(false);
  });
});
