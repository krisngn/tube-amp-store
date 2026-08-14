import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/routing';

/**
 * Admin Authentication Utilities
 * Uses email allowlist from environment variables
 * 
 * Set ADMIN_ALLOWLIST_EMAILS in .env.local:
 * ADMIN_ALLOWLIST_EMAILS=admin@example.com,another@example.com
 */

const ADMIN_EMAILS = process.env.ADMIN_ALLOWLIST_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) || [];

/**
 * Check if user is admin based on email allowlist
 */
export async function isAdmin(): Promise<boolean> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            // No valid session — expected for unauthenticated visitors. Return quietly.
            return false;
        }

        if (!user || !user.email) {
            return false;
        }

        return ADMIN_EMAILS.includes(user.email.toLowerCase());
    } catch (error) {
        console.error('Error in isAdmin:', error);
        return false;
    }
}

/**
 * Require admin access, redirect to login if not admin
 */
export async function requireAdmin(locale?: string) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            // No valid session — send to login without logging (expected when signed out).
            const { redirect: nextRedirect } = await import('next/navigation');
            nextRedirect('/admin/login');
            return; // Never reached, but satisfies TypeScript
        }

        if (!user || !user.email) {
            // Use Next.js redirect for admin routes (no locale)
            const { redirect: nextRedirect } = await import('next/navigation');
            nextRedirect('/admin/login');
            return; // Never reached, but satisfies TypeScript
        }

        const userEmail = user.email.toLowerCase();
        if (!ADMIN_EMAILS.includes(userEmail)) {
            const { redirect: nextRedirect } = await import('next/navigation');
            nextRedirect('/admin/login');
            return; // Never reached, but satisfies TypeScript
        }

        return user;
    } catch (error) {
        console.error('Error in requireAdmin:', error);
        const { redirect: nextRedirect } = await import('next/navigation');
        nextRedirect('/admin/login');
        return; // Never reached, but satisfies TypeScript
    }
}

/**
 * Get admin user or null
 */
export async function getAdminUser() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            // No valid session (e.g. AuthSessionMissingError) — expected when the
            // visitor is not signed in. Return null quietly instead of logging noise.
            return null;
        }

        if (!user || !user.email) {
            return null;
        }

        if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return null;
        }

        return user;
    } catch (error: any) {
        // Catch any unexpected errors
        console.error('[getAdminUser] Unexpected error:', {
            error,
            message: error?.message,
            code: error?.code,
            name: error?.name,
        });
        return null;
    }
}

