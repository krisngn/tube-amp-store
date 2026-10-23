/**
 * Cart Types
 * Defines the structure of cart items and cart state
 */

export type CartItem = {
    productId: string;
    variantId?: string;
    variantName?: string;
    sku?: string;
    slug: string;
    name: string;
    priceVnd: number; // Snapshot price at add-to-cart time
    quantity: number;
    primaryImageUrl?: string;
    requiresDeposit?: boolean; // Flag for deposit reservation orders
    depositAmount?: number; // Calculated deposit amount
    depositType?: 'percent' | 'fixed'; // Deposit type from product
    depositPercentage?: number; // Deposit percentage if applicable
};

export interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
    removeItem: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
    hasItem: (productId: string, variantId?: string) => boolean;
}

