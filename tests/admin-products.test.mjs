import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const require = createRequire(import.meta.url);
async function loadTs(path, dependencies = {}) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled)((name) => dependencies[name] ?? require(name), module, module.exports);
    return module.exports;
}
const variants = await loadTs('src/lib/products/variants.ts');
const payload = {
    slug: 'xac-may-r-122a', price: 3500000, stockQuantity: 1, condition: 'vintage', variants: [],
    translations: { vi: { name: 'Xác máy R-122A' }, en: { name: 'R-122A' } },
};

// Exercise the real repository's SQL writes against PostgreSQL, with and
// without the optional variants migration. No production credentials needed.
await test('admin product writes across schema versions', async (t) => {
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(`
        CREATE TABLE products (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL,
            price numeric NOT NULL CHECK(price > 0), compare_at_price numeric,
            stock_quantity integer, low_stock_threshold integer, condition text,
            topology text, tube_type text, power_watts numeric, taps text[],
            min_speaker_sensitivity integer, specifications jsonb, allow_deposit boolean,
            deposit_type text, deposit_amount numeric, deposit_percentage integer,
            deposit_due_hours integer, reservation_days integer, reservation_policy_note text,
            is_published boolean, is_featured boolean, is_vintage boolean, published_at timestamptz,
            category_id uuid, brand_id uuid
        );
        CREATE TABLE product_translations (
            product_id uuid REFERENCES products(id), locale text, name text NOT NULL,
            short_description text, description text, sound_character text,
            recommended_genres text[], matching_notes text, condition_notes text,
            origin_story text, UNIQUE(product_id, locale)
        );
    `);
    let writes = 0;
    let forcedError;
    const client = { from(table) {
        let operation, data, filter;
        const run = async () => {
            try {
                if (operation === 'select') return { data: (await db.query('SELECT id FROM products WHERE slug=$1', [filter])).rows[0] ?? null, error: null };
                writes++;
                if (forcedError) return { data: null, error: forcedError };
                const rows = Array.isArray(data) ? data : [data];
                const columns = Object.keys(rows[0]).filter(key => rows[0][key] !== undefined);
                let result;
                for (const row of rows) {
                    const values = columns.map(key => ['variants', 'specifications'].includes(key) ? JSON.stringify(row[key]) : row[key]);
                    if (operation === 'insert') {
                        result = await db.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, values);
                    } else {
                        result = await db.query(`UPDATE ${table} SET ${columns.map((key, i) => `${key}=$${i + 1}`).join(',')} WHERE id=$${values.length + 1} RETURNING *`, [...values, filter]);
                    }
                }
                return { data: result?.rows[0], error: null };
            } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
        };
        const query = {
            insert(value) { operation = 'insert'; data = value; return query; },
            update(value) { operation = 'update'; data = value; return query; },
            select() { operation ??= 'select'; return query; },
            eq(_key, value) { filter = value; return query; },
            single: run,
            then(resolve, reject) { return run().then(resolve, reject); },
        };
        return query;
    } };
    const repo = await loadTs('src/lib/repositories/admin/products.ts', {
        '@/lib/products/variants': variants,
        '@/lib/supabase/service': { createServiceClient: () => client },
    });
    let id;
    await t.test('creates a simple product and translations before the variants migration', async () => {
        id = await repo.adminCreateProduct({ ...payload, weightGrams: null, heightCm: null });
        const product = (await db.query('SELECT * FROM products WHERE id=$1', [id])).rows[0];
        assert.equal(Number(product.price), 3500000);
        assert.equal(product.stock_quantity, 1);
        assert.equal((await db.query('SELECT * FROM product_translations WHERE product_id=$1', [id])).rows.length, 2);
    });
    await t.test('requires a migration for supplied measurements, then persists them', async () => {
        await assert.rejects(repo.adminCreateProduct({ ...payload, slug: 'shipping', heightCm: 15 }), /20261027_product_shipping_dimensions.sql/);
        const shippingMigration = await readFile(new URL('../supabase/migrations/20261027_product_shipping_dimensions.sql', import.meta.url), 'utf8');
        await db.exec(shippingMigration);
        await db.exec(shippingMigration);
        const shippingId = await repo.adminCreateProduct({ ...payload, slug: 'shipping', weightGrams: 2000, lengthCm: 30, widthCm: 20, heightCm: 15 });
        const row = (await db.query('SELECT * FROM products WHERE id=$1', [shippingId])).rows[0];
        assert.equal(row.weight_grams, 2000);
        assert.equal(Number(row.height_cm), 15);
        await repo.adminUpdateProduct({ id: shippingId, heightCm: null });
        assert.equal((await db.query('SELECT height_cm FROM products WHERE id=$1', [shippingId])).rows[0].height_cm, null);
    });
    await t.test('updates a simple product on a legacy schema without dropping real options', async () => {
        await repo.adminUpdateProduct({ id, variants: [], price: 3600000 });
        assert.equal(Number((await db.query('SELECT price FROM products WHERE id=$1', [id])).rows[0].price), 3600000);
        const before = writes;
        await assert.rejects(repo.adminUpdateProduct({ id, variants: [{ id: 'a', name: 'A', price: 100000, stockQuantity: 2 }] }), /20261024_product_variants.sql/);
        assert.equal(writes - before, 1);
    });
    await t.test('rejects options on a legacy database with an actionable migration error', async () => {
        await assert.rejects(repo.adminCreateProduct({ ...payload, slug: 'options', variants: [{ id: 'a', name: 'A', price: 100000, stockQuantity: 2 }] }), /20261024_product_variants.sql/);
        assert.equal((await db.query("SELECT * FROM products WHERE slug='options'")).rows.length, 0);
    });
    await t.test('preserves options and can explicitly clear them after migration', async () => {
        await db.exec("ALTER TABLE products ADD COLUMN variants jsonb NOT NULL DEFAULT '[]'");
        const options = [{ id: 'a', name: 'A', price: 100000, stockQuantity: 2 }, { id: 'b', name: 'B', price: 200000, stockQuantity: 3 }];
        const optionId = await repo.adminCreateProduct({ ...payload, slug: 'options', variants: options });
        const product = (await db.query('SELECT * FROM products WHERE id=$1', [optionId])).rows[0];
        assert.equal(Number(product.price), 100000);
        assert.equal(product.stock_quantity, 5);
        assert.deepEqual(product.variants, options);
        await repo.adminUpdateProduct({ id: optionId, variants: [], price: 250000, stockQuantity: 1 });
        assert.deepEqual((await db.query('SELECT variants FROM products WHERE id=$1', [optionId])).rows[0].variants, []);
    });
    await t.test('does not retry unrelated database errors or silently lose options', async () => {
        forcedError = { code: '23514', message: 'price check failed' };
        const before = writes;
        await assert.rejects(repo.adminUpdateProduct({ id, variants: [], price: -1 }), /23514/);
        assert.equal(writes - before, 1);
        forcedError = { code: 'PGRST204', message: "Could not find the 'variants' column of 'products' in the schema cache" };
        await assert.rejects(repo.adminCreateProduct({ ...payload, slug: 'missing-migration', variants: [{ id: 'a', name: 'A', price: 100000, stockQuantity: 2 }] }), /20261024_product_variants.sql/);
        forcedError = undefined;
    });
});

await test('admin edit page reads persisted image IDs and sort_order', async () => {
    const repo = await loadTs('src/lib/repositories/admin/products.ts', {
        '@/lib/products/variants': variants,
        '@/lib/supabase/service': { createServiceClient: () => ({ from: () => ({
            select(columns) {
                assert.match(columns, /product_images\(id, url, alt_text, sort_order, is_primary\)/);
                return this;
            },
            eq() { return this; },
            async single() { return { error: null, data: {
                id: 'product', slug: 'r-122a', price: 3500000, stock_quantity: 1,
                product_images: [
                    { id: 'second', url: 'https://example.com/second.jpg', sort_order: 1 },
                    { id: 'cover', url: 'https://example.com/cover.jpg', sort_order: 0, is_primary: true },
                ],
            } }; },
        }) }) },
    });
    const product = await repo.adminGetProductById('product');
    assert.deepEqual(product.images.map(image => [image.id, image.position]), [['cover', 0], ['second', 1]]);
    assert.equal(product.imageUrl, 'https://example.com/cover.jpg');
});
