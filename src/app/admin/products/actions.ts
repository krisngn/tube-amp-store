'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { adminBulkUpdateProductStatus } from '@/lib/repositories/admin/products';

/**
 * Bulk publish multiple products
 */
export async function bulkPublishProductsAction(ids: string[]): Promise<void> {
    await requireAdmin();
    if (!ids.length) return;
    await adminBulkUpdateProductStatus(ids, true);
    revalidatePath('/admin/products');
}

/**
 * Bulk unpublish (revert to draft) multiple products
 */
export async function bulkUnpublishProductsAction(ids: string[]): Promise<void> {
    await requireAdmin();
    if (!ids.length) return;
    await adminBulkUpdateProductStatus(ids, false);
    revalidatePath('/admin/products');
}
