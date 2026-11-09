ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "ck_audit_log_action";

ALTER TABLE "audit_log" ADD CONSTRAINT "ck_audit_log_action" CHECK (action IN ('create', 'update', 'publish', 'archive', 'restore', 'unpublish', 'pin', 'unpin', 'delete', 'upload', 'login_success', 'login_failed', 'logout', 'session_revoked', 'user_created', 'user_deactivated'));

ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "ck_audit_log_entity_type";

ALTER TABLE "audit_log" ADD CONSTRAINT "ck_audit_log_entity_type" CHECK (entity_type IN ('announcement', 'event', 'album', 'image', 'user', 'session', 'social', 'member', 'contributor', 'attachment', 'setting'));