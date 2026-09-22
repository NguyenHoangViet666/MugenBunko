import React, { useState, useEffect } from 'react';
import { User, Novel, Comment, Review, Chapter } from '../types';
import { Icons } from '../components/Icons';

const getWordCount = (content: string | undefined): number => {
    if (!content) return 0;
    const cleanText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return 0;
    return cleanText.split(/\s+/).length;
};

interface NovelDetailProps {
    API_BASE: string;
    novels: Novel[];
    activeNovelId: number | null;
    currentUser: User | null;
    users: User[];
    setLoginModalOpen: (open: boolean) => void;
    setCurrentView: (view: string) => void;
    setActiveNovelId: (id: number | null) => void;
    startReading: (novelId: number, chapterIndex: number) => void;
    toggleBookmark: (id: number) => void;
    toggleFollowAuthor: (authorId: string, authorName: string) => void;
    reviewText: string;
    setReviewText: (text: string) => void;
    selectedRatingStars: number;
    setSelectedRatingStars: (stars: number) => void;
    submitReview: () => void;
    commentText: string;
    setCommentText: (text: string) => void;
    submitComment: () => void;
    comments: { [novelId: number]: Comment[] };
    setComments?: (comments: any) => void;
    replyToCommentId: number | null;
    setReplyToCommentId: (id: number | null) => void;
    replyText: string;
    setReplyText: (text: string) => void;
    replyToUserId: number | null;
    setReplyToUserId: (id: number | null) => void;
    submitCommentReply: (parentId: number) => void;
    reportComment: (id: number) => void;
    computeAverageStars: (id: number) => string;
    reviews: { [novelId: number]: Review[] };
    detailSummaryExpanded: boolean;
    setDetailSummaryExpanded: (expanded: boolean) => void;
    announcements: any[];
    handleDeleteNovel: (id: number, reason: string) => Promise<boolean>;
    viewPublicProfile: (username: string) => void;
}

