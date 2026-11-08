ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "ck_audit_log_entity_type";

ALTER TABLE "audit_log" ADD CONSTRAINT "ck_audit_log_entity_type" CHECK (entity_type IN ('announcement', 'event', 'album', 'image', 'user', 'session', 'social'));