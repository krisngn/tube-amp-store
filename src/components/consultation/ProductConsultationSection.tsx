'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './ProductConsultationSection.module.css';

export default function ProductConsultationSection() {
    const t = useTranslations('home');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, message }),
            });
            if (!res.ok) throw new Error('Lỗi gửi tin nhắn');
            setSubmitted(true);
        } catch {
            setError('Có lỗi xảy ra, vui lòng thử lại hoặc liên hệ qua Zalo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="tu-van" className={styles.consultationSection}>
            <div className="container">
                {/* Section Header */}
                <div className={styles.header}>
                    <div className={styles.badge}>{t('consultation.badge')}</div>
                    <h2 className={styles.title}>{t('consultation.title')}</h2>
                    <p className={styles.subtitle}>{t('consultation.subtitle')}</p>
                </div>

                {/* 3 Channels Grid */}
                <div className={styles.channelsGrid}>
                    {/* Zalo Card */}
                    <div className={styles.channelCard}>
                        <div className={styles.cardTop}>
                            <div className={`${styles.cardIcon} ${styles.zaloIcon}`}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.84 7.08L5 22l4.13-1.65c.92.26 1.89.4 2.87.4 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1 13.5h-2v-2h2v2zm0-4h-2V7h2v4.5z"/>
                                </svg>
                            </div>
                            <span className={styles.cardTag}>{t('consultation.channels.zalo.tag')}</span>
                        </div>
                        <h3 className={styles.cardTitle}>{t('consultation.channels.zalo.title')}</h3>
                        <p className={styles.cardDesc}>{t('consultation.channels.zalo.desc')}</p>
                        <a
                            href="https://zalo.me/0931772150"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`btn btn-primary ${styles.cardActionBtn}`}
                        >
                            <span>{t('consultation.channels.zalo.action')}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </a>
                    </div>

                    {/* Facebook Messenger Card */}
                    <div className={styles.channelCard}>
                        <div className={styles.cardTop}>
                            <div className={`${styles.cardIcon} ${styles.fbIcon}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.54 3.12 7.42V22l3.41-1.87c1.07.3 2.21.47 3.47.47 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm1.05 13.13l-2.67-2.85-5.21 2.85 5.73-6.08 2.74 2.85 5.14-2.85-5.73 6.08z"/>
                                </svg>
                            </div>
                            <span className={styles.cardTag}>{t('consultation.channels.facebook.tag')}</span>
                        </div>
                        <h3 className={styles.cardTitle}>{t('consultation.channels.facebook.title')}</h3>
                        <p className={styles.cardDesc}>{t('consultation.channels.facebook.desc')}</p>
                        <a
                            href="https://www.facebook.com/vintageaudioaccessories"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`btn btn-secondary ${styles.cardActionBtn}`}
                        >
                            <span>{t('consultation.channels.facebook.action')}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </a>
                    </div>

                    {/* Hotline Card */}
                    <div className={styles.channelCard}>
                        <div className={styles.cardTop}>
                            <div className={`${styles.cardIcon} ${styles.phoneIcon}`}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                </svg>
                            </div>
                            <span className={styles.cardTag}>{t('consultation.channels.showroom.tag')}</span>
                        </div>
                        <h3 className={styles.cardTitle}>{t('consultation.channels.showroom.title')}</h3>
                        <p className={styles.cardDesc}>{t('consultation.channels.showroom.desc')}</p>
                        <a
                            href="tel:0931772150"
                            className={`btn btn-primary ${styles.cardActionBtn}`}
                        >
                            <span>{t('consultation.channels.showroom.action')}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Online contact and message form */}
                <div className={styles.bottomGrid}>
                    <div className={styles.contactInfo}>
                        <h3 className={styles.contactTitle}>{t('consultation.online.title')}</h3>
                        <p className={styles.contactDetail}>{t('consultation.online.description')}</p>
                        <p className={styles.contactDetail}>{t('consultation.online.note')}</p>
                        <a href="/contact" className="btn btn-secondary">{t('consultation.form.title')}</a>
                    </div>

                    <div className={styles.formWrapper}>
                        <h4 className={styles.formTitle}>{t('consultation.form.title')}</h4>
                        <p className={styles.formSubtitle}>{t('consultation.form.subtitle')}</p>

                        {submitted ? (
                            <div className={styles.successBox}>
                                ✓ {t('consultation.form.success')}
                                <div style={{ marginTop: '8px', fontSize: '0.875rem' }}>
                                    Chúng tôi sẽ liên hệ lại số <strong>{phone}</strong> trong thời gian sớm nhất.
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className={styles.formRow}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        aria-label={t('consultation.form.name')}
                                        autoComplete="name"
                                        maxLength={100}
                                        placeholder={t('consultation.form.namePlaceholder')}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                    <input
                                        type="tel"
                                        required
                                        className={styles.input}
                                        aria-label={t('consultation.form.phone')}
                                        autoComplete="tel"
                                        maxLength={30}
                                        placeholder={t('consultation.form.phonePlaceholder')}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                                <textarea
                                    rows={4}
                                    maxLength={5000}
                                    required
                                    aria-label={t('consultation.form.message')}
                                    className={styles.textarea}
                                    placeholder={t('consultation.form.messagePlaceholder')}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                {error && (
                                    <div style={{ color: 'var(--color-error, #f87171)', fontSize: '0.85rem', marginBottom: '8px' }}>
                                        {error}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    disabled={loading}
                                >
                                    {loading ? t('consultation.form.sending') : t('consultation.form.submit')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
