/** A purchasable option; IDs remain stable after renaming or reordering. */
export interface ProductVariant {
    id: string;
    name: string;
    sku?: string;
    price: number;
    stockQuantity: number;
    imageUrl?: string;
}

export function validateVariants(value: unknown): ProductVariant[] {
    if (!Array.isArray(value) || value.length > 100) throw new Error('Danh sách phân loại không hợp lệ (tối đa 100).');
    const ids = new Set<string>();
    const names = new Set<string>();
    return value.map((raw) => {
        if (!raw || typeof raw !== 'object') throw new Error('Phân loại không hợp lệ.');
        const v = raw as Record<string, unknown>;
        const id = typeof v.id === 'string' ? v.id.trim() : '';
        const name = typeof v.name === 'string' ? v.name.trim() : '';
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || ids.has(id)) throw new Error('Mã phân loại trống hoặc trùng.');
        if (!name || name.length > 200 || names.has(name.toLocaleLowerCase())) throw new Error('Tên phân loại trống hoặc trùng.');
        if (typeof v.price !== 'number' || !Number.isSafeInteger(v.price) || v.price <= 0) throw new Error('Giá phân loại phải là số nguyên VND lớn hơn 0.');
        if (typeof v.stockQuantity !== 'number' || !Number.isSafeInteger(v.stockQuantity) || v.stockQuantity < 0) throw new Error('Tồn kho phân loại phải là số nguyên không âm.');
        if (v.imageUrl && (typeof v.imageUrl !== 'string' || !/^https:\/\//.test(v.imageUrl))) throw new Error('Ảnh phân loại phải dùng URL HTTPS.');
        ids.add(id);
        names.add(name.toLocaleLowerCase());
        return { id, name, price: v.price, stockQuantity: v.stockQuantity, sku: typeof v.sku === 'string' ? v.sku.trim() : undefined, imageUrl: v.imageUrl as string | undefined };
    });
}

export function variantSummary(variants: ProductVariant[]) {
    return {
        price: Math.min(...variants.map((v) => v.price)),
        stockQuantity: variants.reduce((sum, v) => sum + v.stockQuantity, 0),
    };
}

export function selectPurchaseOption(product: { price: number; stock_quantity: number; sku?: string | null; variants?: ProductVariant[] }, variantId?: string) {
    const variants = product.variants ?? [];
    if (!variants.length) {
        if (variantId) throw new Error('Phân loại không còn tồn tại.');
        return { price: Number(product.price), stockQuantity: product.stock_quantity, sku: product.sku ?? undefined };
    }
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) throw new Error('Vui lòng chọn phân loại sản phẩm hợp lệ.');
    return { ...variant, sku: variant.sku || product.sku || undefined };
}
