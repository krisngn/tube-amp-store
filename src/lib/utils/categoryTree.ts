/**
 * Generic adjacency-list tree helpers (unlimited nesting).
 * Works on any item that exposes { id, parentId, sortOrder? }.
 * Used by admin category tree, category parent picker, and product category select.
 */

export interface TreeNodeInput {
    id: string;
    parentId: string | null;
    sortOrder?: number;
}

export interface NestedNode<T> {
    item: T;
    depth: number;
    children: NestedNode<T>[];
}

export interface FlatTreeNode<T> {
    item: T;
    depth: number;
    hasChildren: boolean;
}

const ROOT_KEY = '__root__';

/**
 * Build a nested tree (roots -> children, recursively). Orphans (parent not in
 * the set) are treated as roots. Siblings are ordered by sortOrder then insertion.
 */
export function buildNestedTree<T extends TreeNodeInput>(items: T[]): NestedNode<T>[] {
    const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const ids = new Set(sorted.map((i) => i.id));
    const childrenOf = new Map<string, T[]>();
    for (const it of sorted) {
        const key = it.parentId && ids.has(it.parentId) ? it.parentId : ROOT_KEY;
        if (!childrenOf.has(key)) childrenOf.set(key, []);
        childrenOf.get(key)!.push(it);
    }
    const build = (parentKey: string, depth: number): NestedNode<T>[] =>
        (childrenOf.get(parentKey) ?? []).map((it) => ({
            item: it,
            depth,
            children: build(it.id, depth + 1),
        }));
    return build(ROOT_KEY, 0);
}

/**
 * Flatten the tree into a pre-order list, each item tagged with its depth and
 * whether it has children. Handy for indented <select> options and table rows.
 */
export function flattenTree<T extends TreeNodeInput>(items: T[]): FlatTreeNode<T>[] {
    const out: FlatTreeNode<T>[] = [];
    const walk = (nodes: NestedNode<T>[]) => {
        for (const n of nodes) {
            out.push({ item: n.item, depth: n.depth, hasChildren: n.children.length > 0 });
            walk(n.children);
        }
    };
    walk(buildNestedTree(items));
    return out;
}

/** All descendant ids of `id` (children, grandchildren, ...). Excludes `id` itself. */
export function getDescendantIds<T extends TreeNodeInput>(items: T[], id: string): Set<string> {
    const childrenOf = new Map<string, string[]>();
    for (const it of items) {
        if (it.parentId) {
            if (!childrenOf.has(it.parentId)) childrenOf.set(it.parentId, []);
            childrenOf.get(it.parentId)!.push(it.id);
        }
    }
    const result = new Set<string>();
    const stack = [...(childrenOf.get(id) ?? [])];
    while (stack.length) {
        const cur = stack.pop()!;
        if (result.has(cur)) continue;
        result.add(cur);
        for (const c of childrenOf.get(cur) ?? []) stack.push(c);
    }
    return result;
}

/** True if `candidateId` is `id` itself or one of its descendants. */
export function isSelfOrDescendant<T extends TreeNodeInput>(items: T[], id: string, candidateId: string): boolean {
    if (candidateId === id) return true;
    return getDescendantIds(items, id).has(candidateId);
}
