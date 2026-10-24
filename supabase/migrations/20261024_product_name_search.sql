-- Support substring name searches without changing public visibility policies.
BEGIN;
SET LOCAL search_path = public, extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS product_translations_name_trgm_idx
    ON public.product_translations USING gin (name gin_trgm_ops);
COMMIT;
