// Import polyfills first
import '@/lib/polyfills';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import StorefrontWrapper from '@/components/layout/StorefrontWrapper';
import { listCategories } from '@/lib/repositories/categories';
import { defaultLocale } from '@/config/locales';
import { GlobalErrorHandler } from './error-handler';
import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'Vintage Audio Accessories',
        template: '%s | Vintage Audio Accessories',
    },
    description:
        'Phụ kiện audio vintage cao cấp — ampli đèn, loa, đầu đĩa và hơn thế nữa. Premium vintage audio accessories.',
    openGraph: {
        siteName: 'Vintage Audio Accessories',
        type: 'website',
    },
};

// This app uses cookies, headers and next-intl in Server Components.
// Force dynamic rendering globally to avoid DYNAMIC_SERVER_USAGE errors.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let locale: string;
    let messages: any;

    try {
        locale = await getLocale();
        messages = await getMessages();
    } catch (error: any) {
        // Log detailed error to identify 404 source
        console.error('[RootLayout] Error loading locale/messages:', {
            error,
            message: error?.message,
            code: error?.code,
            details: error?.details,
            stack: error?.stack,
        });
        // Fallback to default locale if there's an error
        locale = defaultLocale;
        try {
            const defaultMessages = await import(`../../messages/${defaultLocale}/common.json`);
            messages = { common: defaultMessages.default };
        } catch (fallbackError: any) {
            console.error('[RootLayout] Error loading fallback messages:', {
                error: fallbackError,
                message: fallbackError?.message,
            });
            messages = {};
        }
    }

    // Categories power the storefront navigation dropdown (safe fallback to []).
    const categories = await listCategories(locale);

    return (
        <html lang={locale}>
            <body>
                <GlobalErrorHandler />
                <NextIntlClientProvider messages={messages}>
                    <StorefrontWrapper categories={categories}>{children}</StorefrontWrapper>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
