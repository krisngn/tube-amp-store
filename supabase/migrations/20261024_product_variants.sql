-- Apply before deploying the variant-aware application.
BEGIN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_name text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS inventory_released boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_product_variants()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v jsonb; ids text[] := '{}'; names text[] := '{}'; total_stock bigint := 0; min_price numeric;
BEGIN
    IF jsonb_typeof(NEW.variants) IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.variants) > 100 THEN
        RAISE EXCEPTION 'Invalid product variants';
    END IF;
    FOR v IN SELECT value FROM jsonb_array_elements(NEW.variants) LOOP
        IF jsonb_typeof(v) IS DISTINCT FROM 'object'
            OR coalesce(v->>'id', '') !~ '^[a-zA-Z0-9_-]{1,100}$'
            OR coalesce(length(btrim(v->>'name')), 0) NOT BETWEEN 1 AND 200
            OR (v->>'id') = ANY(ids) OR lower(btrim(v->>'name')) = ANY(names)
            OR jsonb_typeof(v->'price') IS DISTINCT FROM 'number'
            OR jsonb_typeof(v->'stockQuantity') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'Invalid or duplicate product variant';
        END IF;
        IF (v->>'price')::numeric <= 0 OR (v->>'price')::numeric > 9007199254740991
            OR (v->>'price')::numeric <> trunc((v->>'price')::numeric)
            OR (v->>'stockQuantity')::numeric < 0 OR (v->>'stockQuantity')::numeric > 2147483647
            OR (v->>'stockQuantity')::numeric <> trunc((v->>'stockQuantity')::numeric) THEN
            RAISE EXCEPTION 'Invalid variant price or stock';
        END IF;
        ids := array_append(ids, v->>'id');
        names := array_append(names, lower(btrim(v->>'name')));
        total_stock := total_stock + (v->>'stockQuantity')::bigint;
        min_price := least(min_price, (v->>'price')::numeric);
    END LOOP;
    IF TG_OP = 'UPDATE' AND OLD.variants IS DISTINCT FROM NEW.variants THEN
        IF jsonb_array_length(OLD.variants) = 0 AND jsonb_array_length(NEW.variants) > 0
            AND EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.product_id = NEW.id
                AND oi.variant_id IS NULL AND NOT oi.inventory_released) THEN
            RAISE EXCEPTION 'Cannot enable variants while legacy order inventory is reserved';
        END IF;
        IF EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.product_id = NEW.id
            AND oi.variant_id IS NOT NULL AND NOT oi.inventory_released
            AND NOT (oi.variant_id = ANY(ids))) THEN
            RAISE EXCEPTION 'Cannot remove a variant referenced by an order; set stock to zero instead';
        END IF;
    END IF;
    IF jsonb_array_length(NEW.variants) > 0 THEN
        NEW.price := min_price;
        NEW.stock_quantity := total_stock;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_product_variants ON public.products;
CREATE TRIGGER validate_product_variants BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product_variants();

-- Row locking makes validation and stock reservation one atomic operation.
-- Replace the original aggregate-only trigger; never decrement stock twice.
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.products%ROWTYPE; v jsonb; idx integer; pid uuid; delta integer;
BEGIN
    IF TG_OP = 'DELETE' AND OLD.inventory_released THEN RETURN OLD; END IF;
    IF TG_OP = 'INSERT' THEN pid := NEW.product_id; delta := -NEW.quantity;
    ELSE pid := OLD.product_id; delta := OLD.quantity; END IF;
    IF pid IS NULL THEN
        IF TG_OP = 'INSERT' THEN RAISE EXCEPTION 'Product is required'; END IF;
        RETURN OLD;
    END IF;
    SELECT * INTO p FROM public.products WHERE id = pid FOR UPDATE;
    IF NOT FOUND THEN
        IF TG_OP = 'INSERT' THEN RAISE EXCEPTION 'Product not found'; END IF;
        RETURN OLD;
    END IF;
    IF TG_OP = 'INSERT' AND (NOT p.is_published OR NEW.quantity <= 0) THEN
        RAISE EXCEPTION 'Product unavailable or invalid quantity';
    END IF;
    IF jsonb_array_length(p.variants) > 0 THEN
        SELECT value, ordinality::integer - 1 INTO v, idx
        FROM jsonb_array_elements(p.variants) WITH ORDINALITY
        WHERE value->>'id' = CASE WHEN TG_OP = 'INSERT' THEN NEW.variant_id ELSE OLD.variant_id END;
        IF v IS NULL THEN RAISE EXCEPTION 'Select a valid product variant'; END IF;
        IF (v->>'stockQuantity')::integer + delta < 0 THEN RAISE EXCEPTION 'Insufficient variant stock'; END IF;
        IF TG_OP = 'INSERT' THEN
            IF NEW.unit_price <> (v->>'price')::numeric THEN RAISE EXCEPTION 'Variant price changed; refresh your cart'; END IF;
            NEW.variant_name := v->>'name';
            NEW.product_sku := coalesce(nullif(v->>'sku', ''), p.sku);
        END IF;
        UPDATE public.products SET variants = jsonb_set(p.variants, ARRAY[idx::text, 'stockQuantity'], to_jsonb((v->>'stockQuantity')::integer + delta)) WHERE id = pid;
    ELSE
        IF TG_OP = 'INSERT' AND NEW.variant_id IS NOT NULL THEN RAISE EXCEPTION 'Variant no longer exists'; END IF;
        IF p.stock_quantity + delta < 0 THEN RAISE EXCEPTION 'Insufficient product stock'; END IF;
        IF TG_OP = 'INSERT' AND NEW.unit_price <> p.price THEN RAISE EXCEPTION 'Product price changed; refresh your cart'; END IF;
        UPDATE public.products SET stock_quantity = stock_quantity + delta WHERE id = pid;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    NEW.inventory_released := false;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS update_stock_on_order ON public.order_items;
CREATE TRIGGER update_stock_on_order BEFORE INSERT OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

-- One restoration path for cancellation, expiry, refunds and payment failure.
-- Safe to call repeatedly or concurrently: each order line is restored once.
CREATE OR REPLACE FUNCTION public.restore_order_inventory(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.order_items%ROWTYPE; p public.products%ROWTYPE; v jsonb; idx integer;
BEGIN
    PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
    FOR item IN SELECT * FROM public.order_items WHERE order_id = p_order_id AND NOT inventory_released ORDER BY product_id, id FOR UPDATE LOOP
        SELECT * INTO p FROM public.products WHERE id = item.product_id FOR UPDATE;
        IF FOUND THEN
            IF item.variant_id IS NOT NULL THEN
                SELECT value, ordinality::integer - 1 INTO v, idx FROM jsonb_array_elements(p.variants) WITH ORDINALITY WHERE value->>'id' = item.variant_id;
                IF v IS NULL THEN RAISE EXCEPTION 'Cannot restore missing variant %', item.variant_id; END IF;
                UPDATE public.products SET variants = jsonb_set(p.variants, ARRAY[idx::text, 'stockQuantity'], to_jsonb((v->>'stockQuantity')::integer + item.quantity)) WHERE id = p.id;
            ELSE
                UPDATE public.products SET stock_quantity = stock_quantity + item.quantity WHERE id = p.id;
            END IF;
        END IF;
        UPDATE public.order_items SET inventory_released = true WHERE id = item.id;
    END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_order_inventory(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_order_inventory(uuid) TO service_role;
COMMIT;
