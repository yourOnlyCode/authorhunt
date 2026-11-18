import { describe, expect, it } from "vitest";
import { listLine, resendFor } from "@/lib/waitlist";

const now = new Date("2026-11-20T12:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe("an address entered again", () => {
  it("gets nothing for a double press", () => {
    expect(resendFor({ createdAt: ago(1), confirmedAt: null, remindedAt: null }, now)).toBe("none");
  });
  it("gets its confirmation link again if it never confirmed", () => {
    expect(resendFor({ createdAt: ago(30), confirmedAt: null, remindedAt: null }, now)).toBe("confirm");
  });
  it("gets that link at most once an hour", () => {
    expect(resendFor({ createdAt: ago(300), confirmedAt: null, remindedAt: ago(20) }, now)).toBe("none");
    expect(resendFor({ createdAt: ago(300), confirmedAt: null, remindedAt: ago(61) }, now)).toBe("confirm");
  });
  it("is told it's already on the list, at most once a day, once confirmed", () => {
    expect(resendFor({ createdAt: ago(300), confirmedAt: ago(200), remindedAt: null }, now)).toBe("already");
    expect(resendFor({ createdAt: ago(3000), confirmedAt: ago(2900), remindedAt: ago(600) }, now)).toBe("none");
    expect(resendFor({ createdAt: ago(3000), confirmedAt: ago(2900), remindedAt: ago(1500) }, now)).toBe("already");
  });
});

describe("the size of the list, shown on the page", () => {
  it("says nothing until a hundred have confirmed", () => {
    expect(listLine(0)).toBeNull();
    expect(listLine(99)).toBeNull();
  });
  it("rounds down to the ten, so it never claims someone who isn't there", () => {
    expect(listLine(100)).toBe("100+ writers and readers are on the list.");
    expect(listLine(318)).toBe("310+ writers and readers are on the list.");
    expect(listLine(12_345)).toBe("12,340+ writers and readers are on the list.");
  });
});
