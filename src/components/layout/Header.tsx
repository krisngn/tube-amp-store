'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
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

  const navLinks = [
    { href: '/brands', label: t('brands') },
    { href: '/guides', label: t('guides') },
    { href: '/reviews', label: t('reviews') },
    { href: '/contact', label: t('contact') },
    { href: '/order/track', label: t('trackOrder') },
  ];

  return (
    <header className={`${styles.header} ${isScrolled ? styles['header-scrolled'] : ''}`}>
      <div className="container">
        <div className={styles['header-content']}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <span className={styles['logo-text']}>Vintage Audio Accessories</span>
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
              className={styles['mobile-menu-toggle']}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className={styles['nav-mobile']}>
            <Link
              href="/products"
              className={`${styles['nav-link']} ${pathname === '/products' ? styles.active : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('products')}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className={styles['nav-link']}
                style={{ paddingLeft: 'var(--space-md)' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {cat.name}
              </Link>
            ))}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles['nav-link']} ${pathname === link.href ? styles.active : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
