import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import ImportExportPanel from './ImportExportPanel';
import styles from '../taxonomy.module.css';

export const dynamic = 'force-dynamic';

export default async function ImportExportPage() {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>{t('importExport.title')}</h1>
            </div>
            <ImportExportPanel />
        </div>
    );
}
