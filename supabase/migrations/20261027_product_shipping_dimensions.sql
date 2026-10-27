-- Add optional package measurements without changing existing product data.
BEGIN;
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS weight_grams INTEGER,
    ADD COLUMN IF NOT EXISTS length_cm DECIMAL(6, 1),
    ADD COLUMN IF NOT EXISTS width_cm DECIMAL(6, 1),
    ADD COLUMN IF NOT EXISTS height_cm DECIMAL(6, 1);
COMMIT;
NOTIFY pgrst, 'reload schema';
