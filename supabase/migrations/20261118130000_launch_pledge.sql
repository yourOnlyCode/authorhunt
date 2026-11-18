-- When the author made the no-AI pledge for a launch: every line of it is ticked before a launch is set, and
-- this is the record. Null only on launches made before the pledge existed. Safe to run twice.

ALTER TABLE "launches" ADD COLUMN IF NOT EXISTS "pledged_at" timestamp with time zone;
