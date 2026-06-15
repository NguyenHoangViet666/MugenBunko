import React, { useState, useEffect } from 'react';
import { User, Novel, Comment, Review, Chapter } from '../types';

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
                                <button className="text-link-btn" onClick={() => setCurrentView('home')}>
                                    ← Quay lại trang chủ
                                </button>
                            </div>
                            <div style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '40px 30px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
                                <h3 style={{ color: 'var(--text-main)', marginBottom: '12px' }}>Không tìm thấy tác phẩm</h3>
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
                        <div className="back-nav-container">
                            <button className="text-link-btn" onClick={() => setCurrentView('home')}>
                                ← Trở lại danh sách truyện
                            </button>
                        </div>

                        {/* Novel General Metadata Block */}
                        <div className="novel-detail-card">
                            <div className="detail-cover-wrapper">
                                <img src={novel.cover} alt={novel.title} className="detail-cover" />
                            </div>
                            <div className="detail-info">
                                <span className="tag-badge" style={{backgroundColor: 'var(--sakura-pink-light)', color: 'var(--sakura-pink)', borderColor: 'transparent', width: 'fit-content', marginBottom: '8px', fontWeight:600}}>
                                    {novel.status === 'completed' ? 'HOÀN THÀNH' : novel.status === 'paused' ? 'TẠM NGƯNG' : novel.status === 'suspended' ? 'BỊ KHÓA' : 'ĐANG TIẾN HÀNH'}
                                </span>
                                <h2 className="detail-title">{novel.title}</h2>
                                <div className="detail-meta-row">
                                    <span>Tác giả: <strong style={{cursor: 'pointer', color: 'var(--sakura-pink)'}} onClick={() => novel.authorId && viewPublicProfile(novel.authorId)}>{novel.author || novel.author_name || "Ẩn danh"}</strong></span>
                                    <span>Lượt đọc: <strong>{Number(novel.reads).toLocaleString()}</strong></span>
                                    <span>Đánh giá: <strong>{computeAverageStars(novel.id) === 'N/A' ? 'N/A' : `${computeAverageStars(novel.id)} ★`}</strong></span>
                                    <span>Số lượt lưu: <strong>{novel.bookmarksCount || 0}</strong></span>
                                    <span>Tổng số từ: <strong>{Number(totalWordCount).toLocaleString()} từ</strong></span>
                                </div>
                                <p className={`detail-summary ${detailSummaryExpanded ? 'expanded' : ''}`}>{novel.summary}</p>
                                <button className="text-link-btn" style={{width:'fit-content', marginBottom:'16px', padding:0}} onClick={() => setDetailSummaryExpanded(!detailSummaryExpanded)}>
                                    {detailSummaryExpanded ? 'Thu gọn tóm tắt' : 'Đọc thêm tóm tắt'}
                                </button>
                                <div className="detail-tags-row">
                                    {(novel.tags || []).map(t => <span key={t} className="tag-badge">#{t}</span>)}
                                </div>
                                <div className="detail-actions">
                                    <button className="primary-btn" onClick={() => startReading(novel.id, 0)}>Đọc Từ Đầu</button>
                                    {currentUser && (
                                        <button className={isSaved ? "outline-btn active" : "primary-btn"} style={{background: isSaved ? 'var(--indigo-blue)' : '', color: isSaved ? 'white' : ''}} onClick={() => toggleBookmark(novel.id)}>
                                            🔖 {isSaved ? 'Đã Lưu Vào Thư Viện' : 'Lưu Tủ Sách'}
                                        </button>
                                    )}
                                    {currentUser && currentUser.roles && currentUser.roles.includes('admin') && (
                                         <button 
                                             className="outline-btn" 
                                             style={{borderColor: '#dc3545', color: '#dc3545', background: 'transparent'}}
                                             onClick={() => {
                                                 setDeleteReason("");
                                                 setDeleteModalOpen(true);
                                             }}
                                         >
                                             🗑️ Gỡ bỏ tác phẩm (Admin)
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
                                            <div className="alert-box success" style={{background:'rgba(39, 148, 80, 0.08)', padding:'10px 16px', borderRadius:'4px', fontSize:'0.82rem', borderLeft:'3px solid #279450', marginBottom:'16px', color:'#279450', fontWeight:500}}>
                                                ✨ Bạn đã gửi đánh giá cho tác phẩm này rồi. Cảm ơn nhận xét của bạn!
                                            </div>
                                        ) : readCount >= minRequired ? (
                                            <div className="review-form-container">
                                                <div className="star-rating-selector" style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
                                                    <span>Đánh giá của bạn:</span>
                                                    <div className="stars-stars" style={{color:'#d97706', fontSize:'1.2rem', cursor:'pointer'}}>
                                                        {[1,2,3,4,5].map(val => (
                                                            <span 
                                                                key={val} 
                                                                className="star-select"
                                                                onClick={() => setSelectedRatingStars(val)}
                                                                style={{opacity: val <= selectedRatingStars ? 1 : 0.3, marginRight:'2px'}}
                                                            >
                                                                ★
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
                                            <div className="alert-box info" style={{background:'var(--sakura-pink-light)', padding:'10px 16px', borderRadius:'4px', fontSize:'0.82rem', borderLeft:'3px solid var(--sakura-pink)', marginBottom:'16px'}}>
                                                💡 Bạn cần đọc tối thiểu <strong>{minRequired} chương</strong> để gửi đánh giá. Lịch sử đọc hiện tại: <strong>{readCount}</strong> chương.
                                            </div>
                                        )
                                    ) : (
                                        <div className="guest-action-alert" style={{background:'var(--bg-base)', padding:'10px 16px', borderRadius:'4px', fontSize:'0.82rem', textAlign:'center'}}>
                                            🔑 Vui lòng <a href="#" onClick={(e) => { e.preventDefault(); setLoginModalOpen(true); }}>Đăng nhập</a> để bình luận hoặc đánh giá.
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
                                                            <img src={r.avatarSeed && (r.avatarSeed.startsWith('http') || r.avatarSeed.startsWith('/uploads') || r.avatarSeed.startsWith('data:')) ? r.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${r.avatarSeed}`} style={{width:'32px', height:'32px', borderRadius:'50%'}} alt="Avatar" />
                                                            <div>
                                                                <strong style={{fontSize:'0.85rem'}}>{r.displayname || r.username}</strong>
                                                                <div style={{color:'#d97706', fontSize:'0.82rem'}}>{"★".repeat(r.stars) + "☆".repeat(5-r.stars)}</div>
                                                            </div>
                                                        </div>
                                                        <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{r.date || new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                                                    </div>
                                                    <p style={{fontSize:'0.85rem', marginTop:'8px', lineHeight:1.5}}>{r.text}</p>
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
                                        <div className="guest-action-alert" style={{background:'var(--bg-base)', padding:'10px 16px', borderRadius:'4px', fontSize:'0.82rem', textAlign:'center', marginBottom:'16px'}}>
                                            🔑 Vui lòng <a href="#" onClick={(e) => { e.preventDefault(); setLoginModalOpen(true); }}>Đăng nhập</a> để viết bình luận.
                                        </div>
                                    )}

                                    <div className="comment-tree">
                                        {(comments[novel.id] || []).length === 0 ? (
                                            <div style={{fontSize:'0.8rem', color:'var(--text-muted)', padding:'16px 0', textAlign:'center'}}>Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện!</div>
                                        ) : (
                                            (comments[novel.id] || []).map(c => (
                                                <div key={c.id} className="comment-item-node" style={{marginBottom:'16px', padding:'10px 0', borderBottom:'1.5px solid var(--border-color)'}}>
                                                    <div className="flex-row-between" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                        <div style={{display:'flex', alignSelf:'center', gap:'8px', alignItems:'center', cursor:'pointer'}} onClick={() => c.username && viewPublicProfile(c.username)}>
                                                            <img src={c.avatarSeed && (c.avatarSeed.startsWith('http') || c.avatarSeed.startsWith('/uploads') || c.avatarSeed.startsWith('data:')) ? c.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.avatarSeed || 'Default'}`} style={{width:'28px', height:'28px', borderRadius:'50%'}} alt="Avatar" />
                                                            <strong style={{fontSize:'0.82rem'}}>{c.displayname} <span style={{fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:'normal'}}>@{c.username}</span></strong>
                                                        </div>
                                                        <span style={{fontSize:'0.72rem', color:'var(--text-muted)'}}>{c.date || new Date(c.created_at).toLocaleDateString('vi-VN')}</span>
                                                    </div>
                                                    <p style={{fontSize:'0.85rem', marginTop:'6px', lineHeight:1.5}}>{c.text}</p>
                                                    
                                                    <div className="comment-actions-bar" style={{marginTop:'6px', display:'flex', gap:'12px'}}>
                                                        {currentUser && (
                                                            <>
                                                                <button className="text-link-btn" style={{fontSize:'0.75rem', padding:0, height:'auto'}} onClick={() => { setReplyToCommentId(c.id); setReplyToUserId(c.user_id); setReplyText(""); }}>Phản hồi</button>
                                                                <button className="text-link-btn" style={{fontSize:'0.75rem', padding:0, height:'auto', color:'#cc0000'}} onClick={() => reportComment(c.id)}>Báo cáo</button>
                                                            </>
                                                        )}
                                                    </div>

                                                    {replyToCommentId === c.id && (
                                                        <div className="reply-form-placeholder" style={{marginTop:'8px', marginLeft:'40px'}}>
                                                            <textarea 
                                                                placeholder="Nhập phản hồi..." 
                                                                value={replyText}
                                                                onChange={(e) => setReplyText(e.target.value)}
                                                                style={{width:'100%', minHeight:'50px', fontSize:'0.8rem', padding:'6px', border:'1px solid var(--border-color)', borderRadius:'4px', outline:'none', fontFamily:'inherit', background: 'var(--bg-card)', color: 'var(--text-main)'}}
                                                            />
                                                            <div className="flex-row-end" style={{gap:'8px', marginTop:'4px'}}>
                                                                <button className="outline-btn small" style={{padding:'2px 8px', fontSize:'0.7rem'}} onClick={() => setReplyToCommentId(null)}>Hủy</button>
                                                                <button className="primary-btn small" style={{padding:'2px 8px', fontSize:'0.7rem'}} onClick={() => submitCommentReply(c.id)}>Gửi phản hồi</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {c.replies && c.replies.map(reply => (
                                                        <div key={reply.id} className="comment-reply-node" style={{marginLeft:'40px', marginTop:'12px', background:'rgba(0,0,0,0.02)', padding:'8px 12px', borderLeft:'2px solid var(--sakura-pink)', borderRadius:'4px'}}>
                                                            <div className="flex-row-between" style={{fontSize:'0.78rem', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px'}}>
                                                                <div style={{display:'flex', gap:'6px', alignItems:'center', cursor:'pointer'}} onClick={() => reply.username && viewPublicProfile(reply.username)}>
                                                                    <img src={reply.avatarSeed && (reply.avatarSeed.startsWith('http') || reply.avatarSeed.startsWith('/uploads') || reply.avatarSeed.startsWith('data:')) ? reply.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${reply.avatarSeed || 'Default'}`} style={{width:'20px', height:'20px', borderRadius:'50%'}} alt="Avatar" />
                                                                    <strong>{reply.displayname} <span style={{fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:'normal'}}>@{reply.username}</span></strong>
                                                                </div>
                                                                <span style={{fontSize:'0.70rem', color:'var(--text-muted)'}}>{reply.date || new Date(reply.created_at).toLocaleDateString('vi-VN')}</span>
                                                            </div>
                                                            <p style={{fontSize:'0.82rem', marginTop:'4px', lineHeight:1.4, marginLeft:'26px'}}>{reply.text}</p>
                                                            <div className="comment-actions-bar" style={{marginTop:'4px', display:'flex', gap:'12px', marginLeft:'26px'}}>
                                                                {currentUser && (
                                                                    <>
                                                                        <button 
                                                                            className="text-link-btn" 
                                                                            style={{fontSize:'0.72rem', padding:0, height:'auto'}} 
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
                                <div className="sidebar-card author-bio-card">
                                    <h3 className="card-title">Tác giả</h3>
                                    <div 
                                        className="author-profile-summary" 
                                        style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'12px', cursor:'pointer'}}
                                        onClick={() => novel.authorId && viewPublicProfile(novel.authorId)}
                                    >
                                        <img 
                                            src={authorAvatar && (authorAvatar.startsWith('http') || authorAvatar.startsWith('/uploads') || authorAvatar.startsWith('data:')) ? authorAvatar : `https://api.dicebear.com/7.x/adventurer/svg?seed=${authorAvatar}`} 
                                            style={{width:'40px', height:'40px', borderRadius:'50%'}} 
                                            alt={novel.author}
                                        />
                                        <div>
                                            <h4 style={{fontSize:'0.9rem', margin:0, color:'var(--sakura-pink)'}}>{novel.author || novel.author_name || "Ẩn danh"}</h4>
                                            <span style={{fontSize:'0.72rem', color:'var(--text-muted)'}}>Tác giả Mugen</span>
                                        </div>
                                    </div>
                                    <p style={{fontSize:'0.82rem', color:'var(--text-content)', lineHeight:1.4}}>{authorBio}</p>
                                    {currentUser && novel.authorId && currentUser.username !== novel.authorId && (
                                        <button 
                                            className={`outline-btn w-100 ${currentUser.followedAuthors && (currentUser.followedAuthors as any).includes(novel.authorId) ? 'active' : ''}`}
                                            style={{marginTop:'12px'}}
                                            onClick={() => novel.authorId && toggleFollowAuthor(novel.authorId, novel.author || novel.author_name || "Ẩn danh")}
                                        >
                                            {currentUser.followedAuthors && (currentUser.followedAuthors as any).includes(novel.authorId) ? '✓ Đang theo dõi' : '+ Theo dõi Tác giả'}
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
                                            ⚠️ Xác nhận gỡ bỏ tác phẩm
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
