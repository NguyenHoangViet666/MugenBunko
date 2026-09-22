import React from 'react';
import { User, Novel } from '../types';
import { Icons } from '../components/Icons';

interface LibraryProps {
    currentUser: User | null;
    novels: Novel[];
    setCurrentView: (view: string) => void;
    setActiveNovelId: (id: number | null) => void;
    toggleBookmark: (id: number) => void;
    openNovelDetail: (id: number) => void;
}

export default function Library({
    currentUser,
    novels,
    setCurrentView,
    setActiveNovelId,
    toggleBookmark,
    openNovelDetail
}: LibraryProps) {
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

            <div className="library-full-layout" id="library-full-grid">
                {currentUser && currentUser.bookmarks && currentUser.bookmarks.length > 0 ? (
                    currentUser.bookmarks.map(id => {
                        const novel = novels.find(n => n.id === id);
                        if (!novel) return null;

                        const progressKey = `mugen_readprogress_${currentUser.username}_${id}`;
                        const progressString = localStorage.getItem(progressKey);
                        const savedProgress = progressString ? JSON.parse(progressString) : null;
                        
                        let percentage = 0;
                        let lastChapterText = "Chưa đọc";
                        const totalPublished = novel.chapters ? novel.chapters.filter(c => c.status === 'published').length : 0;
                        
                        if (savedProgress && totalPublished > 0) {
                            lastChapterText = `Chương ${savedProgress.chapterIndex + 1}`;
                            percentage = Math.round((savedProgress.readChaptersList.length / totalPublished) * 100);
                        }

                        return (
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
                                <img src={novel.cover} alt="cover" className="lib-card-cover" style={{ width: '64px', height: '88px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                                <div className="lib-card-info" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                                    <h4 className="lib-card-title" style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{novel.title}</h4>
                                    <div className="lib-card-progress-lbl flex-row-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                        <span>{lastChapterText}</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{percentage}%</span>
                                    </div>
                                    <div className="lib-progress-bar" style={{ height: '6px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div className="lib-progress-fill" style={{ height: '100%', background: 'var(--text-main)', width: `${percentage}%`, transition: 'width 0.3s ease' }}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
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
                )}
            </div>
        </div>
    );
}
