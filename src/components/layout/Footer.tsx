'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import styles from './Footer.module.css';

export default function Footer() {
    const t = useTranslations('footer');
    const currentYear = new Date().getFullYear();

    const openConsultation = () => {
        window.dispatchEvent(new CustomEvent('open-consultation-modal'));
    };

    const shopLinks = [
        { href: '/products', label: t('links.allProducts') },
        { href: '/tube-amplifiers', label: t('links.tubeAmplifiers') },
        { href: '/products?condition=vintage', label: t('links.vintage') },
        { href: '/products?sort=newest', label: t('links.newArrivals') },
    ];

    const supportLinks = [
        { href: '/contact', label: t('links.contact') },
        { href: '/service', label: t('links.service') },
        { href: '/guides', label: t('links.guides') },
        { href: '/order/track', label: t('links.trackOrder') },
        { href: '/reviews', label: t('links.reviews') },
    ];

    const policyLinks = [
        { href: '/policies/shipping', label: t('links.shipping') },
        { href: '/policies/warranty', label: t('links.warranty') },
        { href: '/policies/returns', label: t('links.returns') },
        { href: '/policies/payment', label: t('links.payment') },
        { href: '/policies/privacy', label: t('links.privacy') },
        { href: '/policies/terms', label: t('links.terms') },
    ];

    return (
        <footer className={styles.footer}>
            <div className="container">
                {/* Trust Section */}
                <div className={styles.footerTrust}>
                    <h3 className={styles.trustTitle}>{t('trust.title')}</h3>
                    <div className={styles.trustGrid}>
                        <div className={styles.trustItem}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span>{t('trust.tested')}</span>
                        </div>
                        <div className={styles.trustItem}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span>{t('trust.packaging')}</span>
                        </div>
                        <div className={styles.trustItem}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m10.607 2.121a6 6 0 010 8.486m-8.486 0a6 6 0 010-8.486M12 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span>{t('trust.support')}</span>
                        </div>
                        <div className={styles.trustItem}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span>{t('trust.warranty')}</span>
                        </div>
                    </div>
                </div>

                <div className="divider divider-accent"></div>

                {/* Main Footer Content */}
                <div className={styles.footerMain}>
                    {/* Store Info & Direct Contact */}
                    <div className={styles.footerStoreSection}>
                        <h4 className={styles.footerBrand}>{t('storeInfo.title')}</h4>
                        <p className={styles.footerDescription}>{t('storeInfo.description')}</p>
                        
                        <div className={styles.footerContactList}>
                            {/* Address */}
                            <div className={styles.contactItem}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={styles.contactIcon}>
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="currentColor"/>
                                </svg>
                                <div>
                                    <span className={styles.contactValue}>{t('storeInfo.address')}</span>
                                    <span className={styles.contactSub}>{t('storeInfo.showroomNote')}</span>
                                </div>
                            </div>

                            {/* Phone / Hotline */}
                            <div className={styles.contactItem}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={styles.contactIcon}>
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                </svg>
                                <div>
                                    <a href="tel:0931772150" className={styles.contactLink}>
                                        <strong>{t('storeInfo.phone')}</strong>
                                    </a>
                                    <span className={styles.contactSub}>{t('storeInfo.hours')}</span>
                                </div>
                            </div>

                            {/* Email */}
                            <div className={styles.contactItem}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={styles.contactIcon}>
                                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <a href={`mailto:${t('storeInfo.email')}`} className={styles.contactLink}>
                                    {t('storeInfo.email')}
                                </a>
                            </div>
                        </div>

                        {/* Direct Chat / Consultation Buttons in Footer */}
                        <div className={styles.footerCtaButtons}>
                            <a
                                href="https://zalo.me/0931772150"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.zaloBadge}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.84 7.08L5 22l4.13-1.65c.92.26 1.89.4 2.87.4 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1 13.5h-2v-2h2v2zm0-4h-2V7h2v4.5z"/>
                                </svg>
                                <span>Chat Zalo</span>
                            </a>

                            <a
                                href="https://m.me/vintageaudioaccessories"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.fbBadge}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.54 3.12 7.42V22l3.41-1.87c1.07.3 2.21.47 3.47.47 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm1.05 13.13l-2.67-2.85-5.21 2.85 5.73-6.08 2.74 2.85 5.14-2.85-5.73 6.08z"/>
                                </svg>
                                <span>Messenger</span>
                            </a>

                            <button
                                onClick={openConsultation}
                                className={styles.consultBadge}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>Tư Vấn Sản Phẩm</span>
                            </button>
                        </div>
                    </div>

                    {/* Shop Links */}
                    <div className={styles.footerSection}>
                        <h5 className={styles.footerHeading}>{t('sections.shop')}</h5>
                        <ul className={styles.footerLinks}>
                            {shopLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div className={styles.footerSection}>
                        <h5 className={styles.footerHeading}>{t('sections.support')}</h5>
                        <ul className={styles.footerLinks}>
                            {supportLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Policy Links */}
                    <div className={styles.footerSection}>
                        <h5 className={styles.footerHeading}>{t('sections.policies')}</h5>
                        <ul className={styles.footerLinks}>
                            {policyLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="divider"></div>

                {/* Copyright & Disclaimer */}
                <div className={styles.footerBottom}>
                    <p className={styles.copyright}>© {currentYear} {t('storeInfo.title')}. Tất cả quyền được bảo lưu.</p>
                    <p className={styles.addressLine}>S10.01 Vinhomes Grand Park, Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh · Hotline: 0931 772 150</p>
                </div>
            </div>
        </footer>
    );
}
