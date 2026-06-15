import React from 'react';
import { getTierName } from '../utils/levelHelper';
import { User, Novel } from '../types';

interface ModReport {
    id: number;
    reportId: number;
    reason: string;
    date: string;
    commentId: number;
    commentText: string;
    commentAuthor: string;
    commentAuthorUsername: string;
    reporter: string;
    novelId: number;
}

interface PendingChapterItem {
    novelId: number;
    chapterIndex: number;
    novelTitle: string;
    chapterTitle: string;
    author?: string;
    date: string;
}

interface ModDashboardProps {
    pendingChapters: any[];
    reports: ModReport[];
    users: User[];
    modApproveRejectChapter: (novelId: number, chapterIndex: number, action: 'approve' | 'reject') => void;
    handleCommentReportAction: (index: number, action: 'keep' | 'delete') => void;
    toggleUserSuspension: (username: string, status: 'active' | 'suspended') => void;
    toggleAdminUserRole: (username: string, role: string, checked: boolean) => void;
    novels: Novel[];
    setCurrentView: (view: string) => void;
    tagMergeFrom: string;
    setTagMergeFrom: (tag: string) => void;
    tagMergeTo: string;
    setTagMergeTo: (tag: string) => void;
    modMergeTagsSubmit: () => void;
    modRejectChapter: (novelId: number, chapterIndex: number) => void;
    currentUser: User | null;
}

