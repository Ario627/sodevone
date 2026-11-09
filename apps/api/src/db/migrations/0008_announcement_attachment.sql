CREATE TABLE "announcement_attachment" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "announcement_id" uuid NOT NULL,
        "kind" text NOT NULL,
        "storage_key" text NOT NULL,
        "file_name" varchar(160) NOT NULL,
        "mime_type" varchar(120) NOT NULL,
        "byte_size" integer NOT NULL,
        "width" integer,
        "height" integer,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_by" uuid NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_announcement_attachment_kind" CHECK (kind IN ('image', 'file')),
        CONSTRAINT "ck_announcement_attachment_size" CHECK (byte_size > 0 AND byte_size <= 5242880),
        CONSTRAINT "ck_announcement_attachment_sort_order" CHECK (sort_order >= 0),
        CONSTRAINT "ck_announcement_attachment_file_name" CHECK (char_length(btrim(file_name)) >= 1),
        CONSTRAINT "ck_announcement_attachment_shape" CHECK (
                (kind = 'image' AND width IS NOT NULL AND height IS NOT NULL AND mime_type = 'image/webp')
                OR (kind = 'file' AND width IS NULL AND height IS NULL AND mime_type = 'application/pdf')
        )
);

ALTER TABLE "announcement_attachment" ADD CONSTRAINT "announcement_attachment_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "announcement_attachment" ADD CONSTRAINT "announcement_attachment_created_by_admin_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE restrict ON UPDATE no action;

CREATE INDEX "idx_announcement_attachment_list" ON "announcement_attachment" USING btree ("announcement_id", "sort_order");

CREATE TABLE "announcement_attachment_blob" (
        "attachment_id" uuid PRIMARY KEY NOT NULL,
        "bytes" bytea NOT NULL
);

ALTER TABLE "announcement_attachment_blob" ADD CONSTRAINT "announcement_attachment_blob_attachment_id_announcement_attachment_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "announcement_attachment"("id") ON DELETE cascade ON UPDATE no action;