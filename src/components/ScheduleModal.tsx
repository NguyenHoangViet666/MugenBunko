import React from 'react';

interface ScheduleModalProps {
    scheduleModalOpen: boolean;
    setScheduleModalOpen: (open: boolean) => void;
    scheduleDatetime: string;
    setScheduleDatetime: (datetime: string) => void;
    submitScheduleChapter: () => void;
}

export default function ScheduleModal({
    scheduleModalOpen,
    setScheduleModalOpen,
    scheduleDatetime,
    setScheduleDatetime,
    submitScheduleChapter
}: ScheduleModalProps) {
    if (!scheduleModalOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') setScheduleModalOpen(false); }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Hẹn Giờ Xuất Bản Chương</h3>
                    <button className="close-btn" onClick={() => setScheduleModalOpen(false)}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="input-field mb-4">
                        <label>Ngày giờ đăng truyện</label>
                        <input type="datetime-local" value={scheduleDatetime} onChange={(e) => setScheduleDatetime(e.target.value)} style={{width:'100%', padding:'8px', border:'1px solid var(--border-color)', borderRadius:'4px', outline:'none', background:'var(--bg-base)', color:'var(--text-main)'}} />
                    </div>
                    <p className="modal-tip" style={{fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'16px'}}>Chương truyện sẽ được đưa vào hàng đợi tự động xuất bản đúng giờ đã hẹn.</p>
                    <button className="primary-btn w-100" onClick={submitScheduleChapter}>Đặt Lịch Hẹn Đăng</button>
                </div>
            </div>
        </div>
    );
}
