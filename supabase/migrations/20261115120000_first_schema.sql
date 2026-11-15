-- 20261115120000_first_schema.sql
-- Every table Author Hunt starts with (lib/db/schema/index.ts). Safe to run twice.
-- Row level security is on for every table with no policy, so nothing is readable
-- through Supabase's public API: the app reads and writes on the server only, as the
-- table owner. requesting_user_id() is here for the day a policy is wanted.

CREATE TABLE IF NOT EXISTS "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'author' NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"portrait_url" text,
	"city" text,
	"region" text,
	"country" text,
	"city_slug" text,
	"website" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"support_url" text,
	"site_verified_at" timestamp with time zone,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"readers_of" text[] DEFAULT '{}'::text[] NOT NULL,
	"inspired_by" text[] DEFAULT '{}'::text[] NOT NULL,
	"ai_use" text,
	"ai_declared_at" timestamp with time zone,
	"mature" boolean DEFAULT false NOT NULL,
	"standing" text DEFAULT 'good' NOT NULL,
	"claim_state" text DEFAULT 'claimed' NOT NULL,
	"founding" boolean DEFAULT false NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"momentum" double precision DEFAULT 0 NOT NULL,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "cheers" (
	"user_id" text NOT NULL,
	"launch_id" uuid NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cheers_user_id_launch_id_pk" PRIMARY KEY("user_id","launch_id")
);
CREATE TABLE IF NOT EXISTS "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"author_id" uuid,
	"work_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "comment_cheers" (
	"user_id" text NOT NULL,
	"comment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_cheers_user_id_comment_id_pk" PRIMARY KEY("user_id","comment_id")
);
CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"launch_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"cheer_count" integer DEFAULT 0 NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"hidden_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "comps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "follows" (
	"user_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_user_id_author_id_pk" PRIMARY KEY("user_id","author_id")
);
CREATE TABLE IF NOT EXISTS "genres" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent" text
);
CREATE TABLE IF NOT EXISTS "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "launches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"author_id" uuid NOT NULL,
	"work_id" uuid,
	"launch_day" date NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"cheer_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"score" double precision DEFAULT 0 NOT NULL,
	"rank_day" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "letter_subscribers" (
	"email" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "moderation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "notification_prefs" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"bell" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT true NOT NULL,
	CONSTRAINT "notification_prefs_user_id_kind_pk" PRIMARY KEY("user_id","kind")
);
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text DEFAULT '/' NOT NULL,
	"group_key" text,
	"read_at" timestamp with time zone,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "notify_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"launch_id" uuid NOT NULL,
	"user_id" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "platforms" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS "point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"points" real NOT NULL,
	"subject" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "reference_authors" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"decision" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "site_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"path" text NOT NULL,
	"target" text,
	"via" text,
	"author_id" uuid,
	"day" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"author_id" uuid PRIMARY KEY NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"interval" text,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"work_id" uuid,
	"kind" text DEFAULT 'news' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"image_url" text,
	"standing" text DEFAULT 'good' NOT NULL,
	"adult_confirmed_at" timestamp with time zone,
	"always_show_notes" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"kind" text DEFAULT 'reader' NOT NULL,
	"token" text NOT NULL,
	"src" text,
	"confirmed_at" timestamp with time zone,
	"reminded_at" timestamp with time zone,
	"invited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'book' NOT NULL,
	"form" text DEFAULT 'A book' NOT NULL,
	"title" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"cover_url" text,
	"cover_color" text DEFAULT '#1F3A5C' NOT NULL,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pub_date" date,
	"pages" integer,
	"isbn" text,
	"buy_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"ai_use" text,
	"mature" boolean DEFAULT false NOT NULL,
	"content_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"content_note_text" text DEFAULT '' NOT NULL,
	"made_with_lorec" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "authors" ADD CONSTRAINT "authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "cheers" ADD CONSTRAINT "cheers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "cheers" ADD CONSTRAINT "cheers_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comment_cheers" ADD CONSTRAINT "comment_cheers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comment_cheers" ADD CONSTRAINT "comment_cheers_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comps" ADD CONSTRAINT "comps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "follows" ADD CONSTRAINT "follows_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "images" ADD CONSTRAINT "images_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "launches" ADD CONSTRAINT "launches_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "launches" ADD CONSTRAINT "launches_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "notify_requests" ADD CONSTRAINT "notify_requests_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "notify_requests" ADD CONSTRAINT "notify_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "point_events" ADD CONSTRAINT "point_events_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "updates" ADD CONSTRAINT "updates_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "updates" ADD CONSTRAINT "updates_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "works" ADD CONSTRAINT "works_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "authors_handle_key" ON "authors" USING btree ("handle");
CREATE UNIQUE INDEX IF NOT EXISTS "authors_user_key" ON "authors" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "authors_momentum_idx" ON "authors" USING btree ("momentum");
CREATE INDEX IF NOT EXISTS "authors_city_idx" ON "authors" USING btree ("city_slug");
CREATE INDEX IF NOT EXISTS "cheers_launch_idx" ON "cheers" USING btree ("launch_id");
CREATE UNIQUE INDEX IF NOT EXISTS "collection_items_author_key" ON "collection_items" USING btree ("collection_id","author_id");
CREATE UNIQUE INDEX IF NOT EXISTS "collection_items_work_key" ON "collection_items" USING btree ("collection_id","work_id");
CREATE UNIQUE INDEX IF NOT EXISTS "collections_user_slug_key" ON "collections" USING btree ("user_id","slug");
CREATE INDEX IF NOT EXISTS "comments_launch_idx" ON "comments" USING btree ("launch_id");
CREATE INDEX IF NOT EXISTS "follows_author_idx" ON "follows" USING btree ("author_id");
CREATE INDEX IF NOT EXISTS "launches_day_score_idx" ON "launches" USING btree ("launch_day","score");
CREATE INDEX IF NOT EXISTS "launches_author_idx" ON "launches" USING btree ("author_id");
CREATE UNIQUE INDEX IF NOT EXISTS "launches_work_key" ON "launches" USING btree ("work_id");
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "notify_requests_launch_idx" ON "notify_requests" USING btree ("launch_id");
CREATE INDEX IF NOT EXISTS "point_events_author_idx" ON "point_events" USING btree ("author_id","created_at");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports" USING btree ("status","created_at");
CREATE INDEX IF NOT EXISTS "site_events_author_idx" ON "site_events" USING btree ("author_id","day");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_customer_key" ON "subscriptions" USING btree ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "updates_author_idx" ON "updates" USING btree ("author_id");
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_key" ON "waitlist" USING btree ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_token_key" ON "waitlist" USING btree ("token");
CREATE UNIQUE INDEX IF NOT EXISTS "works_slug_key" ON "works" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "works_author_idx" ON "works" USING btree ("author_id");

CREATE OR REPLACE FUNCTION requesting_user_id() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;
ALTER TABLE "authors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cheers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collection_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comment_cheers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "genres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "launches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "letter_subscribers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "moderation_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_prefs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notify_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platforms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "point_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_authors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "updates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "works" ENABLE ROW LEVEL SECURITY;
