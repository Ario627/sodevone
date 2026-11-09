CREATE TABLE "site_setting" (
        "key" text PRIMARY KEY NOT NULL,
        "value" jsonb NOT NULL,
        "updated_by" uuid,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_site_setting_object" CHECK (jsonb_typeof(value) = 'object'),
        CONSTRAINT "ck_site_setting_key_length" CHECK (char_length(key) BETWEEN 1 AND 60)
);

ALTER TABLE "site_setting" ADD CONSTRAINT "site_setting_updated_by_admin_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "admin_user"("id") ON DELETE set null ON UPDATE no action;