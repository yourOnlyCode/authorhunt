import { describe, expect, it } from "vitest";
import { authorAccess, hasMemberTools, isFounding, PRICE, trialEnd } from "@/lib/billing/access";

const now = new Date("2026-11-13T12:00:00Z");
const later = new Date("2026-12-01T00:00:00Z");
const earlier = new Date("2026-11-01T00:00:00Z");

describe("member tools", () => {
  it("are on during the two-month trial and off after it", () => {
    expect(authorAccess({ trialEndsAt: later, subscription: null, comp: null }, now)).toBe("trial");
    expect(authorAccess({ trialEndsAt: earlier, subscription: null, comp: null }, now)).toBe("free");
    expect(trialEnd(new Date("2026-11-01T00:00:00Z")).toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });
  it("starts a trial at opening for a page made before it, so none is spent waiting", () => {
    const opens = new Date("2027-01-08T17:00:00Z");
    expect(trialEnd(new Date("2026-11-20T00:00:00Z"), opens).toISOString()).toBe("2027-03-09T17:00:00.000Z");
    expect(trialEnd(new Date("2027-02-01T00:00:00Z"), opens).toISOString()).toBe("2027-04-02T00:00:00.000Z");
    expect(trialEnd(new Date("2027-02-01T00:00:00Z"), null).toISOString()).toBe("2027-04-02T00:00:00.000Z");
  });
  it("calls a page made before opening a founding author's, and no page after", () => {
    const opens = new Date("2027-01-08T17:00:00Z");
    expect(isFounding(new Date("2026-12-01T00:00:00Z"), opens)).toBe(true);
    expect(isFounding(new Date("2027-01-09T00:00:00Z"), opens)).toBe(false);
    expect(isFounding(new Date("2026-12-01T00:00:00Z"), null)).toBe(false);
  });
  it("are on for an active subscription", () => {
    expect(authorAccess({ trialEndsAt: earlier, subscription: { status: "active", currentPeriodEnd: later }, comp: null }, now)).toBe("member");
  });
  it("stay on to the end of a cancelled period, then switch off", () => {
    expect(authorAccess({ trialEndsAt: null, subscription: { status: "canceled", currentPeriodEnd: later }, comp: null }, now)).toBe("member");
    expect(authorAccess({ trialEndsAt: null, subscription: { status: "canceled", currentPeriodEnd: earlier }, comp: null }, now)).toBe("free");
    expect(authorAccess({ trialEndsAt: null, subscription: { status: "incomplete", currentPeriodEnd: later }, comp: null }, now)).toBe("free");
  });
  it("are on for a comp until it ends", () => {
    expect(authorAccess({ trialEndsAt: null, subscription: null, comp: { until: null } }, now)).toBe("comp");
    expect(authorAccess({ trialEndsAt: null, subscription: null, comp: { until: earlier } }, now)).toBe("free");
  });
  it("means tools, and nothing else", () => {
    expect(hasMemberTools("free")).toBe(false);
    expect(["trial", "member", "comp"].every((a) => hasMemberTools(a as never))).toBe(true);
  });
  it("costs what the owner set", () => {
    expect(PRICE).toEqual({ monthly: 3.99, yearly: 32 });
  });
});
