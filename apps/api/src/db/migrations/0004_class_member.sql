CREATE TABLE "class_member" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "role" text DEFAULT 'student' NOT NULL,
        "full_name" varchar(80) NOT NULL,
        "nickname" varchar(32) NOT NULL,
        "hobby" varchar(48) NOT NULL,
        "note" varchar(200) NOT NULL,
        "sort_order" integer NOT NULL,
        "is_published" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_class_member_role" CHECK (role IN ('student', 'homeroom')),
        CONSTRAINT "ck_class_member_sort_order" CHECK (sort_order >= 0),
        CONSTRAINT "ck_class_member_full_name" CHECK (char_length(btrim(full_name)) >= 2),
        CONSTRAINT "ck_class_member_nickname" CHECK (char_length(btrim(nickname)) >= 2),
        CONSTRAINT "ck_class_member_hobby" CHECK (char_length(btrim(hobby)) >= 2),
        CONSTRAINT "ck_class_member_note" CHECK (char_length(btrim(note)) >= 2)
);

CREATE INDEX "idx_class_member_public" ON "class_member" USING btree ("is_published", "sort_order");