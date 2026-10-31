CREATE TABLE "admin_session" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "token_hash" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "revoked_at" timestamp with time zone,
        "ip_hash" text,
        "user_agent" varchar(255),
        CONSTRAINT "ck_admin_session_token_hash_length" CHECK (char_length(token_hash) = 64),
        CONSTRAINT "ck_admin_session_ip_hash_length" CHECK (ip_hash IS NULL OR char_length(ip_hash) = 64),
        CONSTRAINT "ck_admin_session_expires_after_created" CHECK (expires_at > created_at)
);

CREATE TABLE "admin_user" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "username" varchar(64) NOT NULL,
        "display_name" varchar(120) NOT NULL,
        "password_hash" text NOT NULL,
        "role" text DEFAULT 'editor' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "last_login_at" timestamp with time zone,
        CONSTRAINT "ck_admin_user_username_format" CHECK (username ~ '^[a-z0-9._-]{3,64}$'),
        CONSTRAINT "ck_admin_user_display_name_length" CHECK (char_length(display_name) >= 2),
        CONSTRAINT "ck_admin_user_role" CHECK (role IN ('admin', 'editor')),
        CONSTRAINT "ck_admin_user_password_argon2" CHECK (password_hash LIKE '$argon2%')
);

CREATE TABLE "announcements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "slug" varchar(120) NOT NULL,
        "title" varchar(160) NOT NULL,
        "excerpt" varchar(320) NOT NULL,
        "body" text NOT NULL,
        "category" text DEFAULT 'umum' NOT NULL,
        "status" text DEFAULT 'draft' NOT NULL,
        "visibility" text DEFAULT 'public' NOT NULL,
        "author_id" uuid NOT NULL,
        "published_at" timestamp with time zone,
        "version" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_announcements_version_positive" CHECK (version > 0),
        CONSTRAINT "ck_announcements_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
        CONSTRAINT "ck_announcements_title_length" CHECK (char_length(title) >= 3),
        CONSTRAINT "ck_announcements_body_length" CHECK (char_length(body) >= 1),
        CONSTRAINT "ck_announcements_category" CHECK (category IN ('akademik', 'kegiatan', 'administrasi', 'umum')),
        CONSTRAINT "ck_announcements_status" CHECK (status IN ('draft', 'published', 'archived')),
        CONSTRAINT "ck_announcements_visibility" CHECK (visibility IN ('public', 'internal')),
        CONSTRAINT "ck_announcements_published_at_required" CHECK (status = 'draft' OR published_at IS NOT NULL)
);

CREATE TABLE "audit_log" (
        "id" bigserial PRIMARY KEY NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "actor_id" uuid,
        "actor_label" varchar(120) NOT NULL,
        "action" text NOT NULL,
        "entity_type" text NOT NULL,
        "entity_id" uuid,
        "ip_hash" text,
        "correlation_id" varchar(64),
        CONSTRAINT "ck_audit_log_action" CHECK (action IN ('create', 'update', 'publish', 'archive', 'restore', 'delete', 'upload', 'login_success', 'login_failed', 'logout', 'session_revoked', 'user_created', 'user_deactivated')),
        CONSTRAINT "ck_audit_log_entity_type" CHECK (entity_type IN ('announcement', 'event', 'album', 'image', 'user', 'session')),
        CONSTRAINT "ck_audit_log_actor_label_length" CHECK (char_length(actor_label) >= 1),
        CONSTRAINT "ck_audit_log_ip_hash_length" CHECK (ip_hash IS NULL OR char_length(ip_hash) = 64)
);

CREATE TABLE "events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "slug" varchar(120) NOT NULL,
        "title" varchar(160) NOT NULL,
        "description" text,
        "location" varchar(200),
        "starts_at" timestamp with time zone NOT NULL,
        "ends_at" timestamp with time zone,
        "status" text DEFAULT 'draft' NOT NULL,
        "created_by" uuid NOT NULL,
        "version" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_events_version_positive" CHECK (version > 0),
        CONSTRAINT "ck_events_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
        CONSTRAINT "ck_events_title_length" CHECK (char_length(title) >= 3),
        CONSTRAINT "ck_events_status" CHECK (status IN ('draft', 'published', 'archived')),
        CONSTRAINT "ck_events_end_after_start" CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE "gallery_album" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "slug" varchar(120) NOT NULL,
        "title" varchar(160) NOT NULL,
        "description" text,
        "event_date" date NOT NULL,
        "status" text DEFAULT 'draft' NOT NULL,
        "cover_image_id" uuid,
        "created_by" uuid NOT NULL,
        "published_at" timestamp with time zone,
        "version" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_gallery_album_version_positive" CHECK (version > 0),
        CONSTRAINT "ck_gallery_album_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
        CONSTRAINT "ck_gallery_album_title_length" CHECK (char_length(title) >= 3),
        CONSTRAINT "ck_gallery_album_status" CHECK (status IN ('draft', 'published', 'archived')),
        CONSTRAINT "ck_gallery_album_published_at_required" CHECK (status = 'draft' OR published_at IS NOT NULL)
);

