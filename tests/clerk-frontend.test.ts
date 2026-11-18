import { describe, expect, it } from "vitest";
import { clerkFrontendOrigin } from "@/lib/clerk-frontend";

const key = (host: string, kind = "live") => `pk_${kind}_${Buffer.from(`${host}$`).toString("base64")}`;

describe("Clerk's address, from the publishable key", () => {
  it("reads the host a live or test key carries", () => {
    expect(clerkFrontendOrigin(key("clerk.authorhunt.com"))).toBe("https://clerk.authorhunt.com");
    expect(clerkFrontendOrigin(key("happy-cat-12.clerk.accounts.dev", "test"))).toBe("https://happy-cat-12.clerk.accounts.dev");
  });
  it("is null for no key, or one it can't read", () => {
    expect(clerkFrontendOrigin(undefined)).toBeNull();
    expect(clerkFrontendOrigin("sk_live_abc")).toBeNull();
    expect(clerkFrontendOrigin("pk_live_" + Buffer.from("not a host").toString("base64"))).toBeNull();
  });
});
