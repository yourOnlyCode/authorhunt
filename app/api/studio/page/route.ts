/**
 * PUT /api/studio/page
 *
 * Makes or changes the signed-in person's own page. Making a page is free and
 * asks for no membership (AGENTS.md rule 3). Two things here are member
 * tools and are checked on the server: showing a Support link, and more than
 * five links. With `publish: true` the page is also made public, which is
 * refused with the list of what's missing until the checklist is complete,
 * the AI declaration included (rule 7).
 */

import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { awardPoints } from "@/lib/actions/points";
import { fail, json } from "@/lib/api";
import { FREE_LINK_LIMIT, trialEnd } from "@/lib/billing/access";
import { isMember } from "@/lib/billing/server";
import { db } from "@/lib/db";
import { authors, genres, moderationLog, referenceAuthors, works, type Author, type LinkItem } from "@/lib/db/schema";
import { removeImages } from "@/lib/images/store";
import { forgetLookups } from "@/lib/queries/lookups";
import { safeUrl, supportUrlAllowed } from "@/lib/seo/links";
import { slugify, validHandle } from "@/lib/slug";
import { AI_VALUES, LIMITS, missingFrom, pageChecklist } from "@/lib/studio/rules";
import { ownImages, readInput, studioViewer } from "@/lib/studio/server";

const line = (max: number) => z.string().trim().max(max, `Keep that under ${max} characters.`);

const Body = z.object({
  name: z.string().trim().min(1, "Your page needs a name.").max(80),
  handle: z.string().trim().toLowerCase(),
  kind: z.enum(["author", "publication"]).default("author"),
  tagline: line(140).default(""),
  bio: line(4000).default(""),
  portraitUrl: z.string().nullable().default(null),
  city: line(80).default(""),
  region: line(80).default(""),
  country: line(80).default(""),
  website: line(300).default(""),
  links: z.array(z.object({ label: line(40), url: line(300) })).max(LIMITS.memberLinks).default([]),
  genres: z.array(z.string()).max(LIMITS.genres, `Choose up to ${LIMITS.genres} genres.`).default([]),
  readersOf: z.array(line(80)).max(LIMITS.references, `Up to ${LIMITS.references} names.`).default([]),
  inspiredBy: z.array(line(80)).max(LIMITS.references, `Up to ${LIMITS.references} names.`).default([]),
  mature: z.boolean().default(false),
  aiUse: z.enum(AI_VALUES).nullable().default(null),
  supportUrl: line(300).default(""),
  publish: z.boolean().default(false),
});

/** Each entry is a known writer's slug or a name typed in. A new name is usable at once and waits for an admin before it has a public page. */
async function referenceSlugs(entries: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const raw of entries) {
    const name = raw.trim();
    const slug = slugify(name);
    if (!slug || out.includes(slug)) continue;
    const [known] = await db.select().from(referenceAuthors).where(inArray(referenceAuthors.slug, [name, slug])).limit(1);
    if (known) { if (!out.includes(known.slug)) out.push(known.slug); continue; }
    await db.insert(referenceAuthors).values({ slug, name, approved: false }).onConflictDoNothing();
    forgetLookups();
    out.push(slug);
  }
  return out;
}

