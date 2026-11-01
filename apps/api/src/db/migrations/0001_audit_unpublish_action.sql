ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "ck_audit_log_action";

ALTER TABLE "audit_log" ADD CONSTRAINT "ck_audit_log_action" CHECK (action IN ('create', 'update', 'publish', 'archive', 'restore', 'unpublish', 'delete', 'upload', 'login_success', 'login_failed', 'logout', 'session_revoked', 'user_created', 'user_deactivated'));