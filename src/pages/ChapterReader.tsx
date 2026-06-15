import React, { useEffect, useState } from 'react';
import { Novel, Chapter } from '../types';

interface ChapterReaderProps {
    novels: Novel[];
    activeNovelId: number | null;
    activeChapterIndex: number;
    setActiveChapterIndex: (idx: number) => void;
    setCurrentView: (view: string) => void;
    startReading: (novelId: number, chapterIndex: number) => void;
    navigateToChapter: (dir: 'prev' | 'next') => void;
    theme: string;
    setTheme: (theme: string) => void;
    handleThemeChange: (theme: string) => void;
    readerFont: string;
    setReaderFont: (font: string) => void;
    readerFontSize: number;
    setReaderFontSize: (size: number) => void;
    DB_KEYS: { font: string; fontSize: string; [key: string]: string };
    openNovelDetail: (id: number) => void;
    incrementReadCount: (id: number | null) => void;
    API_BASE: string;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

interface VolumeGroup {
    [key: string]: (Chapter & { originalIndex: number })[];
}

export default function ChapterReader({
    novels,
    activeNovelId,
    activeChapterIndex,
    setCurrentView,
    startReading,
    navigateToChapter,
    theme,
    handleThemeChange,
    readerFont,
    setReaderFont,
    readerFontSize,
    setReaderFontSize,
    DB_KEYS,
    openNovelDetail,
    incrementReadCount,
    API_BASE,
    fetchWithAuth
}: ChapterReaderProps) {
    const novel = novels.find(n => n.id === activeNovelId);
    if (!novel) return null;
    
    const publishedChapters = novel.chapters ? novel.chapters.filter(ch => ch.status === 'published') : [];
    const chapter = publishedChapters[activeChapterIndex];
    if (!chapter) return null;

    const [isTocOpen, setIsTocOpen] = useState(false);
    const [chapterContent, setChapterContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    // Group published chapters by volume_name
    const volumes: VolumeGroup = {};
    publishedChapters.forEach((ch, idx) => {
        const volName = ch.volume_name || "Chương không thuộc tập";
        if (!volumes[volName]) {
            volumes[volName] = [];
        }
        volumes[volName].push({ ...ch, originalIndex: idx });
    });

    // 15 seconds client-side reading delay before calling incrementReadCount
    useEffect(() => {
        const timer = setTimeout(() => {
            incrementReadCount(activeNovelId);
        }, 15000);

        return () => {
            clearTimeout(timer);
        };
    }, [activeNovelId, activeChapterIndex, incrementReadCount]);

    useEffect(() => {
        if (!chapter.id) return;
        setLoading(true);
        setChapterContent('');
        fetchWithAuth(`${API_BASE}/chapters/${chapter.id}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.content) {
                    setChapterContent(data.content);
                } else {
                    setChapterContent('<p style="text-align: center; color: var(--text-muted);">Không thể tải nội dung chương truyện này.</p>');
                }
            })
            .catch(err => {
                console.error("Error loading chapter content:", err);
                setChapterContent('<p style="text-align: center; color: red;">Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng!</p>');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [chapter.id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (
                activeEl && (
                    activeEl.tagName === 'INPUT' || 
                    activeEl.tagName === 'TEXTAREA' || 
                    (activeEl as HTMLElement).isContentEditable
                )
            ) {
                return;
            }

            if (e.key === 'ArrowLeft') {
                if (activeChapterIndex > 0) {
                    navigateToChapter('prev');
                }
            } else if (e.key === 'ArrowRight') {
                if (activeChapterIndex < publishedChapters.length - 1) {
                    navigateToChapter('next');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [navigateToChapter, activeChapterIndex, publishedChapters.length]);

    return (
        <>
            {/* TOC Drawer Backdrop */}
            {isTocOpen && (
                <div className="reader-toc-backdrop" onClick={() => setIsTocOpen(false)} />
            )}

            {/* TOC Drawer */}
            <div className={`reader-toc-drawer ${isTocOpen ? 'open' : ''}`}>
                <div className="reader-toc-header">
                    <h3>Mục Lục</h3>
                    <button className="reader-toc-close-btn" onClick={() => setIsTocOpen(false)}>✕</button>
                </div>
                <div className="reader-toc-novel-title">{novel.title}</div>
                <div className="reader-toc-body">
                    {Object.keys(volumes).map((volName, vIdx) => (
                        <div key={vIdx} className="reader-toc-volume-group">
                            <div className="reader-toc-volume-header">{volName}</div>
                            <div className="reader-toc-chapter-list">
                                {volumes[volName].map((ch, cIdx) => (
                                    <div 
                                        key={cIdx} 
                                        className={`reader-toc-chapter-item ${ch.originalIndex === activeChapterIndex ? 'active' : ''}`}
                                        onClick={() => {
                                            if (activeNovelId !== null) {
                                                startReading(activeNovelId, ch.originalIndex);
                                            }
                                            setIsTocOpen(false);
                                        }}
                                        title={ch.title}
                                    >
                                        {ch.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="page-view active" style={{paddingTop:0}}>
                {/* Reader Settings Toolbar */}
                <div className="reader-toolbar" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 24px', background:'var(--bg-card)', borderBottom:'1px solid var(--border-color)', position:'sticky', top:0, zIndex:100}}>
                    <div className="toolbar-left" style={{display:'flex', alignItems:'center', gap:'12px'}}>
                        <button className="back-btn-reader outline-btn small" onClick={() => { setCurrentView('detail'); if (activeNovelId !== null) openNovelDetail(activeNovelId); }}>
                            ← Thoát Đọc
                        </button>
                        <button className="outline-btn small" onClick={() => setIsTocOpen(true)} style={{display:'flex', alignItems:'center', gap:'6px'}}>
                            ☰ Mục lục
                        </button>
                        <span className="reader-novel-title" style={{fontWeight:600, fontSize:'0.9rem'}}>{novel.title} - {chapter.title}</span>
                    </div>
                    
                    <div className="toolbar-right" style={{display:'flex', alignItems:'center', gap:'16px'}}>
                        <select 
                            value={readerFont} 
                            onChange={(e) => {
                                setReaderFont(e.target.value);
                                localStorage.setItem(DB_KEYS.font, e.target.value);
                            }}
                            style={{background:'var(--bg-base)', border:'1px solid var(--border-color)', color:'var(--text-main)', padding:'4px 8px', borderRadius:'4px', outline:'none'}}
                        >
                            <option value="font-serif">Phông có chân (Serif)</option>
                            <option value="font-sans">Phông không chân (Sans-serif)</option>
                        </select>

                        <div className="font-size-adjust" style={{display:'flex', alignItems:'center', gap:'8px'}}>
                            <button className="outline-btn small" style={{padding:'2px 8px'}} onClick={() => {
                                const sz = Math.max(12, readerFontSize - 2);
                                setReaderFontSize(sz);
                                localStorage.setItem(DB_KEYS.fontSize, String(sz));
                            }}>-</button>
                            <span style={{fontSize:'0.82rem'}}>{readerFontSize}px</span>
                            <button className="outline-btn small" style={{padding:'2px 8px'}} onClick={() => {
                                const sz = Math.min(32, readerFontSize + 2);
                                setReaderFontSize(sz);
                                localStorage.setItem(DB_KEYS.fontSize, String(sz));
                            }}>+</button>
                        </div>

                        <div className="reader-themes" style={{display:'flex', gap:'8px'}}>
                            {['washi', 'sepia', 'charcoal'].map(t => (
                                <button 
                                    key={t}
                                    className={`theme-dot theme-dot-${t} ${theme === t ? 'active' : ''}`}
                                    onClick={() => handleThemeChange(t)}
                                    title={t === 'washi' ? 'Giấy Washi' : (t === 'sepia' ? 'Giấy Cổ' : 'Đêm Charcoal')}
                                    style={{width:'18px', height:'18px', borderRadius:'50%', border: theme === t ? '2px solid var(--sakura-pink)' : '1px solid var(--border-color)', background: t === 'washi' ? '#faf8f5' : (t === 'sepia' ? '#efe5cc' : '#121214'), cursor:'pointer'}}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="reader-container-layout" style={{maxWidth:'1200px', margin:'40px auto 100px auto', padding:'0 24px'}}>
                    {loading ? (
                        <div className="reader-loading-spinner" style={{textAlign: 'center', padding: '100px 0', color: 'var(--sakura-pink)'}}>
                            <style>{`
                                @keyframes reader-spin {
                                    to { transform: rotate(360deg); }
                                }
                            `}</style>
                            <div style={{display: 'inline-block', width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--sakura-pink)', borderRadius: '50%', animation: 'reader-spin 0.8s linear infinite'}} />
                            <p style={{marginTop: '16px', fontSize: '0.95rem', color: 'var(--text-muted)'}}>Đang tải nội dung chương từ thư viện MugenBunko...</p>
                        </div>
                    ) : (
                        <article 
                            className={`reader-content-body ${readerFont}`} 
                            style={{fontSize: `${readerFontSize}px`, lineHeight:1.8, color:'var(--text-content)'}}
                            dangerouslySetInnerHTML={{ __html: chapterContent }}
                        />
                    )}

                    <div className="reader-footer-nav" style={{display:'flex', justifyContent:'space-between', marginTop:'60px', borderTop:'1px solid var(--border-color)', paddingTop:'20px'}}>
                        <button 
                            className="outline-btn" 
                            disabled={activeChapterIndex === 0}
                            onClick={() => navigateToChapter('prev')}
                            style={{opacity: activeChapterIndex === 0 ? 0.5 : 1}}
                            title="Sử dụng nút mũi tên Trái (←) để chuyển về chương trước"
                        >
                            ← Chương trước
                        </button>
                        <button 
                            className="outline-btn" 
                            disabled={activeChapterIndex === publishedChapters.length - 1}
                            onClick={() => navigateToChapter('next')}
                            style={{opacity: activeChapterIndex === publishedChapters.length - 1 ? 0.5 : 1}}
                            title="Sử dụng nút mũi tên Phải (→) để chuyển sang chương sau"
                        >
                            Chương sau →
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
