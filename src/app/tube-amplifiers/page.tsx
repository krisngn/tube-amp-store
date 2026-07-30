import { redirect } from 'next/navigation';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * The store was generalized from a tube-amp-only shop into a full vintage audio
 * catalog. The collection now lives at /products; keep this path as a redirect so
 * existing links and bookmarks continue to work.
 */
export default async function TubeAmplifiersRedirect({ searchParams }: PageProps) {
    const search = await searchParams;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    }
    const qs = params.toString();
    redirect(`/products${qs ? `?${qs}` : ''}`);
}
