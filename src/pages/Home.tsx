import React from 'react';
import { Novel, User, ForumPost, SystemEvent } from '../types';
import { calculateUserLevel } from '../utils/levelHelper';

// ================= MONOCHROME PROFESSIONAL SVG ICONS =================
const Icons = {
    Tag: () => (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
    ),
    History: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    Sparkles: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path>
        </svg>
    ),
    Flame: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path>
        </svg>
    ),
    Book: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
    ),
    Star: ({ filled }: { filled?: boolean }) => (
        <svg viewBox="0 0 24 24" width="13" height="13" fill={filled !== false ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    ),
    Eye: () => (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    ),
    User: () => (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    ),
    Trophy: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path>
            <path d="M18 4H6v7a6 6 0 0 0 12 0V4z"></path>
        </svg>
    ),
    Crown: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
        </svg>
    ),
    Comment: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
    ),
    Bookmark: ({ filled }: { filled?: boolean }) => (
        <svg viewBox="0 0 24 24" width="12" height="12" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
    ),
    ArrowRight: () => (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    ),
    Close: () => (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    ),
    Clock: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    ChevronLeft: () => (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
    ),
    ChevronRight: () => (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
    )
};

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
    wibuRanking: any[];
}

export default function Home({
    novels,
    currentUser,
    setActiveNovelId,
    setCurrentView,
    filterGenre,
    setFilterGenre,
    filterType,
    setFilterType,
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
    setActiveEventId,
    wibuRanking
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

    const heroNovels = React.useMemo(() => {
        const publishedNovels = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
        if (publishedNovels.length === 0) return [];

        let list: Novel[] = [];
        if (activeBannerId) {
            const pinned = publishedNovels.find(n => n.id === activeBannerId);
            if (pinned) list.push(pinned);
        }

        const topByReads = [...publishedNovels]
            .filter(n => !list.some(x => x.id === n.id))
            .sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0));

        list = [...list, ...topByReads].slice(0, 5);
        return list;
    }, [novels, activeBannerId]);

    const [heroIdx, setHeroIdx] = React.useState(0);
    const [isHeroHovered, setIsHeroHovered] = React.useState(false);

    React.useEffect(() => {
        if (heroNovels.length <= 1 || isHeroHovered) return;
        const timer = setInterval(() => {
            setHeroIdx(prev => (prev + 1) % heroNovels.length);
        }, 7000);
        return () => clearInterval(timer);
    }, [heroNovels.length, isHeroHovered]);

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

    const featuredNovels = React.useMemo(() => {
        const publishedNovels = novels.filter(novel => (novel.chapters || []).some(ch => ch.status === 'published'));
        return [...publishedNovels].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 5);
    }, [novels]);

    const newestNovels = React.useMemo(() => {
        const publishedNovels = novels.filter(novel => (novel.chapters || []).some(ch => ch.status === 'published'));
        return [...publishedNovels].sort((a, b) => b.id - a.id).slice(0, 5);
    }, [novels]);

    // Render helper for Novel Card 2.0
    const renderNovelCard = (novel: Novel) => {
        const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
        const stars = computeAverageStars(novel.id);

        return (
            <div key={novel.id} className="novel-card-v2" onClick={() => openNovelDetail(novel.id)}>
                <div className="novel-cover-wrapper-v2">
                    <img src={novel.cover} alt={novel.title} className="novel-cover-img-v2" loading="lazy" />
                    <div className="novel-badges-overlay">
                        <span className="novel-badge-status">
                            {novel.status === 'completed' ? 'Hoàn thành' : novel.status === 'paused' ? 'Tạm ngưng' : novel.status === 'suspended' ? 'Đã khóa' : 'Đang ra'}
                        </span>
                        <span className="novel-badge-format">
                            {novel.type === 'oneshot' ? 'Oneshot' : 'Series'}
                        </span>
                    </div>
                </div>

                <div className="novel-info-block-v2">
                    <h4 className="novel-card-title-v2" title={novel.title}>
                        {novel.title}
                    </h4>
                    
                    <div className="novel-card-author-v2">
                        <Icons.User />
                        <span>{novel.author || novel.author_name || "Ẩn danh"}</span>
                    </div>

                    <div className="novel-card-tags-v2">
                        {(novel.tags || []).slice(0, 3).map(t => (
                            <span key={t} className="novel-tag-pill-v2">#{t}</span>
                        ))}
                    </div>

                    <div className="novel-card-meta-v2">
                        <div className="novel-card-stats-group">
                            <span className="novel-card-rating-v2">
                                <Icons.Star /> {stars === 'N/A' ? 'N/A' : stars}
                            </span>
                            <span className="novel-card-reads-v2">
                                <Icons.Eye /> {Number(novel.reads).toLocaleString()}
                            </span>
                        </div>

                        {currentUser && (
                            <button
                                className={`novel-bookmark-btn-v2 ${isSaved ? 'saved' : ''}`}
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(novel.id); }}
                                title={isSaved ? 'Xóa khỏi tủ sách' : 'Lưu vào tủ sách'}
                            >
                                <Icons.Bookmark filled={isSaved} />
                                <span>{isSaved ? 'Đã Lưu' : 'Lưu Tủ'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-view active">
            
            {/* 1. FEATURED HERO BANNER 2.0 (CINEMATIC & AUTHENTIC REAL BOOK) */}
            {heroNovels.length > 0 && (() => {
                const currentHero = heroNovels[heroIdx] || heroNovels[0];
                const isHeroSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(currentHero.id);
                const heroStars = computeAverageStars(currentHero.id);
                const firstChapter = (currentHero.chapters || []).find(ch => ch.status === 'published');
                const firstChapterIdx = firstChapter ? (currentHero.chapters || []).indexOf(firstChapter) : 0;

                return (
                    <div 
                        className="featured-banner"
                        onMouseEnter={() => setIsHeroHovered(true)}
                        onMouseLeave={() => setIsHeroHovered(false)}
                    >
                        <div className="featured-bg-cover" style={{ backgroundImage: `url(${currentHero.cover})` }}></div>
                        <div className="featured-overlay-ambient"></div>
                        <div className="featured-kanji-watermark">無限文庫 • 今週の推薦</div>

                        <div className="featured-banner-content" key={currentHero.id}>
                            <div className="featured-info">
                                <div className="featured-badges-row">
                                    <span className="hero-editorial-badge">
                                        <Icons.Sparkles /> Đề Cử #{heroIdx + 1}
                                    </span>
                                    <span className="hero-pill-tag">
                                        {currentHero.type === 'oneshot' ? 'Oneshot' : 'Series'}
                                    </span>
                                    {currentHero.genre && (
                                        <span className="hero-pill-tag">{currentHero.genre}</span>
                                    )}
                                    <span className="hero-pill-tag" style={{ color: currentHero.status === 'completed' ? '#2ecc71' : 'var(--sakura-pink)' }}>
                                        {currentHero.status === 'completed' ? 'Hoàn' : 'Đang ra'}
                                    </span>
                                </div>

                                <h1 onClick={() => openNovelDetail(currentHero.id)} title={currentHero.title}>
                                    {currentHero.title}
                                </h1>

                                <p className="featured-desc">
                                    {currentHero.summary || "Một tác phẩm hấp dẫn đang được cộng đồng độc giả MugenBunko quan tâm theo dõi."}
                                </p>

                                <div className="featured-meta">
                                    <span className="featured-meta-item">
                                        <Icons.User /> {currentHero.author || currentHero.author_name || "Ẩn danh"}
                                    </span>
                                    <span className="meta-sep">•</span>
                                    <span className="featured-meta-item">
                                        <Icons.Star /> {heroStars === 'N/A' ? 'N/A' : `${heroStars} ★`}
                                    </span>
                                    <span className="meta-sep">•</span>
                                    <span className="featured-meta-item">
                                        <Icons.Eye /> {Number(currentHero.reads).toLocaleString()}
                                    </span>
                                </div>

                                <div className="featured-actions-row">
                                    <button 
                                        className="hero-primary-cta-btn" 
                                        onClick={() => {
                                            if (firstChapter) {
                                                startReading(currentHero.id, firstChapterIdx);
                                            } else {
                                                openNovelDetail(currentHero.id);
                                            }
                                        }}
                                    >
                                        <Icons.Book /> Đọc ngay
                                    </button>

                                    <button 
                                        className="hero-secondary-cta-btn" 
                                        onClick={() => openNovelDetail(currentHero.id)}
                                    >
                                        <Icons.ArrowRight /> Chi tiết tác phẩm
                                    </button>

                                    {currentUser && (
                                        <button 
                                            className={`hero-bookmark-cta-btn ${isHeroSaved ? 'saved' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(currentHero.id); }}
                                            title={isHeroSaved ? "Đã lưu vào tủ sách" : "Lưu vào tủ sách"}
                                        >
                                            <Icons.Bookmark filled={isHeroSaved} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Book Showcase (Realistic Physical Light Novel) */}
                            <div className="featured-cover-showcase" onClick={() => openNovelDetail(currentHero.id)}>
                                <div className="hero-book-ambient-glow"></div>
                                <div className="hero-book-wrapper">
                                    <div className="hero-book-cover">
                                        <div className="hero-book-spine"></div>
                                        <img src={currentHero.cover} alt={currentHero.title} />
                                        <span className="hero-book-rank-ribbon">
                                            <Icons.Flame /> #{heroIdx + 1} Hot
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Multi-slide carousel controls */}
                        {heroNovels.length > 1 && (
                            <div className="hero-carousel-controls">
                                <button 
                                    className="hero-arrow-btn" 
                                    onClick={() => setHeroIdx(prev => (prev - 1 + heroNovels.length) % heroNovels.length)}
                                    title="Tác phẩm trước"
                                >
                                    <Icons.ChevronLeft />
                                </button>
                                <div className="hero-carousel-dots">
                                    {heroNovels.map((n, idx) => (
                                        <button 
                                            key={n.id}
                                            className={`hero-dot-btn ${idx === heroIdx ? 'active' : ''}`}
                                            onClick={() => setHeroIdx(idx)}
                                            title={n.title}
                                        />
                                    ))}
                                </div>
                                <button 
                                    className="hero-arrow-btn" 
                                    onClick={() => setHeroIdx(prev => (prev + 1) % heroNovels.length)}
                                    title="Tác phẩm tiếp theo"
                                >
                                    <Icons.ChevronRight />
                                </button>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* 2. GENRE QUICK NAVIGATION (MONOCHROME REFINED) */}
            <div className="genre-quick-nav" style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                padding: '8px 2px 18px 2px',
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
                    gap: '6px',
                    marginRight: '6px',
                    flexShrink: 0
                }}>
                    <Icons.Tag /> Thể loại nhanh:
                </span>
                {genres.slice(0, 10).map(genre => (
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

            {/* 3. MAIN DISCOVERY 2-COLUMN LAYOUT */}
            <div className="discovery-layout">
                
                {/* LEFT MAIN COLUMN */}
                <div className="main-column" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* BENTO READING HISTORY ("Đang đọc dở") */}
                    {readingHistory.length > 0 ? (
                        <div className="reading-history-card-bento">
                            <div className="reading-history-header-v2">
                                <Icons.History />
                                <span>Tiếp Tục Đọc Dở</span>
                            </div>
                            <div className="reading-history-grid-v2">
                                {readingHistory.slice(0, 4).map((item, idx) => {
                                    const n = novels.find(x => x.id === item.novelId);
                                    const pubChs = n?.chapters?.filter(ch => ch.status === 'published') || [];
                                    const total = pubChs.length || 1;
                                    let readCount = item.chapterIndex + 1;
                                    if (currentUser) {
                                        try {
                                            const key = `mugen_readprogress_${currentUser.username}_${item.novelId}`;
                                            const raw = localStorage.getItem(key);
                                            const saved = raw ? JSON.parse(raw) : null;
                                            if (saved && saved.readChaptersList) readCount = saved.readChaptersList.length;
                                        } catch(e) {}
                                    }
                                    const pct = Math.min(100, Math.round((readCount / total) * 100));

                                    return (
                                        <div
                                            key={idx}
                                            className="reading-history-item-v2"
                                            onClick={() => startReading(item.novelId, item.chapterIndex)}
                                        >
                                            <img
                                                src={item.novelCover}
                                                alt={item.novelTitle}
                                                className="reading-history-cover-v2"
                                            />
                                            <div className="reading-history-info-v2">
                                                <h4 className="reading-history-title-v2" title={item.novelTitle}>
                                                    {item.novelTitle}
                                                </h4>
                                                <span className="reading-history-chapter-v2" title={item.chapterTitle}>
                                                    {item.chapterTitle}
                                                </span>
                                                <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--sakura-pink)', transition: 'width 0.3s ease' }} title={`Đã đọc ${pct}%`}></div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => deleteHistoryItem(e, item.novelId)}
                                                title="Xóa khỏi lịch sử đọc"
                                                className="reading-history-del-btn"
                                            >
                                                <Icons.Close />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="reading-history-card-bento" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'inline-flex', padding: '8px', background: 'var(--bg-base)', borderRadius: '50%', marginBottom: '8px', color: 'var(--sakura-pink)' }}>
                                <Icons.Book />
                            </div>
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-main)' }}>Đang đọc dở</h4>
                            <p style={{ fontSize: '0.78rem', margin: 0 }}>Bạn chưa đọc tác phẩm nào. Hãy khám phá thư viện và chọn một câu chuyện thú vị để bắt đầu nhé!</p>
                        </div>
                    )}

                    {/* ACTIVE SYSTEM EVENT BANNER */}
                    {activeEvents.length > 0 && (() => {
                        const activeEv = activeEvents[currentEventIdx] || activeEvents[0];
                        if (!activeEv) return null;
                        return (
                            <div
                                className="home-event-banner-v2"
                                onClick={() => {
                                    setActiveEventId(activeEv.id);
                                    setCurrentView('event-detail');
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--sakura-pink-light)', color: 'var(--sakura-pink)' }}>
                                        <Icons.Sparkles />
                                    </div>
                                    <div key={activeEv.id} style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sakura-pink)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Sự kiện {activeEvents.length > 1 && `(${currentEventIdx + 1}/${activeEvents.length})`}
                                            </span>
                                        </div>
                                        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-main)' }}>
                                            {activeEv.title}
                                        </h4>
                                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                                            {activeEv.description || activeEv.content || ""}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                                    {activeEvents.length > 1 && (
                                        <div className="home-event-dots" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '5px' }}>
                                            {activeEvents.map((_, dotIdx) => (
                                                <span
                                                    key={dotIdx}
                                                    onClick={() => setCurrentEventIdx(dotIdx)}
                                                    className={`home-event-dot ${currentEventIdx === dotIdx ? 'active' : ''}`}
                                                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentEventIdx === dotIdx ? 'var(--sakura-pink)' : 'var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--sakura-pink)' }}>
                                        Xem ngay <Icons.ArrowRight />
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* SECTION 1: PERSONALIZED RECOMMENDATIONS */}
                    {recommendedNovels.length > 0 && (
                        <div>
                            <div className="home-section-header">
                                <h2 className="home-section-title">
                                    <span className="section-icon-mono"><Icons.Sparkles /></span>
                                    <span>Dành Riêng Cho Bạn</span>
                                </h2>
                            </div>
                            <div className="novel-grid">
                                {recommendedNovels.map(renderNovelCard)}
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: FEATURED NOVELS (TOP READS) */}
                    <div>
                        <div className="home-section-header">
                            <h2 className="home-section-title">
                                <span className="section-icon-mono"><Icons.Flame /></span>
                                <span>Đề Cử Nổi Bật</span>
                            </h2>
                        </div>
                        <div className="novel-grid">
                            {featuredNovels.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '16px 0' }}>Chưa có tác phẩm đề cử.</div>
                            ) : (
                                featuredNovels.map(renderNovelCard)
                            )}
                        </div>
                    </div>

                    {/* SECTION 3: ONESHOT NOVELS */}
                    {oneshotNovels.length > 0 && (
                        <div>
                            <div className="home-section-header">
                                <h2 className="home-section-title">
                                    <span className="section-icon-mono"><Icons.Book /></span>
                                    <span>Truyện Ngắn Chọn Lọc</span>
                                </h2>
                            </div>
                            <div className="novel-grid">
                                {oneshotNovels.map(renderNovelCard)}
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: NEWEST RELEASES */}
                    <div>
                        <div className="home-section-header">
                            <h2 className="home-section-title">
                                <span className="section-icon-mono"><Icons.Clock /></span>
                                <span>Tác Phẩm Mới Nhất</span>
                            </h2>
                        </div>
                        <div className="novel-grid">
                            {newestNovels.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '16px 0' }}>Chưa có tác phẩm mới đăng.</div>
                            ) : (
                                newestNovels.map(renderNovelCard)
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR BENTO COLUMN */}
                <aside className="sidebar-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* BENTO 1: BẢNG XẾP HẠNG TRUYỆN */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Trophy /></span>
                            <span>Bảng Xếp Hạng Truyện</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {(() => {
                                const publishedNovels = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
                                const sorted = [...publishedNovels].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 5);
                                
                                if (sorted.length === 0) {
                                    return <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có tác phẩm nào.</div>;
                                }

                                return sorted.map((novel, index) => {
                                    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                                    return (
                                        <div key={novel.id} className="ranking-item-v2" onClick={() => openNovelDetail(novel.id)}>
                                            <span className={`ranking-badge-v2 ${rankClass}`}>
                                                {index + 1}
                                            </span>
                                            <div className="ranking-info-v2">
                                                <div className="ranking-title-v2">{novel.title}</div>
                                                <div className="ranking-score-v2">
                                                    <Icons.Eye /> {Number(novel.reads).toLocaleString()} lượt đọc
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* BENTO 2: CAO THỦ WIBU TUẦN */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Crown /></span>
                            <span>Cao Thủ Wibu Tuần</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(() => {
                                if (!wibuRanking || wibuRanking.length === 0) {
                                    return <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có cao thủ nào.</div>;
                                }
                                
                                return wibuRanking.slice(0, 5).map((user, index) => {
                                    const lvlInfo = calculateUserLevel(user.xp || 0);
                                    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                                    const avatarSrc = user.avatarSeed && (user.avatarSeed.startsWith('http') || user.avatarSeed.startsWith('/uploads') || user.avatarSeed.startsWith('data:')) 
                                        ? user.avatarSeed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.avatarSeed || 'Default'}`;

                                    return (
                                        <div 
                                            key={user.id} 
                                            className="ranking-item-v2"
                                            onClick={() => {
                                                window.location.hash = `#/profile/${encodeURIComponent(user.username)}`;
                                            }}
                                        >
                                            <span className={`ranking-badge-v2 ${rankClass}`}>
                                                {index + 1}
                                            </span>
                                            <img 
                                                src={avatarSrc} 
                                                alt={user.username} 
                                                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover' }} 
                                            />
                                            <div className="ranking-info-v2">
                                                <div className="ranking-title-v2">@{user.username}</div>
                                                <div className="ranking-score-v2">
                                                    <span>{lvlInfo.tierName}</span>
                                                    <span>•</span>
                                                    <span>{Number(user.xp).toLocaleString()} XP</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* BENTO 3: BÌNH LUẬN MỚI NHẤT */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Comment /></span>
                            <span>Bình Luận Mới Nhất</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {latestComments && latestComments.length > 0 ? (
                                latestComments.slice(0, 4).map((comment: any) => {
                                    const avatarSrc = comment.avatarSeed && (comment.avatarSeed.startsWith('http') || comment.avatarSeed.startsWith('/uploads') || comment.avatarSeed.startsWith('data:')) 
                                        ? comment.avatarSeed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.avatarSeed || 'Default'}`;

                                    return (
                                        <div
                                            key={comment.id}
                                            onClick={() => openNovelDetail(comment.novelId)}
                                            style={{
                                                display: 'flex',
                                                gap: '10px',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                border: '1px dashed var(--border-color)',
                                                background: 'var(--bg-base)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <img
                                                src={avatarSrc}
                                                alt={comment.displayname}
                                                style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{comment.displayname}</strong>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{comment.date ? comment.date.split(' ')[0] : ''}</span>
                                                </div>
                                                <p style={{
                                                    fontSize: '0.73rem',
                                                    color: 'var(--text-muted)',
                                                    margin: '3px 0',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: '1.35'
                                                }}>
                                                    "{comment.text}"
                                                </p>
                                                <div style={{ fontSize: '0.66rem', color: 'var(--sakura-pink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <Icons.Book /> {comment.novelTitle}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có bình luận nào.</div>
                            )}
                        </div>
                    </div>

                    {/* BENTO 4: ĐÁNH GIÁ MỚI NHẤT */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Star /></span>
                            <span>Đánh Giá Mới Nhất</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {latestReviews && latestReviews.length > 0 ? (
                                latestReviews.slice(0, 4).map((review: any) => {
                                    const avatarSrc = review.avatarSeed && (review.avatarSeed.startsWith('http') || review.avatarSeed.startsWith('/uploads') || review.avatarSeed.startsWith('data:')) 
                                        ? review.avatarSeed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${review.avatarSeed || 'Default'}`;

                                    return (
                                        <div
                                            key={review.id}
                                            onClick={() => openNovelDetail(review.novelId)}
                                            style={{
                                                display: 'flex',
                                                gap: '10px',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                border: '1px dashed var(--border-color)',
                                                background: 'var(--bg-base)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <img
                                                src={avatarSrc}
                                                alt={review.username}
                                                style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{review.username}</strong>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--sakura-pink)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <Icons.Star /> {review.stars ? parseFloat(review.stars).toFixed(1) : '5.0'}
                                                    </span>
                                                </div>
                                                <p style={{
                                                    fontSize: '0.73rem',
                                                    color: 'var(--text-muted)',
                                                    margin: '3px 0',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: '1.35'
                                                }}>
                                                    "{review.text}"
                                                </p>
                                                <div style={{ fontSize: '0.66rem', color: 'var(--sakura-pink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <Icons.Book /> {review.novelTitle}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có đánh giá nào.</div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
