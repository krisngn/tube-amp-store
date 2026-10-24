/** Extract only explicit sale-unit statements, never infer from an image or quantity. */
export function getSalesUnit(name: string, description = '', locale = 'vi'): string | undefined {
    const text = `${name}\n${description}`.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
    const units = new Set<string>();
    const pattern = /(?:giá(?:\s+bán)?(?:\s+(?:tính|là|cho))*|đơn\s+vị(?:\s+bán)?)[\s:–—-]*(?:[\d.,]+\s*(?:vnđ|vnd|đ|₫)\s*\/\s*)?(1|một)\s*(con|cặp|bộ|chiếc|cái|đôi)(?![\p{L}\p{N}])/giu;
    for (const match of text.matchAll(pattern)) {
        const unit = match[2].toLowerCase();
        units.add(unit === 'đôi' ? 'cặp' : unit === 'cái' || unit === 'chiếc' ? 'con' : unit);
    }
    if (units.size !== 1) return undefined;
    const unit = [...units][0];
    return locale === 'en' ? ({ con: '1 piece', cặp: '1 pair', bộ: '1 set' } as Record<string, string>)[unit] : `1 ${unit}`;
}
