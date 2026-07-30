/**
 * Minimal, dependency-free CSV (RFC 4180-ish) parser + serializer.
 * Handles quoted fields, escaped quotes (""), embedded commas and newlines.
 */

/** Parse CSV text into a matrix of string cells. */
export function parseCsv(input: string): string[][] {
    let text = input;
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i++;
                continue;
            }
            field += ch;
            i++;
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
            i++;
            continue;
        }
        if (ch === ',') {
            row.push(field);
            field = '';
            i++;
            continue;
        }
        if (ch === '\r') {
            i++;
            continue;
        }
        if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            i++;
            continue;
        }
        field += ch;
        i++;
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

/** Parse CSV into an array of objects keyed by the (trimmed) header row. */
export function csvToObjects(input: string): Record<string, string>[] {
    let rows = parseCsv(input).filter((r) => r.some((c) => c.trim() !== ''));
    // Skip a leading Excel delimiter hint line ("sep=,")
    if (rows.length && (rows[0][0] ?? '').toLowerCase().startsWith('sep=')) {
        rows = rows.slice(1);
    }
    if (rows.length === 0) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((r) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
            obj[h] = (r[idx] ?? '').trim();
        });
        return obj;
    });
}

function escapeCell(value: string): string {
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Serialize rows (objects) to CSV using the given column order.
 * Prepends a UTF-8 BOM (so Excel reads Vietnamese correctly) and a `sep=,`
 * hint line (so Excel splits columns regardless of the OS list-separator).
 * The importer skips the `sep=,` line, so files round-trip cleanly.
 */
export function toCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
    const lines = [columns.map(escapeCell).join(',')];
    for (const row of rows) {
        lines.push(
            columns
                .map((col) => {
                    const v = row[col];
                    return escapeCell(v === null || v === undefined ? '' : String(v));
                })
                .join(',')
        );
    }
    return '﻿' + 'sep=,\r\n' + lines.join('\r\n');
}

/** Encode a specifications object as "Key=Value|Key=Value" for a single CSV cell. */
export function encodeSpecs(specs: Record<string, unknown> | null | undefined): string {
    if (!specs) return '';
    return Object.entries(specs)
        .filter(([, v]) => v !== null && v !== undefined && String(v) !== '')
        .map(([k, v]) => `${k}=${String(v)}`)
        .join('|');
}

/** Decode a "Key=Value|Key=Value" cell into a specifications object. */
export function decodeSpecs(cell: string | null | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    if (!cell) return out;
    for (const part of cell.split('|')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const key = part.slice(0, eq).trim();
        const value = part.slice(eq + 1).trim();
        if (key) out[key] = value;
    }
    return out;
}
