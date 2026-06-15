import React, { useState } from 'react';
import { User, Novel } from '../types';

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
}

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
    setSearchQuery
}: ExploreProps) {
    const [gachaNovel, setGachaNovel] = useState<Novel | null>(null);
    const [gachaRolling, setGachaRolling] = useState(false);

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

    const publishedNovels = novels.filter(novel => novel.chapters && novel.chapters.some(ch => ch.status === 'published'));

    // Filtering
    let list = publishedNovels.filter(novel => {
        if (exploreGenre !== "Tất cả" && !novel.genre.split(',').map(g => g.trim()).includes(exploreGenre)) return false;
        if (exploreType !== "all" && novel.type !== exploreType) return false;
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const matchesTitle = novel.title.toLowerCase().includes(query);
            const matchesAuthor = (novel.author || novel.author_name || "").toLowerCase().includes(query);
            const matchesTag = novel.tags && novel.tags.some(t => t.toLowerCase().includes(query));
            if (!matchesTitle && !matchesAuthor && !matchesTag) return false;
        }
        return true;
    });

    // Sorting
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

    return (
        <div className="page-view active">
            <div className="studio-header">
                <div>
                    <h2>{searchQuery && searchQuery.trim() ? `Kết quả tìm kiếm: "${searchQuery}"` : (exploreGenre === 'Tất cả' ? 'Khám Phá Tác Phẩm' : `Thể loại: ${exploreGenre}`)}</h2>
                    <p className="subtitle">
                        {searchQuery && searchQuery.trim() ? (
                            <span>
                                Tìm thấy {list.length} tác phẩm khớp với từ khóa. 
                                <button onClick={() => setSearchQuery("")} style={{background:'none', border:'none', color:'var(--sakura-pink)', cursor:'pointer', fontWeight:600, padding:'0 8px', textDecoration:'underline'}}>Xóa tìm kiếm</button>
                            </span>
                        ) : (
                            exploreGenre === 'Tất cả' ? 'Duyệt qua danh mục kho tàng truyện của MugenBunko.' : `Các tác phẩm thuộc thể loại ${exploreGenre} tại MugenBunko.`
                        )}
                    </p>
                </div>
                <button className="outline-btn small" onClick={() => { setSearchQuery(""); setCurrentView('home'); }}>← Về Trang Chủ</button>
            </div>

            <div className="explore-layout" style={{ display: 'grid', gridTemplateColumns: '8.5fr 3.5fr', gap: '24px', alignItems: 'flex-start' }}>
                <div className="explore-main-column">
                    {/* Unified Filter Bar at the top */}
                    <div className="explore-filter-bar" style={{
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '20px', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        marginTop: '10px'
                    }}>
                        {/* Left side: Genre Dropdown & Format Pills */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                            {/* Genre Dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thể loại:</span>
                                <select
                                    value={exploreGenre}
                                    onChange={(e) => setExploreGenre(e.target.value)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.78rem',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                        borderColor: exploreGenre !== 'Tất cả' ? 'var(--sakura-pink)' : 'var(--border-color)',
                                        boxShadow: exploreGenre !== 'Tất cả' ? '0 0 0 1px var(--sakura-pink)' : 'none'
                                    }}
                                >
                                    <option value="Tất cả">Tất cả thể loại</option>
                                    {genres.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Format pills */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Định dạng:</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {[
                                        { id: 'all', name: 'Tất cả' },
                                        { id: 'series', name: 'Series' },
                                        { id: 'oneshot', name: 'Oneshot' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setExploreType(opt.id)}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.78rem',
                                                border: '1px solid',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                                transition: 'all 0.2s',
                                                background: exploreType === opt.id ? 'var(--sakura-pink)' : 'transparent',
                                                color: exploreType === opt.id ? 'white' : 'var(--text-main)',
                                                borderColor: exploreType === opt.id ? 'var(--sakura-pink)' : 'var(--border-color)'
                                            }}
                                        >
                                            {opt.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right side: Sort Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sắp xếp:</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {[
                                    { id: 'reads', name: 'Đọc nhiều nhất' },
                                    { id: 'rating', name: 'Đánh giá tốt nhất' },
                                    { id: 'new', name: 'Mới đăng' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setExploreSort(opt.id)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.78rem',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                            background: exploreSort === opt.id ? 'var(--sakura-pink)' : 'transparent',
                                            color: exploreSort === opt.id ? 'white' : 'var(--text-main)',
                                            borderColor: exploreSort === opt.id ? 'var(--sakura-pink)' : 'var(--border-color)'
                                        }}
                                    >
                                        {opt.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* List of Novels Grid */}
                    <div className="content-box" style={{ padding: '24px' }}>
                        <h3 className="section-title" style={{ marginBottom: '20px' }}>
                            Danh sách tác phẩm
                        </h3>

                        {list.length === 0 ? (
                            <div className="empty-state-card" style={{ padding: '40px 20px' }}>
                                <span className="empty-icon">📚</span>
                                <h4>Không tìm thấy kết quả</h4>
                                <p>Không có tác phẩm nào phù hợp với bộ lọc hiện tại.</p>
                            </div>
                        ) : (
                            <div className="novel-grid">
                                {list.map(novel => {
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
                                                <div className="novel-card-author">Tác giả: {novel.author || novel.author_name || novel.author_username || "Ẩn danh"}</div>
                                                <div className="detail-tags-row" style={{ marginBottom: '8px', gap: '4px' }}>
                                                    {novel.tags && novel.tags.slice(0, 3).map(t => (
                                                        <span key={t} className="tag-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>#{t}</span>
                                                    ))}
                                                </div>
                                                <div className="novel-card-meta">
                                                    <span className="novel-card-rating">{computeAverageStars(novel.id) === 'N/A' ? 'N/A' : `★ ${computeAverageStars(novel.id)}`}</span>
                                                    <span className="novel-card-reads">📖 {novel.reads}</span>
                                                </div>
                                                <div className="flex-row-between" style={{ marginTop: '10px' }}>
                                                    {currentUser && (
                                                        <button
                                                            className={isSaved ? "primary-btn small" : "outline-btn small"}
                                                            style={{ padding: '4px 8px', fontSize: '0.72rem', background: isSaved ? 'var(--indigo-blue)' : '' }}
                                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(novel.id); }}
                                                        >
                                                            🔖 {isSaved ? 'Đã Lưu' : 'Lưu Tủ'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <aside className="sidebar-column" style={{ minWidth: 0 }}>
                    {/* Mugen Gacha Widget */}
                    <div className="sidebar-card library-card" style={{
                        background: 'linear-gradient(135deg, var(--sakura-pink-light) 0%, rgba(255,255,255,0.9) 100%)',
                        border: '1px solid var(--sakura-pink)',
                        boxShadow: '0 4px 15px rgba(224, 82, 117, 0.1)',
                        position: 'relative',
                        overflow: 'hidden',
                        margin: 0,
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{
                            position: 'absolute', right: '-15px', top: '-15px', fontSize: '4rem', opacity: 0.15, transform: 'rotate(15deg)', userSelect: 'none'
                        }}>🔮</div>
                        <h3 className="card-title" style={{color: 'var(--sakura-pink)', borderBottomColor: 'rgba(224, 82, 117, 0.2)'}}>
                            🔮 Mugen Gacha
                        </h3>
                        <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'12px'}}>Bạn đang phân vân chưa biết đọc gì? Hãy thử vận may quay gacha tìm nhân duyên sách của bạn nhé!</p>
                        
                        {gachaRolling ? (
                            <div style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0', gap:'8px'}}>
                                <span style={{fontSize:'1.8rem', animation:'spin 1s linear infinite', display:'inline-block'}}>🔮</span>
                                <span style={{fontSize:'0.78rem', color:'var(--sakura-pink)', fontWeight:600}}>Đang triệu hồi tác phẩm...</span>
                            </div>
                        ) : gachaNovel ? (
                            <div style={{
                                display:'flex', gap:'10px', alignItems:'center', background:'rgba(255,255,255,0.8)', padding:'10px', borderRadius:'6px', border:'1px solid rgba(224, 82, 117, 0.1)', animation:'slideUpChat 0.3s ease', marginBottom:'12px',
                                overflow: 'hidden',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}>
                                <img src={gachaNovel.cover} alt="cover" style={{width:'40px', height:'55px', objectFit:'cover', borderRadius:'4px', border:'1px solid var(--border-color)', flexShrink:0}} />
                                <div style={{flexGrow:1, minWidth:0}}>
                                    <h4 style={{fontSize:'0.82rem', margin:'0 0 4px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-main)'}}>{gachaNovel.title}</h4>
                                    <span style={{fontSize:'0.7rem', color:'var(--text-muted)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>Tác giả: {gachaNovel.author || gachaNovel.author_name || gachaNovel.author_username || "Ẩn danh"}</span>
                                    <span style={{fontSize:'0.68rem', color:'var(--sakura-pink)', fontWeight:600}}>{computeAverageStars(gachaNovel.id) === 'N/A' ? 'N/A' : `★ ${computeAverageStars(gachaNovel.id)} Điểm`}</span>
                                </div>
                                <button className="primary-btn small" onClick={() => openNovelDetail(gachaNovel.id)} style={{padding:'4px 8px', fontSize:'0.7rem', flexShrink:0}}>Đọc</button>
                            </div>
                        ) : null}

                        <button className="primary-btn w-100" onClick={rollGacha} disabled={gachaRolling} style={{
                            background: 'var(--sakura-pink)',
                            borderColor: 'var(--sakura-pink)',
                            boxShadow: '0 2px 8px rgba(224, 82, 117, 0.3)',
                            fontWeight: 600,
                            fontSize: '0.8rem'
                        }}>
                            {gachaNovel ? '🔮 Quay lại gacha' : '🔮 Khai mở nhân duyên'}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
