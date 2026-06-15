import React from 'react';
import { getTierName } from '../utils/levelHelper';
import { User, Novel, SystemEvent } from '../types';

interface AdminEvent extends SystemEvent {
    status: 'draft' | 'published' | 'active';
    desc?: string;
}

interface AdminDashboardProps {
    novels: (Novel & { author?: string })[];
    users: User[];
    events: AdminEvent[];
    genres: string[];
    newGenreName: string;
    setNewGenreName: (name: string) => void;
    tagMergeFrom: string;
    setTagMergeFrom: (tag: string) => void;
    tagMergeTo: string;
    setTagMergeTo: (tag: string) => void;
    adminEventTitle: string;
    setAdminEventTitle: (title: string) => void;
    adminEventDesc: string;
    setAdminEventDesc: (desc: string) => void;
    adminEventContent: string;
    setAdminEventContent: (content: string) => void;
    updateFeaturedBannerSubmit: (id: number) => void;
    createSystemEventSubmit: () => void;
    clearActiveEvent: () => void;
    toggleAdminUserRole: (username: string, role: string, checked: boolean) => void;
    deleteGenre: (genre: string) => void;
    handleAddGenre: () => void;
    modMergeTagsSubmit: () => void;
    setCurrentView: (view: string) => void;
    activeBannerId: number | null;
    reports: any[];
    modApproveRejectChapter: (novelId: number, chapterIndex: number, action: 'approve' | 'reject') => void;
    handleCommentReportAction: (index: number, action: 'keep' | 'delete') => void;
    handleRejectAuthorRequest: (userId: number) => void;
    currentUser: User | null;
    openNovelDetail: (id: number) => void;
    computeAverageStars?: (id: number) => string;
    publishSystemEvent: (id: number) => void;
    deleteSystemEvent: (id: number) => void;
    setActiveEventId: (id: number | null) => void;
}

