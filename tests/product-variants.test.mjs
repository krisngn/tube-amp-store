import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
async function loadTs(path, dependencies = {}) {
    const source = await readFile(new URL(path, root), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled)((name) => dependencies[name] ?? require(name), module, module.exports);
    return module.exports;
}
const variants = await loadTs('src/lib/products/variants.ts');
const utils = await loadTs('src/lib/cart/cart.utils.ts');
const { useCartStore } = await loadTs('src/lib/cart/cart.store.ts', { './cart.utils': utils });
const options = [
    { id: 'small', name: '0.22 µF', sku: 'CAP-022', price: 100000, stockQuantity: 3 },
    { id: 'large', name: '0.47 µF', sku: 'CAP-047', price: 200000, stockQuantity: 2 },
];

await test('product variants', async (t) => {
await t.test('server rejects missing/foreign options; derives price and stock from selected option', () => {
    const p = { price: 1, stock_quantity: 999, variants: options };
    assert.throws(() => variants.selectPurchaseOption(p));
    assert.throws(() => variants.selectPurchaseOption(p, 'foreign'));
    assert.equal(variants.selectPurchaseOption(p, 'large').price, 200000);
    assert.equal(variants.selectPurchaseOption(p, 'large').stockQuantity, 2);
    assert.deepEqual(variants.variantSummary(options), { price: 100000, stockQuantity: 5 });
    assert.throws(() => variants.validateVariants([{ ...options[0], price: -1 }]));
    assert.throws(() => variants.validateVariants([{ ...options[0], stockQuantity: 0.5 }]));
    assert.throws(() => variants.validateVariants([options[0], options[0]]));
    assert.throws(() => variants.validateVariants([{ ...options[0], name: '   ' }]));
});

await t.test('cart keeps options separate, merges matching options, updates and removes only selected line', () => {
    const cart = useCartStore;
    cart.getState().clearCart();
    const base = { productId: 'p', slug: 'cap', name: 'Capacitor' };
    cart.getState().addItem({ ...base, variantId: 'small', priceVnd: 100000 });
    cart.getState().addItem({ ...base, variantId: 'large', priceVnd: 200000 });
    cart.getState().addItem({ ...base, variantId: 'small', priceVnd: 100000 });
    assert.equal(cart.getState().items.length, 2);
    assert.equal(cart.getState().getTotal(), 400000);
    cart.getState().updateQuantity('p', 3, 'large');
    assert.equal(cart.getState().items[0].quantity, 2);
    assert.equal(cart.getState().getTotal(), 800000);
    cart.getState().removeItem('p', 'small');
    assert.equal(cart.getState().items[0].variantId, 'large');
    cart.getState().clearCart();
    cart.getState().addItem({ ...base, priceVnd: 50000 });
    cart.getState().updateQuantity('p', 2);
    assert.equal(cart.getState().getTotal(), 100000);
    cart.getState().removeItem('p');
    assert.equal(cart.getState().items.length, 0);
});

const db = new PGlite();
t.after(() => db.close());
const pid = '00000000-0000-0000-0000-000000000001';
const simpleId = '00000000-0000-0000-0000-000000000002';
const oid = '00000000-0000-0000-0000-000000000010';
await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE products (id uuid PRIMARY KEY, price numeric NOT NULL, stock_quantity integer NOT NULL CHECK(stock_quantity >= 0), is_published boolean NOT NULL DEFAULT true, sku text);
    CREATE TABLE orders (id uuid PRIMARY KEY);
    CREATE TABLE order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid REFERENCES orders(id) ON DELETE CASCADE, product_id uuid REFERENCES products(id) ON DELETE SET NULL, quantity integer NOT NULL, unit_price numeric NOT NULL, product_name text, product_sku text);
`);
const migration = await readFile(new URL('supabase/migrations/20261024_product_variants.sql', root), 'utf8');
await db.exec(migration);
// Migration can be safely reapplied, without duplicating triggers.
await db.exec(migration);
await db.query('INSERT INTO products(id,price,stock_quantity,variants) VALUES ($1,1,999,$2::jsonb)', [pid, JSON.stringify(options)]);
await db.query('INSERT INTO products(id,price,stock_quantity) VALUES ($1,50000,4)', [simpleId]);
await db.query('INSERT INTO orders(id) VALUES ($1)', [oid]);
const insert = (variant, qty, price, productId = pid) => db.query('INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price) VALUES ($1,$2,$3,$4,$5) RETURNING *', [oid, productId, variant, qty, price]);
const product = async (id = pid) => (await db.query('SELECT * FROM products WHERE id=$1', [id])).rows[0];

await t.test('database reserves exact option and snapshots SKU/name; rejects missing option, price changes and overselling', async () => {
    assert.equal(Number((await product()).price), 100000);
    assert.equal((await product()).stock_quantity, 5);
    await assert.rejects(insert(null, 1, 100000), /valid product variant/);
    await assert.rejects(insert('foreign', 1, 100000), /valid product variant/);
    await assert.rejects(insert('large', 1, 1), /price changed/);
    const first = await insert('large', 2, 200000);
    assert.equal(first.rows[0].variant_name, '0.47 µF');
    assert.equal(first.rows[0].product_sku, 'CAP-047');
    assert.equal((await product()).variants[0].stockQuantity, 3);
    assert.equal((await product()).variants[1].stockQuantity, 0);
    await assert.rejects(insert('large', 1, 200000), /Insufficient variant stock/);
    // Multi-row insert is atomic: a later failure rolls back earlier reservations.
    await assert.rejects(db.query('INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price) VALUES ($1,$2,\'small\',2,100000),($1,$2,\'small\',2,100000)', [oid,pid]), /Insufficient/);
    assert.equal((await product()).variants[0].stockQuantity, 3);
    await assert.rejects(db.query('UPDATE products SET variants=$2 WHERE id=$1', [pid, JSON.stringify([options[0]])]), /Cannot remove/);
});

await t.test('restoration is idempotent, restores correct options and simple stock, delete does not restore twice', async () => {
    await insert(null, 2, 50000, simpleId);
    assert.equal((await product(simpleId)).stock_quantity, 2);
    await db.query('SELECT restore_order_inventory($1)', [oid]);
    await db.query('SELECT restore_order_inventory($1)', [oid]);
    assert.equal((await product()).variants[1].stockQuantity, 2);
    assert.equal((await product()).stock_quantity, 5);
    assert.equal((await product(simpleId)).stock_quantity, 4);
    await db.query('DELETE FROM order_items WHERE order_id=$1', [oid]);
    assert.equal((await product()).stock_quantity, 5);
    assert.equal((await product(simpleId)).stock_quantity, 4);
    await insert('small', 1, 100000);
    await db.query('DELETE FROM order_items WHERE order_id=$1', [oid]);
    assert.equal((await product()).stock_quantity, 5);
});

await t.test('database rejects invalid JSON, fractional stock, duplicate IDs and unavailable products', async () => {
    for (const invalid of [null, {}, [{ ...options[0], stockQuantity: -1 }], [{ ...options[0], stockQuantity: 0.5 }], [options[0], options[0]], [{ ...options[0], price: 0 }]]) {
        await assert.rejects(db.query('UPDATE products SET variants=$2::jsonb WHERE id=$1', [pid, JSON.stringify(invalid)]));
    }
    await db.query('UPDATE products SET is_published=false WHERE id=$1', [pid]);
    await assert.rejects(insert('small', 1, 100000), /unavailable/);
    await db.query('UPDATE products SET is_published=true WHERE id=$1', [pid]);
    await assert.rejects(insert('small', 0, 100000), /invalid quantity/);
});

await t.test('legacy reservations block conversion, option IDs survive reordering, restoration is service-only', async () => {
    await insert(null, 1, 50000, simpleId);
    await assert.rejects(db.query('UPDATE products SET variants=$2 WHERE id=$1', [simpleId, JSON.stringify(options)]), /legacy order/);
    const before = (await product()).variants;
    await db.query('UPDATE products SET variants=$2 WHERE id=$1', [pid, JSON.stringify([...before].reverse())]);
    const line = await insert('small', 1, 100000);
    assert.equal(line.rows[0].variant_id, 'small');
    assert.equal((await product()).variants.find((v) => v.id === 'small').stockQuantity, 2);
    await db.exec('SET ROLE authenticated');
    await assert.rejects(db.query('SELECT restore_order_inventory($1)', [oid]), /permission denied/);
    await db.exec('RESET ROLE');
    await db.query('SELECT restore_order_inventory($1)', [oid]);
    assert.equal((await product()).variants.find((v) => v.id === 'small').stockQuantity, 3);
    assert.equal((await product(simpleId)).stock_quantity, 4);
});

});
