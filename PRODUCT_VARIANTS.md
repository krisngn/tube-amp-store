# Product variants

Each product can contain up to 100 options with a stable `id`, display `name`, integer VND `price`, integer `stockQuantity`, optional `sku`, and optional HTTPS `imageUrl`. A name can represent a combination of Shopee options, e.g. `0.22 µF / 630 V`. Keep IDs unchanged when renaming or reordering.

## Deployment order

1. Back up the database and check outstanding orders. Audit old cancelled/failed orders if inventory restoration needs retrying: the new `inventory_released` marker cannot infer which historical stock was already restored by the old application.
2. Run `supabase/migrations/20261024_product_variants.sql` against the store's Supabase database. Apply it after `supabase/schema.sql` for a fresh installation too.
3. Deploy this application immediately after migration. Keep variants empty until deployment finishes: the old application does not require customers to select an option.
4. Create a draft with two differently priced options, verify selection/cart, and test order/cancellation in a staging database before publishing real option products.
5. Import the Shopee CSV using Admin → Import/Export → Products. Upload images and review drafts before publishing.

The migration adds a JSONB column on products and snapshot/release fields on order items. Product row locks serialize stock reservations. The original stock trigger is replaced, so stock is deducted once. Server-side checkout requires an option ID for products with options, validates stock and current price, and snapshots the selected option name and SKU. All cancellation/refund/payment-failure paths use `restore_order_inventory`, which releases each line once. It is executable only by `service_role`.

Base product price and stock are derived from the minimum option price and sum of option stocks. Products with no options keep their original behavior. Options referenced by unreleased order lines cannot be removed; set their stock to zero instead. A product with outstanding legacy order lines cannot be converted to options until those reservations are resolved.

## CSV

The `variants` column contains a JSON array:

```json
[{"id":"shopee-123","name":"0.22 µF","sku":"CAP-022","price":100000,"stockQuantity":3}]
```

Use `[]` to remove all options where allowed. Omit the column entirely to leave existing options unchanged. Export includes the same JSON format. Image uploads remain separate from CSV import. Do not substitute a minimum price for option-specific prices.

## Validation

Run `pnpm test:variants`, `pnpm exec tsc --noEmit`, and `pnpm build --webpack`.

Tests execute the actual migration in an isolated PGlite PostgreSQL database and verify price/selection validation, independent cart lines, atomic rollback when an order oversells, stock restoration, deletion without double restoration, malformed option data, and compatibility with products without options. They do not connect to the production store. Payment gateway end-to-end testing still requires a configured staging environment.

Run `pnpm test:admin-products` to check admin creation and updates against databases both with and without the variants column. Simple products can be saved before the variants migration; saving actual options requires the migration and reports its filename if it is missing. Clearing options on a migrated database still writes an explicit empty array.
