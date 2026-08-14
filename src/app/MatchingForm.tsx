'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './HomePage.module.css';

/**
 * Speaker/amp matching tool (client-side form). Extracted so the home page can
 * be a server component and fetch real products/categories.
 */
export default function MatchingForm() {
    const t = useTranslations('home');
    const [matchingForm, setMatchingForm] = useState({
        sensitivity: '',
        impedance: '8',
        roomSize: 'medium',
        listeningLevel: 'medium',
        genres: '',
    });

    const handleMatchingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement matching logic
        console.log('Matching form submitted:', matchingForm);
    };

    return (
        <section className={`${styles.matching} ${styles.section}`}>
            <div className="container">
                <div>
                    <div>
                        <h2 className={styles.sectionTitle}>{t('matching.title')}</h2>
                        <p className={styles.sectionSubtitle}>{t('matching.subtitle')}</p>
                    </div>
                    <form onSubmit={handleMatchingSubmit} className={`${styles.matchingForm} card-elevated`}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className="label">{t('matching.form.sensitivity.label')}</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder={t('matching.form.sensitivity.placeholder')}
                                    value={matchingForm.sensitivity}
                                    onChange={(e) => setMatchingForm({ ...matchingForm, sensitivity: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className="label">{t('matching.form.impedance.label')}</label>
                                <select
                                    className="input select"
                                    value={matchingForm.impedance}
                                    onChange={(e) => setMatchingForm({ ...matchingForm, impedance: e.target.value })}
                                >
                                    <option value="4">{t('matching.form.impedance.options.4')}</option>
                                    <option value="6">{t('matching.form.impedance.options.6')}</option>
                                    <option value="8">{t('matching.form.impedance.options.8')}</option>
                                    <option value="16">{t('matching.form.impedance.options.16')}</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className="label">{t('matching.form.roomSize.label')}</label>
                                <select
                                    className="input select"
                                    value={matchingForm.roomSize}
                                    onChange={(e) => setMatchingForm({ ...matchingForm, roomSize: e.target.value })}
                                >
                                    <option value="small">{t('matching.form.roomSize.options.small')}</option>
                                    <option value="medium">{t('matching.form.roomSize.options.medium')}</option>
                                    <option value="large">{t('matching.form.roomSize.options.large')}</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className="label">{t('matching.form.listeningLevel.label')}</label>
                                <select
                                    className="input select"
                                    value={matchingForm.listeningLevel}
                                    onChange={(e) => setMatchingForm({ ...matchingForm, listeningLevel: e.target.value })}
                                >
                                    <option value="low">{t('matching.form.listeningLevel.options.low')}</option>
                                    <option value="medium">{t('matching.form.listeningLevel.options.medium')}</option>
                                    <option value="loud">{t('matching.form.listeningLevel.options.loud')}</option>
                                </select>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className="label">{t('matching.form.genres.label')}</label>
                            <input
                                type="text"
                                className="input"
                                placeholder={t('matching.form.genres.placeholder')}
                                value={matchingForm.genres}
                                onChange={(e) => setMatchingForm({ ...matchingForm, genres: e.target.value })}
                            />
                        </div>
                        <div className={styles.formSubmit}>
                            <button type="submit" className="btn btn-primary">
                                {t('matching.form.submit')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}
