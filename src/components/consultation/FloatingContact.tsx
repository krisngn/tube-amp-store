'use client';

import styles from './FloatingContact.module.css';

export default function FloatingContact() {
    const openConsultation = () => {
        window.dispatchEvent(new CustomEvent('open-consultation-modal'));
    };

    return (
        <div className={styles.floatingContainer} aria-label="Kênh liên hệ nhanh">
            {/* Consultation Modal Trigger */}
            <button
                onClick={openConsultation}
                className={`${styles.floatingButton} ${styles.consultBtn} ${styles.pulseRing}`}
                title="Tư vấn sản phẩm cùng chuyên viên"
                aria-label="Tư vấn sản phẩm"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.btnText}>Tư Vấn Sản Phẩm</span>
            </button>

            {/* Zalo Button */}
            <a
                href="https://zalo.me/0931772150"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.floatingButton} ${styles.zaloBtn}`}
                title="Chat Zalo: 0931 772 150"
                aria-label="Chat Zalo"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.84 7.08L5 22l4.13-1.65c.92.26 1.89.4 2.87.4 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1 13.5h-2v-2h2v2zm0-4h-2V7h2v4.5z"/>
                </svg>
                <span className={styles.btnText}>Chat Zalo</span>
            </a>

            {/* Hotline Call Button */}
            <a
                href="tel:0931772150"
                className={`${styles.floatingButton} ${styles.phoneBtn}`}
                title="Gọi hotline: 0931 772 150"
                aria-label="Gọi hotline"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                <span className={styles.btnText}>0931 772 150</span>
            </a>
        </div>
    );
}
