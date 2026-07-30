'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ProductDetailDTO } from '@/lib/types/catalog';
import { flattenTree } from '@/lib/utils/categoryTree';
import ProductImageManager from './ProductImageManager';
import styles from './ProductForm.module.css';

interface CategoryOption {
    id: string;
    nameVi: string;
    parentId: string | null;
}

interface BrandOption {
    id: string;
    name: string;
}

interface ProductFormProps {
    product?: ProductDetailDTO;
    categories?: CategoryOption[];
    brands?: BrandOption[];
}

export default function ProductForm({ product, categories = [], brands = [] }: ProductFormProps) {
    const t = useTranslations('admin');
    const router = useRouter();
    const isEdit = !!product;

    // Category picker: a single indented tree select (unlimited depth)
    const [categoryId, setCategoryId] = useState(product?.categoryId || '');
    const [brandId, setBrandId] = useState(product?.brandId || '');

    const categoryOptions = flattenTree(categories).map((n) => ({
        id: n.item.id,
        label: `${'   '.repeat(n.depth)}${n.item.nameVi}`,
    }));
    const selectedCategoryId = categoryId || null;

    const [formData, setFormData] = useState({
        // Core fields
        slug: product?.slug || '',
        price: product?.priceVnd || 0,
        compareAtPrice: product?.compareAtPriceVnd || 0,
        stockQuantity: product?.stockQuantity || 0,
        condition: product?.condition || 'new',
        topology: product?.topology || '',
        tubeType: product?.tubeType || '',
        powerWatts: product?.powerWatts || 0,
        taps: (product?.taps || []).join(','),
        minSpeakerSensitivity: product?.recommendedSensitivityMin || 0,
        isPublished: product ? (product.publishedAt ? true : false) : false,
        isFeatured: product?.isFeatured || false,
        isVintage: product?.isVintage || false,
        // Deposit reservation
        allowDeposit: product?.allowDeposit || false,
        depositType: product?.depositType || 'percent',
        depositAmount: product?.depositAmount || 0,
        depositPercentage: product?.depositPercentage || 20,
        depositDueHours: product?.depositDueHours || 24,
        reservationPolicyNote: product?.reservationPolicyNote || '',
        // Translations
        nameVi: product?.name || '',
        nameEn: '',
        descriptionVi: product?.description || '',
        descriptionEn: '',
        shortDescriptionVi: product?.shortDescription || '',
        shortDescriptionEn: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    useEffect(() => {
        // Load English translation if editing
        if (product && product.id) {
            // Fetch English translation
            fetch(`/api/admin/products/${product.id}/translations/en`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.name) {
                        setFormData((prev) => ({
                            ...prev,
                            nameEn: data.name,
                            descriptionEn: data.description || '',
                            shortDescriptionEn: data.shortDescription || '',
                        }));
                    }
                })
                .catch(() => {
                    // English translation might not exist yet
                });
        }
    }, [product]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        setSelectedImages((prev) => [...prev, ...newFiles]);

        // Create previews
        const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
        setImagePreviews((prev) => [...prev, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
        // Revoke object URL to prevent memory leak
        URL.revokeObjectURL(imagePreviews[index]);
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const payload = {
                slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
                price: formData.price,
                compareAtPrice: formData.compareAtPrice || undefined,
                stockQuantity: formData.stockQuantity,
                condition: formData.condition,
                topology: formData.topology || undefined,
                tubeType: formData.tubeType || undefined,
                powerWatts: formData.powerWatts || undefined,
                taps: formData.taps.split(',').filter((t) => t.trim()).map((t) => t.trim()),
                minSpeakerSensitivity: formData.minSpeakerSensitivity || undefined,
                categoryId: selectedCategoryId,
                brandId: brandId || null,
                isPublished: publish,
                isFeatured: formData.isFeatured,
                isVintage: formData.isVintage,
                allowDeposit: formData.allowDeposit,
                depositType: formData.allowDeposit ? formData.depositType : undefined,
                depositAmount: formData.allowDeposit && formData.depositType === 'fixed' ? formData.depositAmount : undefined,
                depositPercentage: formData.allowDeposit && formData.depositType === 'percent' ? formData.depositPercentage : undefined,
                depositDueHours: formData.allowDeposit ? formData.depositDueHours : undefined,
                reservationPolicyNote: formData.allowDeposit ? formData.reservationPolicyNote : undefined,
                translations: {
                    vi: {
                        name: formData.nameVi,
                        shortDescription: formData.shortDescriptionVi || undefined,
                        description: formData.descriptionVi || undefined,
                    },
                    en: {
                        name: formData.nameEn || formData.nameVi, // Fallback to VI if EN empty
                        shortDescription: formData.shortDescriptionEn || undefined,
                        description: formData.descriptionEn || undefined,
                    },
                },
            };

            const url = isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products';
            const method = isEdit ? 'PUT' : 'POST';

            let response: Response;
            
            // If creating new product and has images, use FormData
            if (!isEdit && selectedImages.length > 0) {
                const formDataToSend = new FormData();
                formDataToSend.append('productData', JSON.stringify(payload));
                
                selectedImages.forEach((file, index) => {
                    formDataToSend.append(`images[${index}]`, file);
                });

                response = await fetch(url, {
                    method,
                    body: formDataToSend,
                });
            } else {
                // Use JSON for edit or create without images
                response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save product');
            }

            setSuccess(true);
            
            // Clear selected images after successful creation
            if (!isEdit) {
                selectedImages.forEach((_, index) => {
                    URL.revokeObjectURL(imagePreviews[index]);
                });
                setSelectedImages([]);
                setImagePreviews([]);
            }
            
            // If creating new product, redirect to edit page
            if (!isEdit && result.id) {
                setTimeout(() => {
                    router.push(`/admin/products/${result.id}`);
                }, 1000);
            } else if (isEdit) {
                // If editing, reload the page to refresh product data and show image manager
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className={styles.productForm} onSubmit={(e) => handleSubmit(e, false)}>
            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{t('products.list.saved')}</div>}

            <div className={styles.formSection}>
                <h2>{t('products.form.basicInfo')}</h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.name')} (VI) *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.nameVi}
                            onChange={(e) => setFormData({ ...formData, nameVi: e.target.value })}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.name')} (EN)</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.nameEn}
                            onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.slug')} *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            required
                            pattern="[a-z0-9-]+"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.price')} (VND) *</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            required
                            min="0"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.compareAtPrice')} (VND)</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.compareAtPrice}
                            onChange={(e) => setFormData({ ...formData, compareAtPrice: Number(e.target.value) })}
                            min="0"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.stock')} *</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.stockQuantity}
                            onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                            required
                            min="0"
                        />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h2>Phân loại</h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className="label">Danh mục</label>
                        <select
                            className="input"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                        >
                            <option value="">— Chọn danh mục —</option>
                            {categoryOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">Thương hiệu</label>
                        <select
                            className="input"
                            value={brandId}
                            onChange={(e) => setBrandId(e.target.value)}
                        >
                            <option value="">— Chọn thương hiệu —</option>
                            {brands.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h2>{t('products.form.specifications')}</h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.condition')} *</label>
                        <select
                            className="input"
                            value={formData.condition}
                            onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                            required
                        >
                            <option value="new">{t('products.condition.new')}</option>
                            <option value="like_new">{t('products.condition.likeNew')}</option>
                            <option value="vintage">{t('products.condition.vintage')}</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.topology')}</label>
                        <select
                            className="input"
                            value={formData.topology}
                            onChange={(e) => setFormData({ ...formData, topology: e.target.value as any })}
                        >
                            <option value="">—</option>
                            <option value="se">SE</option>
                            <option value="pp">PP</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.tubeType')}</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.tubeType}
                            onChange={(e) => setFormData({ ...formData, tubeType: e.target.value })}
                            placeholder="300B, EL34, KT88..."
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.power')} (W)</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.powerWatts}
                            onChange={(e) => setFormData({ ...formData, powerWatts: Number(e.target.value) })}
                            min="0"
                            step="0.1"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.taps')}</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.taps}
                            onChange={(e) => setFormData({ ...formData, taps: e.target.value })}
                            placeholder="4, 8, 16"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">{t('products.fields.minSensitivity')} (dB)</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.minSpeakerSensitivity}
                            onChange={(e) => setFormData({ ...formData, minSpeakerSensitivity: Number(e.target.value) })}
                            min="0"
                        />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h2>{t('products.form.translations')}</h2>
                <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className="label">{t('products.fields.description')} (VI)</label>
                        <textarea
                            className="input"
                            rows={6}
                            value={formData.descriptionVi}
                            onChange={(e) => setFormData({ ...formData, descriptionVi: e.target.value })}
                        />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className="label">{t('products.fields.description')} (EN)</label>
                        <textarea
                            className="input"
                            rows={6}
                            value={formData.descriptionEn}
                            onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h2>{t('products.form.depositReservation')}</h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.allowDeposit}
                                onChange={(e) => setFormData({ ...formData, allowDeposit: e.target.checked })}
                            />
                            {t('products.form.allowDeposit')}
                        </label>
                    </div>
                    {formData.allowDeposit && (
                        <>
                            <div className={styles.formGroup}>
                                <label className="label">{t('products.form.depositType')}</label>
                                <select
                                    className="input"
                                    value={formData.depositType}
                                    onChange={(e) => setFormData({ ...formData, depositType: e.target.value as 'percent' | 'fixed' })}
                                >
                                    <option value="percent">{t('products.form.depositPercent')}</option>
                                    <option value="fixed">{t('products.form.depositFixed')}</option>
                                </select>
                            </div>
                            {formData.depositType === 'percent' ? (
                                <div className={styles.formGroup}>
                                    <label className="label">{t('products.form.depositPercentage')} (%)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.depositPercentage}
                                        onChange={(e) => setFormData({ ...formData, depositPercentage: Number(e.target.value) })}
                                        min="1"
                                        max="100"
                                    />
                                </div>
                            ) : (
                                <div className={styles.formGroup}>
                                    <label className="label">{t('products.form.depositAmount')} (VND)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.depositAmount}
                                        onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                                        min="0"
                                    />
                                </div>
                            )}
                            <div className={styles.formGroup}>
                                <label className="label">{t('products.form.depositDueHours')} (hours)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.depositDueHours}
                                    onChange={(e) => setFormData({ ...formData, depositDueHours: Number(e.target.value) })}
                                    min="1"
                                />
                            </div>
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className="label">{t('products.form.reservationPolicyNote')}</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={formData.reservationPolicyNote}
                                    onChange={(e) => setFormData({ ...formData, reservationPolicyNote: e.target.value })}
                                    placeholder={t('products.form.reservationPolicyNotePlaceholder')}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.formSection}>
                <h2>{t('products.form.publishing')}</h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.isPublished}
                                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                            />
                            {t('products.form.published')}
                        </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.isFeatured}
                                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                            />
                            {t('products.form.featured')}
                        </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.isVintage}
                                onChange={(e) => setFormData({ ...formData, isVintage: e.target.checked })}
                            />
                            {t('products.form.vintage')}
                        </label>
                    </div>
                </div>
            </div>

            <div id="product-images-section" className={styles.formSection}>
                <h2>{t('products.images.title')}</h2>
                {isEdit && product?.id ? (
                    <ProductImageManager productId={product.id} />
                ) : (
                    <div className={styles.imageUploadSection}>
                        <label className={styles.imageUploadLabel}>
                            <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleImageSelect}
                                disabled={loading}
                                style={{ display: 'none' }}
                            />
                            <div className={styles.imageUploadButton}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M12 5v14m-7-7h14"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {t('products.images.upload')}
                            </div>
                        </label>
                        {selectedImages.length > 0 && (
                            <div className={styles.imagePreviewGrid}>
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className={styles.imagePreviewCard}>
                                        <img src={preview} alt={`Preview ${index + 1}`} />
                                        {index === 0 && (
                                            <div className={styles.primaryBadge}>
                                                {t('products.images.cover')}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            className={styles.removeImageButton}
                                            onClick={() => removeImage(index)}
                                            aria-label="Remove image"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedImages.length === 0 && (
                            <p className={styles.imageUploadHint}>
                                {t('products.images.uploadHint')}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.formActions}>
                <button
                    type="button"
                    onClick={(e) => handleSubmit(e, false)}
                    className="btn btn-secondary"
                    disabled={loading}
                >
                    {loading ? t('products.list.saving') : t('products.saveDraft')}
                </button>
                <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? t('products.list.saving') : t('products.publish')}
                </button>
            </div>
        </form>
    );
}
