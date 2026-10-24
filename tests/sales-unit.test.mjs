import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/products/sales-unit.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
new Function('exports', code)(module.exports);
const { getSalesUnit } = module.exports;

test('reads explicit units including Vietnamese endings and HTML', () => {
    assert.equal(getSalesUnit('Tụ RIFA', '<p>Giá bán tính cho 1 con tụ.</p>'), '1 con');
    assert.equal(getSalesUnit('Bóng đèn — Giá 1 cặp'), '1 cặp');
    assert.equal(getSalesUnit('Linh kiện', 'Đơn vị bán: 1 bộ'), '1 bộ');
    assert.equal(getSalesUnit('Tube', 'Giá cho một đôi', 'en'), '1 pair');
});
test('never guesses a sale unit from a photo quantity, circuit description or conflicting prices', () => {
    assert.equal(getSalesUnit('Bóng đèn', 'Ảnh chụp 5 con. Ghép thành một cặp trong mạch.'), undefined);
    assert.equal(getSalesUnit('Bóng đèn', 'Giá 1 con: 100k. Giá 1 cặp: 190k.'), undefined);
    assert.equal(getSalesUnit('Bộ linh kiện gồm 4 con'), undefined);
});
