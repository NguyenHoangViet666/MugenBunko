import React, { useRef, useEffect, useState } from 'react';
import { User, Novel } from '../types';
import { Icons } from '../components/Icons';

interface AuthorStudioProps {
    currentUser: User;
    novels: Novel[];
    activeStudioNovelId: number | null;
    setActiveStudioNovelId: (id: number | null) => void;
    activeStudioChapterIndex: number | null;
    setActiveStudioChapterIndex: (idx: number | null) => void;
    setCurrentView: (view: string) => void;
    setActiveNovelId: (id: number | null) => void;
    setNewNovelModalOpen: (open: boolean) => void;
    setScheduleModalOpen: (open: boolean) => void;
    createNewChapter: (volumeName?: string) => void;
    saveDraft: () => void;
    publishChapter: () => void;
    deleteActiveChapter: () => void;
    deleteVolume: (volumeName: string) => void;
    postAuthorAnnouncement: () => void;
    autosaveText: string;
    autosaveColor: string;
    volNameRef: React.RefObject<HTMLInputElement | null>;
    chapterTitleRef: React.RefObject<HTMLInputElement | null>;
    contentAreaRef: React.RefObject<HTMLDivElement | null>;
    formatDoc: (cmd: string, val?: string) => void;
    insertStaticIllustration: () => void;
    announcements: any[];
    setAutosaveText: (text: string) => void;
    setAutosaveColor: (color: string) => void;
    handleDeleteNovel: (id: number) => void;
    openEditNovelModal: (id: number) => void;
    triggerConfirm: (msg: string, callback: () => void) => void;
    API_BASE: string;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function AuthorStudio({
    currentUser,
    novels,
    activeStudioNovelId,
    setActiveStudioNovelId,
    activeStudioChapterIndex,
    setActiveStudioChapterIndex,
    setCurrentView,
    setNewNovelModalOpen,
    setScheduleModalOpen,
    createNewChapter,
    saveDraft,
    publishChapter,
    deleteActiveChapter,
    deleteVolume,
    postAuthorAnnouncement,
    autosaveText,
    autosaveColor,
    volNameRef,
    chapterTitleRef,
    contentAreaRef,
    formatDoc,
    insertStaticIllustration,
    setAutosaveText,
    setAutosaveColor,
    handleDeleteNovel,
    openEditNovelModal,
    triggerConfirm,
    API_BASE,
    fetchWithAuth
}: AuthorStudioProps) {
    const loadedChapterIdRef = useRef<number | null>(null);
    const [localVolumes, setLocalVolumes] = React.useState<string[]>([]);
    const [selectedVolName, setSelectedVolName] = React.useState<string>("");
    const [chapterTab, setChapterTab] = React.useState<'all' | 'published' | 'draft'>('all');
    const [currentWordCount, setCurrentWordCount] = React.useState<number>(0);
    
    // Modal states for creating a new volume
    const [volumeModalOpen, setVolumeModalOpen] = React.useState<boolean>(false);
    const [newVolName, setNewVolName] = React.useState<string>("");
    const [volumeModalError, setVolumeModalError] = React.useState<string>("");

    const exportChapterBackup = (format: 'txt' | 'md') => {
        const title = chapterTitleRef.current?.value || "chuong";
        const rawHtml = contentAreaRef.current?.innerHTML || "";
        const text = rawHtml.replace(/<br\s*[\/]?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').trim();
        const content = format === 'md' ? `# ${title}\n\n${text}` : `${title}\n\n${text}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const countEditorWords = () => {
        const text = contentAreaRef.current?.innerText || "";
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        setCurrentWordCount(words);
    };

    useEffect(() => {
        if (activeStudioNovelId !== null) {
            const novel = novels.find(n => n.id === activeStudioNovelId);
            if (novel && novel.chapters) {
                const uniqueVols = Array.from(new Set(novel.chapters.map(c => c.volume_name || "Tập 01")));
                if (uniqueVols.length === 0) {
                    uniqueVols.push("Tập 01");
                }
                setLocalVolumes(uniqueVols);
            } else {
                setLocalVolumes(["Tập 01"]);
            }
        } else {
            setLocalVolumes([]);
        }
    }, [activeStudioNovelId, novels]);

    const handleAddVolume = () => {
        setVolumeModalOpen(true);
    };

    const handleConfirmAddVolume = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newVolName.trim();
        if (!trimmed) {
            setVolumeModalError("Tên tập không được để trống!");
            return;
        }
        if (localVolumes.includes(trimmed)) {
            setVolumeModalError("Tập này đã tồn tại!");
            return;
        }
        setLocalVolumes([...localVolumes, trimmed]);
        createNewChapter(trimmed);
        setVolumeModalOpen(false);
        setNewVolName("");
        setVolumeModalError("");
    };

    useEffect(() => {
        if (activeStudioNovelId !== null && activeStudioChapterIndex !== null) {
            const novel = novels.find(n => n.id === activeStudioNovelId);
            const ch = novel?.chapters?.[activeStudioChapterIndex];
            if (ch && ch.id !== loadedChapterIdRef.current) {
                loadedChapterIdRef.current = ch.id;
                const activeVol = ch.volume_name || "Tập 01";
                setSelectedVolName(activeVol);
                if (volNameRef.current) volNameRef.current.value = activeVol;
                if (chapterTitleRef.current) chapterTitleRef.current.value = ch.title || "";
                
                // Fetch chapter content dynamically in editor
                if (contentAreaRef.current) contentAreaRef.current.innerHTML = "<p>Đang tải nội dung chương truyện...</p>";
                fetchWithAuth(`${API_BASE}/chapters/${ch.id}`)
                    .then(res => res.json())
                    .then(data => {
                        // Double check we are still editing the same chapter when the request returns
                        if (loadedChapterIdRef.current === ch.id && contentAreaRef.current) {
                            contentAreaRef.current.innerHTML = (data && data.content) || "";
                        }
                    })
                    .catch(err => {
                        console.error("Error loading chapter in editor:", err);
                        if (loadedChapterIdRef.current === ch.id && contentAreaRef.current) {
                            contentAreaRef.current.innerHTML = "<p style='color:red;'>Lỗi tải nội dung chương truyện. Vui lòng chọn lại chương!</p>";
                        }
                    });
            }
        } else {
            loadedChapterIdRef.current = null;
        }
    }, [activeStudioNovelId, activeStudioChapterIndex, novels, volNameRef, chapterTitleRef, contentAreaRef, API_BASE, fetchWithAuth]);

    if (!currentUser) {
        return (
            <div className="page-view active">
                <div className="studio-header">
                    <div>
                        <h2>Bàn Làm Việc Tác Giả</h2>
                        <p className="subtitle">Vui lòng đăng nhập để sử dụng tính năng này.</p>
                    </div>
                    <button className="outline-btn small" onClick={() => setCurrentView('home')}>← Quay lại thư viện</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-view active">
            <div className="studio-header">
                <div>
                    <h2>Bàn Làm Việc Tác Giả</h2>
                    <p className="subtitle">Quản lý các tác phẩm sáng tác và biên soạn nội dung chương truyện.</p>
                </div>
                <button className="outline-btn small" onClick={() => setCurrentView('home')}>← Quay lại thư viện</button>
            </div>

            {!currentUser.roles.includes('author') && (
                <div className="reader-studio-banner" style={{
                    background: 'rgba(217, 119, 6, 0.15)',
                    border: '1px solid rgba(217, 119, 6, 0.3)',
                    color: '#d97706',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Icons.Lightbulb size={16} />
                    <span>Bạn đang soạn thảo dưới tư cách viết thử. Khi chương truyện đầu tiên của bạn được kiểm duyệt viên Duyệt, bạn sẽ được tự động nâng cấp lên Tác giả!</span>
                </div>
            )}

            {/* Analytics Stats */}
            {(() => {
                const myNovels = novels.filter(n => n.authorId === currentUser.username);
                const totalReads = myNovels.reduce((acc, n) => acc + (Number(n.reads) || 0), 0);
                const totalSaved = myNovels.reduce((acc, n) => acc + (n.bookmarksCount || 0), 0);

                return (
                    <div className="admin-stats-row" style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'20px', marginBottom:'24px'}}>
                        <div className="stat-card">
                            <span className="stat-num">{totalReads.toLocaleString()}</span>
                            <span className="stat-label">Tổng lượt đọc tác phẩm</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{totalSaved.toLocaleString()}</span>
                            <span className="stat-label">Tổng số lượt lưu tủ</span>
                        </div>
                         <div className="stat-card">
                             <span className="stat-num">{myNovels.length}</span>
                             <span className="stat-label">Tổng số tác phẩm đã đăng</span>
                         </div>
                    </div>
                );
            })()}

            <div className="studio-layout">
                {/* Left Sidebar column: novels lists and volume tree */}
                <div className="sidebar-column">
                    <button className="primary-btn w-100" style={{marginBottom:'16px'}} onClick={() => setNewNovelModalOpen(true)}>+ Tạo tác phẩm mới</button>

                    <div className="sidebar-card">
                        <h3 className="card-title">Tác phẩm đang viết</h3>
                        <div className="studio-novel-list" style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                            {novels.filter(n => n.authorId === currentUser.username).map(novel => (
                                <div 
                                    key={novel.id} 
                                    className={`studio-novel-item ${novel.id === activeStudioNovelId ? 'active' : ''}`}
                                    onClick={() => { setActiveStudioNovelId(novel.id); setActiveStudioChapterIndex(null); }}
                                    style={{
                                        display: 'flex', 
                                        gap: '8px', 
                                        alignItems: 'center', 
                                        padding: '8px', 
                                        borderRadius: '4px', 
                                        cursor: 'pointer', 
                                        border: '1px solid var(--border-color)', 
                                        background: novel.id === activeStudioNovelId ? 'var(--sakura-pink-light)' : '',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div style={{display: 'flex', gap: '8px', alignItems: 'center', overflow: 'hidden', flexGrow: 1}}>
                                        <img src={novel.cover} style={{width:'36px', height:'48px', objectFit:'cover', borderRadius:'2px', flexShrink: 0}} alt="Novel Cover" />
                                        <span style={{fontSize:'0.82rem', fontWeight:600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{novel.title}</span>
                                    </div>
                                    <div style={{display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0}}>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditNovelModal(novel.id);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-content)',
                                                cursor: 'pointer',
                                                padding: '4px 6px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Sửa tác phẩm"
                                        >
                                            <Icons.PenTool size={13} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerConfirm(`Bạn có chắc chắn muốn xóa tác phẩm '${novel.title}'? Hành động này không thể hoàn tác!`, () => {
                                                    handleDeleteNovel(novel.id);
                                                });
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#dc3545',
                                                cursor: 'pointer',
                                                padding: '4px 6px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Xóa tác phẩm"
                                        >
                                            <Icons.Trash size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {novels.filter(n => n.authorId === currentUser.username).length === 0 && (
                                <div style={{fontSize:'0.75rem', color:'var(--text-muted)', padding:'10px 0'}}>Chưa tạo truyện nào</div>
                            )}
                        </div>
                    </div>

                    {activeStudioNovelId && (
                        <>
                            <div className="sidebar-card">
                                <h3 className="card-title">Cấu trúc tác phẩm</h3>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                    <button className="outline-btn small" style={{ flexGrow: 1, padding: '6px 8px', fontSize: '0.78rem' }} onClick={handleAddVolume}>+ Thêm tập mới</button>
                                    <button className="outline-btn small" style={{ flexGrow: 1, padding: '6px 8px', fontSize: '0.78rem' }} onClick={() => createNewChapter("Tập 01")}>+ Thêm chương</button>
                                </div>

                                {/* Chapter Status Filter Tabs (Phase 4) */}
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                                    {[
                                        { id: 'all', name: 'Tất cả' },
                                        { id: 'published', name: 'Đã xuất bản' },
                                        { id: 'draft', name: 'Bản nháp' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setChapterTab(t.id as any)}
                                            style={{
                                                fontSize: '0.68rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                background: chapterTab === t.id ? 'var(--text-main)' : 'transparent',
                                                color: chapterTab === t.id ? 'var(--bg-card)' : 'var(--text-main)',
                                                border: '1px solid var(--border-color)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="studio-structure-tree" style={{maxHeight:'320px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px'}}>
                                    {(() => {
                                        const novel = novels.find(n => n.id === activeStudioNovelId);
                                        if (!novel) return null;
                                        const allChapters = novel.chapters || [];
                                        const filteredChapters = allChapters.filter(c => {
                                            if (chapterTab === 'published') return c.status === 'published';
                                            if (chapterTab === 'draft') return c.status !== 'published';
                                            return true;
                                        });
                                        
                                        // Group chapters by volume
                                        const volsMap: { [volName: string]: { ch: any; idx: number }[] } = {};
                                        
                                        localVolumes.forEach(vol => {
                                            volsMap[vol] = [];
                                        });

                                        allChapters.forEach((ch, idx) => {
                                            if (chapterTab === 'published' && ch.status !== 'published') return;
                                            if (chapterTab === 'draft' && ch.status === 'published') return;
                                            const vol = ch.volume_name || "Tập 01";
                                            if (!volsMap[vol]) volsMap[vol] = [];
                                            volsMap[vol].push({ ch, idx });
                                        });

                                        const sortedVols = localVolumes.slice().sort((a, b) => {
                                            const listA = volsMap[a] || [];
                                            const listB = volsMap[b] || [];
                                            if (listA.length === 0) return 1;
                                            if (listB.length === 0) return -1;
                                            const minIdA = Math.min(...listA.map(item => item.ch.id));
                                            const minIdB = Math.min(...listB.map(item => item.ch.id));
                                            return minIdA - minIdB;
                                        });

                                        if (filteredChapters.length === 0 && chapterTab !== 'all') {
                                            return <div style={{fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', padding:'10px 0'}}>Không có chương nào trong danh mục này</div>;
                                        }

                                        return sortedVols.map(volName => {
                                            const list = volsMap[volName];
                                            return (
                                                <div key={volName} style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        background: 'var(--bg-base)',
                                                        padding: '6px 10px',
                                                        borderRadius: '4px',
                                                        borderLeft: '3px solid var(--sakura-pink)',
                                                        marginBottom: '6px'
                                                    }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%', display: 'inline-flex', alignItems: 'center', gap: '6px' }} title={volName}>
                                                            <Icons.Folder size={13} /> {volName}
                                                        </span>
                                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); createNewChapter(volName); }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: 'var(--text-main)',
                                                                    cursor: 'pointer',
                                                                    padding: '0 4px',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}
                                                                title="Thêm chương mới vào tập này"
                                                            >
                                                                <Icons.Plus size={13} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); deleteVolume(volName); }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#dc3545',
                                                                    cursor: 'pointer',
                                                                    padding: '0 4px',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}
                                                                title="Xóa tập này và tất cả chương thuộc tập"
                                                            >
                                                                <Icons.Trash size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                                                        {list.map(item => (
                                                            <div 
                                                                key={item.idx} 
                                                                className={`studio-chapter-item ${item.idx === activeStudioChapterIndex ? 'active' : ''}`}
                                                                onClick={() => setActiveStudioChapterIndex(item.idx)}
                                                                style={{
                                                                    padding: '5px 8px',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    border: '1px solid var(--border-color)',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    background: item.idx === activeStudioChapterIndex ? 'rgba(0,0,0,0.04)' : ''
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%', display: 'inline-flex', alignItems: 'center', gap: '5px' }} title={item.ch.title}>
                                                                    <Icons.FileText size={12} /> {item.ch.title}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '0.62rem',
                                                                    padding: '1px 5px',
                                                                    borderRadius: '2px',
                                                                    background: item.ch.status === 'published' ? '#279450' : (item.ch.status === 'pending' ? '#d97706' : '#737b82'),
                                                                    color: 'white',
                                                                }}>
                                                                    {item.ch.status === 'published' ? 'Đã đăng' : (item.ch.status === 'pending' ? 'Chờ duyệt' : 'Bản nháp')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {list.length === 0 && (
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '8px' }}>
                                                                (Chưa có chương)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            <div className="sidebar-card">
                                <h3 className="card-title">Đăng Thông Báo Bảng Tin</h3>
                                <textarea 
                                    placeholder="Nhập nội dung tin cập nhật..." 
                                    id="studio-announcement-textarea" 
                                    style={{width:'100%', minHeight:'80px', fontSize:'0.82rem', padding:'8px', borderRadius:'4px', border:'1.5px solid var(--border-color)', outline:'none', fontFamily:'inherit', resize:'vertical'}}
                                />
                                <button className="primary-btn small w-100" style={{marginTop:'8px'}} onClick={postAuthorAnnouncement}>Đăng Tin Lên Truyện</button>
                            </div>
                        </>
                    )}
                </div>

                {/* Right Panel Editor */}
                <div className="main-column">
                    <div className="editor-container" style={{background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--border-radius-md)', padding:'24px', minHeight:'500px', display:'flex', flexDirection:'column'}}>
                        {activeStudioNovelId !== null && activeStudioChapterIndex !== null ? (
                            (() => {
                                const novel = novels.find(n => n.id === activeStudioNovelId);
                                const ch = novel?.chapters?.[activeStudioChapterIndex];
                                if (!ch) return null;

                                return (
                                    <div className="editor-active-fields" style={{display:'flex', flexDirection:'column', gap:'16px', flexGrow:1}}>
                                        <div className="editor-meta-fields" style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'12px'}}>
                                            <div className="input-field">
                                                <label>Tập (Volume)</label>
                                                <input type="hidden" ref={volNameRef} value={selectedVolName} readOnly />
                                                <select
                                                    value={selectedVolName}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSelectedVolName(val);
                                                        if (volNameRef.current) volNameRef.current.value = val;
                                                        setAutosaveText("Thay đổi chưa được lưu");
                                                        setAutosaveColor("red");
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '4px',
                                                        border: '1.5px solid var(--border-color)',
                                                        background: 'var(--bg-base)',
                                                        color: 'var(--text-main)',
                                                        outline: 'none'
                                                    }}
                                                >
                                                    {localVolumes.map(vol => (
                                                        <option key={vol} value={vol}>{vol}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="input-field">
                                                <label>Tiêu đề chương</label>
                                                <input type="text" ref={chapterTitleRef} defaultValue={ch.title || ""} placeholder="Chương X: Tiêu đề..." />
                                            </div>
                                        </div>

                                        <div className="editor-toolbar-actions" style={{display:'flex', alignItems:'center', gap:'8px', background:'var(--bg-base)', padding:'6px', borderRadius:'4px', border:'1px solid var(--border-color)'}}>
                                            <button className="toolbar-icon-btn outline-btn small" style={{padding:'4px 8px'}} onClick={() => formatDoc('bold')} title="In đậm (Ctrl + B)"><strong>B</strong></button>
                                            <button className="toolbar-icon-btn outline-btn small" style={{padding:'4px 8px'}} onClick={() => formatDoc('italic')} title="In nghiêng (Ctrl + I)"><em>I</em></button>
                                            <button className="toolbar-icon-btn outline-btn small" style={{padding:'4px 8px'}} onClick={() => formatDoc('justifyLeft')}>L-Align</button>
                                            <button className="toolbar-icon-btn outline-btn small" style={{padding:'4px 8px'}} onClick={() => formatDoc('justifyCenter')}>C-Align</button>
                                            <button className="toolbar-icon-btn outline-btn small" style={{padding:'4px 8px'}} onClick={insertStaticIllustration}>Chèn Ảnh</button>
                                            
                                            {/* Backup export buttons */}
                                            <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px', marginLeft: '4px' }}>
                                                <button className="toolbar-icon-btn outline-btn small" style={{padding:'3px 6px', fontSize:'0.72rem', display:'inline-flex', alignItems:'center', gap:'3px'}} onClick={() => exportChapterBackup('txt')} title="Lưu dự phòng file .txt">
                                                    <Icons.Download size={11} /> TXT
                                                </button>
                                                <button className="toolbar-icon-btn outline-btn small" style={{padding:'3px 6px', fontSize:'0.72rem', display:'inline-flex', alignItems:'center', gap:'3px'}} onClick={() => exportChapterBackup('md')} title="Lưu dự phòng file .md">
                                                    <Icons.Download size={11} /> MD
                                                </button>
                                            </div>

                                            <div className="editor-autosave-status" style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.72rem'}}>
                                                <span style={{ color: 'var(--text-muted)' }}>{currentWordCount} từ</span>
                                                <span className="status-dot" style={{width:'8px', height:'8px', borderRadius:'50%', background: autosaveColor === 'green' ? '#279450' : '#cc0000'}}></span>
                                                <span>{autosaveText}</span>
                                            </div>
                                        </div>

                                        <div 
                                            contentEditable={true} 
                                            ref={contentAreaRef}
                                            className="editor-body-textarea font-serif" 
                                            style={{flexGrow:1, minHeight:'300px', border:'1.5px solid var(--border-color)', borderRadius:'4px', padding:'16px', outline:'none', background:'var(--reader-bg)', overflowY:'auto'}}
                                            onInput={() => { 
                                                setAutosaveText("Thay đổi chưa được lưu"); 
                                                setAutosaveColor("red"); 
                                                countEditorWords();
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.ctrlKey && e.key === 'b') {
                                                    e.preventDefault();
                                                    formatDoc('bold');
                                                } else if (e.ctrlKey && e.key === 'i') {
                                                    e.preventDefault();
                                                    formatDoc('italic');
                                                }
                                            }}
                                        />

                                         <div className="editor-footer-actions" style={{display:'flex', gap:'12px', justifyContent:'flex-end', marginTop:'16px'}}>
                                             <button className="outline-btn" style={{color:'red', borderColor:'rgba(255,0,0,0.15)'}} onClick={deleteActiveChapter}>Xóa chương</button>
                                             
                                             {ch.status === 'published' ? (
                                                 <>
                                                     <button className="outline-btn" onClick={saveDraft}>Chuyển thành bản nháp</button>
                                                     <button className="primary-btn" onClick={publishChapter}>Cập nhật chương</button>
                                                 </>
                                             ) : ch.status === 'pending' ? (
                                                 <>
                                                     <button className="outline-btn" onClick={saveDraft}>Chuyển thành bản nháp</button>
                                                     <button className="primary-btn" onClick={publishChapter}>Cập nhật & Gửi duyệt</button>
                                                 </>
                                             ) : (
                                                 <>
                                                     <button className="outline-btn" onClick={saveDraft}>Lưu nháp</button>
                                                     <button className="outline-btn" onClick={() => setScheduleModalOpen(true)}>Hẹn giờ đăng</button>
                                                     <button className="primary-btn" onClick={publishChapter}>Xuất bản chương</button>
                                                 </>
                                             )}
                                         </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="editor-empty-state" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexGrow:1, color:'var(--text-muted)', textAlign:'center'}}>
                                <span className="empty-icon" style={{display:'inline-flex', justifyContent:'center', alignItems:'center', marginBottom:'16px', opacity: 0.5}}>
                                    <Icons.Edit size={44} />
                                </span>
                                <h4>Soạn Thảo Tác Phẩm</h4>
                                <p>Chọn một truyện và nhấp vào một chương để bắt đầu viết nội dung, hoặc click thêm một chương mới ở cột bên trái.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {volumeModalOpen && (
                <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') { setVolumeModalOpen(false); setNewVolName(""); setVolumeModalError(""); } }}>
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 600 }}>
                                <Icons.Folder size={18} /> Thêm tập mới
                            </h3>
                            <button className="close-btn" onClick={() => { setVolumeModalOpen(false); setNewVolName(""); setVolumeModalError(""); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <form onSubmit={handleConfirmAddVolume}>
                            <div className="modal-body">
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.4 }}>
                                    Nhập tên tập mới (Hệ thống sẽ tạo tự động một chương nháp trong tập này).
                                </p>
                                <div style={{ marginBottom: '16px' }}>
                                    <input 
                                        type="text" 
                                        value={newVolName}
                                        onChange={(e) => { setNewVolName(e.target.value); setVolumeModalError(""); }}
                                        placeholder="Ví dụ: Tập 01: Khởi Đầu Mới"
                                        className="form-input"
                                        autoFocus
                                        style={{ width: '100%', padding: '10px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                    />
                                    {volumeModalError && (
                                        <p style={{ color: '#dc3545', fontSize: '0.75rem', marginTop: '6px', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Icons.AlertCircle size={13} /> {volumeModalError}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button 
                                        type="button"
                                        className="outline-btn" 
                                        onClick={() => { setVolumeModalOpen(false); setNewVolName(""); setVolumeModalError(""); }}
                                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button 
                                        type="submit"
                                        className="primary-btn" 
                                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    >
                                        Tạo tập
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