export default function AdminDashboard({
    novels,
    users,
    events,
    genres,
    newGenreName,
    setNewGenreName,
    tagMergeFrom,
    setTagMergeFrom,
    tagMergeTo,
    setTagMergeTo,
    adminEventTitle,
    setAdminEventTitle,
    adminEventDesc,
    setAdminEventDesc,
    adminEventContent,
    setAdminEventContent,
    updateFeaturedBannerSubmit,
    createSystemEventSubmit,
    clearActiveEvent,
    toggleAdminUserRole,
    deleteGenre,
    handleAddGenre,
    modMergeTagsSubmit,
    setCurrentView,
    activeBannerId,
    reports,
    handleRejectAuthorRequest,
    currentUser,
    openNovelDetail,
    computeAverageStars,
    publishSystemEvent,
    deleteSystemEvent,
    setActiveEventId
}: AdminDashboardProps) {
    return (
        <div className="page-view active">
            <div className="admin-header">
                <div>
                    <h2>Bảng Quản Trị Hệ Thống (Administrator)</h2>
                    <p className="subtitle">Quản lý nhân sự, cấu hình thẻ tag, thể loại và toàn quyền điều hành.</p>
                </div>
                <button className="outline-btn small" onClick={() => setCurrentView('home')}>← Quay lại thư viện</button>
            </div>

            {/* Top quick stats counters */}
            {(() => {
                let pendingCount = 0;
                novels.forEach(n => {
                    if (n.chapters) {
                        n.chapters.forEach(ch => { if (ch.status === 'pending') pendingCount++; });
                    }
                });
                const reportedCount = reports.length;
                const usersCount = users.length;

                return (
                    <div className="admin-stats-row" style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'20px', marginBottom:'24px'}}>
                        <div className="stat-card">
                            <span className="stat-num">{pendingCount}</span>
                            <span className="stat-label">Chương chờ duyệt</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{reportedCount}</span>
                            <span className="stat-label">Báo cáo vi phạm</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{usersCount}</span>
                            <span className="stat-label">Tài khoản đăng ký</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{novels.length}</span>
                            <span className="stat-label">Tổng số tác phẩm</span>
                        </div>
                    </div>
                );
            })()}

            {/* Top options featured banner and system broadcast event panel */}
            <div className="admin-panel-card mb-4">
                <h3 className="panel-title">Cấu hình Đề Cử & Sự Kiện Hệ Thống</h3>
                <div className="economy-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'12px'}}>
                    <div className="eco-deposit-box">
                        <h4>Thay Đổi Banner Tiêu Điểm Trang Chủ</h4>
                        <div className="input-field" style={{margin:'12px 0'}}>
                            <label>Chọn tác phẩm tiêu điểm:</label>
                            <select 
                                value={activeBannerId || ""} 
                                onChange={(e) => updateFeaturedBannerSubmit(parseInt(e.target.value))}
                                style={{width:'100%', padding:'8px', border:'1px solid var(--border-color)', borderRadius:'4px', outline:'none', background:'var(--bg-base)', color:'var(--text-main)'}}
                            >
                                <option value="">Chọn truyện...</option>
                                {novels.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="eco-deposit-box">
                        <h4>Tạo Sự Kiện / Thông Báo Chạy Chữ</h4>
                        <div className="input-field" style={{marginBottom:'8px'}}>
                            <label>Tên sự kiện (Ngắn)</label>
                            <input type="text" placeholder="Ví dụ: Sự kiện Sakura..." value={adminEventTitle} onChange={(e) => setAdminEventTitle(e.target.value)} />
                        </div>
                        <div className="input-field" style={{marginBottom:'8px'}}>
                            <label>Nội dung hiển thị nhanh (Banner)</label>
                            <input type="text" placeholder="Tặng vật phẩm được nhận x2 điểm EXP..." value={adminEventDesc} onChange={(e) => setAdminEventDesc(e.target.value)} />
                        </div>
                        <div className="input-field" style={{marginBottom:'8px'}}>
                            <label>Nội dung chi tiết (Markdown/HTML)</label>
                            <textarea 
                                placeholder="Nội dung bài viết chi tiết sự kiện (hỗ trợ HTML)..." 
                                value={adminEventContent} 
                                onChange={(e) => setAdminEventContent(e.target.value)}
                                style={{
                                    width:'100%', 
                                    minHeight:'100px', 
                                    padding:'8px', 
                                    border:'1px solid var(--border-color)', 
                                    borderRadius:'4px', 
                                    outline:'none', 
                                    background:'var(--bg-base)', 
                                    color:'var(--text-main)',
                                    fontFamily:'inherit',
                                    resize:'vertical'
                                }}
                            />
                        </div>
                        <div className="flex-row-between" style={{display:'flex', justifyContent:'space-between', marginTop:'12px'}}>
                            <button className="outline-btn small" onClick={clearActiveEvent}>Hủy sự kiện cũ</button>
                            <button className="primary-btn small" onClick={createSystemEventSubmit}>Lưu Bản Nháp</button>
                        </div>

                        {events && events.length > 0 && (
                            <div style={{marginTop:'18px'}}>
                                <label style={{fontSize:'0.85rem', fontWeight:600, color:'var(--text-main)', display:'block', marginBottom:'8px'}}>
                                    Danh Sách Sự Kiện Hệ Thống:
                                </label>
                                <div style={{
                                    display:'flex', 
                                    flexDirection:'column', 
                                    gap:'10px', 
                                    maxHeight:'250px', 
                                    overflowY:'auto',
                                    paddingRight:'4px'
                                }}>
                                    {events.map(ev => (
                                        <div key={ev.id} style={{
                                            padding:'10px', 
                                            background:'var(--bg-card)', 
                                            border:'1px solid var(--border-color)', 
                                            borderRadius:'6px',
                                            display:'flex',
                                            flexDirection:'column',
                                            gap:'4px'
                                        }}>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                <strong style={{fontSize:'0.82rem', color:'var(--text-main)'}}>{ev.title}</strong>
                                                <span style={{
                                                    fontSize:'0.65rem',
                                                    padding:'2px 8px',
                                                    borderRadius:'10px',
                                                    fontWeight:700,
                                                    background: ev.status === 'active' ? 'var(--sakura-pink-light)' : 'rgba(217, 119, 6, 0.1)',
                                                    color: ev.status === 'active' ? 'var(--sakura-pink)' : '#d97706',
                                                    border: ev.status === 'active' ? '1px solid var(--sakura-pink)' : '1px solid rgba(217, 119, 6, 0.3)'
                                                }}>
                                                    {ev.status === 'active' ? '🌸 Đang Chạy' : '📝 Nháp'}
                                                </span>
                                            </div>
                                            <div style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{ev.desc || ev.description}</div>
                                            <div style={{display:'flex', gap:'8px', marginTop:'6px', justifyContent:'flex-end'}}>
                                                <button 
                                                    className="outline-btn small" 
                                                    style={{padding:'2px 8px', fontSize:'0.7rem'}}
                                                    onClick={() => {
                                                        setActiveEventId(ev.id);
                                                        setCurrentView('event-detail');
                                                    }}
                                                >
                                                    Xem trước
                                                </button>
                                                {ev.status === 'draft' && (
                                                    <button 
                                                        className="primary-btn small" 
                                                        style={{padding:'2px 8px', fontSize:'0.7rem', background:'var(--sakura-pink)', border:'none', color:'white'}}
                                                        onClick={() => publishSystemEvent(ev.id)}
                                                    >
                                                        Phát hành
                                                    </button>
                                                )}
                                                <button 
                                                    className="outline-btn small" 
                                                    style={{padding:'2px 8px', fontSize:'0.7rem', color:'red', borderColor:'rgba(255,0,0,0.15)'}}
                                                    onClick={() => deleteSystemEvent(ev.id)}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="admin-grid-layout">
                {/* Admin staffing user promotion panel */}
                <div className="admin-panel-card">
                    <h3 className="panel-title">Phân Quyền Nhân Sự Hệ Thống</h3>
                    <div className="queue-list" style={{maxHeight:'280px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px'}}>
                        {users
                            .filter(user => !currentUser || user.username !== currentUser.username)
                            .map(user => {
                            const isAuthor = user.roles.includes('author');
                            const isMod = user.roles.includes('moderator');
                            const isAdmin = user.roles.includes('admin');

                            return (
                                <div key={user.username} className="user-promotion-item" style={{padding:'8px 0', borderBottom:'1px dashed var(--border-color)', display:'flex', flexDirection:'column', gap:'4px'}}>
                                    <div className="flex-row-between" style={{display:'flex', justifyContent:'space-between', fontSize:'0.82rem'}}>
                                        <strong>{user.displayname}</strong>
                                        <span style={{fontSize:'0.72rem', color:'var(--text-muted)'}}>@{user.username} (Cấp {getTierName(user.level)})</span>
                                    </div>
                                    <div style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>Vai trò: {user.roles.join(', ')}</div>
                                    {user.author_request === 'pending' && (
                                        <div style={{display:'flex', alignItems:'center', gap:'6px', margin:'2px 0'}}>
                                            <span style={{fontSize:'0.7rem', padding:'2px 6px', borderRadius:'2px', background:'#d97706', color:'white', fontWeight:600}}>Đang xin quyền Author</span>
                                            <button 
                                                className="outline-btn small" 
                                                style={{padding:'1px 6px', fontSize:'0.65rem', color:'red', borderColor:'rgba(255,0,0,0.15)'}}
                                                onClick={() => handleRejectAuthorRequest(user.id)}
                                            >
                                                Từ chối
                                            </button>
                                        </div>
                                    )}
                                    <div className="role-toggles-row" style={{display:'flex', gap:'10px', marginTop:'2px'}}>
                                        <label style={{fontSize:'0.72rem', display:'flex', alignItems:'center', gap:'2px', cursor:'pointer'}}>
                                            <input type="checkbox" checked={isAuthor} onChange={(e) => toggleAdminUserRole(user.username, 'author', e.target.checked)} /> Tác giả
                                        </label>
                                        <label style={{fontSize:'0.72rem', display:'flex', alignItems:'center', gap:'2px', cursor:'pointer'}}>
                                            <input type="checkbox" checked={isMod} disabled={isAdmin} onChange={(e) => toggleAdminUserRole(user.username, 'moderator', e.target.checked)} /> Mod
                                        </label>
                                        <label style={{fontSize:'0.72rem', display:'flex', alignItems:'center', gap:'2px', cursor:'pointer'}}>
                                            <input type="checkbox" checked={isAdmin} disabled={isMod} onChange={(e) => toggleAdminUserRole(user.username, 'admin', e.target.checked)} /> Admin
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* System novels list panel */}
                <div className="admin-panel-card">
                    <h3 className="panel-title">Danh Sách Tác Phẩm Hệ Thống</h3>
                    <div className="queue-list" style={{maxHeight:'280px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'12px'}}>
                        {novels.length === 0 ? (
                            <div style={{fontSize:'0.8rem', color:'var(--text-muted)', textAlign:'center', padding:'12px 0'}}>Không có tác phẩm nào trên hệ thống.</div>
                        ) : (
                            novels.map(novel => {
                                const totalChapters = novel.chapters ? novel.chapters.length : 0;
                                const avgStars = computeAverageStars ? computeAverageStars(novel.id) : (parseFloat(String(novel.rating)) || 0).toFixed(1);
                                return (
                                    <div key={novel.id} className="novel-list-item" style={{display:'flex', gap:'12px', padding:'8px 0', borderBottom:'1px dashed var(--border-color)', alignItems:'center'}}>
                                        <img 
                                            src={novel.cover} 
                                            alt={novel.title} 
                                            style={{width:'40px', height:'55px', objectFit:'cover', borderRadius:'4px', border:'1px solid var(--border-color)', flexShrink:0}} 
                                        />
                                        <div style={{flexGrow:1, minWidth:0}}>
                                            <div style={{fontWeight:600, fontSize:'0.85rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-main)'}} title={novel.title}>
                                                {novel.title}
                                            </div>
                                            <div style={{fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'2px'}}>
                                                Tác giả: <strong>{novel.author || novel.author_name || novel.author_username || "Ẩn danh"}</strong>
                                            </div>
                                            <div style={{fontSize:'0.68rem', color:'var(--text-muted)', display:'flex', gap:'8px'}}>
                                                <span>Chương: <strong>{totalChapters}</strong></span>
                                                <span>Lượt đọc: <strong>{novel.reads}</strong></span>
                                                <span style={{color:'var(--sakura-pink)'}}>⭐ <strong>{avgStars === 'N/A' ? 'N/A' : avgStars}</strong></span>
                                            </div>
                                        </div>
                                        <button 
                                            className="outline-btn small" 
                                            style={{padding:'4px 8px', fontSize:'0.7rem', flexShrink:0}}
                                            onClick={() => openNovelDetail && openNovelDetail(novel.id)}
                                        >
                                            Xem
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Tags and Genres configuration lists */}
                <div className="admin-panel-card" style={{gridColumn:'span 2'}}>
                    <h3 className="panel-title">Quản Lý Danh Mục Truyện & Thể Loại</h3>
                    <div className="admin-tags-config-area">
                        <div className="tags-group">
                            <label>Chuẩn hóa Tags (Merge gộp):</label>
                            <div className="merge-tags-form" style={{display:'flex', gap:'8px', alignItems:'center', marginTop:'8px'}}>
                                <input type="text" placeholder="Từ tag (isekai)" value={tagMergeFrom} onChange={(e) => setTagMergeFrom(e.target.value)} />
                                <span className="arrow">➔</span>
                                <input type="text" placeholder="Sang tag (chuyển sinh)" value={tagMergeTo} onChange={(e) => setTagMergeTo(e.target.value)} />
                                <button className="primary-btn small" onClick={modMergeTagsSubmit}>Áp dụng Gộp</button>
                            </div>
                        </div>

                        <div className="genre-list-edit" style={{marginTop:'16px'}}>
                            <label>Thể Loại đang hiển thị trên bộ lọc:</label>
                            <div className="genres-edit-wrapper" style={{display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'8px'}}>
                                {genres.map(genre => (
                                    <span key={genre} className="genre-edit-badge" style={{background:'var(--sakura-pink-light)', padding:'4px 8px', borderRadius:'4px', fontSize:'0.75rem', display:'inline-flex', alignItems:'center', gap:'6px'}}>
                                        <span>{genre}</span>
                                        <button onClick={() => deleteGenre(genre)} style={{background:'none', border:'none', cursor:'pointer', fontWeight:600, color:'red', padding:0, fontSize:'1rem', lineHeight:1}}>&times;</button>
                                    </span>
                                ))}
                            </div>
                            <div className="add-genre-form" style={{display:'flex', gap:'8px', marginTop:'12px', maxWidth:'300px'}}>
                                <input type="text" placeholder="Thêm thể loại mới..." value={newGenreName} onChange={(e) => setNewGenreName(e.target.value)} />
                                <button className="outline-btn small" onClick={handleAddGenre}>Thêm Mới</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
