import React, { useState, useMemo } from 'react';
import { User, Novel } from '../types';
import { Icons } from '../components/Icons';

interface LibraryProps {
    currentUser: User | null;
    novels: Novel[];
    setCurrentView: (view: string) => void;
    setActiveNovelId: (id: number | null) => void;
    toggleBookmark: (id: number) => void;
    openNovelDetail: (id: number) => void;
    startReading?: (novelId: number, chapterIndex: number) => void;
}

export default function Library({
    currentUser,
    novels,
    setCurrentView,
    toggleBookmark,
    openNovelDetail,
    startReading
}: LibraryProps) {
    const [shelfFilter, setShelfFilter] = useState<'all' | 'reading' | 'completed' | 'unread'>('all');
    const [shelfSearch, setShelfSearch] = useState<string>('');

    // Precalculate all bookmarked novel items with their read progress
    const bookmarkedNovels = useMemo(() => {
        if (!currentUser || !currentUser.bookmarks) return [];
        return currentUser.bookmarks.map(id => {
            const novel = novels.find(n => n.id === id);
            if (!novel) return null;

            const progressKey = `mugen_readprogress_${currentUser.username}_${id}`;
            let savedProgress = null;
            try {
                const progressString = localStorage.getItem(progressKey);
                savedProgress = progressString ? JSON.parse(progressString) : null;
            } catch (e) {
                console.error("Parse read progress error:", e);
            }

            let percentage = 0;
            let lastChapterText = "Chưa đọc";
            const totalPublished = novel.chapters ? novel.chapters.filter(c => c.status === 'published').length : 0;
            
            if (savedProgress && totalPublished > 0) {
                lastChapterText = `Chương ${savedProgress.chapterIndex + 1}`;
                const readCount = savedProgress.readChaptersList ? savedProgress.readChaptersList.length : (savedProgress.chapterIndex + 1);
                percentage = Math.min(100, Math.round((readCount / totalPublished) * 100));
            }

            let statusType: 'reading' | 'completed' | 'unread' = 'unread';
            if (percentage === 100 || (percentage > 0 && novel.status === 'completed')) {
                statusType = 'completed';
            } else if (percentage > 0) {
                statusType = 'reading';
            }

            return {
                id,
                novel,
                savedProgress,
                percentage,
                lastChapterText,
                totalPublished,
                statusType
            };
        }).filter(Boolean) as Array<{
            id: number;
            novel: Novel;
            savedProgress: any;
            percentage: number;
            lastChapterText: string;
            totalPublished: number;
            statusType: 'reading' | 'completed' | 'unread';
        }>;
    }, [currentUser, novels]);

    const counts = useMemo(() => ({
        all: bookmarkedNovels.length,
        reading: bookmarkedNovels.filter(b => b.statusType === 'reading').length,
        completed: bookmarkedNovels.filter(b => b.statusType === 'completed').length,
        unread: bookmarkedNovels.filter(b => b.statusType === 'unread').length
    }), [bookmarkedNovels]);

    const filteredNovels = useMemo(() => {
        return bookmarkedNovels.filter(item => {
            if (shelfFilter !== 'all' && item.statusType !== shelfFilter) return false;
            if (shelfSearch.trim()) {
                const q = shelfSearch.toLowerCase();
                const title = item.novel.title.toLowerCase();
                const author = (item.novel.author || item.novel.author_name || '').toLowerCase();
                return title.includes(q) || author.includes(q);
            }
            return true;
        });
    }, [bookmarkedNovels, shelfFilter, shelfSearch]);

    return (
        <div className="page-view active">
            <div className="studio-header">
                <div>
                    <h2>Tủ Sách Cá Nhân</h2>
                    <p className="subtitle">Lưu trữ các tác phẩm theo dõi và tiến trình đọc của bạn.</p>
                </div>
                <button className="outline-btn small" onClick={() => setCurrentView('home')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.ArrowLeft size={14} /> Quay lại trang chủ
                </button>
            </div>

            {/* Shelf Management Tabs & Search Filter (Phase 2.3) */}
            {bookmarkedNovels.length > 0 && (
                <div className="library-filter-toolbar" style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '0 0 24px 0',
                    padding: '12px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)'
                }}>
                    <div className="library-tabs-group" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className={`outline-btn small ${shelfFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setShelfFilter('all')}
                            style={{
                                borderRadius: '18px',
                                padding: '4px 12px',
                                fontSize: '0.78rem',
                                background: shelfFilter === 'all' ? 'var(--text-main)' : 'transparent',
                                color: shelfFilter === 'all' ? 'var(--bg-base)' : 'var(--text-main)',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                            }}
                        >
                            Tất cả ({counts.all})
                        </button>
                        <button
                            type="button"
                            className={`outline-btn small ${shelfFilter === 'reading' ? 'active' : ''}`}
                            onClick={() => setShelfFilter('reading')}
                            style={{
                                borderRadius: '18px',
                                padding: '4px 12px',
                                fontSize: '0.78rem',
                                background: shelfFilter === 'reading' ? 'var(--text-main)' : 'transparent',
                                color: shelfFilter === 'reading' ? 'var(--bg-base)' : 'var(--text-main)',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                            }}
                        >
                            Đang đọc ({counts.reading})
                        </button>
                        <button
                            type="button"
                            className={`outline-btn small ${shelfFilter === 'completed' ? 'active' : ''}`}
                            onClick={() => setShelfFilter('completed')}
                            style={{
                                borderRadius: '18px',
                                padding: '4px 12px',
                                fontSize: '0.78rem',
                                background: shelfFilter === 'completed' ? 'var(--text-main)' : 'transparent',
                                color: shelfFilter === 'completed' ? 'var(--bg-base)' : 'var(--text-main)',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                            }}
                        >
                            Đã hoàn thành ({counts.completed})
                        </button>
                        <button
                            type="button"
                            className={`outline-btn small ${shelfFilter === 'unread' ? 'active' : ''}`}
                            onClick={() => setShelfFilter('unread')}
                            style={{
                                borderRadius: '18px',
                                padding: '4px 12px',
                                fontSize: '0.78rem',
                                background: shelfFilter === 'unread' ? 'var(--text-main)' : 'transparent',
                                color: shelfFilter === 'unread' ? 'var(--bg-base)' : 'var(--text-main)',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                            }}
                        >
                            Chưa đọc ({counts.unread})
                        </button>
                    </div>

                    <div className="library-search-box" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '4px 12px',
                        minWidth: '200px'
                    }}>
                        <Icons.Search size={13} className="text-muted" />
                        <input
                            type="text"
                            placeholder="Lọc truyện trong tủ..."
                            value={shelfSearch}
                            onChange={(e) => setShelfSearch(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-main)',
                                fontSize: '0.78rem',
                                width: '100%'
                            }}
                        />
                        {shelfSearch && (
                            <button
                                type="button"
                                onClick={() => setShelfSearch('')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: 0 }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="library-full-layout" id="library-full-grid">
                {bookmarkedNovels.length === 0 ? (
                    <div className="empty-state-card" style={{ gridColumn: '1/-1', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <Icons.Book size={48} />
                        </div>
                        <h4 style={{ fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 700 }}>Tủ sách của bạn còn trống</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 20px auto' }}>Bạn chưa theo dõi tác phẩm nào. Hãy khám phá và lưu những câu chuyện hấp dẫn để tiếp tục đọc bất cứ lúc nào!</p>
                        <button className="primary-btn" onClick={() => setCurrentView('explore')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <Icons.Compass size={16} />
                            <span>Khám Phá Tác Phẩm Ngay</span>
                        </button>
                    </div>
                ) : filteredNovels.length === 0 ? (
                    <div className="empty-state-card" style={{ gridColumn: '1/-1', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '36px 20px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>Không tìm thấy truyện nào phù hợp với bộ lọc hiện tại.</p>
                        <button
                            className="outline-btn small"
                            onClick={() => { setShelfFilter('all'); setShelfSearch(''); }}
                        >
                            Đặt lại bộ lọc
                        </button>
                    </div>
                ) : (
                    filteredNovels.map(({ id, novel, savedProgress, percentage, lastChapterText }) => (
                        <div 
                            key={id} 
                            className="library-progress-card" 
                            onClick={() => openNovelDetail(id)} 
                            style={{
                                background: 'var(--bg-card)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 'var(--border-radius-md)', 
                                padding: '16px', 
                                display: 'flex', 
                                gap: '14px', 
                                cursor: 'pointer', 
                                transition: 'var(--transition-smooth)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <img src={novel.cover} alt={novel.title} className="lib-card-cover" style={{ width: '68px', height: '94px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', flexShrink: 0 }} loading="lazy" />
                            <div className="lib-card-info" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                                <h4 className="lib-card-title" style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{novel.title}</h4>
                                
                                <div className="lib-card-progress-lbl flex-row-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    <span>{lastChapterText}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{percentage}%</span>
                                </div>
                                <div className="lib-progress-bar" style={{ height: '5px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                                    <div className="lib-progress-fill" style={{ height: '100%', background: 'var(--text-main)', width: `${percentage}%`, transition: 'width 0.3s ease' }}></div>
                                </div>

                                {/* Quick Actions inside Library */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        className="primary-btn small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (startReading) {
                                                const resumeIdx = savedProgress ? savedProgress.chapterIndex : 0;
                                                startReading(id, resumeIdx);
                                            } else {
                                                openNovelDetail(id);
                                            }
                                        }}
                                        style={{ padding: '3px 12px', fontSize: '0.74rem', borderRadius: '14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                        title={savedProgress ? `Đọc tiếp chương ${savedProgress.chapterIndex + 1}` : "Đọc từ chương đầu"}
                                    >
                                        <Icons.Play size={11} />
                                        <span>{savedProgress ? 'Đọc tiếp' : 'Đọc ngay'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="outline-btn small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleBookmark(id);
                                        }}
                                        title="Bỏ lưu khỏi tủ sách"
                                        style={{ padding: '3px 10px', fontSize: '0.74rem', borderRadius: '14px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Icons.Trash size={12} />
                                        <span>Bỏ lưu</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