CREATE TABLE "gallery_image" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "album_id" uuid NOT NULL,
        "storage_key" varchar(200) NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "thumb_width" integer NOT NULL,
        "thumb_height" integer NOT NULL,
        "byte_size" integer NOT NULL,
        "mime_type" text NOT NULL,
        "alt_text" varchar(200),
        "caption" varchar(300),
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_gallery_image_dimensions" CHECK (width BETWEEN 1 AND 6000 AND height BETWEEN 1 AND 6000),
        CONSTRAINT "ck_gallery_image_thumb_dimensions" CHECK (thumb_width BETWEEN 1 AND 6000 AND thumb_height BETWEEN 1 AND 6000),
        CONSTRAINT "ck_gallery_image_byte_size" CHECK (byte_size BETWEEN 1 AND 5242880),
        CONSTRAINT "ck_gallery_image_mime_type" CHECK (mime_type IN ('image/webp', 'image/jpeg')),
        CONSTRAINT "ck_gallery_image_sort_order" CHECK (sort_order >= 0),
        CONSTRAINT "ck_gallery_image_alt_text_length" CHECK (alt_text IS NULL OR char_length(alt_text) BETWEEN 1 AND 200)
);
CREATE TABLE "slug_redirect" (
        "old_slug" varchar(120) PRIMARY KEY NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" uuid NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_slug_redirect_resource_type" CHECK (resource_type IN ('announcement', 'album', 'event')),
        CONSTRAINT "ck_slug_redirect_slug_format" CHECK (old_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_user_id_admin_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_admin_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."admin_user"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_admin_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_user"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "gallery_album" ADD CONSTRAINT "gallery_album_cover_image_id_gallery_image_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."gallery_image"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "gallery_album" ADD CONSTRAINT "gallery_album_created_by_admin_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_user"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "gallery_image" ADD CONSTRAINT "gallery_image_album_id_gallery_album_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."gallery_album"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "uq_admin_session_token_hash" ON "admin_session" USING btree ("token_hash");
CREATE INDEX "idx_admin_session_user" ON "admin_session" USING btree ("user_id");
CREATE INDEX "idx_admin_session_expires" ON "admin_session" USING btree ("expires_at");
CREATE UNIQUE INDEX "uq_admin_user_username" ON "admin_user" USING btree ("username");
CREATE INDEX "idx_admin_user_active" ON "admin_user" USING btree ("is_active") WHERE is_active;
CREATE UNIQUE INDEX "uq_announcements_slug" ON "announcements" USING btree ("slug");
CREATE INDEX "idx_announcements_public" ON "announcements" USING btree ("status","published_at" DESC NULLS LAST) WHERE status = 'published';
CREATE INDEX "idx_announcements_category_public" ON "announcements" USING btree ("category","published_at" DESC NULLS LAST) WHERE status = 'published';
CREATE INDEX "idx_announcements_admin" ON "announcements" USING btree ("status","updated_at" DESC NULLS LAST);
CREATE INDEX "idx_announcements_author" ON "announcements" USING btree ("author_id");
CREATE INDEX "idx_audit_created" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);
CREATE INDEX "idx_audit_actor" ON "audit_log" USING btree ("actor_id","created_at" DESC NULLS LAST);
CREATE INDEX "idx_audit_entity" ON "audit_log" USING btree ("entity_type","entity_id");
CREATE UNIQUE INDEX "uq_events_slug" ON "events" USING btree ("slug");
CREATE INDEX "idx_events_public" ON "events" USING btree ("starts_at") WHERE status = 'published';
CREATE INDEX "idx_events_admin" ON "events" USING btree ("status","updated_at" DESC NULLS LAST);
CREATE UNIQUE INDEX "uq_gallery_album_slug" ON "gallery_album" USING btree ("slug");
CREATE INDEX "idx_gallery_album_public" ON "gallery_album" USING btree ("event_date" DESC NULLS LAST) WHERE status = 'published';
CREATE INDEX "idx_gallery_album_admin" ON "gallery_album" USING btree ("status","updated_at" DESC NULLS LAST);
CREATE UNIQUE INDEX "uq_gallery_image_storage_key" ON "gallery_image" USING btree ("storage_key");
CREATE INDEX "idx_gallery_image_album" ON "gallery_image" USING btree ("album_id","sort_order","id");
CREATE INDEX "idx_slug_redirect_resource" ON "slug_redirect" USING btree ("resource_type","resource_id");
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_admin_user_updated_at BEFORE UPDATE ON "admin_user" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON "announcements" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON "events" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_gallery_album_updated_at BEFORE UPDATE ON "gallery_album" FOR EACH ROW EXECUTE FUNCTION set_updated_at();