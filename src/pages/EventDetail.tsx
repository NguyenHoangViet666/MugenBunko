import React from 'react';
import { User, SystemEvent } from '../types';

interface DetailedSystemEvent extends SystemEvent {
    date?: string;
    status: 'draft' | 'published' | 'active';
}

interface EventDetailProps {
    events: DetailedSystemEvent[];
    activeEventId: number | null;
    setCurrentView: (view: string) => void;
    currentUser: User | null;
}

export default function EventDetail({
    events,
    activeEventId,
    setCurrentView,
    currentUser
}: EventDetailProps) {
    const event = events.find(ev => ev.id === activeEventId);

    if (!event) {
        return (
            <div className="page-view active" style={{textAlign:'center', padding:'48px'}}>
                <h3>Không tìm thấy sự kiện</h3>
                <button className="outline-btn small" style={{marginTop:'12px'}} onClick={() => setCurrentView('home')}>Về Trang Chủ</button>
            </div>
        );
    }

    const isAdmin = currentUser && currentUser.roles.includes('admin');

    return (
        <div className="page-view active">
            <div className="studio-header">
                <div>
                    <h2>🌸 Chi Tiết Sự Kiện Hệ Thống</h2>
                    <p className="subtitle">Cập nhật những hoạt động, thử thách và phần quà hấp dẫn từ MugenBunko.</p>
                </div>
                <button className="outline-btn small" onClick={() => setCurrentView(isAdmin ? 'admin-dashboard' : 'home')}>
                    ← Quay lại
                </button>
            </div>

            <div className="content-box" style={{padding:'40px', background:'var(--bg-card)', borderRadius:'8px', border:'1px solid var(--border-color)', boxShadow:'var(--shadow-sm)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1.5px solid var(--border-color)', paddingBottom:'16px', marginBottom:'24px'}}>
                    <div>
                        <h1 style={{fontSize:'2.2rem', margin:'0 0 8px 0', fontFamily:'var(--font-serif)', color:'var(--text-main)', fontWeight:750}}>{event.title}</h1>
                        <span style={{fontSize:'0.82rem', color:'var(--text-muted)'}}>Phát ngày: {event.date}</span>
                    </div>
                    <div>
                        <span style={{
                            background: event.status === 'active' ? 'var(--sakura-pink-light)' : 'rgba(217, 119, 6, 0.1)',
                            color: event.status === 'active' ? 'var(--sakura-pink)' : '#d97706',
                            border: event.status === 'active' ? '1px solid var(--sakura-pink)' : '1px solid rgba(217, 119, 6, 0.3)',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 700
                        }}>
                            {event.status === 'active' ? '🌸 Đang Diễn Ra' : '📝 Bản Nháp (Preview)'}
                        </span>
                    </div>
                </div>

                {/* Subtitle / Banner Description */}
                <div style={{
                    fontSize:'1.05rem', 
                    lineHeight:'1.6', 
                    fontStyle:'italic', 
                    color:'var(--text-main)', 
                    opacity:0.85, 
                    background:'var(--bg-base)', 
                    padding:'16px 20px', 
                    borderRadius:'6px', 
                    borderLeft:'4px solid var(--sakura-pink)',
                    marginBottom:'32px'
                }}>
                    "{event.description}"
                </div>

                {/* Rich content display */}
                <div 
                    className="event-rich-content" 
                    style={{
                        fontSize:'1rem', 
                        lineHeight:'1.8', 
                        color:'var(--text-main)', 
                        minHeight:'200px',
                        whiteSpace:'pre-wrap'
                    }}
                    dangerouslySetInnerHTML={{ __html: event.content || '<p style="color:var(--text-muted)">Không có nội dung chi tiết cho sự kiện này.</p>' }}
                />
            </div>
        </div>
    );
}
