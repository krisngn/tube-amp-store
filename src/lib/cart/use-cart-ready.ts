'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
// Persisted cart values are client-only; keep the first hydrated render equal to SSR.
export function useCartReady() {
    return useSyncExternalStore(subscribe, () => true, () => false);
}
