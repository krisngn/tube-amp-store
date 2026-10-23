'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import styles from './CommunityCarousel.module.css';

interface SlideItem {
    src: string;
    caption: string;
    desc: string;
}

const slides: SlideItem[] = [
    {
        src: '/images/community/setup-horn-speaker.jpg',
        caption: 'Horn Speaker + Gramophone',
        desc: 'Setup vintage độc đáo với loa kèn thủ công và tượng nhạc sĩ saxophone',
    },
    {
        src: '/images/community/setup-tubes-6p3s.jpg',
        caption: 'Bộ 4 đèn 6P3S NOS',
        desc: 'Hình ảnh tham khảo một bộ bóng đèn 6P3S',
    },
    {
        src: '/images/community/setup-jbl-sa600.jpg',
        caption: 'JBL SA600 Solid State',
        desc: 'Hình ảnh tham khảo ampli JBL SA600',
    },
    {
        src: '/images/community/setup-western-electric-300b.jpg',
        caption: 'Western Electric 300B Pair',
        desc: 'Hình ảnh tham khảo cặp bóng đèn 300B Western Electric',
    },
    {
        src: '/images/community/setup-lansing-drivers.jpg',
        caption: 'Lansing Driver Collection',
        desc: 'Hình ảnh tham khảo bộ sưu tập driver Lansing',
    },
];

const AUTO_PLAY_MS = 4500;

export default function CommunityCarousel() {
    const [current, setCurrent] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const goTo = useCallback((index: number) => {
        setCurrent((index + slides.length) % slides.length);
    }, []);

    const next = useCallback(() => goTo(current + 1), [current, goTo]);
    const prev = useCallback(() => goTo(current - 1), [current, goTo]);

    // Auto-play
    useEffect(() => {
        if (isHovered) return;
        timerRef.current = setTimeout(next, AUTO_PLAY_MS);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [current, isHovered, next]);

    // Touch / mouse swipe
    const handleDragStart = (clientX: number) => {
        dragStartX.current = clientX;
        setIsDragging(true);
    };

    const handleDragEnd = (clientX: number) => {
        if (dragStartX.current === null) return;
        const delta = dragStartX.current - clientX;
        if (Math.abs(delta) > 40) {
            delta > 0 ? next() : prev();
        }
        dragStartX.current = null;
        setIsDragging(false);
    };

    return (
        <div
            className={styles.carousel}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseUp={(e) => handleDragEnd(e.clientX)}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
            onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
        >
            {/* Slides track */}
            <div
                className={styles.track}
                style={{ transform: `translateX(-${current * 100}%)` }}
                aria-live="polite"
            >
                {slides.map((slide, i) => (
                    <div
                        key={i}
                        className={styles.slide}
                        aria-hidden={i !== current}
                    >
                        <div className={styles.imageWrap}>
                            <Image
                                src={slide.src}
                                alt={slide.caption}
                                fill
                                priority={i === 0}
                                sizes="(max-width: 640px) 100vw, 80vw"
                                style={{ objectFit: 'cover', objectPosition: 'center' }}
                                draggable={false}
                            />
                            {/* Gradient overlay */}
                            <div className={styles.gradientOverlay} />
                        </div>
                        {/* Caption */}
                        <div className={styles.caption}>
                            <h4 className={styles.captionTitle}>{slide.caption}</h4>
                            <p className={styles.captionDesc}>{slide.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Prev / Next buttons */}
            <button
                className={`${styles.navBtn} ${styles.navBtnPrev}`}
                onClick={prev}
                aria-label="Ảnh trước"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            <button
                className={`${styles.navBtn} ${styles.navBtnNext}`}
                onClick={next}
                aria-label="Ảnh tiếp theo"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Dot indicators */}
            <div className={styles.dots} role="tablist">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
                        onClick={() => goTo(i)}
                        aria-label={`Ảnh ${i + 1}`}
                        role="tab"
                        aria-selected={i === current}
                    />
                ))}
            </div>

            {/* Progress bar */}
            {!isHovered && (
                <div className={styles.progressBar} key={current}>
                    <div
                        className={styles.progressFill}
                        style={{ animationDuration: `${AUTO_PLAY_MS}ms` }}
                    />
                </div>
            )}
        </div>
    );
}
