/**
 * lib/db/schema/index.ts
 *
 * Every table Author Hunt has. docs/ontology.md is the dictionary for these
 * names: a table, column or state added here is added there in the same change.
 *
 * Conventions:
 * - Enumerations are text columns with a TypeScript union, not Postgres enums,
 *   so adding a value needs no ALTER TYPE (the mistake Lorec's AGENTS.md warns
 *   about: a missing enum value passes CI and fails in production).
 * - Genres, reference authors and platforms are lookup tables keyed by slug;
 *   a page or work lists the slugs it carries in a text[] column.
 * - Counts shown on pages (cheer_count, follower_count, momentum) are columns
 *   kept by the write path or the hourly job, never counted at read time.
 */

import { sql } from "drizzle-orm";
import {
  boolean, date, doublePrecision, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const slugs = (name: string) => text(name).array().notNull().default(sql`'{}'::text[]`);

export type Standing = "good" | "suspended" | "banned";
export type AiUse = "none" | "assisted" | "generated";
export type PageKind = "author" | "publication";
export type WorkKind = "book" | "short" | "serial" | "issue";
export type LaunchKind = "author" | "work";
export type LaunchStatus = "scheduled" | "live" | "closed" | "pulled";
export type LinkItem = { label: string; url: string };

/** One signed-in person. The id is the one Author Hunt's own Clerk application gives them. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  imageUrl: text("image_url"),
  standing: text("standing").$type<Standing>().notNull().default("good"),
  adultConfirmedAt: timestamp("adult_confirmed_at", { withTimezone: true }),
  alwaysShowNotes: boolean("always_show_notes").notNull().default(false),
  createdAt: createdAt(),
});

/** An author's (or a publication's) page. One per account. */
export const authors = pgTable("authors", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").$type<PageKind>().notNull().default("author"),
  handle: text("handle").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  bio: text("bio").notNull().default(""),
  portraitUrl: text("portrait_url"),
  city: text("city"),
  region: text("region"),
  country: text("country"),
  citySlug: text("city_slug"),
  website: text("website"),
  links: jsonb("links").$type<LinkItem[]>().notNull().default([]),
  supportUrl: text("support_url"),
  siteVerifiedAt: timestamp("site_verified_at", { withTimezone: true }),
  genres: slugs("genres"),
  readersOf: slugs("readers_of"),
  inspiredBy: slugs("inspired_by"),
  aiUse: text("ai_use").$type<AiUse>(),
  aiDeclaredAt: timestamp("ai_declared_at", { withTimezone: true }),
  mature: boolean("mature").notNull().default(false),
  standing: text("standing").$type<Standing>().notNull().default("good"),
  claimState: text("claim_state").$type<"claimed" | "unclaimed" | "pending">().notNull().default("claimed"),
  founding: boolean("founding").notNull().default(false),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  momentum: doublePrecision("momentum").notNull().default(0),
  followerCount: integer("follower_count").notNull().default(0),
  /** Null until the page has its AI declaration and the author makes it public. */
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("authors_handle_key").on(t.handle),
  uniqueIndex("authors_user_key").on(t.userId),
  index("authors_momentum_idx").on(t.momentum),
  index("authors_city_idx").on(t.citySlug),
]);

