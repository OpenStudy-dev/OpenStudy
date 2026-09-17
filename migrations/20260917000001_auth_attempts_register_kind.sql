-- Allow kind='register' so /oauth/register (RFC 7591 DCR) can share the
-- per-IP rate limiter. Registration is intentionally unauthenticated (MCP
-- spec requirement) so it needs a write-rate bound of its own.
BEGIN;

ALTER TABLE public.auth_attempts DROP CONSTRAINT auth_attempts_kind_check;
ALTER TABLE public.auth_attempts
    ADD CONSTRAINT auth_attempts_kind_check
    CHECK (kind IN ('login', 'signup', 'reset', 'register'));

COMMIT;
