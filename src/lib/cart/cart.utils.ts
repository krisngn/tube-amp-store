/**
 * Cart Utilities
 * Helper functions for cart operations
 */

import type { CartItem } from './cart.types';

export function cartItemKey(item: Pick<CartItem, 'productId' | 'variantId'>): string {
    return JSON.stringify([item.productId, item.variantId ?? null]);
}

const CART_STORAGE_KEY = 'rtb_cart';

/**
 * Load cart from localStorage
 */
export function loadCartFromStorage(): CartItem[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored) as CartItem[];
        
        // Validate structure
        if (!Array.isArray(parsed)) {
            return [];
        }

        // Validate each item
        const validItems = parsed.filter((item) => {
            return (
                typeof item === 'object' &&
                typeof item.productId === 'string' &&
                typeof item.slug === 'string' &&
                typeof item.name === 'string' &&
                typeof item.priceVnd === 'number' &&
                typeof item.quantity === 'number' &&
                item.quantity > 0 &&
                item.priceVnd > 0
            );
        });

        return validItems;
    } catch (error) {
        console.error('Failed to load cart from storage:', error);
        return [];
    }
}

/**
 * Save cart to localStorage
 */
export function saveCartToStorage(items: CartItem[]): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Failed to save cart to storage:', error);
    }
}

/**
 * Calculate cart subtotal
 */
export function calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.priceVnd * item.quantity, 0);
}

/**
 * Calculate total item count
 */
export function calculateItemCount(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
}

