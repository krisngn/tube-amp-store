'use client';

import { useState } from 'react';
import styles from '../taxonomy.module.css';
import msgStyles from './messages.module.css';

interface Message {
    id: string;
    name: string | null;
    phone: string;
    message: string | null;
    is_read: boolean;
    created_at: string;
}

interface Props {
    messages: Message[];
}

export default function MessagesTable({ messages: initialMessages }: Props) {
    const [messages, setMessages] = useState(initialMessages);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    const filtered = messages.filter((m) => {
        const matchFilter = filter === 'all' || !m.is_read;
        const q = search.toLowerCase();
        const matchSearch =
            !q ||
            (m.name || '').toLowerCase().includes(q) ||
            m.phone.includes(q) ||
            (m.message || '').toLowerCase().includes(q);
        return matchFilter && matchSearch;
    });

    const unreadCount = messages.filter((m) => !m.is_read).length;

    const markRead = async (id: string) => {
        try {
            setError('');
            const response = await fetch(`/api/messages/${id}/read`, { method: 'PATCH' });
            if (!response.ok) throw new Error('Update failed');
            setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
            );
        } catch {
            setError('Chưa đánh dấu được lời nhắn. Vui lòng thử lại.');
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 style={{ margin: 0 }}>Lời Nhắn Tư Vấn</h1>
                    {unreadCount > 0 && (
                        <span className={msgStyles.unreadBadge}>
                            {unreadCount} chưa đọc
                        </span>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className={msgStyles.toolbar}>
                <div className={msgStyles.filterGroup}>
                    <button
                        className={`${msgStyles.filterBtn} ${filter === 'all' ? msgStyles.active : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Tất cả ({messages.length})
                    </button>
                    <button
                        className={`${msgStyles.filterBtn} ${filter === 'unread' ? msgStyles.active : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        Chưa đọc ({unreadCount})
                    </button>
                </div>
                <input
                    type="search"
                    className={msgStyles.searchInput}
                    placeholder="Tìm theo tên, SĐT, nội dung..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {error && <p role="alert">{error}</p>}
            {/* Table */}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>Tên</th>
                            <th>Số điện thoại</th>
                            <th>Nội dung lời nhắn</th>
                            <th>Thời gian</th>
                            <th>Trạng thái</th>
                            <th style={{ width: '100px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className={styles.empty}>
                                    {search || filter === 'unread'
                                        ? 'Không tìm thấy lời nhắn nào.'
                                        : 'Chưa có lời nhắn nào.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((m, i) => (
                                <tr
                                    key={m.id}
                                    className={!m.is_read ? msgStyles.unreadRow : ''}
                                >
                                    <td className={styles.muted}>{i + 1}</td>
                                    <td>
                                        <span className={!m.is_read ? msgStyles.boldText : ''}>
                                            {m.name || <span className={styles.muted}>—</span>}
                                        </span>
                                    </td>
                                    <td>
                                        <a
                                            href={`tel:${m.phone}`}
                                            className={msgStyles.phoneLink}
                                        >
                                            {m.phone}
                                        </a>
                                    </td>
                                    <td className={msgStyles.messageCell}>
                                        {m.message || <span className={styles.muted}>—</span>}
                                    </td>
                                    <td className={styles.muted} style={{ whiteSpace: 'nowrap' }}>
                                        {formatDate(m.created_at)}
                                    </td>
                                    <td>
                                        <span
                                            className={`${styles.badge} ${m.is_read ? styles.badgeInactive : msgStyles.badgeUnread}`}
                                        >
                                            {m.is_read ? 'Đã đọc' : 'Mới'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            {!m.is_read && (
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                                                    onClick={() => markRead(m.id)}
                                                    title="Đánh dấu đã đọc"
                                                >
                                                    ✓ Đọc
                                                </button>
                                            )}
                                            <a
                                                href={`tel:${m.phone}`}
                                                className="btn btn-primary"
                                                style={{ fontSize: '0.8rem', padding: '4px 10px', textDecoration: 'none' }}
                                                title="Gọi ngay"
                                            >
                                                📞
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