export default function NovelDetail({
    API_BASE,
    novels,
    activeNovelId,
    currentUser,
    setLoginModalOpen,
    setCurrentView,
    startReading,
    toggleBookmark,
    toggleFollowAuthor,
    reviewText,
    setReviewText,
    selectedRatingStars,
    setSelectedRatingStars,
    submitReview,
    commentText,
    setCommentText,
    submitComment,
    comments,
    replyToCommentId,
    setReplyToCommentId,
    replyText,
    setReplyText,
    replyToUserId,
    setReplyToUserId,
    submitCommentReply,
    reportComment,
    computeAverageStars,
    reviews,
    detailSummaryExpanded,
    setDetailSummaryExpanded,
    announcements,
    handleDeleteNovel,
    viewPublicProfile
}: NovelDetailProps) {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");

    const [deletedInfo, setDeletedInfo] = useState<{ id: number; title: string; reason: string; deletedAt?: string } | null>(null);
    const [loadingDeleted, setLoadingDeleted] = useState(false);
    const [deletedError, setDeletedError] = useState(false);

    useEffect(() => {
        const novel = novels.find(n => n.id === activeNovelId);
        if (!novel && activeNovelId !== null) {
            setLoadingDeleted(true);
            setDeletedError(false);
            setDeletedInfo(null);
            fetch(`${API_BASE}/novels/deleted/${activeNovelId}`)
                .then(res => {
                    if (!res.ok) throw new Error("Not found");
                    return res.json();
                })
                .then(data => {
                    setDeletedInfo(data);
                    setLoadingDeleted(false);
                })
                .catch(err => {
                    console.error("Fetch deleted novel info error:", err);
                    setDeletedError(true);
                    setLoadingDeleted(false);
                });
        }
    }, [activeNovelId, novels, API_BASE]);

    return (
        <div className="page-view active">
            {(() => {
                const novel = novels.find(n => n.id === activeNovelId);
                if (!novel) {
                    if (loadingDeleted) {
                        return (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
                                <span style={{ marginLeft: '10px' }}>Đang tải thông tin...</span>
                            </div>
                        );
                    }
                    if (deletedInfo) {
                        return (
                            <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
                                <div className="back-nav-container" style={{ marginBottom: '24px' }}>
                                    <button className="text-link-btn" onClick={() => setCurrentView('home')}>
                                        ← Quay lại trang chủ
                                    </button>
                                </div>
                                <div style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    padding: '40px 30px',
                                    textAlign: 'center',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                                }}>
                                    <div style={{
                                        fontSize: '3.5rem',
                                        color: 'var(--sakura-pink)',
                                        marginBottom: '20px',
                                        lineHeight: 1
                                    }}>
                                        ⚠️
                                    </div>
                                    <h2 style={{
                                        fontSize: '1.4rem',
                                        fontWeight: 700,
                                        color: 'var(--text-main)',
                                        marginBottom: '16px'
                                    }}>
                                        Tác phẩm đã bị gỡ bỏ
                                    </h2>
                                    <p style={{
                                        fontSize: '1rem',
                                        color: 'var(--text-muted)',
                                        marginBottom: '24px',
                                        lineHeight: 1.6
                                    }}>
                                        Truyện <strong style={{ color: 'var(--sakura-pink)' }}>{deletedInfo.title}</strong> đã bị gỡ bỏ khỏi hệ thống.
                                    </p>
                                    <div style={{
                                        background: 'var(--bg-base)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '20px',
                                        textAlign: 'left',
                                        marginBottom: '30px'
                                    }}>
                                        <h4 style={{
                                            margin: '0 0 8px 0',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Lý do gỡ bỏ:
                                        </h4>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.95rem',
                                            color: 'var(--text-main)',
                                            lineHeight: 1.5,
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {deletedInfo.reason}
                                        </p>
                                        {deletedInfo.deletedAt && (
                                            <div style={{
                                                marginTop: '12px',
                                                fontSize: '0.78rem',
                                                color: 'var(--text-muted)',
                                                textAlign: 'right'
                                            }}>
                                                Thời gian gỡ: {deletedInfo.deletedAt}
                                            </div>
                                        )}
                                    </div>
                                    <button className="primary-btn" onClick={() => setCurrentView('home')} style={{ width: '100%', padding: '12px', borderRadius: '6px' }}>
                                        Khám phá truyện khác
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
                            <div className="back-nav-container" style={{ marginBottom: '24px', textAlign: 'left' }}>
                                <button className="text-link-btn" onClick={() => setCurrentView('home')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600 }}>
                                    <Icons.ArrowLeft size={16} /> Quay lại trang chủ
                                </button>
                            </div>
                            <div style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '40px 30px',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Icons.Search size={44} />
                                </div>
                                <h3 style={{ color: 'var(--text-main)', marginBottom: '12px', fontFamily: 'var(--font-serif)' }}>Không tìm thấy tác phẩm</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Tác phẩm không tồn tại hoặc đã bị xóa hoàn toàn khỏi cơ sở dữ liệu.</p>
                                <button className="primary-btn" onClick={() => setCurrentView('home')} style={{ width: '100%', padding: '12px', borderRadius: '6px' }}>
                                    Quay về trang chủ
                                </button>
                            </div>
                        </div>
                    );
                }
                const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
                const publishedChapters = novel.chapters ? novel.chapters.filter(ch => ch.status === 'published') : [];
                const totalWordCount = publishedChapters.reduce((acc, ch) => acc + (ch.word_count || 0), 0);
                
                // Check reading history for review criteria
                let readCount = 0;
                if (currentUser) {
                    const progressKey = `mugen_readprogress_${currentUser.username}_${novel.id}`;
                    const progressRaw = localStorage.getItem(progressKey);
                    const savedProgress = progressRaw ? JSON.parse(progressRaw) : null;
                    if (savedProgress && savedProgress.readChaptersList) {
                        readCount = savedProgress.readChaptersList.length;
                    }
                }

                const isOneshot = novel.type === 'oneshot';
                const minRequired = isOneshot ? 1 : 3;

                // Author user info from novel query
                const authorAvatar = novel.authorAvatarSeed || 'author';
                const authorBio = novel.authorBio || 'Nhà văn tự do sáng tác tại MugenBunko.';

                return (
                    <>
                        <div className="back-nav-container" style={{ marginBottom: '20px' }}>
                            <button className="text-link-btn" onClick={() => setCurrentView('home')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600 }}>
                                <Icons.ArrowLeft size={16} /> Trở lại danh sách truyện
                            </button>
                        </div>

                        {/* Novel General Metadata Block (Bento Showcase) */}
                        <div className="novel-detail-card" style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-lg)',
                            boxShadow: 'var(--shadow-sm)',
                            padding: '28px',
                            display: 'flex',
                            gap: '32px'
                        }}>
                            <div className="detail-cover-wrapper" style={{ flexShrink: 0, position: 'relative' }}>
                                <img 
                                    src={novel.cover} 
                                    alt={novel.title} 
                                    className="detail-cover" 
                                    style={{
                                        width: '180px',
                                        height: '250px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                        border: '1px solid var(--border-color)'
                                    }} 
                                />
                            </div>
                            <div className="detail-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{
                                        background: 'var(--text-main)',
                                        color: 'var(--bg-card)',
                                        padding: '3px 10px',
                                        borderRadius: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.5px'
                                    }}>
                                        {novel.status === 'completed' ? 'HOÀN THÀNH' : novel.status === 'paused' ? 'TẠM NGƯNG' : novel.status === 'suspended' ? 'BỊ KHÓA' : 'ĐANG TIẾN HÀNH'}
                                    </span>
                                    <span style={{
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-muted)',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600
                                    }}>
                                        {novel.type === 'oneshot' ? 'Oneshot' : 'Series'}
                                    </span>
                                </div>

                                <h2 className="detail-title" style={{
                                    fontSize: '1.65rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-serif)',
                                    color: 'var(--text-main)',
                                    margin: '0 0 12px 0',
                                    lineHeight: '1.3'
                                }}>
                                    {novel.title}
                                </h2>

                                <div className="detail-meta-row" style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '16px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '14px',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <Icons.User size={15} />
                                        <span>Tác giả:</span>
                                        <strong 
                                            style={{ cursor: 'pointer', color: 'var(--text-main)', textDecoration: 'underline' }} 
                                            onClick={() => novel.authorId && viewPublicProfile(novel.authorId)}
                                        >
                                            {novel.author || novel.author_name || "Ẩn danh"}
                                        </strong>
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <Icons.Eye size={15} />
                                        <strong>{Number(novel.reads).toLocaleString()}</strong> lượt đọc
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <Icons.Star size={15} filled={true} />
                                        <strong>{computeAverageStars(novel.id) === 'N/A' ? 'N/A' : computeAverageStars(novel.id)}</strong>
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <Icons.Bookmark size={15} />
                                        <strong>{novel.bookmarksCount || 0}</strong> lưu
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <Icons.Feather size={15} />
                                        <strong>{Number(totalWordCount).toLocaleString()}</strong> từ
                                    </span>
                                </div>

                                <p className={`detail-summary ${detailSummaryExpanded ? 'expanded' : ''}`} style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-content)',
                                    lineHeight: '1.6',
                                    marginBottom: '10px'
                                }}>
                                    {novel.summary}
                                </p>

                                <button 
                                    className="text-link-btn" 
                                    style={{ width: 'fit-content', marginBottom: '14px', padding: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }} 
                                    onClick={() => setDetailSummaryExpanded(!detailSummaryExpanded)}
                                >
                                    {detailSummaryExpanded ? '↑ Thu gọn tóm tắt' : '↓ Đọc thêm tóm tắt'}
                                </button>

                                <div className="detail-tags-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                                    {(novel.tags || []).map(t => (
                                        <span key={t} className="tag-badge" style={{
                                            fontSize: '0.75rem',
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            background: 'var(--bg-base)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-muted)'
                                        }}>
                                            #{t}
                                        </span>
                                    ))}
                                </div>

                                <div className="detail-actions" style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
                                    <button className="primary-btn" onClick={() => startReading(novel.id, 0)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        <Icons.Book size={16} />
                                        <span>Đọc Từ Đầu</span>
                                    </button>
                                    {currentUser && (
                                        <button 
                                            className={isSaved ? "primary-btn" : "outline-btn"} 
                                            onClick={() => toggleBookmark(novel.id)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <Icons.Bookmark size={16} filled={Boolean(isSaved)} />
                                            <span>{isSaved ? 'Đã Lưu Tủ Sách' : 'Lưu Tủ Sách'}</span>
                                        </button>
                                    )}
                                    {currentUser && currentUser.roles && currentUser.roles.includes('admin') && (
                                        <button 
                                            className="outline-btn" 
                                            style={{ borderColor: '#dc3545', color: '#dc3545', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            onClick={() => {
                                                setDeleteReason("");
                                                setDeleteModalOpen(true);
                                            }}
                                        >
                                            <Icons.Trash size={15} />
                                            <span>Gỡ bỏ (Admin)</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Book split layout detail */}
                        <div className="novel-detail-body">
                            <div className="main-column">
                                {/* Chapter Tree rendering */}
                                <div className="content-box">
                                    <h3 className="section-title">Danh Sách Tập & Chương</h3>
                                    <div className="chapter-tree-container">
                                        {(() => {
                                            const publishedChapters = (novel.chapters || []).filter(ch => ch.status === 'published');
                                            if (publishedChapters.length === 0) {
                                                return <div style={{fontSize:'0.85rem', color:'var(--text-muted)', padding:'16px 0', textAlign:'center'}}>Tác phẩm chưa có chương công khai.</div>;
                                            }
                                            
                                            const vols: { [key: string]: { ch: Chapter; idx: number }[] } = {};
                                            publishedChapters.forEach((ch, idx) => {
                                                const volName = ch.volume_name || ch.volume || "Tập 01: Quyển khởi đầu";
                                                if (!vols[volName]) vols[volName] = [];
                                                vols[volName].push({ ch, idx });
                                            });

                                            const sortedVols = Object.entries(vols).sort((a, b) => {
                                                const minIdA = Math.min(...a[1].map(item => item.ch.id));
                                                const minIdB = Math.min(...b[1].map(item => item.ch.id));
                                                return minIdA - minIdB;
                                            });

                                            return sortedVols.map(([volName, list]) => (
                                                <div key={volName} className="novel-volume-block">
                                                    <h4 className="volume-title" style={{margin:'16px 0 8px 0', borderBottom:'1.5px solid var(--border-color)', paddingBottom:'6px', fontWeight:600}}>{volName}</h4>
                                                    <ul className="chapter-list" style={{listStyle:'none', padding:0, margin:0}}>
                                                        {list.map(item => (
                                                            <li 
                                                                key={item.idx} 
                                                                className="chapter-tree-item"
                                                                onClick={() => startReading(novel.id, item.idx)}
                                                                style={{padding:'8px 12px', borderBottom:'1px dashed var(--border-color)', cursor:'pointer', display:'flex', justifyContent:'space-between'}}
                                                            >
                                                                <span className="chapter-title-lbl" style={{fontSize:'0.88rem'}}>{item.ch.title}</span>
                                                                <span className="chapter-date-lbl" style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{Number(item.ch.word_count || 0).toLocaleString()} từ | {item.ch.date || new Date(item.ch.created_at).toLocaleDateString('vi-VN')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>

                                {/* Announcements */}
                                <div className="content-box">
                                    <h3 className="section-title">Thông Báo Của Tác Giả</h3>
                                    <div className="announcements-list-wrapper">
                                        {announcements.filter(a => a.novelId === novel.id).length === 0 ? (
                                            <div style={{fontSize:'0.8rem', color:'var(--text-muted)', padding:'8px 0'}}>Không có thông báo mới nào từ tác giả.</div>
                                        ) : (
                                            [...announcements].filter(a => a.novelId === novel.id).reverse().map(ann => (
                                                <div key={ann.id} className="announcement-item-box">
                                                    <div className="announcement-meta">
                                                        <span>Đăng ngày: {ann.date}</span>
                                                    </div>
                                                    <p className="announcement-body">{ann.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Reviews Section */}
                                <div className="content-box">
                                    <h3 className="section-title">Đánh giá tác phẩm</h3>
                                    
                                    {currentUser ? (
                                        (reviews[novel.id] || []).some(r => r.user_id === currentUser.id || r.username === currentUser.username) ? (
                                            <div className="alert-box success" style={{background:'var(--bg-base)', padding:'12px 16px', borderRadius:'6px', fontSize:'0.82rem', border:'1px solid var(--border-color)', marginBottom:'16px', color:'var(--text-main)', display:'flex', alignItems:'center', gap:'8px'}}>
                                                <Icons.CheckCircle size={16} />
                                                <span>Bạn đã gửi đánh giá cho tác phẩm này rồi. Cảm ơn nhận xét của bạn!</span>
                                            </div>
                                        ) : readCount >= minRequired ? (
                                            <div className="review-form-container">
                                                <div className="star-rating-selector" style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
                                                    <span style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Đánh giá của bạn:</span>
                                                    <div className="stars-stars" style={{color:'var(--text-main)', display:'flex', gap:'4px', cursor:'pointer'}}>
                                                        {[1,2,3,4,5].map(val => (
                                                            <span 
                                                                key={val} 
                                                                className="star-select"
                                                                onClick={() => setSelectedRatingStars(val)}
                                                                style={{opacity: val <= selectedRatingStars ? 1 : 0.25, transition:'opacity 0.2s'}}
                                                            >
                                                                <Icons.Star size={18} filled={val <= selectedRatingStars} />
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <textarea 
                                                    placeholder="Nhận xét của bạn về truyện (tối thiểu 15 ký tự)..." 
                                                    value={reviewText}
                                                    onChange={(e) => setReviewText(e.target.value)}
                                                    style={{width:'100%', minHeight:'80px', padding:'8px', border:'1px solid var(--border-color)', borderRadius:'4px', outline:'none', fontFamily:'inherit', resize:'vertical'}}
                                                />
                                                <div className="flex-row-end" style={{marginTop:'8px'}}>
                                                    <button className="primary-btn small" onClick={submitReview}>Gửi Đánh Giá</button>
                                                 </div>
                                            </div>
                                        ) : (
                                            <div className="alert-box info" style={{background:'var(--bg-base)', padding:'12px 16px', borderRadius:'6px', fontSize:'0.82rem', border:'1px solid var(--border-color)', marginBottom:'16px'}}>
                                                <div style={{ marginBottom: '10px', display:'flex', alignItems:'center', gap:'8px', color:'var(--text-main)' }}>
                                                    <Icons.AlertCircle size={16} />
                                                    <span>Bạn cần đọc tối thiểu <strong>{minRequired} chương</strong> để gửi đánh giá. Lịch sử đọc hiện tại: <strong>{readCount}</strong> chương.</span>
                                                </div>
                                                <button className="primary-btn small" onClick={() => startReading(novel.id, readCount > 0 ? readCount : 0)}>
                                                    {readCount > 0 ? `Đọc tiếp Chương ${readCount + 1} ngay` : 'Đọc chương 1 ngay'}
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="guest-action-alert" style={{background:'var(--bg-base)', padding:'12px 16px', borderRadius:'6px', fontSize:'0.82rem', textAlign:'center', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
                                            <Icons.Key size={16} />
                                            <span>Vui lòng <a href="#" onClick={(e) => { e.preventDefault(); setLoginModalOpen(true); }} style={{color:'var(--text-main)', fontWeight:600, textDecoration:'underline'}}>Đăng nhập</a> để bình luận hoặc đánh giá.</span>
                                        </div>
                                    )}

                                    <div className="reviews-list-container" style={{marginTop:'20px'}}>
                                        {(reviews[novel.id] || []).length === 0 ? (
                                            <div style={{fontSize:'0.8rem', color:'var(--text-muted)', padding:'16px 0', textAlign:'center'}}>Chưa có đánh giá nào.</div>
                                        ) : (
                                            (reviews[novel.id] || []).map((r, i) => (
                                                <div key={i} className="review-item-card" style={{borderBottom:'1px solid var(--border-color)', padding:'12px 0'}}>
                                                    <div className="review-author-row flex-row-between" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                        <div style={{display:'flex', alignSelf:'center', gap:'8px', alignItems:'center', cursor:'pointer'}} onClick={() => r.username && viewPublicProfile(r.username)}>
                                                            <img src={r.avatarSeed && (r.avatarSeed.startsWith('http') || r.avatarSeed.startsWith('/uploads') || r.avatarSeed.startsWith('data:')) ? r.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${r.avatarSeed}`} style={{width:'32px', height:'32px', borderRadius:'50%', border:'1px solid var(--border-color)'}} alt="Avatar" />
                                                            <div>
                                                                <strong style={{fontSize:'0.85rem', color:'var(--text-main)'}}>{r.displayname || r.username}</strong>
                                                                <div style={{color:'var(--text-main)', display:'flex', gap:'2px', marginTop:'2px'}}>
                                                                    {[...Array(5)].map((_, sIdx) => (
                                                                        <Icons.Star key={sIdx} size={12} filled={sIdx < r.stars} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{r.date || new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                                                    </div>
                                                    <p style={{fontSize:'0.85rem', marginTop:'8px', lineHeight:1.5, color:'var(--text-content)'}}>{r.text}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Comments Section */}
                                <div className="content-box">
                                    <h3 className="section-title">Bình luận trao đổi</h3>
                                    {currentUser ? (
                                        <div className="comment-input-box" style={{marginBottom:'20px'}}>
                                            <textarea 
                                                placeholder="Viết bình luận của bạn..." 
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                style={{width:'100%', minHeight:'80px', padding:'8px', border:'1px solid var(--border-color)', borderRadius:'4px', outline:'none', fontFamily:'inherit', resize:'vertical'}}
                                            />
                                            <div className="flex-row-end" style={{marginTop:'8px'}}>
                                                <button className="primary-btn small" onClick={submitComment}>Gửi Bình Luận</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="guest-action-alert" style={{background:'var(--bg-base)', padding:'12px 16px', borderRadius:'6px', fontSize:'0.82rem', textAlign:'center', marginBottom:'16px', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
                                            <Icons.Key size={16} />
                                            <span>Vui lòng <a href="#" onClick={(e) => { e.preventDefault(); setLoginModalOpen(true); }} style={{color:'var(--text-main)', fontWeight:600, textDecoration:'underline'}}>Đăng nhập</a> để viết bình luận.</span>
                                        </div>
                                    )}

                                    <div className="comments-tree">
                                        {Object.values(comments[novel.id] || []).length === 0 ? (
                                            <div style={{fontSize:'0.8rem', color:'var(--text-muted)', padding:'16px 0', textAlign:'center'}}>Chưa có bình luận nào. Hãy là người đầu tiên!</div>
                                        ) : (
                                            Object.values(comments[novel.id] || []).map((c) => (
                                                <div key={c.id} className="comment-root-node" style={{borderBottom:'1px dashed var(--border-color)', padding:'14px 0'}}>
                                                    <div className="comment-meta-row flex-row-between" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                        <div style={{display:'flex', gap:'8px', alignItems:'center', cursor:'pointer'}} onClick={() => c.username && viewPublicProfile(c.username)}>
                                                            <img src={c.avatarSeed && (c.avatarSeed.startsWith('http') || c.avatarSeed.startsWith('/uploads') || c.avatarSeed.startsWith('data:')) ? c.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.avatarSeed}`} style={{width:'28px', height:'28px', borderRadius:'50%', border:'1px solid var(--border-color)'}} alt="Avatar" />
                                                            <strong style={{fontSize:'0.85rem', color:'var(--text-main)'}}>{c.displayname || c.username}</strong>
                                                        </div>
                                                        <span style={{fontSize:'0.72rem', color:'var(--text-muted)'}}>{c.date || new Date(c.created_at).toLocaleDateString('vi-VN')}</span>
                                                    </div>
                                                    <p style={{fontSize:'0.85rem', marginTop:'6px', lineHeight:1.45, color:'var(--text-content)'}}>{c.text}</p>
                                                    <div className="comment-actions-bar" style={{marginTop:'6px', display:'flex', gap:'14px'}}>
                                                        {currentUser && (
                                                            <>
                                                                <button 
                                                                    className="text-link-btn" 
                                                                    style={{fontSize:'0.75rem', padding:0, height:'auto', color:'var(--text-muted)'}} 
                                                                    onClick={() => { 
                                                                        setReplyToCommentId(c.id); 
                                                                        setReplyToUserId(c.user_id);
                                                                        if (c.username === currentUser.username) {
                                                                            setReplyText("");
                                                                        } else {
                                                                            setReplyText(`@${c.displayname} `);
                                                                        }
                                                                    }}
                                                                >
                                                                    Phản hồi
                                                                </button>
                                                                <button className="text-link-btn" style={{fontSize:'0.75rem', padding:0, height:'auto', color:'#cc0000'}} onClick={() => reportComment(c.id)}>Báo cáo</button>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Replies list */}
                                                    {(c.replies || []).map((reply: any) => (
                                                        <div key={reply.id} className="comment-reply-item" style={{marginLeft:'28px', marginTop:'10px', padding:'10px 12px', background:'var(--bg-base)', borderRadius:'6px', border:'1px solid var(--border-color)'}}>
                                                            <div className="flex-row-between" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                                <div style={{display:'flex', gap:'6px', alignItems:'center', cursor:'pointer'}} onClick={() => reply.username && viewPublicProfile(reply.username)}>
                                                                    <img src={reply.avatarSeed && (reply.avatarSeed.startsWith('http') || reply.avatarSeed.startsWith('/uploads') || reply.avatarSeed.startsWith('data:')) ? reply.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${reply.avatarSeed}`} style={{width:'22px', height:'22px', borderRadius:'50%'}} alt="Avatar" />
                                                                    <strong style={{fontSize:'0.8rem', color:'var(--text-main)'}}>{reply.displayname || reply.username}</strong>
                                                                </div>
                                                                <span style={{fontSize:'0.70rem', color:'var(--text-muted)'}}>{reply.date || new Date(reply.created_at).toLocaleDateString('vi-VN')}</span>
                                                            </div>
                                                            <p style={{fontSize:'0.82rem', marginTop:'4px', lineHeight:1.4, marginLeft:'28px', color:'var(--text-content)'}}>{reply.text}</p>
                                                            <div className="comment-actions-bar" style={{marginTop:'4px', display:'flex', gap:'12px', marginLeft:'28px'}}>
                                                                {currentUser && (
                                                                    <>
                                                                        <button 
                                                                            className="text-link-btn" 
                                                                            style={{fontSize:'0.72rem', padding:0, height:'auto', color:'var(--text-muted)'}} 
                                                                            onClick={() => { 
                                                                                setReplyToCommentId(c.id); 
                                                                                setReplyToUserId(reply.user_id);
                                                                                if (reply.username === currentUser.username) {
                                                                                    setReplyText(""); 
                                                                                } else {
                                                                                    setReplyText(`@${reply.displayname} `); 
                                                                                }
                                                                            }}
                                                                        >
                                                                            Phản hồi
                                                                        </button>
                                                                        <button className="text-link-btn" style={{fontSize:'0.72rem', padding:0, height:'auto', color:'#cc0000'}} onClick={() => reportComment(reply.id)}>Báo cáo</button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="sidebar-column">
                                {/* Author Bio Widget */}
                                <div className="sidebar-card author-bio-card" style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--border-radius-md)',
                                    padding: '20px'
                                }}>
                                    <h3 className="card-title" style={{ fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Tác giả</h3>
                                    <div 
                                        className="author-profile-summary" 
                                        style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'12px', cursor:'pointer'}}
                                        onClick={() => novel.authorId && viewPublicProfile(novel.authorId)}
                                    >
                                        <img 
                                            src={authorAvatar && (authorAvatar.startsWith('http') || authorAvatar.startsWith('/uploads') || authorAvatar.startsWith('data:')) ? authorAvatar : `https://api.dicebear.com/7.x/adventurer/svg?seed=${authorAvatar}`} 
                                            style={{width:'44px', height:'44px', borderRadius:'50%', border: '1px solid var(--border-color)'}} 
                                            alt={novel.author}
                                        />
                                        <div>
                                            <h4 style={{fontSize:'0.95rem', margin:0, fontWeight: 700, color:'var(--text-main)'}}>{novel.author || novel.author_name || "Ẩn danh"}</h4>
                                            <span style={{fontSize:'0.72rem', color:'var(--text-muted)'}}>Tác giả MugenBunko</span>
                                        </div>
                                    </div>
                                    <p style={{fontSize:'0.82rem', color:'var(--text-content)', lineHeight:1.45}}>{authorBio}</p>
                                    {currentUser && novel.authorId && currentUser.username !== novel.authorId && (
                                        <button 
                                            className={`outline-btn w-100 ${currentUser.followedAuthors && (currentUser.followedAuthors as any).includes(novel.authorId) ? 'active' : ''}`}
                                            style={{marginTop:'14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}
                                            onClick={() => novel.authorId && toggleFollowAuthor(novel.authorId, novel.author || novel.author_name || "Ẩn danh")}
                                        >
                                            {currentUser.followedAuthors && (currentUser.followedAuthors as any).includes(novel.authorId) ? (
                                                <>
                                                    <Icons.CheckCircle size={14} />
                                                    <span>Đang theo dõi</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icons.Plus size={14} />
                                                    <span>Theo dõi Tác giả</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {deleteModalOpen && (
                            <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') setDeleteModalOpen(false); }}>
                                <div className="modal-content" style={{ maxWidth: '500px' }}>
                                    <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                        <h3 style={{ margin: 0, color: '#dc3545', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Icons.AlertCircle size={18} /> Xác nhận gỡ bỏ tác phẩm
                                        </h3>
                                        <button className="close-btn" onClick={() => setDeleteModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                                    </div>
                                    <div className="modal-body" style={{ paddingTop: '16px' }}>
                                        <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '12px' }}>
                                            Bạn đang thực hiện gỡ bỏ tác phẩm <strong>"{novel.title}"</strong> của tác giả <strong>{novel.author || novel.author_name || "Ẩn danh"}</strong>.
                                        </p>
                                        
                                        <div className="input-field mb-4">
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                                                Lý do xóa tác phẩm (thông báo sẽ được gửi cho tác giả):
                                            </label>
                                            <textarea 
                                                placeholder="Nhập lý do xóa tác phẩm tại đây..." 
                                                value={deleteReason} 
                                                onChange={(e) => setDeleteReason(e.target.value)} 
                                                rows={3}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-card)',
                                                    color: 'var(--text-main)',
                                                    fontFamily: 'inherit',
                                                    fontSize: '0.85rem',
                                                    resize: 'vertical',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>

                                        <div style={{ background: 'rgba(220, 53, 69, 0.08)', borderLeft: '3px solid #dc3545', padding: '10px 14px', borderRadius: '4px', fontSize: '0.8rem', color: '#dc3545', marginBottom: '20px', lineHeight: 1.4 }}>
                                            <strong>Cảnh báo:</strong> Hành động này là vĩnh viễn và không thể hoàn tác. Tác phẩm cùng toàn bộ chương và bình luận liên quan sẽ bị xóa khỏi hệ thống.
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                            <button 
                                                className="outline-btn" 
                                                onClick={() => setDeleteModalOpen(false)}
                                                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                            >
                                                Hủy bỏ
                                            </button>
                                            <button 
                                                className="primary-btn" 
                                                onClick={async () => {
                                                    const trimmedReason = deleteReason.trim() || "Không tuân thủ nguyên tắc cộng đồng.";
                                                    const success = await handleDeleteNovel(novel.id, trimmedReason);
                                                    if (success) {
                                                        setDeleteModalOpen(false);
                                                        setCurrentView('home');
                                                    }
                                                }}
                                                style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#dc3545', borderColor: '#dc3545', color: 'white' }}
                                            >
                                                Xác nhận gỡ bỏ
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
}
