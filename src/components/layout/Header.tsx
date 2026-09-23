'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import type { CategoryDTO } from '@/lib/types/catalog';
import LocaleSwitcher from '../LocaleSwitcher';
import styles from './Header.module.css';

export default function Header({ categories = [] }: { categories?: CategoryDTO[] }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  const navLinks = [
    { href: '/brands', label: t('brands') },
    { href: '/guides', label: t('guides') },
    { href: '/reviews', label: t('reviews') },
    { href: '/contact', label: t('contact') },
    { href: '/order/track', label: t('trackOrder') },
  ];

  return (
    <>
      <header className={`${styles.header} ${isScrolled ? styles['header-scrolled'] : ''}`}>
        <div className="container">
          <div className={styles['header-content']}>
            {/* Logo */}
            <Link href="/" className={styles.logo}>
              <div className={styles['logo-image-wrapper']}>
                <Image
                  src="/images/logo.jpg"
                  alt="Vintage Audio Accessories"
                  width={100}
                  height={100}
                  priority
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className={styles['nav-desktop']}>
              {/* Products dropdown */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setIsProductsOpen(true)}
                onMouseLeave={() => setIsProductsOpen(false)}
              >
                <Link
                  href="/products"
                  className={`${styles['nav-link']} ${pathname === '/products' ? styles.active : ''}`}
                >
                  {t('products')}
                </Link>
                {categories.length > 0 && isProductsOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-md)',
                      minWidth: 240,
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-xs)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    }}
                  >
                    <Link href="/products" className={styles['nav-link']} style={{ fontWeight: 600 }}>
                      {t('allProducts')}
                    </Link>
                    {categories.map((cat) => (
                      <div key={cat.id} style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link
                          href={`/products?category=${cat.slug}`}
                          className={styles['nav-link']}
                          style={{ fontWeight: 600 }}
                        >
                          {cat.name}
                        </Link>
                        {cat.children?.map((child) => (
                          <Link
                            key={child.id}
                            href={`/products?category=${child.slug}`}
                            className={styles['nav-link']}
                            style={{ paddingLeft: 'var(--space-md)', fontSize: '0.9rem' }}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles['nav-link']} ${pathname === link.href ? styles.active : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className={styles['header-actions']}>
              <LocaleSwitcher />
              <button className={`btn btn-ghost ${styles['search-btn']}`} aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
                  <path d="M12.5 12.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <Link href="/cart" className={`btn btn-ghost ${styles['cart-btn']}`}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-1.5 4.5M17 13l1.5 4.5M9 18a1 1 0 100-2 1 1 0 000 2zM15 18a1 1 0 100-2 1 1 0 000 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className={styles['cart-count']}>0</span>
              </Link>
              <button className={`btn btn-primary ${styles['btn-matching']}`}>
                {t('matchingAdvice')}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                className={`${styles['mobile-menu-toggle']} ${isMobileMenuOpen ? styles.active : ''}`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      <div
        className={`${styles['mobile-menu-overlay']} ${isMobileMenuOpen ? styles.active : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile Navigation Drawer */}
      <nav
        className={`${styles['nav-mobile']} ${isMobileMenuOpen ? styles.active : ''}`}
        aria-label="Mobile navigation"
      >
        {/* Drawer Header */}
        <div style={{ paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-md)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)' }}>
            Menu
          </p>
        </div>

        {/* Products Link + Category sub-links */}
        <Link
          href="/products"
          className={`${styles['nav-link']} ${pathname === '/products' ? styles.active : ''}`}
          onClick={closeMobileMenu}
        >
          {t('products')}
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className={styles['nav-link']}
            style={{ paddingLeft: 'var(--space-lg)', fontSize: '0.9rem', color: 'var(--color-text-tertiary)' }}
            onClick={closeMobileMenu}
          >
            {cat.name}
          </Link>
        ))}

        {/* Other nav links */}
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles['nav-link']} ${pathname === link.href ? styles.active : ''}`}
            onClick={closeMobileMenu}
          >
            {link.label}
          </Link>
        ))}

        {/* CTA at bottom */}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--color-border-subtle)' }}>
          <Link href="/products" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={closeMobileMenu}>
            {t('matchingAdvice')}
          </Link>
        </div>
      </nav>
    </>
  );
}
