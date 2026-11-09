ALTER TABLE "class_member" DROP CONSTRAINT IF EXISTS "ck_class_member_full_name";

ALTER TABLE "class_member" ADD CONSTRAINT "ck_class_member_full_name" CHECK (is_published = false OR char_length(btrim(full_name)) >= 2);

ALTER TABLE "class_member" DROP CONSTRAINT IF EXISTS "ck_class_member_nickname";

ALTER TABLE "class_member" ADD CONSTRAINT "ck_class_member_nickname" CHECK (is_published = false OR char_length(btrim(nickname)) >= 2);

ALTER TABLE "class_member" DROP CONSTRAINT IF EXISTS "ck_class_member_hobby";

ALTER TABLE "class_member" ADD CONSTRAINT "ck_class_member_hobby" CHECK (is_published = false OR char_length(btrim(hobby)) >= 2);

ALTER TABLE "class_member" DROP CONSTRAINT IF EXISTS "ck_class_member_note";

ALTER TABLE "class_member" ADD CONSTRAINT "ck_class_member_note" CHECK (is_published = false OR char_length(btrim(note)) >= 2);