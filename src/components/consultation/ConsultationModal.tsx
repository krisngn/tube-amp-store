'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './ConsultationModal.module.css';

interface ModalDetail {
    productName?: string;
    source?: string;
}

export default function ConsultationModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [productName, setProductName] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setIsSubmitted(false);
    }, []);

    useEffect(() => {
        const handleOpen = (e: Event) => {
            const customEvent = e as CustomEvent<ModalDetail>;
            if (customEvent.detail?.productName) {
                setProductName(customEvent.detail.productName);
                setMessage(`Tôi cần tư vấn thêm về sản phẩm: ${customEvent.detail.productName}`);
            } else {
                setProductName(null);
                setMessage('');
            }
            setIsSubmitted(false);
            setIsOpen(true);
        };

        window.addEventListener('open-consultation-modal', handleOpen);
        return () => window.removeEventListener('open-consultation-modal', handleOpen);
    }, []);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeModal]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/messages', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, message }),
            });
            if (!res.ok) throw new Error();
            setIsSubmitted(true);
        } catch {
            setError('Chưa gửi được lời nhắn. Vui lòng thử lại hoặc liên hệ qua Zalo.');
        } finally { setLoading(false); }
    };

    if (!isOpen) return null;

    const zaloUrl = `https://zalo.me/0931772150`;
    // Messenger link to admin / page
    const messengerUrl = `https://m.me/vintageaudioaccessories`;

    return (
        <div
            className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) closeModal();
            }}
            aria-modal="true"
            role="dialog"
        >
            <div className={styles.modal}>
                <button
                    className={styles.closeBtn}
                    onClick={closeModal}
                    aria-label="Đóng cửa sổ"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>

                <div className={styles.header}>
                    <div className={styles.badge}>Hỗ Trợ Mua Hàng Online</div>
                    <h3 className={styles.title}>Tư Vấn Sản Phẩm Âm Thanh</h3>
                    <p className={styles.subtitle}>
                        Chọn kênh trao đổi thuận tiện nhất với bạn để được giải đáp thắc mắc, tìm hiểu thông tin sản phẩm hoặc được hỗ trợ mua hàng online.
                    </p>
                </div>

                {productName && (
                    <div className={styles.productTarget}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span>Đang yêu cầu tư vấn: <strong>{productName}</strong></span>
                    </div>
                )}

                {/* Direct Channel Cards */}
                <div className={styles.channels}>
                    {/* Zalo */}
                    <a
                        href={zaloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.channelCard}
                    >
                        <div className={styles.channelLeft}>
                            <div className={`${styles.channelIcon} ${styles.zaloIcon}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.84 7.08L5 22l4.13-1.65c.92.26 1.89.4 2.87.4 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1 13.5h-2v-2h2v2zm0-4h-2V7h2v4.5z"/>
                                </svg>
                            </div>
                            <div className={styles.channelText}>
                                <h4>Nhắn tin qua Zalo (Ưu tiên)</h4>
                                <p>Số Zalo: 0931 772 150</p>
                            </div>
                        </div>
                        <span className={styles.channelAction}>
                            Mở Zalo
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </span>
                    </a>

                    {/* Facebook Messenger */}
                    <a
                        href={messengerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.channelCard}
                    >
                        <div className={styles.channelLeft}>
                            <div className={`${styles.channelIcon} ${styles.fbIcon}`}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.54 3.12 7.42V22l3.41-1.87c1.07.3 2.21.47 3.47.47 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm1.05 13.13l-2.67-2.85-5.21 2.85 5.73-6.08 2.74 2.85 5.14-2.85-5.73 6.08z"/>
                                </svg>
                            </div>
                            <div className={styles.channelText}>
                                <h4>Nhắn tin qua Facebook</h4>
                                <p>Hỏi thông số, tình trạng sản phẩm và đơn hàng</p>
                            </div>
                        </div>
                        <span className={styles.channelAction}>
                            Mở Messenger
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </span>
                    </a>

                    {/* Hotline */}
                    <a
                        href="tel:0931772150"
                        className={styles.channelCard}
                    >
                        <div className={styles.channelLeft}>
                            <div className={`${styles.channelIcon} ${styles.phoneIcon}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                </svg>
                            </div>
                            <div className={styles.channelText}>
                                <h4>Gọi Hotline Trực Tiếp</h4>
                                <p>0931 772 150 · 08:30 - 21:00 hàng ngày</p>
                            </div>
                        </div>
                        <span className={styles.channelAction}>
                            Gọi ngay
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </span>
                    </a>
                </div>

                {/* Quick callback form */}
                <div className={styles.formSection}>
                    <h4 className={styles.formTitle}>Hoặc để lại số điện thoại để admin gọi lại:</h4>
                    <p className={styles.formSubtitle}>Chúng tôi sẽ chủ động gọi điện hoặc nhắn Zalo tư vấn chi tiết cho bạn.</p>

                    {isSubmitted ? (
                        <div className={styles.successToast}>
                            ✓ Yêu cầu tư vấn đã được gửi thành công! Admin sẽ liên hệ lại với bạn qua số <strong>{phone}</strong> trong thời gian sớm nhất.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGrid}>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="Họ tên của bạn"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <input
                                    type="tel"
                                    required
                                    className={styles.formInput}
                                    placeholder="Số điện thoại / Zalo *"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <textarea
                                rows={3}
                                required
                                maxLength={5000}
                                className={styles.formTextarea}
                                placeholder="Nhu cầu tư vấn (VD: Chọn ampli đánh loa Tannoy, hoặc câu hỏi của bạn...)"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            {error && <p role="alert" style={{ color: '#f87171' }}>{error}</p>}
                            <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
                                {loading ? 'Đang gửi...' : 'Gửi Lời Nhắn'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