/** One thing an author launches: a book, a short work, a serial, an issue. */
export const works = pgTable("works", {
  id: id(),
  authorId: uuid("author_id").notNull().references(() => authors.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  kind: text("kind").$type<WorkKind>().notNull().default("book"),
  /** The specific word the page shows: "A novel", "A chapbook", "Issue 12". */
  form: text("form").notNull().default("A book"),
  title: text("title").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  excerpt: text("excerpt").notNull().default(""),
  coverUrl: text("cover_url"),
  /** A flat colour for a work with no cover yet, so it never shows a grey box. */
  coverColor: text("cover_color").notNull().default("#1F3A5C"),
  gallery: jsonb("gallery").$type<{ url: string; caption: string }[]>().notNull().default([]),
  pubDate: date("pub_date"),
  pages: integer("pages"),
  isbn: text("isbn"),
  buyLinks: jsonb("buy_links").$type<LinkItem[]>().notNull().default([]),
  genres: slugs("genres"),
  platforms: slugs("platforms"),
  aiUse: text("ai_use").$type<AiUse>(),
  mature: boolean("mature").notNull().default(false),
  contentNotes: slugs("content_notes"),
  contentNoteText: text("content_note_text").notNull().default(""),
  madeWithLorec: boolean("made_with_lorec").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("works_slug_key").on(t.slug),
  index("works_author_idx").on(t.authorId),
]);

/** An author page or a work put on one day's board. */
export const launches = pgTable("launches", {
  id: id(),
  kind: text("kind").$type<LaunchKind>().notNull(),
  authorId: uuid("author_id").notNull().references(() => authors.id, { onDelete: "cascade" }),
  workId: uuid("work_id").references(() => works.id, { onDelete: "cascade" }),
  /** A calendar date in America/New_York. lib/ranking/day.ts is the only place that makes one. */
  launchDay: date("launch_day").notNull(),
  status: text("status").$type<LaunchStatus>().notNull().default("scheduled"),
  cheerCount: integer("cheer_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  score: doublePrecision("score").notNull().default(0),
  rankDay: integer("rank_day"),
  createdAt: createdAt(),
}, (t) => [
  index("launches_day_score_idx").on(t.launchDay, t.score),
  index("launches_author_idx").on(t.authorId),
  uniqueIndex("launches_work_key").on(t.workId),
]);

export const cheers = pgTable("cheers", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  launchId: uuid("launch_id").notNull().references(() => launches.id, { onDelete: "cascade" }),
  weight: real("weight").notNull().default(1),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.launchId] }), index("cheers_launch_idx").on(t.launchId)]);

export const follows = pgTable("follows", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => authors.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.authorId] }), index("follows_author_idx").on(t.authorId)]);

export const comments = pgTable("comments", {
  id: id(),
  launchId: uuid("launch_id").notNull().references(() => launches.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  body: text("body").notNull(),
  cheerCount: integer("cheer_count").notNull().default(0),
  pinned: boolean("pinned").notNull().default(false),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("comments_launch_idx").on(t.launchId)]);

export const commentCheers = pgTable("comment_cheers", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.commentId] })]);

export const updates = pgTable("updates", {
  id: id(),
  authorId: uuid("author_id").notNull().references(() => authors.id, { onDelete: "cascade" }),
  workId: uuid("work_id").references(() => works.id, { onDelete: "set null" }),
  kind: text("kind").$type<"progress" | "cover" | "event" | "excerpt" | "news">().notNull().default("news"),
  body: text("body").notNull(),
  createdAt: createdAt(),
}, (t) => [index("updates_author_idx").on(t.authorId)]);

export const collections = pgTable("collections", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("collections_user_slug_key").on(t.userId, t.slug)]);

/** Exactly one of authorId and workId is set. */
export const collectionItems = pgTable("collection_items", {
  id: id(),
  collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => authors.id, { onDelete: "cascade" }),
  workId: uuid("work_id").references(() => works.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("collection_items_author_key").on(t.collectionId, t.authorId),
  uniqueIndex("collection_items_work_key").on(t.collectionId, t.workId),
]);

export const genres = pgTable("genres", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  parent: text("parent"),
});

/** A well-known writer used as a signpost. Has no account and no page of their own. */
export const referenceAuthors = pgTable("reference_authors", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  /** A name an author typed in is usable at once and gets its public page once an admin approves it. */
  approved: boolean("approved").notNull().default(false),
});

export const platforms = pgTable("platforms", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  /** Lorec's row exists and stays hidden until its publishing is ready. */
  hidden: boolean("hidden").notNull().default(false),
});

