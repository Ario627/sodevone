CREATE TABLE "site_contributor" (
        "id" uuid PRIMARY KEY NOT NULL,
        "name" varchar(80) NOT NULL,
        "nickname" varchar(32) NOT NULL,
        "role" varchar(80) NOT NULL,
        "class_name" varchar(40) NOT NULL,
        "summary" varchar(400) NOT NULL,
        "focuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
        "tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
        "is_published" boolean DEFAULT true NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "ck_site_contributor_sort_order" CHECK (sort_order >= 0),
        CONSTRAINT "ck_site_contributor_focuses_array" CHECK (jsonb_typeof(focuses) = 'array'),
        CONSTRAINT "ck_site_contributor_tools_array" CHECK (jsonb_typeof(tools) = 'array'),
        CONSTRAINT "ck_site_contributor_summary" CHECK (char_length(btrim(summary)) >= 10)
);