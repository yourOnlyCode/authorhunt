import { describe, expect, it } from "vitest";
import { GO_WORDS } from "@/lib/work-words";

describe("the launch page's main button", () => {
  it("reads or views, and never gets or buys", () => {
    for (const words of Object.values(GO_WORDS)) {
      expect(words).toMatch(/^(Read|View) /);
      expect(words).not.toMatch(/get|buy/i);
    }
  });
  it("has words for every kind of work", () => {
    expect(Object.keys(GO_WORDS).sort()).toEqual(["book", "issue", "serial", "short"]);
  });
});
