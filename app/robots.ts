/**
 * app/robots.ts
 *
 * Everything public may be crawled (docs/development.md, Outbound links and
 * search). What is kept out is only what belongs to a signed-in person or is
 * not a page at all.
 */

import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/studio", "/settings", "/notifications", "/for-you", "/you", "/admin", "/sign-in", "/confirm", "/search"] }],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
