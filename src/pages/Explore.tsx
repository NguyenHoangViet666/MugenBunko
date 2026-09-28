import React, { useState, useEffect, useMemo } from 'react';
import { User, Novel } from '../types';
import { Icons } from '../components/Icons';

interface ExploreProps {
    novels: Novel[];
    currentUser: User | null;
    exploreType: string;
    setExploreType: (type: string) => void;
    exploreGenre: string;
    setExploreGenre: (genre: string) => void;
    exploreSort: string;
    setExploreSort: (sort: string) => void;
    setCurrentView: (view: string) => void;
    toggleBookmark: (id: number) => void;
    openNovelDetail: (id: number) => void;
    computeAverageStars: (id: number) => string;
    genres: string[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    startReading?: (novelId: number, chapterIndex: number) => void;
}

const ITEMS_PER_PAGE = 12;

export default function Explore({
    novels,
    currentUser,
    exploreType,
    setExploreType,
    exploreGenre,
    setExploreGenre,
    exploreSort,
    setExploreSort,
    setCurrentView,
    toggleBookmark,
    openNovelDetail,
    computeAverageStars,
    genres,
    searchQuery,
    setSearchQuery,
    startReading
}: ExploreProps) {
    const [gachaNovel, setGachaNovel] = useState<Novel | null>(null);
    const [gachaRolling, setGachaRolling] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
    const [currentPage, setCurrentPage] = useState<number>(1);

    const rollGacha = () => {
        setGachaRolling(true);
        setGachaNovel(null);
        setTimeout(() => {
            const publishedNovelsOnly = novels.filter(n => n.chapters && n.chapters.some(ch => ch.status === 'published'));
            if (publishedNovelsOnly.length === 0) {
                setGachaRolling(false);
                return;
            }
            const randomIndex = Math.floor(Math.random() * publishedNovelsOnly.length);
            setGachaNovel(publishedNovelsOnly[randomIndex]);
            setGachaRolling(false);
        }, 800);
    };

    const publishedNovels = useMemo(() => {
        return novels.filter(novel => novel.chapters && novel.chapters.some(ch => ch.status === 'published'));
    }, [novels]);

    // Filtering & Sorting
    const filteredList = useMemo(() => {
        let list = publishedNovels.filter(novel => {
            if (exploreGenre !== "Tất cả" && !novel.genre.split(',').map(g => g.trim()).includes(exploreGenre)) return false;
            if (exploreType !== "all" && novel.type !== exploreType) return false;
            if (statusFilter === 'ongoing' && novel.status === 'completed') return false;
            if (statusFilter === 'completed' && novel.status !== 'completed') return false;
            if (searchQuery && searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesTitle = novel.title.toLowerCase().includes(query);
                const matchesAuthor = (novel.author || novel.author_name || "").toLowerCase().includes(query);
                const matchesTag = novel.tags && novel.tags.some(t => t.toLowerCase().includes(query));
                if (!matchesTitle && !matchesAuthor && !matchesTag) return false;
            }
            return true;
        });

        if (exploreSort === 'reads') {
            list.sort((a, b) => (Number(b.reads) || 0) - (Number(a.reads) || 0));
        } else if (exploreSort === 'rating') {
            list.sort((a, b) => {
                const rA = computeAverageStars(a.id);
                const rB = computeAverageStars(b.id);
                const valA = rA === "N/A" ? 0 : parseFloat(rA);
                const valB = rB === "N/A" ? 0 : parseFloat(rB);
                return valB - valA;
            });
        } else if (exploreSort === 'new') {
            list.sort((a, b) => b.id - a.id);
        }

        return list;
    }, [publishedNovels, exploreGenre, exploreType, statusFilter, searchQuery, exploreSort, computeAverageStars]);

    // Reset pagination when any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [exploreGenre, exploreType, statusFilter, searchQuery, exploreSort]);

    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
    const paginatedList = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredList.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredList, currentPage]);

    return (
        <div className="page-view active">
            <div className="studio-header">
                <div>
                    <h2>{searchQuery && searchQuery.trim() ? `Kết quả tìm kiếm: "${searchQuery}"` : (exploreGenre === 'Tất cả' ? 'Khám Phá Tác Phẩm' : `Thể loại: ${exploreGenre}`)}</h2>
                    <p className="subtitle">
                        {searchQuery && searchQuery.trim() ? (
                            <span>
                                Tìm thấy {filteredList.length} tác phẩm khớp với từ khóa. 
                                <button onClick={() => setSearchQuery("")} style={{background:'none', border:'none', color:'var(--text-main)', cursor:'pointer', fontWeight:600, padding:'0 8px', textDecoration:'underline'}}>Xóa tìm kiếm</button>
                            </span>
                        ) : (
                            exploreGenre === 'Tất cả' ? 'Duyệt qua danh mục kho tàng truyện của MugenBunko.' : `Các tác phẩm thuộc thể loại ${exploreGenre} tại MugenBunko.`
                        )}
                    </p>
                </div>
                <button className="outline-btn small" onClick={() => { setSearchQuery(""); setCurrentView('home'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.ArrowLeft size={14} /> Về Trang Chủ
                </button>
            </div>

            <div className="explore-layout">
                <div className="explore-main-column">
                    {/* Unified Filter Bar at the top */}
                    <div className="explore-filter-bar" style={{
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '18px', 
                        alignItems: 'center', 
                        justifyContent: 'flex-start',
                        padding: '16px 20px',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        marginTop: '10px'
                    }}>
                        {/* Keyword Search */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Từ khóa:</span>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type="text" 
                                    placeholder="Tên truyện, tác giả..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: '6px 12px 6px 30px',
                                        borderRadius: '20px',
                                        fontSize: '0.78rem',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        outline: 'none',
                                        width: '160px'
                                    }}
                                />
                                <span style={{ position: 'absolute', left: '10px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                                    <Icons.Search size={13} />
                                </span>
                            </div>
                        </div>

                        {/* Genre Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thể loại:</span>
                            <select
                                value={exploreGenre}
                                onChange={(e) => setExploreGenre(e.target.value)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.78rem',
                                    border: '1px solid',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    fontWeight: 500,
                                    borderColor: exploreGenre !== 'Tất cả' ? 'var(--text-main)' : 'var(--border-color)'
                                }}
                            >
                                <option value="Tất cả">Tất cả thể loại</option>
                                {genres.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tình trạng:</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[
                                    { id: 'all', name: 'Tất cả' },
                                    { id: 'ongoing', name: 'Đang ra' },
                                    { id: 'completed', name: 'Đã hoàn' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setStatusFilter(opt.id as any)}
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: '16px',
                                            fontSize: '0.74rem',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            background: statusFilter === opt.id ? 'var(--text-main)' : 'transparent',
                                            color: statusFilter === opt.id ? 'var(--bg-card)' : 'var(--text-main)',
                                            borderColor: statusFilter === opt.id ? 'var(--text-main)' : 'var(--border-color)'
                                        }}
                                    >
                                        {opt.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Format pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Định dạng:</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[
                                    { id: 'all', name: 'Tất cả' },
                                    { id: 'series', name: 'Series' },
                                    { id: 'oneshot', name: 'Oneshot' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setExploreType(opt.id)}
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: '16px',
                                            fontSize: '0.74rem',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            background: exploreType === opt.id ? 'var(--text-main)' : 'transparent',
                                            color: exploreType === opt.id ? 'var(--bg-card)' : 'var(--text-main)',
                                            borderColor: exploreType === opt.id ? 'var(--text-main)' : 'var(--border-color)'
                                        }}
                                    >
                                        {opt.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sắp xếp:</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[
                                    { id: 'reads', name: 'Xem nhiều' },
                                    { id: 'rating', name: 'Điểm cao' },
                                    { id: 'new', name: 'Mới nhất' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setExploreSort(opt.id)}
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: '16px',
                                            fontSize: '0.74rem',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            background: exploreSort === opt.id ? 'var(--text-main)' : 'transparent',
                                            color: exploreSort === opt.id ? 'var(--bg-card)' : 'var(--text-main)',
                                            borderColor: exploreSort === opt.id ? 'var(--text-main)' : 'var(--border-color)'
                                        }}
                                    >
                                        {opt.name}
                                    </button>
                                ))}
                            </div>

                            {/* View Mode Toggle Buttons */}
                            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', marginLeft: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    title="Hiển thị dạng lưới"
                                    style={{
                                        background: viewMode === 'grid' ? 'var(--text-main)' : 'var(--bg-card)',
                                        color: viewMode === 'grid' ? 'var(--bg-base)' : 'var(--text-main)',
                                        border: 'none',
                                        padding: '5px 8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Icons.Grid size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    title="Hiển thị dạng danh sách chi tiết"
                                    style={{
                                        background: viewMode === 'list' ? 'var(--text-main)' : 'var(--bg-card)',
                                        color: viewMode === 'list' ? 'var(--bg-base)' : 'var(--text-main)',
                                        border: 'none',
                                        padding: '5px 8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Icons.List size={13} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List of Novels */}
                    <div className="content-box" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 className="section-title" style={{ margin: 0 }}>
                                Danh sách tác phẩm ({filteredList.length})
                            </h3>
                            {totalPages > 1 && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    Trang {currentPage} / {totalPages}
                                </span>
                            )}
                        </div>

                        {filteredList.length === 0 ? (
                            <div className="empty-state-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                                    <Icons.Book size={44} />
                                </div>
                                <h4 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Không tìm thấy kết quả</h4>
                                <p style={{ fontSize: '0.85rem' }}>Không có tác phẩm nào phù hợp với bộ lọc hiện tại.</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="novel-grid">
                                {paginatedList.map(novel => {
                                    const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
                                    const stars = computeAverageStars(novel.id);
                                    const hasChapters = (novel.chapters || []).some(ch => ch.status === 'published');
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

                                                {hasChapters && startReading && (
                                                    <div className="novel-card-quick-read-overlay">
                                                        <button
                                                            className="quick-read-btn-pill"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startReading(novel.id, 0);
                                                            }}
                                                            title="Bắt đầu đọc"
                                                        >
                                                            <Icons.Play size={13} />
                                                            <span>Đọc ngay</span>
                                                        </button>
                                                    </div>
                                                )}
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
                                                        <span
                                                            key={t}
                                                            className="novel-tag-pill-v2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSearchQuery(t);
                                                            }}
                                                            title={`Lọc theo thẻ #${t}`}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            #{t}
                                                        </span>
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
                                                            <Icons.Bookmark filled={Boolean(isSaved)} />
                                                            <span>{isSaved ? 'Đã Lưu' : 'Lưu Tủ'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* List View Mode (Phase 3) */
                            <div className="novel-list-view" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {paginatedList.map(novel => {
                                    const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
                                    const stars = computeAverageStars(novel.id);
                                    const hasChapters = (novel.chapters || []).some(ch => ch.status === 'published');
                                    return (
                                        <div
                                            key={novel.id}
                                            className="novel-list-item-card"
                                            onClick={() => openNovelDetail(novel.id)}
                                            style={{
                                                display: 'flex',
                                                gap: '16px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius-md)',
                                                padding: '14px',
                                                cursor: 'pointer',
                                                transition: 'var(--transition-smooth)',
                                                boxShadow: 'var(--shadow-sm)'
                                            }}
                                        >
                                            <div style={{ position: 'relative', width: '80px', height: '112px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                                <img src={novel.cover} alt={novel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                                <span className="novel-badge-status" style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '0.6rem', padding: '1px 5px' }}>
                                                    {novel.status === 'completed' ? 'Hoàn' : 'Đang ra'}
                                                </span>
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                        <h4 style={{ fontSize: '0.98rem', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-main)', lineHeight: 1.35 }}>
                                                            {novel.title}
                                                        </h4>
                                                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                                                            {hasChapters && startReading && (
                                                                <button
                                                                    type="button"
                                                                    className="primary-btn small"
                                                                    onClick={() => startReading(novel.id, 0)}
                                                                    style={{ borderRadius: '16px', padding: '3px 12px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    <Icons.Play size={10} />
                                                                    <span>Đọc ngay</span>
                                                                </button>
                                                            )}
                                                            {currentUser && (
                                                                <button
                                                                    type="button"
                                                                    className={`novel-bookmark-btn-v2 ${isSaved ? 'saved' : ''}`}
                                                                    onClick={() => toggleBookmark(novel.id)}
                                                                    style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                                                                >
                                                                    <Icons.Bookmark filled={Boolean(isSaved)} />
                                                                    <span>{isSaved ? 'Đã Lưu' : 'Lưu Tủ'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                            <Icons.User /> {novel.author || novel.author_name || "Ẩn danh"}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{novel.genre || 'Light Novel'}</span>
                                                        <span>•</span>
                                                        <span>{novel.type === 'oneshot' ? 'Oneshot' : `${(novel.chapters || []).filter(c => c.status === 'published').length} chương`}</span>
                                                    </div>

                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45 }}>
                                                        {novel.description || novel.summary || 'Chưa có lời giới thiệu cho tác phẩm này.'}
                                                    </p>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        {(novel.tags || []).slice(0, 3).map(t => (
                                                            <span
                                                                key={t}
                                                                className="novel-tag-pill-v2"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSearchQuery(t);
                                                                }}
                                                            >
                                                                #{t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="novel-card-stats-group">
                                                        <span className="novel-card-rating-v2">
                                                            <Icons.Star /> {stars === 'N/A' ? 'N/A' : stars}
                                                        </span>
                                                        <span className="novel-card-reads-v2">
                                                            <Icons.Eye /> {Number(novel.reads).toLocaleString()} lượt đọc
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="explore-pagination-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '28px' }}>
                                <button
                                    className="outline-btn small"
                                    disabled={currentPage === 1}
                                    onClick={() => {
                                        setCurrentPage(prev => Math.max(1, prev - 1));
                                        window.scrollTo({ top: 300, behavior: 'smooth' });
                                    }}
                                    style={{ opacity: currentPage === 1 ? 0.4 : 1, padding: '4px 10px', borderRadius: '4px' }}
                                >
                                    <Icons.ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                                    if (p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)) {
                                        return (
                                            <button
                                                key={p}
                                                className={`outline-btn small ${currentPage === p ? 'active' : ''}`}
                                                onClick={() => {
                                                    setCurrentPage(p);
                                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                                }}
                                                style={{
                                                    minWidth: '32px',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: currentPage === p ? 'var(--text-main)' : 'transparent',
                                                    color: currentPage === p ? 'var(--bg-base)' : 'var(--text-main)',
                                                    fontWeight: currentPage === p ? 700 : 500,
                                                    borderColor: 'var(--border-color)'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        );
                                    }
                                    if (p === currentPage - 3 || p === currentPage + 3) {
                                        return <span key={p} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>;
                                    }
                                    return null;
                                })}
                                <button
                                    className="outline-btn small"
                                    disabled={currentPage === totalPages}
                                    onClick={() => {
                                        setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                        window.scrollTo({ top: 300, behavior: 'smooth' });
                                    }}
                                    style={{ opacity: currentPage === totalPages ? 0.4 : 1, padding: '4px 10px', borderRadius: '4px' }}
                                >
                                    <Icons.ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="sidebar-column" style={{ minWidth: 0 }}>
                    {/* Mugen Gacha Bento Widget */}
                    <div className="sidebar-card library-card" style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-md)',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '20px'
                    }}>
                        <div style={{
                            position: 'absolute', right: '-10px', top: '-10px', fontSize: '3.5rem', opacity: 0.05, fontFamily: 'var(--font-serif)', userSelect: 'none', color: 'var(--text-main)'
                        }}>運命</div>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
                            <Icons.Compass size={18} />
                            <span>Mugen Gacha</span>
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.45 }}>
                            Bạn đang phân vân chưa biết đọc gì? Hãy thử vận may quay gacha tìm nhân duyên sách của bạn nhé!
                        </p>
                        
                        {gachaRolling ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '8px' }}>
                                <div style={{ animation: 'spin 1s linear infinite' }}>
                                    <Icons.Compass size={24} />
                                </div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>Đang triệu hồi tác phẩm...</span>
                            </div>
                        ) : gachaNovel ? (
                            <div style={{
                                display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-base)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '14px',
                                overflow: 'hidden', width: '100%', boxSizing: 'border-box'
                            }}>
                                <img src={gachaNovel.cover} alt="cover" style={{ width: '40px', height: '55px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                                <div style={{ flexGrow: 1, minWidth: 0 }}>
                                    <h4 style={{ fontSize: '0.82rem', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{gachaNovel.title}</h4>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Tác giả: {gachaNovel.author || gachaNovel.author_name || "Ẩn danh"}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Icons.Star size={12} /> {computeAverageStars(gachaNovel.id) === 'N/A' ? 'N/A' : `${computeAverageStars(gachaNovel.id)}`}
                                    </span>
                                </div>
                                <button className="primary-btn small" onClick={() => openNovelDetail(gachaNovel.id)} style={{ padding: '4px 8px', fontSize: '0.72rem', flexShrink: 0 }}>Đọc</button>
                            </div>
                        ) : null}

                        <button className="primary-btn w-100" onClick={rollGacha} disabled={gachaRolling} style={{
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}>
                            <Icons.Zap size={14} />
                            <span>{gachaNovel ? 'Quay lại gacha' : 'Khai mở nhân duyên'}</span>
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
