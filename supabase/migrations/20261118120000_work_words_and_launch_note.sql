-- A work's length in words (a poem, an essay or a story isn't counted in pages), and the author's note on a
-- launch: what they say to readers about it, shown first on the launch page. Safe to run twice.

ALTER TABLE "works" ADD COLUMN IF NOT EXISTS "words" integer;
ALTER TABLE "launches" ADD COLUMN IF NOT EXISTS "note" text DEFAULT '' NOT NULL;
