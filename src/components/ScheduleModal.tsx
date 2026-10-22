import StudioDialog from './StudioDialog';

interface ScheduleModalProps {
    scheduleModalOpen: boolean; setScheduleModalOpen: (open: boolean) => void;
    scheduleDatetime: string; setScheduleDatetime: (datetime: string) => void;
    submitScheduleChapter: () => void; busy?: boolean; error?: string; needsApproval?: boolean;
}

export default function ScheduleModal({ scheduleModalOpen, setScheduleModalOpen, scheduleDatetime,
    setScheduleDatetime, submitScheduleChapter, busy, error, needsApproval }: ScheduleModalProps) {
    if (!scheduleModalOpen) return null;
    return <StudioDialog title="Hẹn giờ đăng chương" onClose={() => setScheduleModalOpen(false)} busy={busy}>
        <form onSubmit={event => { event.preventDefault(); submitScheduleChapter(); }}>
            <label className="studio-field">Ngày giờ đăng · {Intl.DateTimeFormat().resolvedOptions().timeZone}
                <input type="datetime-local" required value={scheduleDatetime} disabled={busy} onChange={event => setScheduleDatetime(event.target.value)} />
            </label>
            <p className="muted">{needsApproval ? 'Chương cần được duyệt trước thời gian đã chọn. Nếu được duyệt sau giờ hẹn, chương sẽ được đăng ngay khi duyệt.' : 'Chương sẽ tự động xuất bản vào thời gian đã chọn.'}</p>
            {error && <p className="studio-error" role="alert">{error}</p>}
            <div className="studio-dialog-actions"><button type="button" className="outline-btn" disabled={busy} onClick={() => setScheduleModalOpen(false)}>Hủy</button>
                <button className="primary-btn" disabled={busy}>{busy ? 'Đang lưu…' : needsApproval ? 'Gửi duyệt kèm lịch đăng' : 'Lưu lịch đăng'}</button></div>
        </form>
    </StudioDialog>;
}
