import { describe, expect, it } from "vitest";
import { relFor, safeUrl, supportUrlAllowed } from "@/lib/seo/links";
import { isGivingLink } from "@/lib/seo/links";
import { slugify, validHandle } from "@/lib/slug";

describe("outbound links", () => {
  it("follows a website only once the site is verified", () => {
    expect(relFor("website", { siteVerified: false })).toContain("nofollow");
    expect(relFor("website", { siteVerified: true })).not.toContain("nofollow");
  });
  it("never follows what a reader typed, or a payment link", () => {
    expect(relFor("user_text", { siteVerified: true })).toContain("ugc");
    expect(relFor("user_text", { siteVerified: true })).toContain("nofollow");
    expect(relFor("support", { siteVerified: true })).toContain("nofollow");
  });
  it("takes no plan as input: a followed link can't be bought", () => {
    // The function's only fact is whether the site is verified.
    expect(relFor.length).toBe(2);
  });
  it("only renders http and https", () => {
    expect(safeUrl("example.com/books")).toBe("https://example.com/books");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,x")).toBeNull();
    expect(safeUrl("")).toBeNull();
  });
  it("keeps the Support button to services we recognise", () => {
    expect(supportUrlAllowed("https://ko-fi.com/maren")).toBe(true);
    expect(supportUrlAllowed("paypal.me/maren")).toBe(true);
    expect(supportUrlAllowed("https://ko-fi.com.evil.example/maren")).toBe(false);
    expect(supportUrlAllowed("https://example.com/pay")).toBe(false);
  });
});

describe("slugs and handles", () => {
  it("makes plain slugs", () => {
    expect(slugify("Raleigh N.C.")).toBe("raleigh-n-c");
    expect(slugify("Ursula K. Le Guin")).toBe("ursula-k-le-guin");
    expect(slugify("S\u00f8ren & \u00c6sop\u2019s Caf\u00e9")).toBe("soren-and-aesops-cafe");
    expect(slugify("The Understudy's Knife")).toBe("the-understudys-knife");
  });
  it("refuses handles that are routes or badly shaped", () => {
    expect(validHandle("maren")).toBe(true);
    expect(validHandle("authors")).toBe(false);
    expect(validHandle("api")).toBe(false);
    expect(validHandle("-maren")).toBe(false);
    expect(validHandle("Ma")).toBe(false);
  });
});

describe("a link that is a way to give money", () => {
  it("is recognised on the services people use for it", () => {
    for (const url of ["https://ko-fi.com/maren", "https://www.paypal.me/maren", "patreon.com/maren", "https://buymeacoffee.com/x", "https://github.com/sponsors/maren", "https://cash.app/$maren"]) expect(isGivingLink(url)).toBe(true);
  });
  it("is not a bookshop, a newsletter, a profile or an ordinary site", () => {
    for (const url of ["https://bookshop.org/a/1/9780000000000", "https://maren.substack.com", "https://github.com/maren", "https://example.com/donate", "https://archiveofourown.org/users/maren", "not a link"]) expect(isGivingLink(url)).toBe(false);
  });
});
