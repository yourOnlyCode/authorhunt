import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { genreRows, platformRows } from "@/lib/catalog";

// Production gets its genres and platforms from the migration, development from lib/catalog.ts.
// Every row in the list has to be in the migration, or the two would show different choices.
const migration = readFileSync("supabase/migrations/20261117120000_genres_and_platforms.sql", "utf8");
const q = (v: string) => `'${v.replace(/'/g, "''")}'`;

describe("the catalog", () => {
  it("has every genre in the migration", () => {
    for (const g of genreRows()) expect(migration).toContain(`(${q(g.slug)}, ${q(g.name)})`);
  });
  it("has every platform in the migration", () => {
    for (const p of platformRows()) expect(migration).toContain(`(${q(p.slug)}, ${q(p.name)}, ${p.hidden})`);
  });
  it("includes fan fiction, and where it's posted", () => {
    expect(genreRows().map((g) => g.slug)).toContain("fan-fiction");
    expect(platformRows().map((p) => p.slug)).toEqual(expect.arrayContaining(["archive-of-our-own", "fanfiction-net"]));
  });
  it("has no slug twice", () => {
    const slugs = genreRows().map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
