'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import styles from './page.module.css';

export default function AdminLoginPage() {
    const t = useTranslations('admin');
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const supabase = createClient();
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                // Log detailed error for debugging
                console.error('[AdminLogin] Sign in error:', {
                    code: signInError.code,
                    message: signInError.message,
                    status: signInError.status,
                });
                setError(signInError.message);
                return;
            }

            if (data.user) {
                // Redirect to the admin dashboard
                router.push('/admin');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginContainer}>
                <h1>{t('login.title')}</h1>
                <p className={styles.subtitle}>{t('login.subtitle')}</p>

                <form onSubmit={handleSubmit} className={styles.loginForm}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.formGroup}>
                        <label className="label">{t('login.email')}</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className="label">{t('login.password')}</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
                        {loading ? t('login.loading') : t('login.submit')}
                    </button>
                </form>
            </div>
        </div>
    );
}
