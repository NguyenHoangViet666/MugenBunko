import React from 'react';
import { User, Novel } from '../types';

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
                <button className="outline-btn small" onClick={() => setCurrentView('home')}>← Quay lại thư viện</button>
            </div>

            <div className="library-full-layout" id="library-full-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px', marginTop:'24px'}}>
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
                            <div key={id} className="library-progress-card" onClick={() => openNovelDetail(id)} style={{background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--border-radius-md)', padding:'16px', display:'flex', gap:'12px', cursor:'pointer', transition:'var(--transition-smooth)'}}>
                                <img src={novel.cover} alt="cover" className="lib-card-cover" style={{width:'60px', height:'80px', objectFit:'cover', borderRadius:'4px'}} />
                                <div className="lib-card-info" style={{flexGrow:1, display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                    <h4 className="lib-card-title" style={{fontSize:'0.9rem', marginBottom:'6px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>{novel.title}</h4>
                                    <span className="lib-card-progress-lbl flex-row-between" style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'4px'}}>
                                        <span>{lastChapterText}</span>
                                        <span>{percentage}%</span>
                                    </span>
                                    <div className="lib-progress-bar" style={{height:'6px', background:'var(--bg-base)', borderRadius:'3px', overflow:'hidden'}}>
                                        <div className="lib-progress-fill" style={{height:'100%', background:'var(--sakura-pink)', width: `${percentage}%`}}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="empty-state-card" style={{gridColumn:'1/-1', width:'100%'}}>
                        <span className="empty-icon">📖</span>
                        <h4>Tủ sách trống</h4>
                        <p>Bạn chưa theo dõi tác phẩm nào. Hãy khám phá và lưu những tác phẩm thú vị!</p>
                        <button className="primary-btn mt-2" onClick={() => setCurrentView('home')}>Trở lại thư viện</button>
                    </div>
                )}
            </div>
        </div>
    );
}
