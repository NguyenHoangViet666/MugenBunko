import React from 'react';
import { Novel, User, ForumPost, SystemEvent } from '../types';

interface ReadingHistoryItem {
    novelId: number;
    novelTitle: string;
    novelCover: string;
    chapterIndex: number;
    chapterTitle: string;
}

interface HomeProps {
    novels: Novel[];
    currentUser: User | null;
    activeNovelId: number | null;
    setActiveNovelId: (id: number | null) => void;
    currentView: string;
    setCurrentView: (view: string) => void;
    filterGenre: string;
    setFilterGenre: (genre: string) => void;
    filterType: string;
    setFilterType: (type: string) => void;
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    filterSort: string;
    setFilterSort: (sort: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeBannerId: number | null;
    setActiveBannerId: (id: number | null) => void;
    genres: string[];
    setLoginModalOpen: (open: boolean) => void;
    startReading: (novelId: number, chapterIndex: number) => void;
    toggleBookmark: (id: number) => void;
    computeAverageStars: (id: number) => string;
    announcements: any[];
    openNovelDetail: (id: number) => void;
    filterDrawerOpen: boolean;
    setFilterDrawerOpen: (open: boolean) => void;
    handleGenreClick: (genre: string) => void;
    handleTagClick: (tag: string) => void;
    forumPosts: ForumPost[];
    setActiveForumPostId: (id: number | null) => void;
    latestComments: any[];
    latestReviews: any[];
    events: SystemEvent[];
    setActiveEventId: (id: number | null) => void;
}

export default function Home({
    novels,
    currentUser,
    setActiveNovelId,
    setCurrentView,
    filterGenre,
    filterType,
    selectedTags,
    setSelectedTags,
    filterStatus,
    setFilterStatus,
    filterSort,
    setFilterSort,
    searchQuery,
    setSearchQuery,
    activeBannerId,
    genres,
    setLoginModalOpen,
    startReading,
    toggleBookmark,
    computeAverageStars,
    announcements,
    openNovelDetail,
    filterDrawerOpen,
    setFilterDrawerOpen,
    handleGenreClick,
    handleTagClick,
    forumPosts,
    setActiveForumPostId,
    latestComments,
    latestReviews,
    events,
    setActiveEventId
}: HomeProps) {
    const [readingHistory, setReadingHistory] = React.useState<ReadingHistoryItem[]>([]);
    const activeEvents = React.useMemo(() => {
        return events ? events.filter(ev => ev.status === 'active') : [];
    }, [events]);
    const [currentEventIdx, setCurrentEventIdx] = React.useState(0);

    React.useEffect(() => {
        setCurrentEventIdx(0);
    }, [activeEvents.length]);

    React.useEffect(() => {
        if (activeEvents.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentEventIdx(prev => (prev + 1) % activeEvents.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [activeEvents]);

    React.useEffect(() => {
        const historyKey = currentUser ? `mugen_reading_history_${currentUser.username}` : 'mugen_reading_history_guest';
        try {
            const raw = localStorage.getItem(historyKey);
            const history = raw ? JSON.parse(raw) : [];
            setReadingHistory(history);
        } catch (err) {
            console.error("Load reading history error:", err);
        }
    }, [currentUser]);

    const deleteHistoryItem = (e: React.MouseEvent, novelId: number) => {
        e.stopPropagation();
        const historyKey = currentUser ? `mugen_reading_history_${currentUser.username}` : 'mugen_reading_history_guest';
        try {
            const updatedHistory = readingHistory.filter(item => item.novelId !== novelId);
            setReadingHistory(updatedHistory);
            localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        } catch (err) {
            console.error("Delete reading history error:", err);
        }
    };

    const oneshotNovels = React.useMemo(() => {
        const published = novels.filter(n => n.type === 'oneshot' && (n.chapters || []).some(ch => ch.status === 'published'));
        return [...published].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 5);
    }, [novels]);

    const completedNovels = React.useMemo(() => {
        const published = novels.filter(n => n.status === 'completed' && (n.chapters || []).some(ch => ch.status === 'published'));
        return [...published].sort((a, b) => {
            const starsA = parseFloat(computeAverageStars(a.id)) || 0;
            const starsB = parseFloat(computeAverageStars(b.id)) || 0;
            if (starsB !== starsA) return starsB - starsA;
            return (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0);
        }).slice(0, 5);
    }, [novels, computeAverageStars]);

    const recommendedNovels = React.useMemo(() => {
        const published = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
        if (published.length === 0) return [];

        const interestedGenres = new Set<string>();
        const interestedTags = new Set<string>();
        const interactedNovelIds = new Set<number>();

        if (currentUser && currentUser.bookmarks) {
            currentUser.bookmarks.forEach(id => {
                interactedNovelIds.add(id);
                const n = novels.find(x => x.id === id);
                if (n) {
                    if (n.genre) interestedGenres.add(n.genre);
                    n.tags?.forEach(t => interestedTags.add(t));
                }
            });
        }

        readingHistory.forEach(item => {
            interactedNovelIds.add(item.novelId);
            const n = novels.find(x => x.id === item.novelId);
            if (n) {
                if (n.genre) interestedGenres.add(n.genre);
                n.tags?.forEach(t => interestedTags.add(t));
            }
        });

        if (interestedGenres.size === 0 && interestedTags.size === 0) {
            return [...published]
                .sort((a, b) => {
                    const starsA = parseFloat(computeAverageStars(a.id)) || 0;
                    const starsB = parseFloat(computeAverageStars(b.id)) || 0;
                    if (starsB !== starsA) return starsB - starsA;
                    return (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0);
                })
                .slice(0, 5);
        }

        const scored = published
            .filter(n => !interactedNovelIds.has(n.id))
            .map(n => {
                let score = 0;
                if (n.genre && interestedGenres.has(n.genre)) {
                    score += 3;
                }
                n.tags?.forEach(t => {
                    if (interestedTags.has(t)) score += 1;
                });
                const stars = parseFloat(computeAverageStars(n.id)) || 0;
                score += stars * 0.5;

                return { novel: n, score };
            });

        const sorted = scored.sort((a, b) => b.score - a.score).map(x => x.novel);

        if (sorted.length < 5) {
            const remainder = published.filter(n => !interactedNovelIds.has(n.id) && !sorted.some(x => x.id === n.id));
            const filled = [...sorted, ...remainder.sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0))];
            return filled.slice(0, 5);
        }

        return sorted.slice(0, 5);
    }, [novels, currentUser, readingHistory, computeAverageStars]);

    return (
        <div className="page-view active">
            {/* Featured Banner */}
            {(() => {
                const publishedNovels = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
                let featured = novels.find(n => n.id === activeBannerId);
                if (!featured || !(featured.chapters || []).some(ch => ch.status === 'published')) {
                    featured = [...publishedNovels].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0))[0];
                }

                if (featured) {
                    return (
                        <div className="featured-banner">
                            <div className="featured-bg-cover" style={{ backgroundImage: `url(${featured.cover})` }}></div>
                            <div className="featured-banner-content">
                                <div className="featured-info">
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                                        <span className="genre-tag">Tiêu Điểm Đề Cử</span>
                                        <span className="format-tag">{featured.type === 'oneshot' ? 'Oneshot' : 'Series'}</span>
                                    </div>
                                    <h1>{featured.title}</h1>
                                    <p className="featured-desc">{featured.summary}</p>
                                    <div className="featured-meta">
                                        <span>Tác giả: <strong>{featured.author || featured.author_name || "Ẩn danh"}</strong></span>
                                        <span>•</span>
                                        <span>Đánh giá: <strong>{computeAverageStars(featured.id) === 'N/A' ? 'N/A' : `${computeAverageStars(featured.id)} ★`}</strong></span>
                                        <span>•</span>
                                        <span>Lượt đọc: <strong>{featured.reads}</strong></span>
                                    </div>
                                    <button className="primary-btn featured-cta-btn" onClick={() => featured && openNovelDetail(featured.id)}>Đọc ngay</button>
                                </div>
                                <div className="featured-cover-showcase" onClick={() => featured && openNovelDetail(featured.id)}>
                                    <div className="showcase-card">
                                        <img src={featured.cover} alt={featured.title} />
                                        <div className="showcase-glow"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="featured-overlay"></div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Genre Quick Navigation Bar */}
            <div className="genre-quick-nav" style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                padding: '8px 4px 16px 4px',
                marginBottom: '16px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    marginRight: '8px',
                    flexShrink: 0
                }}>🌸 Phân loại nhanh:</span>
                {genres.slice(0, 8).map(genre => (
                    <button
                        key={genre}
                        className="outline-btn small"
                        onClick={() => handleGenreClick(genre)}
                        style={{
                            borderRadius: '20px',
                            padding: '4px 14px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            background: filterGenre === genre ? 'var(--sakura-pink-light)' : 'var(--bg-card)',
                            color: filterGenre === genre ? 'var(--sakura-pink)' : 'var(--text-main)',
                            borderColor: filterGenre === genre ? 'var(--sakura-pink)' : 'var(--border-color)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {genre}
                    </button>
                ))}
            </div>

            <div className="discovery-layout">
                <div className="main-column" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Đang đọc dở (Reading History) Widget */}
                    {readingHistory.length > 0 ? (
                        <div className="reading-history-widget" style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            padding: '20px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--sakura-pink)' }}>
                                Đang đọc dở
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: '16px'
                            }}>
                                {readingHistory.slice(0, 4).map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="reading-history-item"
                                        onClick={() => startReading(item.novelId, item.chapterIndex)}
                                        style={{
                                            display: 'flex',
                                            gap: '12px',
                                            padding: '10px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: 'var(--bg-base)',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--sakura-pink)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(224, 82, 117, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <img
                                            src={item.novelCover}
                                            alt={item.novelTitle}
                                            style={{
                                                width: '40px',
                                                height: '55px',
                                                objectFit: 'cover',
                                                borderRadius: '3px',
                                                border: '1px solid var(--border-color)',
                                                flexShrink: 0
                                            }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', justifyContent: 'center', paddingRight: '20px' }}>
                                            <h4 style={{
                                                margin: 0,
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                color: 'var(--text-main)'
                                            }} title={item.novelTitle}>
                                                {item.novelTitle}
                                            </h4>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                color: 'var(--sakura-pink)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                fontWeight: 500
                                            }} title={item.chapterTitle}>
                                                {item.chapterTitle}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => deleteHistoryItem(e, item.novelId)}
                                            title="Xóa khỏi lịch sử đọc"
                                            style={{
                                                position: 'absolute',
                                                top: '4px',
                                                right: '4px',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s',
                                                lineHeight: 1,
                                                zIndex: 10
                                            }}
                                            onMouseEnter={(e) => {
                                                e.stopPropagation();
                                                e.currentTarget.style.color = '#ff3b30';
                                                e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.stopPropagation();
                                                e.currentTarget.style.color = 'var(--text-muted)';
                                                e.currentTarget.style.background = 'none';
                                            }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="reading-history-widget-empty" style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            padding: '20px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Đang đọc dở</h4>
                            <p style={{ fontSize: '0.78rem', margin: 0 }}>Bạn chưa đọc tác phẩm nào. Hãy khám phá thư viện và chọn một câu chuyện thú vị để bắt đầu nhé! 🌸</p>
                        </div>
                    )}

                    {/* Dynamic active system event announcement banner */}
                    {activeEvents.length > 0 && (() => {
                        const activeEv = activeEvents[currentEventIdx] || activeEvents[0];
                        if (!activeEv) return null;
                        return (
                            <div
                                className="home-event-banner"
                                onClick={() => {
                                    setActiveEventId(activeEv.id);
                                    setCurrentView('event-detail');
                                }}
                            >
                                <div className="home-event-banner-left">
                                    <div className="home-event-icon-wrapper">
                                        🌸
                                    </div>
                                    <div className="home-event-info" style={{ animation: 'fadeSlideIn 0.3s ease-out' }} key={activeEv.id}>
                                        <span className="home-event-tag">
                                            Sự kiện {activeEvents.length > 1 && `(${currentEventIdx + 1}/${activeEvents.length})`}
                                        </span>
                                        <h4 className="home-event-title">{activeEv.title}</h4>
                                        <p className="home-event-desc">{activeEv.description || activeEv.content || ""}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 2 }}>
                                    {activeEvents.length > 1 && (
                                        <div className="home-event-dots" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
                                            {activeEvents.map((_, dotIdx) => (
                                                <span
                                                    key={dotIdx}
                                                    onClick={() => setCurrentEventIdx(dotIdx)}
                                                    className={`home-event-dot ${currentEventIdx === dotIdx ? 'active' : ''}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <div className="home-event-action">
                                        Xem ngay →
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Personalized Recommendations Section */}
                    {recommendedNovels.length > 0 && (
                        <div>
                            <div className="filter-header-bar" style={{ marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Dành Riêng Cho Bạn</h2>
                            </div>
                            <div className="novel-grid">
                                {recommendedNovels.map(novel => {
                                    const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
                                    return (
                                        <div key={novel.id} className="novel-card" onClick={() => openNovelDetail(novel.id)}>
                                            <div className="novel-cover-wrapper">
                                                <img src={novel.cover} alt={novel.title} className="novel-cover-img" loading="lazy" />
                                                <div className="novel-card-badges-container">
                                                    <span className="novel-card-badge">{novel.status === 'completed' ? 'Hoàn' : novel.status === 'paused' ? 'Ngưng' : novel.status === 'suspended' ? 'Khóa' : 'Đang ra'}</span>
                                                    <span className="novel-card-format-badge">{novel.type === 'oneshot' ? 'Oneshot' : 'Series'}</span>
                                                </div>
                                            </div>
                                            <div className="novel-info-block">
                                                <h4 className="novel-card-title">{novel.title}</h4>
                                                <div className="novel-card-author">Tác giả: {novel.author || novel.author_name || "Ẩn danh"}</div>
                                                <div className="detail-tags-row" style={{ marginBottom: '8px', gap: '4px' }}>
                                                    {(novel.tags || []).slice(0, 3).map(t => (
                                                        <span key={t} className="tag-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>#{t}</span>
                                                    ))}
                                                </div>
                                                <div className="novel-card-meta">
                                                    <span className="novel-card-rating">{computeAverageStars(novel.id) === 'N/A' ? 'N/A' : `★ ${computeAverageStars(novel.id)}`}</span>
                                                    <span className="novel-card-reads">{novel.reads}</span>
                                                </div>
                                                <div className="flex-row-between" style={{ marginTop: '10px' }}>
                                                    {currentUser && (
                                                        <button
                                                            className={isSaved ? "primary-btn small" : "outline-btn small"}
                                                            style={{ padding: '4px 8px', fontSize: '0.72rem', background: isSaved ? 'var(--indigo-blue)' : '' }}
                                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(novel.id); }}
                                                        >
                                                            {isSaved ? 'Đã Lưu' : 'Lưu Tủ'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Featured / Most Read Section */}
                    <div>
                        <div className="filter-header-bar" style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Đề Cử Nổi Bật</h2>
                        </div>
                        <div className="novel-grid">
                            {(() => {
                                const publishedNovels = novels.filter(novel => (novel.chapters || []).some(ch => ch.status === 'published'));
                                const list = [...publishedNovels].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 5);

                                if (list.length === 0) {
                                    return <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '16px 0' }}>Chưa có tác phẩm đề cử.</div>;
                                }

                                return list.map(novel => {
                                    const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
                                    return (
                                        <div key={novel.id} className="novel-card" onClick={() => openNovelDetail(novel.id)}>
                                            <div className="novel-cover-wrapper">
                                                <img src={novel.cover} alt={novel.title} className="novel-cover-img" loading="lazy" />
                                                <div className="novel-card-badges-container">
                                                    <span className="novel-card-badge">{novel.status === 'completed' ? 'Hoàn' : novel.status === 'paused' ? 'Ngưng' : novel.status === 'suspended' ? 'Khóa' : 'Đang ra'}</span>
                                                    <span className="novel-card-format-badge">{novel.type === 'oneshot' ? 'Oneshot' : 'Series'}</span>
                                                </div>
                                            </div>
                                            <div className="novel-info-block">
                                                <h4 className="novel-card-title">{novel.title}</h4>
                                                <div className="novel-card-author">Tác giả: {novel.author || novel.author_name || "Ẩn danh"}</div>
                                                <div className="detail-tags-row" style={{ marginBottom: '8px', gap: '4px' }}>
                                                    {(novel.tags || []).slice(0, 3).map(t => (
                                                        <span key={t} className="tag-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>#{t}</span>
                                                    ))}
                                                </div>
                                                <div className="novel-card-meta">
                                                    <span className="novel-card-rating">{computeAverageStars(novel.id) === 'N/A' ? 'N/A' : `★ ${computeAverageStars(novel.id)}`}</span>
                                                    <span className="novel-card-reads">{novel.reads}</span>
                                                </div>
                                                <div className="flex-row-between" style={{ marginTop: '10px' }}>
                                                    {currentUser && (
                                                        <button
                                                            className={isSaved ? "primary-btn small" : "outline-btn small"}
                                                            style={{ padding: '4px 8px', fontSize: '0.72rem', background: isSaved ? 'var(--indigo-blue)' : '' }}
                                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(novel.id); }}
                                                        >
                                                            {isSaved ? 'Đã Lưu' : 'Lưu Tủ'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Oneshot Showcase Section */}
                    {oneshotNovels.length > 0 && (
                        <div>
                            <div className="filter-header-bar" style={{ marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Truyện Ngắn Chọn Lọc</h2>
                            </div>
                            <div className="novel-grid">
                                {oneshotNovels.map(novel => {
                                    const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
                                    return (
                                        <div key={novel.id} className="novel-card" onClick={() => openNovelDetail(novel.id)}>
                                            <div className="novel-cover-wrapper">
                                                <img src={novel.cover} alt={novel.title} className="novel-cover-img" loading="lazy" />
                                                <div className="novel-card-badges-container">
                                                    <span className="novel-card-badge">{novel.status === 'completed' ? 'Hoàn' : novel.status === 'paused' ? 'Ngưng' : novel.status === 'suspended' ? 'Khóa' : 'Đang ra'}</span>
                                                    <span className="novel-card-format-badge">{novel.type === 'oneshot' ? 'Oneshot' : 'Series'}</span>
                                                </div>
                                            </div>
                                            <div className="novel-info-block">
                                                <h4 className="novel-card-title">{novel.title}</h4>
                                                <div className="novel-card-author">Tác giả: {novel.author || novel.author_name || "Ẩn danh"}</div>
                                                <div className="detail-tags-row" style={{ marginBottom: '8px', gap: '4px' }}>
                                                    {(novel.tags || []).slice(0, 3).map(t => (
                                                        <span key={t} className="tag-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>#{t}</span>
                                                    ))}
                                                </div>
                                                <div className="novel-card-meta">
                                                    <span className="novel-card-rating">{computeAverageStars(novel.id) === 'N/A' ? 'N/A' : `★ ${computeAverageStars(novel.id)}`}</span>
                                                    <span className="novel-card-reads">{novel.reads}</span>
                                                </div>
                                                <div className="flex-row-between" style={{ marginTop: '10px' }}>
                                                    {currentUser && (
                                                        <button
                                                            className={isSaved ? "primary-btn small" : "outline-btn small"}
                                                            style={{ padding: '4px 8px', fontSize: '0.72rem', background: isSaved ? 'var(--indigo-blue)' : '' }}
                                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(novel.id); }}
                                                        >
                                                            {isSaved ? 'Đã Lưu' : 'Lưu Tủ'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Newest Releases Section */}
                    <div>
                        <div className="filter-header-bar" style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Tác Phẩm Mới Nhất</h2>
                        </div>
                        <div className="novel-grid">
                            {(() => {
                                const publishedNovels = novels.filter(novel => (novel.chapters || []).some(ch => ch.status === 'published'));
                                const list = [...publishedNovels].sort((a, b) => b.id - a.id).slice(0, 5);

                                if (list.length === 0) {
                                    return <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '16px 0' }}>Chưa có tác phẩm mới đăng.</div>;
                                }

                                return list.map(novel => {
                                    const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
                                    return (
                                        <div key={novel.id} className="novel-card" onClick={() => openNovelDetail(novel.id)}>
                                            <div className="novel-cover-wrapper">
                                                <img src={novel.cover} alt={novel.title} className="novel-cover-img" loading="lazy" />
                                                <div className="novel-card-badges-container">
                                                    <span className="novel-card-badge">{novel.status === 'completed' ? 'Hoàn' : novel.status === 'paused' ? 'Ngưng' : novel.status === 'suspended' ? 'Khóa' : 'Đang ra'}</span>
                                                    <span className="novel-card-format-badge">{novel.type === 'oneshot' ? 'Oneshot' : 'Series'}</span>
                                                </div>
                                            </div>
                                            <div className="novel-info-block">
                                                <h4 className="novel-card-title">{novel.title}</h4>
                                                <div className="novel-card-author">Tác giả: {novel.author || novel.author_name || "Ẩn danh"}</div>
                                                <div className="detail-tags-row" style={{ marginBottom: '8px', gap: '4px' }}>
                                                    {(novel.tags || []).slice(0, 3).map(t => (
                                                        <span key={t} className="tag-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>#{t}</span>
                                                    ))}
                                                </div>
                                                <div className="novel-card-meta">
                                                    <span className="novel-card-rating">{computeAverageStars(novel.id) === 'N/A' ? 'N/A' : `★ ${computeAverageStars(novel.id)}`}</span>
                                                    <span className="novel-card-reads">{novel.reads}</span>
                                                </div>
                                                <div className="flex-row-between" style={{ marginTop: '10px' }}>
                                                    {currentUser && (
                                                        <button
                                                            className={isSaved ? "primary-btn small" : "outline-btn small"}
                                                            style={{ padding: '4px 8px', fontSize: '0.72rem', background: isSaved ? 'var(--indigo-blue)' : '' }}
                                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(novel.id); }}
                                                        >
                                                            {isSaved ? 'Đã Lưu' : 'Lưu Tủ'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>

                <aside className="sidebar-column">
                    {/* Bảng Xếp Hạng Truyện */}
                    <div className="sidebar-card ranking-card">
                        <h3 className="card-title" style={{ borderBottomColor: 'rgba(224, 82, 117, 0.1)' }}>
                            🏆 Bảng Xếp Hạng Truyện
                        </h3>
                        <ul className="ranking-list" style={{ padding: 0, margin: 0 }}>
                            {(() => {
                                const publishedNovels = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
                                const sorted = [...publishedNovels].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 5);
                                if (sorted.length === 0) {
                                    return <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có tác phẩm nào.</div>;
                                }
                                return sorted.map((novel, index) => (
                                    <li key={novel.id} className="ranking-item" onClick={() => openNovelDetail(novel.id)}>
                                        <span className="ranking-num">{index + 1}</span>
                                        <div className="ranking-details">
                                            <div className="ranking-title">{novel.title}</div>
                                            <div className="ranking-score">👀 {novel.reads.toLocaleString()} lượt đọc</div>
                                        </div>
                                    </li>
                                ));
                            })()}
                        </ul>
                    </div>

                    {/* Wibu Ranking Widget */}
                    <div className="sidebar-card ranking-card">
                        <h3 className="card-title" style={{ borderBottomColor: 'rgba(224, 82, 117, 0.1)' }}>
                            🏆 Cao Thủ Wibu Tuần
                        </h3>
                        <ul className="ranking-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0, listStyle: 'none' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ background: '#ffd700', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>1</span>
                                <div style={{ flexGrow: 1 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>@kirito_kun</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cấp bậc: SSR • 680,500 XP</div>
                                </div>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ background: '#c0c0c0', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>2</span>
                                <div style={{ flexGrow: 1 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>@megumin_explosion</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cấp bậc: SR • 78,200 XP</div>
                                </div>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '4px' }}>
                                <span style={{ background: '#cd7f32', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>3</span>
                                <div style={{ flexGrow: 1 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>@senpai_reader</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cấp bậc: R • 15,400 XP</div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Latest Comments Sidebar Widget */}
                    <div className="sidebar-card ranking-card">
                        <h3 className="card-title" style={{ borderBottomColor: 'rgba(224, 82, 117, 0.1)' }}>
                            Bình luận mới nhất
                        </h3>
                        <ul className="ranking-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0, listStyle: 'none' }}>
                            {latestComments && latestComments.length > 0 ? (
                                latestComments.map((comment: any) => (
                                    <li
                                        key={comment.id}
                                        onClick={() => openNovelDetail(comment.novelId)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '10px',
                                            borderBottom: '1px dashed var(--border-color)',
                                            paddingBottom: '8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <img
                                            src={comment.avatarSeed && (comment.avatarSeed.startsWith('http') || comment.avatarSeed.startsWith('/uploads') || comment.avatarSeed.startsWith('data:')) ? comment.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.avatarSeed || 'Default'}`}
                                            alt="Avatar"
                                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }}
                                        />
                                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{comment.displayname}</strong>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{comment.date ? comment.date.split(' ')[0] : ''}</span>
                                            </div>
                                            <div style={{
                                                fontSize: '0.72rem',
                                                color: 'var(--text-muted)',
                                                margin: '2px 0',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                lineHeight: '1.4'
                                            }}>
                                                "{comment.text}"
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--sakura-pink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                📖 {comment.novelTitle}
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có bình luận nào.</div>
                            )}
                        </ul>
                    </div>

                    {/* Latest Reviews Sidebar Widget */}
                    <div className="sidebar-card ranking-card">
                        <h3 className="card-title" style={{ borderBottomColor: 'rgba(224, 82, 117, 0.1)' }}>
                            Đánh giá mới nhất
                        </h3>
                        <ul className="ranking-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0, listStyle: 'none' }}>
                            {latestReviews && latestReviews.length > 0 ? (
                                latestReviews.map((review: any) => (
                                    <li
                                        key={review.id}
                                        onClick={() => openNovelDetail(review.novelId)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '10px',
                                            borderBottom: '1px dashed var(--border-color)',
                                            paddingBottom: '8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <img
                                            src={review.avatarSeed && (review.avatarSeed.startsWith('http') || review.avatarSeed.startsWith('/uploads') || review.avatarSeed.startsWith('data:')) ? review.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${review.avatarSeed || 'Default'}`}
                                            alt="Avatar"
                                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }}
                                        />
                                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{review.username}</strong>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--sakura-pink)', fontWeight: 700 }}>⭐ {review.stars ? parseFloat(review.stars).toFixed(1) : '5.0'}</span>
                                            </div>
                                            <div style={{
                                                fontSize: '0.72rem',
                                                color: 'var(--text-muted)',
                                                margin: '2px 0',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                lineHeight: '1.4'
                                            }}>
                                                "{review.text}"
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--sakura-pink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                📖 {review.novelTitle}
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có đánh giá nào.</div>
                            )}
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}