/** The append-only ledger Momentum is computed from. */
export const pointEvents = pgTable("point_events", {
  id: id(),
  authorId: uuid("author_id").notNull().references(() => authors.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  points: real("points").notNull(),
  /** What the event was about, so a limit ("one a day") can be checked. */
  subject: text("subject"),
  createdAt: createdAt(),
}, (t) => [index("point_events_author_idx").on(t.authorId, t.createdAt)]);

export const subscriptions = pgTable("subscriptions", {
  authorId: uuid("author_id").primaryKey().references(() => authors.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("incomplete"),
  interval: text("interval").$type<"month" | "year">(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("subscriptions_customer_key").on(t.stripeCustomerId)]);

export const comps = pgTable("comps", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").$type<"admin" | "founding">().notNull(),
  until: timestamp("until", { withTimezone: true }),
  createdAt: createdAt(),
});

export type ReportTarget = "launch" | "author" | "work" | "comment" | "collection" | "image";
export const reports = pgTable("reports", {
  id: id(),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetKind: text("target_kind").$type<ReportTarget>().notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  note: text("note").notNull().default(""),
  status: text("status").$type<"open" | "decided">().notNull().default("open"),
  decision: text("decision"),
  decidedBy: text("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("reports_status_idx").on(t.status, t.createdAt)]);

/** Every moderation step, append-only: who, what, about what, and why. */
export const moderationLog = pgTable("moderation_log", {
  id: id(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  targetKind: text("target_kind").notNull(),
  targetId: text("target_id").notNull(),
  note: text("note").notNull().default(""),
  createdAt: createdAt(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  href: text("href").notNull().default("/"),
  /** Notifications that share a key within a day are shown and mailed as one. */
  groupKey: text("group_key"),
  readAt: timestamp("read_at", { withTimezone: true }),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]);

export const notificationPrefs = pgTable("notification_prefs", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  bell: boolean("bell").notNull().default(true),
  email: boolean("email").notNull().default(true),
}, (t) => [primaryKey({ columns: [t.userId, t.kind] })]);

/** "Tell me when it launches", from an account or a bare address. */
export const notifyRequests = pgTable("notify_requests", {
  id: id(),
  launchId: uuid("launch_id").notNull().references(() => launches.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: text("email"),
  createdAt: createdAt(),
}, (t) => [index("notify_requests_launch_idx").on(t.launchId)]);

/** Addresses collected by the splash page before opening (docs/launch.md). */
export const waitlist = pgTable("waitlist", {
  id: id(),
  email: text("email").notNull(),
  kind: text("kind").$type<"author" | "reader">().notNull().default("reader"),
  token: text("token").notNull(),
  src: text("src"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  remindedAt: timestamp("reminded_at", { withTimezone: true }),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("waitlist_email_key").on(t.email), uniqueIndex("waitlist_token_key").on(t.token)]);

/** The Sunday letter's readers who have no account. */
export const letterSubscribers = pgTable("letter_subscribers", {
  email: text("email").primaryKey(),
  token: text("token").notNull(),
  genres: slugs("genres"),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const images = pgTable("images", {
  id: id(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"portrait" | "cover" | "gallery">().notNull(),
  url: text("url").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: integer("bytes").notNull(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** The site's own page analytics: a view or an outbound click, no cookie. */
export const siteEvents = pgTable("site_events", {
  id: id(),
  kind: text("kind").$type<"view" | "click">().notNull(),
  path: text("path").notNull(),
  target: text("target"),
  via: text("via"),
  authorId: uuid("author_id"),
  day: date("day").notNull(),
  createdAt: createdAt(),
}, (t) => [index("site_events_author_idx").on(t.authorId, t.day)]);

export type User = typeof users.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type Work = typeof works.$inferSelect;
export type Launch = typeof launches.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Collection = typeof collections.$inferSelect;
