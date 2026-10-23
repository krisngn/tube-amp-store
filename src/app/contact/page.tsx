'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function ContactPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [topic, setTopic] = useState('tu-van');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone) return;
        setIsSubmitted(true);
    };

    return (
        <div className={styles.contactPage}>
            <div className="container">
                {/* Breadcrumb */}
                <nav className={styles.breadcrumb}>
                    <Link href="/">Trang chủ</Link>
                    <span>/</span>
                    <span>Liên hệ & Phòng nghe</span>
                </nav>

                {/* Hero Header */}
                <div className={styles.heroHeader}>
                    <div className={styles.badge}>Kết Nối Cùng Đam Mê Audio</div>
                    <h1 className={styles.title}>Liên Hệ & Trải Nghiệm Thực Tế</h1>
                    <p className={styles.subtitle}>
                        Chúng tôi luôn sẵn sàng đón tiếp quý khách đến nghe thử trực tiếp tại phòng nghe hoặc tư vấn chu đáo 1-1 qua các kênh Zalo, Facebook Messenger và Hotline.
                    </p>
                </div>

                {/* Main 2 Columns Layout */}
                <div className={styles.contactLayout}>
                    {/* Info Column */}
                    <div className={styles.infoColumn}>
                        <div className={styles.infoCard}>
                            {/* Address & Showroom */}
                            <div className={styles.infoItem}>
                                <div className={styles.iconWrapper}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="currentColor"/>
                                    </svg>
                                </div>
                                <div className={styles.itemContent}>
                                    <h4>Phòng Nghe Trải Nghiệm & Showroom</h4>
                                    <p><strong>Tòa S10.01, Vinhomes Grand Park</strong></p>
                                    <p>Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh</p>
                                    <p style={{ marginTop: 4, color: 'var(--color-accent-bright)', fontSize: '0.825rem' }}>
                                        ✓ Bãi đỗ xe ô tô & xe máy rộng rãi ngay sảnh, an ninh 24/7. Vui lòng liên hệ trước để chúng tôi chuẩn bị phòng nghe chu đáo.
                                    </p>
                                </div>
                            </div>

                            {/* Hotline & Zalo */}
                            <div className={styles.infoItem}>
                                <div className={styles.iconWrapper}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                    </svg>
                                </div>
                                <div className={styles.itemContent}>
                                    <h4>Hotline & Zalo Kỹ Thuật</h4>
                                    <a href="tel:0931772150" className={styles.itemLink}>0931 772 150</a>
                                    <p>Hỗ trợ tư vấn thông số, video test âm thanh thực tế & ghép loa</p>
                                </div>
                            </div>

                            {/* Operating Hours */}
                            <div className={styles.infoItem}>
                                <div className={styles.iconWrapper}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
                                    </svg>
                                </div>
                                <div className={styles.itemContent}>
                                    <h4>Thời Gian Đón Tiếp</h4>
                                    <p><strong>08:30 - 21:00</strong> tất cả các ngày trong tuần</p>
                                    <p>Kể cả Thứ 7, Chủ Nhật và ngày lễ</p>
                                </div>
                            </div>

                            {/* Email */}
                            <div className={styles.infoItem}>
                                <div className={styles.iconWrapper}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <div className={styles.itemContent}>
                                    <h4>Hòm Thư Điện Tử</h4>
                                    <a href="mailto:thientan.3003.01@gmail.com" className={styles.itemLink}>
                                        thientan.3003.01@gmail.com
                                    </a>
                                    <p>Tiếp nhận yêu cầu hợp tác, bảo hành và phản hồi dịch vụ</p>
                                </div>
                            </div>
                        </div>

                        {/* Fast Action Buttons */}
                        <div className={styles.actionButtons}>
                            <a
                                href="https://zalo.me/0931772150"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.actionBtn} ${styles.zaloBtn}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.84 7.08L5 22l4.13-1.65c.92.26 1.89.4 2.87.4 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1 13.5h-2v-2h2v2zm0-4h-2V7h2v4.5z"/>
                                </svg>
                                <span>Chat Zalo</span>
                            </a>

                            <a
                                href="https://m.me/vintageaudioaccessories"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.actionBtn} ${styles.fbBtn}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.54 3.12 7.42V22l3.41-1.87c1.07.3 2.21.47 3.47.47 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm1.05 13.13l-2.67-2.85-5.21 2.85 5.73-6.08 2.74 2.85 5.14-2.85-5.73 6.08z"/>
                                </svg>
                                <span>Messenger</span>
                            </a>

                            <a
                                href="tel:0931772150"
                                className={`${styles.actionBtn} ${styles.phoneBtn}`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                </svg>
                                <span>0931 772 150</span>
                            </a>
                        </div>
                    </div>

                    {/* Contact Form Column */}
                    <div className={styles.formCard}>
                        <h3 className={styles.formCardTitle}>Gửi Lời Nhắn Cho Chúng Tôi</h3>
                        <p className={styles.formCardSubtitle}>
                            Để lại thông tin và yêu cầu của bạn, chuyên viên sẽ phản hồi qua Zalo hoặc gọi lại trong vòng 15 phút.
                        </p>

                        {isSubmitted ? (
                            <div className={styles.successBox}>
                                <h4 style={{ color: '#9fe2a3', marginBottom: 8, fontSize: '1.2rem' }}>
                                    ✓ Đã Gửi Thành Công!
                                </h4>
                                <p>Cảm ơn <strong>{name || 'quý khách'}</strong>! Chúng tôi đã nhận được thông tin và sẽ liên hệ lại qua số điện thoại <strong>{phone}</strong> trong ít phút.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Họ và tên *</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.input}
                                        placeholder="VD: Nguyễn Văn A"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Số điện thoại / Zalo *</label>
                                    <input
                                        type="tel"
                                        required
                                        className={styles.input}
                                        placeholder="VD: 0931 772 150"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email (không bắt buộc)</label>
                                    <input
                                        type="email"
                                        className={styles.input}
                                        placeholder="email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Nội dung cần hỗ trợ</label>
                                    <select
                                        className={styles.select}
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                    >
                                        <option value="tu-van">Tư vấn chọn mua ampli đèn & phụ kiện</option>
                                        <option value="hen-nghe-thu">Đặt hẹn nghe thử tại Vinhomes Grand Park</option>
                                        <option value="ky-thuat">Hỗ trợ kỹ thuật / Bảo hành / Cân chỉnh bias</option>
                                        <option value="khac">Khác</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Tin nhắn chi tiết</label>
                                    <textarea
                                        rows={4}
                                        className={styles.textarea}
                                        placeholder="VD: Tôi đang chơi loa JBL L100, muốn tìm ampli đèn nghe Vocal/Jazz, phòng khoảng 25m2..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                </div>

                                <button type="submit" className={`btn btn-primary ${styles.submitBtn}`}>
                                    Gửi Yêu Cầu Tư Vấn
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
