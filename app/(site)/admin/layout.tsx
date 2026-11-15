/**
 * app/(site)/admin/layout.tsx
 *
 * Every admin page is for the owner only and is kept out of search. The gate
 * is here and again in each page, since a layout isn't rendered again when
 * someone moves between its pages. Anyone else gets the site's 404.
 */

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