export async function PUT(req: Request) {
  const who = await studioViewer(req, { name: "studio-page", max: 40, windowSec: 60 });
  if ("response" in who) return who.response;
  const { viewer, author: existing } = who;
  const body = await readInput(req, Body);
  if ("response" in body) return body.response;
  const d = body.data;
  const now = new Date();

  // The handle is the page's address: fixed once the page is public, so links to it keep working.
  if (existing?.publishedAt && d.handle !== existing.handle) return fail(400, "A public page keeps its address. The handle can't be changed now.");
  if (d.handle !== existing?.handle) {
    if (!validHandle(d.handle)) return fail(400, "A handle is 3 to 32 lowercase letters, digits or hyphens, and can't be a word the site uses.");
    const [taken] = await db.select({ id: authors.id }).from(authors).where(and(eq(authors.handle, d.handle), ne(authors.userId, viewer.id))).limit(1);
    if (taken) return fail(409, "That handle is taken. Try another.");
  }

  const website = d.website ? safeUrl(d.website) : null;
  if (d.website && !website) return fail(400, "That website address couldn't be read.");

  const links: LinkItem[] = [];
  for (const l of d.links) {
    if (!l.label && !l.url) continue;
    const url = safeUrl(l.url);
    if (!url) return fail(400, `The link "${l.label || l.url}" needs a full web address.`);
    links.push({ label: l.label || new URL(url).hostname.replace(/^www\./, ""), url });
  }

  // Member tools, decided on the server. A free page keeps what it already shows and is never blocked from saving the rest.
  const member = existing ? await isMember(existing, now) : true; // a new page starts its thirty days now
  const linkLimit = member ? LIMITS.memberLinks : Math.max(FREE_LINK_LIMIT, existing?.links.length ?? 0);
  if (links.length > linkLimit) return fail(403, `A page has ${FREE_LINK_LIMIT} links without a membership. More than that is a member tool.`);
  let supportUrl = existing?.supportUrl ?? null;
  const wantedSupport = d.supportUrl ? safeUrl(d.supportUrl) : null;
  if (member) {
    if (d.supportUrl && (!wantedSupport || !supportUrlAllowed(d.supportUrl))) return fail(400, "A Support link has to be on a service we recognise: Ko-fi, Buy Me a Coffee, PayPal, Patreon, Venmo, Cash App, Liberapay, GitHub Sponsors or a Stripe payment link.");
    supportUrl = wantedSupport;
  } else if (wantedSupport && wantedSupport !== supportUrl) {
    return fail(403, "Showing a Support link is a member tool.");
  }

  const knownGenres = d.genres.length ? await db.select({ slug: genres.slug }).from(genres).where(inArray(genres.slug, d.genres)) : [];
  const genreSlugs = d.genres.filter((g, i) => knownGenres.some((k) => k.slug === g) && d.genres.indexOf(g) === i);
  if (genreSlugs.length !== d.genres.length) return fail(400, "One of those genres isn't on the list.");

  let portraitUrl = existing?.portraitUrl ?? null;
  if (d.portraitUrl !== portraitUrl) {
    if (d.portraitUrl && !(await ownImages(viewer.id, [d.portraitUrl])).has(d.portraitUrl)) return fail(400, "That portrait isn't one you uploaded.");
    portraitUrl = d.portraitUrl;
  }

  const [readersOf, inspiredBy] = [await referenceSlugs(d.readersOf), await referenceSlugs(d.inspiredBy)];

  const values = {
    name: d.name, handle: d.handle, kind: d.kind, tagline: d.tagline, bio: d.bio, portraitUrl,
    city: d.city || null, region: d.region || null, country: d.country || null,
    citySlug: d.city ? slugify(`${d.city} ${d.region}`) : null,
    website, links, supportUrl, genres: genreSlugs, readersOf, inspiredBy, mature: d.mature,
    // The declaration can be changed but not taken back once made: a public page always has one.
    aiUse: d.aiUse ?? existing?.aiUse ?? null,
    aiDeclaredAt: d.aiUse && d.aiUse !== existing?.aiUse ? now : existing?.aiDeclaredAt ?? null,
    // A verified site was verified for that address and that handle. Change either and it has to be checked again.
    siteVerifiedAt: existing && existing.website === website && existing.handle === d.handle ? existing.siteVerifiedAt : null,
  };

  const [anyWork] = existing ? await db.select({ id: works.id }).from(works).where(eq(works.authorId, existing.id)).limit(1) : [];
  // A public page stays whole: a change that would leave it without something it needed to go public is refused.
  if (existing?.publishedAt) {
    const gone = missingFrom(pageChecklist(values, anyWork ? 1 : 0));
    if (gone.length > 0) return fail(400, `A public page needs: ${gone.join("; ")}.`);
  }

  let saved: Author;
  try {
    const rows = existing
      ? await db.update(authors).set(values).where(eq(authors.id, existing.id)).returning()
      : await db.insert(authors).values({ ...values, userId: viewer.id, trialEndsAt: trialEnd(now) }).returning();
    saved = rows[0]!;
  } catch (e) {
    // Two people asking for one handle at the same moment: the unique index decides.
    if (/authors_handle_key|duplicate key/.test(String((e as { message?: string })?.message ?? e) + String((e as { cause?: unknown })?.cause ?? ""))) return fail(409, "That handle is taken. Try another.");
    throw e;
  }

  if (existing?.portraitUrl && existing.portraitUrl !== saved.portraitUrl) await removeImages(viewer.id, [existing.portraitUrl]);
  // A changed declaration is kept on record (docs/development.md, The AI declaration).
  if (existing?.aiUse && saved.aiUse !== existing.aiUse) {
    await db.insert(moderationLog).values({ actorId: viewer.id, action: "declaration_changed", targetKind: "author", targetId: saved.id, note: `${existing.aiUse} to ${saved.aiUse}` });
  }

  const checklist = pageChecklist(saved, anyWork ? 1 : 0);
  const missing = missingFrom(checklist);

  if (d.publish && !saved.publishedAt) {
    if (saved.standing !== "good") return json({ author: saved, checklist, saved: true, error: "Your page is under review, so it can't be made public until that's decided." }, 403);
    if (missing.length > 0) return json({ author: saved, checklist, saved: true, missing, error: `Saved, but not public yet. Still needed: ${missing.join("; ")}.` }, 422);
    saved = (await db.update(authors).set({ publishedAt: now }).where(eq(authors.id, saved.id)).returning())[0]!;
    await awardPoints(saved.id, "finish_page", { now, subject: saved.id });
  }

  return json({ author: saved, checklist, saved: true, created: !existing });
}
