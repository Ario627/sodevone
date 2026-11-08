CREATE TABLE "social_link" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "platform" text NOT NULL,
        "url" text NOT NULL,
        "caption" varchar(280),
        "posted_at" timestamp with time zone,
        "image_id" uuid,
        "image_url" text,
        "image_width" integer,
        "image_height" integer,
        "alt_text" varchar(200),
        "sort_order" integer DEFAULT 0 NOT NULL,
        "is_visible" boolean DEFAULT true NOT NULL,
        "created_by" uuid NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_social_link_platform" CHECK (platform IN ('instagram', 'tiktok')),
        CONSTRAINT "ck_social_link_url_https" CHECK (url ~ '^https://'),
        CONSTRAINT "ck_social_link_image_url_https" CHECK (image_url IS NULL OR image_url ~ '^https://'),
        CONSTRAINT "ck_social_link_single_image" CHECK (image_id IS NULL OR image_url IS NULL),
        CONSTRAINT "ck_social_link_image_dimensions" CHECK (
                image_url IS NULL
                OR (
                        image_width IS NOT NULL
                        AND image_height IS NOT NULL
                        AND image_width BETWEEN 1 AND 6000
                        AND image_height BETWEEN 1 AND 6000
                )
        ),
        CONSTRAINT "ck_social_link_sort_order" CHECK (sort_order >= 0),
        CONSTRAINT "ck_social_link_caption_length" CHECK (caption IS NULL OR char_length(caption) BETWEEN 1 AND 280),
        CONSTRAINT "ck_social_link_alt_text_length" CHECK (alt_text IS NULL OR char_length(alt_text) BETWEEN 1 AND 200)
);

ALTER TABLE "social_link" ADD CONSTRAINT "social_link_image_id_gallery_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "gallery_image"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "social_link" ADD CONSTRAINT "social_link_created_by_admin_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE restrict ON UPDATE no action;

CREATE INDEX "idx_social_link_public" ON "social_link" USING btree ("is_visible", "sort_order", "id");

CREATE INDEX "idx_social_link_platform" ON "social_link" USING btree ("platform");