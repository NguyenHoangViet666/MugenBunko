import React from 'react';

interface NewNovelModalProps {
    newNovelModalOpen: boolean;
    setNewNovelModalOpen: (open: boolean) => void;
    newNovelTitle: string;
    setNewNovelTitle: (title: string) => void;
    newNovelGenres: string[];
    setNewNovelGenres: React.Dispatch<React.SetStateAction<string[]>>;
    newNovelStatus: string;
    setNewNovelStatus: (status: string) => void;
    newNovelCover: string;
    setNewNovelCover: (cover: string) => void;
    newNovelSummary: string;
    setNewNovelSummary: (summary: string) => void;
    newNovelType: string;
    setNewNovelType: (type: string) => void;
    genres: string[];
    createNewNovelSubmit: () => void;
    handleCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function NewNovelModal({
    newNovelModalOpen,
    setNewNovelModalOpen,
    newNovelTitle,
    setNewNovelTitle,
    newNovelGenres,
    setNewNovelGenres,
    newNovelStatus,
    setNewNovelStatus,
    newNovelCover,
    setNewNovelCover,
    newNovelSummary,
    setNewNovelSummary,
    newNovelType,
    setNewNovelType,
    genres,
    createNewNovelSubmit,
    handleCoverUpload
}: NewNovelModalProps) {
    if (!newNovelModalOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') setNewNovelModalOpen(false); }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Tạo Tác Phẩm Light Novel Mới</h3>
                    <button className="close-btn" onClick={() => setNewNovelModalOpen(false)}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="input-field mb-4">
                        <label>Tên tác phẩm</label>
                        <input type="text" placeholder="Ví dụ: Tà Thần Trở Lại Lớp Học..." value={newNovelTitle} onChange={(e) => setNewNovelTitle(e.target.value)} />
                    </div>
                    <div className="input-field mb-4">
                        <label>Thể loại tác phẩm (Chọn nhiều)</label>
                        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px', marginTop:'8px', background:'var(--bg-card)', padding:'12px', borderRadius:'6px', border:'1px solid var(--border-color)', maxHeight:'160px', overflowY:'auto'}}>
                            {[...genres].sort((a, b) => a.localeCompare(b, 'vi')).map(g => {
                                const checked = newNovelGenres && newNovelGenres.includes(g);
                                return (
                                    <label key={g} style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.82rem', cursor:'pointer', color:'var(--text-content)'}}>
                                        <input 
                                            type="checkbox" 
                                            checked={checked} 
                                            onChange={() => {
                                                if (checked) {
                                                    setNewNovelGenres(prev => prev.filter(item => item !== g));
                                                } else {
                                                    setNewNovelGenres(prev => [...prev, g]);
                                                }
                                            }} 
                                        />
                                        {g}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <div className="input-field mb-4">
                        <label>Tình trạng tác phẩm</label>
                        <select value={newNovelStatus} onChange={(e) => setNewNovelStatus(e.target.value)} style={{width:'100%', padding:'8px', border:'1px solid var(--border-color)', borderRadius:'4px', outline:'none', background:'var(--bg-base)', color:'var(--text-main)'}}>
                            <option value="active">Đang ra</option>
                            <option value="completed">Hoàn thành</option>
                            <option value="paused">Tạm ngưng</option>
                        </select>
                    </div>
                    <div className="input-field mb-4">
                        <label>Định dạng truyện</label>
                        <select value={newNovelType} onChange={(e) => setNewNovelType(e.target.value)} style={{width:'100%', padding:'8px', border:'1px solid var(--border-color)', borderRadius:'4px', outline:'none', background:'var(--bg-base)', color:'var(--text-main)'}}>
                            <option value="series">Series (Dài tập)</option>
                            <option value="oneshot">Oneshot (Truyện ngắn)</option>
                        </select>
                    </div>
                    <div className="input-field mb-4">
                        <label>Bìa minh họa tác phẩm</label>
                        <div style={{display:'flex', gap:'16px', alignItems:'center', background:'var(--bg-card)', padding:'12px', borderRadius:'6px', border:'1px solid var(--border-color)'}}>
                            <div className="preview-cover-box" style={{width:'64px', height:'85px', borderRadius:'4px', overflow:'hidden', border:'1px solid var(--border-color)', flexShrink:0}}>
                                <img src={newNovelCover} alt="Preview" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                            </div>
                            <div style={{display:'flex', flexDirection:'column', gap:'8px', flexGrow:1}}>
                                <span style={{fontSize:'0.82rem', fontWeight:600, color:'var(--text-content)'}}>
                                    {newNovelCover.startsWith('assets/default_novel_cover.png') ? 'Sử dụng ảnh bìa mặc định' : 'Bìa tự tải lên'}
                                </span>
                                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                                    <button type="button" className="outline-btn small" onClick={() => {
                                        const fileInput = document.getElementById('cover-file-input');
                                        if (fileInput) fileInput.click();
                                    }} style={{padding:'4px 10px', fontSize:'0.75rem'}}>
                                        Thay đổi ảnh bìa
                                    </button>
                                    {!(newNovelCover.startsWith('assets/default_novel_cover.png')) && (
                                        <button type="button" className="outline-btn small" onClick={() => setNewNovelCover('assets/default_novel_cover.png')} style={{padding:'4px 10px', fontSize:'0.75rem', color:'red', borderColor:'rgba(255,0,0,0.15)'}}>
                                            Đặt lại mặc định
                                        </button>
                                    )}
                                    <input 
                                        type="file" 
                                        id="cover-file-input" 
                                        accept="image/*" 
                                        style={{display:'none'}} 
                                        onChange={handleCoverUpload}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="input-field mb-4">
                        <label>Tóm tắt cốt truyện</label>
                        <textarea placeholder="Nội dung tóm tắt cốt truyện..." value={newNovelSummary} onChange={(e) => setNewNovelSummary(e.target.value)} style={{width:'100%', minHeight:'100px', padding:'8px', border:'1px solid var(--border-color)', borderRadius:'4px', outline:'none', fontFamily:'inherit'}} />
                    </div>
                    <button className="primary-btn w-100" onClick={createNewNovelSubmit}>Khởi tạo tác phẩm</button>
                </div>
            </div>
        </div>
    );
}
