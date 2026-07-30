-- =====================================================
-- ADD PRODUCT SHIPPING WEIGHT & DIMENSIONS
-- =====================================================
-- Marketplaces (Shopee / TikTok Shop / Lazada) require a shipping weight and
-- usually package dimensions to compute shipping fees. Store them on products
-- so the CSV export can feed those platforms' mass-upload templates.
--
-- Run in the Supabase SQL Editor. Idempotent.
-- =====================================================

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS weight_grams INTEGER,     -- shipping weight in grams
    ADD COLUMN IF NOT EXISTS length_cm DECIMAL(6, 1),  -- package length (cm)
    ADD COLUMN IF NOT EXISTS width_cm DECIMAL(6, 1),   -- package width (cm)
    ADD COLUMN IF NOT EXISTS height_cm DECIMAL(6, 1);  -- package height (cm)
