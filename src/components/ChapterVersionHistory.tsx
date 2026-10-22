import { useEffect, useRef, useState } from 'react';
import type { Chapter } from '../types';
import { PageLoading } from './LoadState';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface Version { id: number; title: string; volumeName: string; wordCount: number; source: string; createdAt: string; editorName: string }
interface Snapshot extends Chapter { created_at: string }
interface Props {
    disabled?: boolean;
    chapter: Chapter; novelId: number; API_BASE: string;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    getCurrentDraft: () => { volumeName: string; title: string; content: string } | null;
    onRestored: (chapter: Chapter) => void;
    onBusyChange: (busy: boolean) => void;
}
export default function ChapterVersionHistory({ chapter, novelId, API_BASE, fetchWithAuth, getCurrentDraft, onRestored, onBusyChange, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const dialogRef = useDialogFocus(open);
    const busyRef = useRef(onBusyChange);
    useEffect(() => { busyRef.current = onBusyChange; });
    useEffect(() => { busyRef.current(open); return () => busyRef.current(false); }, [open]);
    const [versions, setVersions] = useState<Version[]>([]);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const fetchRef = useRef(fetchWithAuth);
    useEffect(() => { fetchRef.current = fetchWithAuth; });
    useEffect(() => { setOpen(false); setSnapshot(null); }, [chapter.id]);
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController(); setLoading(true); setError('');
        fetchRef.current(`${API_BASE}/chapters/${chapter.id}/versions`, { signal: controller.signal }).then(async response => {
            const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
        }).then(data => { if (!controller.signal.aborted) setVersions(data); }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [open, chapter.id, API_BASE, attempt]);
    const preview = async (id: number) => {
        setLoading(true); setError('');
        try { const response = await fetchRef.current(`${API_BASE}/chapters/${chapter.id}/versions/${id}`); const data = await response.json();
            if (!response.ok) throw new Error(data.error); setSnapshot(data); }
        catch (err) { setError(err instanceof Error ? err.message : 'Không thể xem phiên bản.'); }
        finally { setLoading(false); }
    };
    const restore = async () => {
        if (!snapshot || !window.confirm('Khôi phục phiên bản này thành bản nháp? Bản hiện tại sẽ được lưu vào lịch sử trước khi khôi phục.')) return;
        setRestoring(true); onBusyChange(true); setError('');
        try {
            // Preserve unsaved editor changes as well as the last server version.
            const draft = getCurrentDraft();
            if (draft && (!draft.title.trim() || !draft.volumeName.trim())) throw new Error('Hãy điền tiêu đề và tập để giữ bản hiện tại trước khi khôi phục.');
            const response = await fetchRef.current(`${API_BASE}/chapters/${chapter.id}/versions/${snapshot.id}/restore`, { method: 'POST', body: JSON.stringify({ currentDraft: draft }) });
            const data = await response.json(); if (!response.ok) throw new Error(data.error);
            onRestored(data); setOpen(false); setSnapshot(null);
        } catch (err) { setError(err instanceof Error ? err.message : 'Không thể khôi phục bản thảo.'); }
        finally { setRestoring(false); }
    };
    const previewDocument = snapshot ? new DOMParser().parseFromString(snapshot.content || '', 'text/html') : null;
    previewDocument?.querySelectorAll('br').forEach(element => element.replaceWith(previewDocument.createTextNode('\n')));
    previewDocument?.querySelectorAll('p, h1, h2, h3, h4, li, blockquote').forEach(element => element.append(previewDocument.createTextNode('\n\n')));
    const previewText = previewDocument?.body.textContent || '';
    return <><button className="outline-btn small" disabled={disabled} onClick={() => { setSnapshot(null); setOpen(true); }}>Lịch sử phiên bản</button>
        {open && <div className="feature-modal-backdrop" onClick={() => { if (!restoring) setOpen(false); }}><section ref={dialogRef} className="feature-modal version-history-modal" role="dialog" aria-modal="true" aria-labelledby="version-history-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape' && !restoring) setOpen(false); }}>
            <div className="section-heading-row"><div><span className="eyebrow">Bản thảo của bạn</span><h2 id="version-history-title">Lịch sử phiên bản</h2></div><button autoFocus className="outline-btn small" disabled={restoring} aria-label="Đóng lịch sử" onClick={() => setOpen(false)}>✕</button></div>
            <p className="muted">Giữ 50 phiên bản gần nhất. Nội dung không đổi sẽ không tạo thêm bản lưu.</p>
            {error && <div className="inline-notice" role="alert">{error} <button className="text-action" disabled={restoring} onClick={() => setAttempt(a => a + 1)}>Thử lại</button></div>}
            {loading ? <PageLoading reader /> : <div className="version-history-layout"><div className="version-list">{versions.map(version => <button key={version.id} disabled={restoring} className={`version-list-item ${snapshot?.id === version.id ? 'selected' : ''}`} onClick={() => void preview(version.id)}>
                <strong>{version.title}</strong><span>{new Date(version.createdAt).toLocaleString('vi-VN')}</span><span>{version.wordCount} từ · {version.source === 'autosave' ? 'Tự động lưu' : version.source === 'restore' ? 'Khôi phục' : version.source === 'before-restore' ? 'Trước khôi phục' : 'Bản lưu'} · {version.editorName}</span></button>)}
                {!versions.length && <p className="muted">Chương này chưa có lịch sử. Phiên bản đầu tiên sẽ được giữ khi bạn lưu lần tới.</p>}</div>
                <div className="version-preview">{snapshot ? <><span className="eyebrow">{snapshot.volume_name}</span><h3>{snapshot.title}</h3><pre>{previewText}</pre><button className="primary-btn" disabled={restoring} onClick={() => void restore()}>{restoring ? 'Đang khôi phục…' : 'Khôi phục thành bản nháp'}</button></> : <p className="muted">Chọn một phiên bản để xem nội dung trước khi khôi phục.</p>}</div>
            </div>}
        </section></div>}
    </>;
}
