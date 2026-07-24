-- Enable pg_trgm extension for fast fuzzy substring search (ILIKE '%word%')
-- Requires: CREATE EXTENSION requires superuser or owner privileges (available on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes on name, city for admin leads search (used with ILIKE '%search%')
-- CONCURRENTLY = no table lock, safe for production
-- IF NOT EXISTS = idempotent, safe to re-run

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_name_trgm ON "Lead" USING gin (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_city_trgm ON "Lead" USING gin (city gin_trgm_ops);

-- Note: phone already has a B-tree index (@@index([phone, isDeleted]))
-- B-tree + ILIKE '%value%' can't use B-tree efficiently, but at 1M rows phone search
-- with index scan + sequential fallback is acceptable. Add if needed:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_phone_trgm ON "Lead" USING gin (phone gin_trgm_ops);