-- Enable Row Level Security on tables exposed through the Supabase Data API (PostgREST).
--
-- This app does NOT use the Supabase Data API: the backend accesses Postgres
-- directly via Prisma, which connects as the table owner and therefore bypasses
-- RLS. Tenant isolation is enforced in application code by scoping every query on
-- companyId (see crm-backend/CLAUDE.md), not by RLS policies.
--
-- Enabling RLS with NO policies makes the anon/authenticated PostgREST roles
-- deny-by-default on these tables, resolving the Supabase linter error
-- "rls_disabled_in_public" (0013) without affecting the backend. The pre-existing
-- tables already have RLS enabled; this brings the two newer tables in line.

ALTER TABLE "public"."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ConversationMute" ENABLE ROW LEVEL SECURITY;
