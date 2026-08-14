-- =====================================================
-- ADD CATEGORIES & BRANDS + GENERALIZE PRODUCTS
-- =====================================================
-- Vintage Audio Accessories - store expansion migration
--
-- Adds a 2-level category taxonomy (parent -> child) and a brands table,
-- links each product to at most one category and one brand, and relaxes
-- the amp-specific NOT NULL columns so non-amplifier products can be sold.
--
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Safe to run once; uses IF NOT EXISTS where possible.
-- =====================================================

-- -----------------------------------------------------
-- BRANDS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,           -- display name (works for both locales; proper noun)
    name_en TEXT,                 -- optional English override
    description_vi TEXT,
    description_en TEXT,
    logo_path TEXT,               -- Supabase Storage path or external URL
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- CATEGORIES (2-level: parent -> child)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    name_vi TEXT NOT NULL,
    name_en TEXT,                 -- optional English override
    description_vi TEXT,
    description_en TEXT,
    image_path TEXT,              -- Supabase Storage path or external URL
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unlimited nesting (adjacency list). Only guard against cycles: a category
-- may not become its own ancestor.
CREATE OR REPLACE FUNCTION enforce_category_no_cycle()
RETURNS TRIGGER AS $$
DECLARE
    is_cycle BOOLEAN;
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF NEW.parent_id = NEW.id THEN
            RAISE EXCEPTION 'A category cannot be its own parent';
        END IF;
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

-- -----------------------------------------------------
-- PRODUCTS: link to category + brand, relax amp-only columns
-- -----------------------------------------------------
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- These were required when the store only sold tube amps. A general vintage
-- audio catalog has products (speakers, cables, tubes...) that don't have them.
ALTER TABLE public.products ALTER COLUMN topology DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN tube_type DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN power_watts DROP NOT NULL;

-- -----------------------------------------------------
-- INDEXES
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands(slug);

-- -----------------------------------------------------
-- updated_at TRIGGERS (reuse update_updated_at_column() from schema.sql)
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON public.brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- ROW LEVEL SECURITY
-- Public may read active rows; writes go through the service-role key
-- (which bypasses RLS), matching how products are managed today.
-- -----------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
CREATE POLICY "Anyone can view active categories" ON public.categories
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Anyone can view active brands" ON public.brands;
CREATE POLICY "Anyone can view active brands" ON public.brands
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
CREATE POLICY "Admins can manage brands" ON public.brands
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );
