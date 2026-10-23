/**
 * Utility functions for formatting product data
 */

import type { ProductDetailDTO } from '@/lib/types/catalog';

/**
 * Format price with locale-specific currency symbol
 * Note: All prices are stored in VND, we just change the symbol
 */
export function formatPrice(amount: number, locale: string): string {
    const symbol = locale === 'vi' ? '₫' : '$';

    // Format with thousands separators
    const formatted = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(amount);

    return `${formatted}${symbol}`;
}

/**
 * Determine stock status based on quantity and threshold
 */
export function formatStockStatus(
    quantity: number,
    threshold: number
): 'in_stock' | 'limited' | 'out_of_stock' {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= threshold) return 'limited';
    return 'in_stock';
}

/**
 * Generate summary bullets from product data
 * Creates 3-4 key selling points
 */
export function generateSummaryBullets(product: ProductDetailDTO, locale: string): string[] {
    const bullets: string[] = [];

    // Use short description if available
    if (product.shortDescription) {
        return product.shortDescription.split('\n').filter(Boolean).slice(0, 4);
    }

    // Otherwise generate from product specs
    if (product.topology && product.tubeType) {
        const topologyLabel = product.topology === 'se' ? 'Single-Ended' : 'Push-Pull';
        bullets.push(
            locale === 'vi'
                ? `Topology ${topologyLabel} ${product.tubeType}`
                : `${topologyLabel} ${product.tubeType} topology`
        );
    }

    if (product.powerWatts) {
        bullets.push(
            locale === 'vi'
                ? `Công suất ${product.powerWatts}W`
                : `${product.powerWatts}W output power`
        );
    }

    if (product.condition === 'vintage') {
        bullets.push(
            locale === 'vi'
                ? 'Hàng vintage: xem mô tả tình trạng từng sản phẩm'
                : 'Vintage: review the condition described for this item'
        );
    } else if (product.condition === 'new') {
        bullets.push(
            locale === 'vi'
                ? 'Tình trạng: mới — xem chi tiết trong mô tả'
                : 'Condition: new — review the product description'
        );
    }

    if (product.taps && product.taps.length > 0) {
        bullets.push(
            locale === 'vi'
                ? `Đa dạng cổng loa: ${product.taps.join(', ')}`
                : `Multiple speaker taps: ${product.taps.join(', ')}`
        );
    }

    return bullets.slice(0, 4);
}

/**
 * Format warranty period
 */
export function formatWarranty(months: number | null | undefined, locale: string): string {
    if (!months) return locale === 'vi' ? 'Không có bảo hành' : 'No warranty';

    if (months === 12) {
        return locale === 'vi' ? '1 năm' : '1 year';
    }

    if (months % 12 === 0) {
        const years = months / 12;
        return locale === 'vi' ? `${years} năm` : `${years} year${years > 1 ? 's' : ''}`;
    }

    return locale === 'vi' ? `${months} tháng` : `${months} month${months > 1 ? 's' : ''}`;
}

/**
 * Format return period
 */
export function formatReturnPeriod(days: number | null | undefined, locale: string): string {
    if (!days) return locale === 'vi' ? 'Không đổi trả' : 'No returns';

    return locale === 'vi' ? `${days} ngày` : `${days} day${days > 1 ? 's' : ''}`;
}
