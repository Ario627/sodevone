ALTER TABLE "announcements" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;

ALTER TABLE "announcements" ADD COLUMN "pinned_at" timestamp with time zone;

ALTER TABLE "announcements" ADD CONSTRAINT "ck_announcements_pinned_at_required" CHECK (is_pinned = false OR pinned_at IS NOT NULL);

DROP INDEX IF EXISTS "idx_announcements_public";

CREATE INDEX "idx_announcements_public" ON "announcements" USING btree ("is_pinned" DESC, "published_at" DESC) WHERE status = 'published';