export default function ModDashboard({
    reports,
    users,
    modApproveRejectChapter,
    handleCommentReportAction,
    toggleUserSuspension,
    novels,
    setCurrentView,
    modRejectChapter,
    currentUser
}: ModDashboardProps) {
    return (
        <div className="page-view active">
            <div className="admin-header">
                <div>
                    <h2>Bảng Điều Phối Viên (Moderator)</h2>
                    <p className="subtitle">Duyệt chương mới, đóng bình luận toxic và trừng phạt người dùng vi phạm.</p>
                </div>
                <button className="outline-btn small" onClick={() => setCurrentView('home')}>← Quay lại thư viện</button>
            </div>

            {/* Quick metrics stat row */}
            {(() => {
                let pendingCount = 0;
                novels.forEach(n => {
                    if (n.chapters) {
                        n.chapters.forEach(ch => { if (ch.status === 'pending') pendingCount++; });
                    }
                });
                const reportedCount = reports.length;
                const suspendedCount = users.filter(u => u.status === 'suspended').length;

                return (
                    <div className="admin-stats-row" style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'20px', marginBottom:'24px'}}>
                        <div className="stat-card">
                            <span className="stat-num">{pendingCount}</span>
                            <span className="stat-label">Chương chờ duyệt</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{reportedCount}</span>
                            <span className="stat-label">Bình luận bị báo cáo</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{suspendedCount}</span>
                            <span className="stat-label">Tài khoản bị khóa</span>
                        </div>
                    </div>
                );
            })()}

            <div className="admin-grid-layout">
                {/* Chapters Approval pending queue */}
                <div className="admin-panel-card">
                    <h3 className="panel-title">Chương Truyện Chờ Duyệt</h3>
                    <div className="queue-list" style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                        {(() => {
                            const list: PendingChapterItem[] = [];
                            novels.forEach(n => {
                                if (n.chapters) {
                                    n.chapters.forEach((ch, idx) => {
                                        if (ch.status === 'pending') {
                                            list.push({ 
                                                novelId: n.id, 
                                                chapterIndex: idx, 
                                                novelTitle: n.title, 
                                                chapterTitle: ch.title, 
                                                author: n.author_name || n.author_username || "Ẩn danh", 
                                                date: ch.created_at || "" 
                                            });
                                        }
                                    });
                                }
                            });

                            if (list.length === 0) {
                                return <div style={{fontSize:'0.8rem', color:'var(--text-muted)', textAlign:'center', padding:'12px 0'}}>Không có chương nào đang chờ duyệt.</div>;
                            }

                            return list.map((item, index) => (
                                <div key={index} className="queue-item-box" style={{border:'1px solid var(--border-color)', borderRadius:'4px', padding:'12px', background:'var(--bg-card)'}}>
                                    <div style={{fontSize:'0.82rem', marginBottom:'8px'}}>
                                        <strong>{item.novelTitle}</strong>
                                        <div style={{fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600}}>{item.chapterTitle}</div>
                                        <div style={{fontSize:'0.68rem', color:'var(--text-muted)'}}>Người đăng: {item.author} | Ngày: {item.date}</div>
                                    </div>
                                    <div className="flex-row-end" style={{gap:'8px'}}>
                                        <button className="outline-btn small" style={{color:'red', borderColor:'rgba(255,0,0,0.15)'}} onClick={() => modApproveRejectChapter(item.novelId, item.chapterIndex, 'reject')}>Từ chối</button>
                                        <button className="primary-btn small" onClick={() => modApproveRejectChapter(item.novelId, item.chapterIndex, 'approve')}>Duyệt Đăng</button>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {/* Comments toxic reports queue */}
                <div className="admin-panel-card">
                    <h3 className="panel-title">Bình Luận Bị Báo Cáo</h3>
                    <div className="queue-list" style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                        {reports.length === 0 ? (
                            <div style={{fontSize:'0.8rem', color:'var(--text-muted)', textAlign:'center', padding:'12px 0'}}>Không có bình luận bị báo cáo.</div>
                        ) : (
                            reports.map((item, index) => (
                                <div key={item.reportId || item.id} className="queue-item-box" style={{border:'1px solid var(--border-color)', borderRadius:'4px', padding:'12px', background:'var(--bg-card)'}}>
                                    <div style={{fontSize:'0.8rem', marginBottom:'8px'}}>
                                        <div style={{color:'var(--text-muted)', fontSize:'0.7rem'}}>Người bị báo cáo: {item.commentAuthor}</div>
                                        <div style={{background:'rgba(255,0,0,0.03)', borderLeft:'2px solid red', padding:'4px 8px', margin:'4px 0', fontStyle:'italic'}}>"{item.commentText}"</div>
                                        <div style={{fontSize:'0.72rem', marginTop:'2px'}}><strong>Lý do:</strong> {item.reason}</div>
                                        <div style={{color:'var(--text-muted)', fontSize:'0.68rem'}}>Người báo cáo: {item.reporter}</div>
                                    </div>
                                    <div className="flex-row-end" style={{gap:'8px'}}>
                                        <button className="outline-btn small" onClick={() => handleCommentReportAction(index, 'keep')}>Giữ comment</button>
                                        <button className="primary-btn small" style={{background:'#cc0000'}} onClick={() => handleCommentReportAction(index, 'delete')}>Xóa comment</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* User Suspension penalty center */}
                <div className="admin-panel-card">
                    <h3 className="panel-title">Quản Lý Trừng Phạt Người Dùng Toxic</h3>
                    <div className="queue-list" style={{maxHeight:'300px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px'}}>
                        {users.filter(u => !u.roles.includes('admin') && u.username !== currentUser?.username).map(user => {
                            const isSuspended = user.status === 'suspended';
                            return (
                                <div key={user.username} className="flex-row-between" style={{padding:'8px 0', borderBottom:'1px dashed var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <div style={{fontSize:'0.82rem'}}>
                                        <strong>{user.displayname}</strong> (@{user.username})
                                        <span className="status-badge" style={{background: isSuspended ? '#cc0000' : '#c9f5d9', color: isSuspended ? 'white' : '#279450', fontSize:'0.65rem', marginLeft:'4px', padding:'2px 4px', borderRadius:'2px'}}>
                                            {isSuspended ? 'Bị khóa' : 'Hoạt động'}
                                        </span>
                                    </div>
                                    {isSuspended ? (
                                        <button className="primary-btn small" style={{background:'#279450', padding:'2px 8px', fontSize:'0.72rem'}} onClick={() => toggleUserSuspension(user.username, 'active')}>Mở Khóa</button>
                                    ) : (
                                        <button className="outline-btn small" style={{color:'red', borderColor:'rgba(255,0,0,0.15)', padding:'2px 8px', fontSize:'0.72rem'}} onClick={() => toggleUserSuspension(user.username, 'suspended')}>Khóa/Suspend</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Active Content deletion rollout board */}
                <div className="admin-panel-card">
                    <h3 className="panel-title">Quản Lý Nội Dung Đã Đăng (Ẩn/Gỡ Truyện)</h3>
                    <div className="queue-list" style={{maxHeight:'300px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px'}}>
                        {(() => {
                            const list: { novelId: number; chapterIndex: number; title: string; author: string }[] = [];
                            novels.forEach(novel => {
                                if (novel.chapters) {
                                    novel.chapters.forEach((ch, idx) => {
                                        if (ch.status === 'published') {
                                            list.push({ 
                                                novelId: novel.id, 
                                                chapterIndex: idx, 
                                                title: `${novel.title} - ${ch.title}`, 
                                                author: novel.author_name || novel.author_username || "Ẩn danh" 
                                            });
                                        }
                                    });
                                }
                            });

                            if (list.length === 0) {
                                return <div style={{fontSize:'0.8rem', color:'var(--text-muted)', textAlign:'center', padding:'12px 0'}}>Không có chương truyện nào đã xuất bản.</div>;
                            }

                            return list.map((item, index) => (
                                <div key={index} className="flex-row-between" style={{padding:'8px 0', borderBottom:'1px dashed var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <div style={{fontSize:'0.82rem', maxWidth:'70%'}}>
                                        <strong>{item.title}</strong>
                                        <span style={{fontSize:'0.7rem', color:'var(--text-muted)', display:'block'}}>Tác giả: {item.author}</span>
                                    </div>
                                    <button className="outline-btn small" style={{color:'red', borderColor:'rgba(255,0,0,0.15)', padding:'2px 8px', fontSize:'0.72rem'}} onClick={() => modRejectChapter(item.novelId, item.chapterIndex)}>Gỡ/Ẩn</button>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
