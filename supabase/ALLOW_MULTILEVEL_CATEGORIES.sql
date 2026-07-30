-- =====================================================
-- ALLOW MULTI-LEVEL CATEGORIES
-- =====================================================
-- Removes the fixed 2-level restriction on categories and replaces it with a
-- cycle-prevention guard, so the category tree can nest to any depth
-- (adjacency list via parent_id, like onex-erp).
--
-- Run this in the Supabase SQL Editor AFTER ADD_CATEGORIES_AND_BRANDS.sql.
-- Idempotent.
-- =====================================================

-- 1) Drop the old 2-level enforcement
DROP TRIGGER IF EXISTS trg_category_two_levels ON public.categories;
DROP FUNCTION IF EXISTS enforce_category_two_levels();

-- 2) Cycle-prevention guard: a category may not become its own ancestor.
--    Unlimited nesting is allowed; only loops are rejected.
CREATE OR REPLACE FUNCTION enforce_category_no_cycle()
RETURNS TRIGGER AS $$
DECLARE
    is_cycle BOOLEAN;
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF NEW.parent_id = NEW.id THEN
            RAISE EXCEPTION 'A category cannot be its own parent';
        END IF;

        -- Walk up the ancestor chain from the chosen parent; if we ever reach
        -- NEW.id, assigning this parent would create a cycle.
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id FROM public.categories WHERE id = NEW.parent_id
            UNION ALL
            SELECT c.id, c.parent_id
            FROM public.categories c
            JOIN ancestors a ON c.id = a.parent_id
        )
        SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id) INTO is_cycle;

        IF is_cycle THEN
            RAISE EXCEPTION 'Category cannot be moved under its own descendant (would create a cycle)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_no_cycle ON public.categories;
CREATE TRIGGER trg_category_no_cycle
    BEFORE INSERT OR UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION enforce_category_no_cycle();
