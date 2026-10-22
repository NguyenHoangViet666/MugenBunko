import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import DOMPurify from 'dompurify';
import type { Chapter } from '../types';
import { readStudioDraft, sameDraft, studioDraftKey } from '../utils/studioDraft';
import type { DraftFields, LocalStudioDraft } from '../utils/studioDraft';

interface Options {
    userId: number; chapter: Chapter | undefined; novelId: number | null;
    contentRef: RefObject<HTMLDivElement | null>; API_BASE: string;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    onUpdated: (chapter: Chapter) => void; showToast: (message: string) => void;
}
const empty: DraftFields = { title: '', volumeName: '', content: '' };
export type SaveIntent = 'save' | 'publish' | 'schedule' | 'withdraw';

export function useStudioEditor(options: Options) {
    const latest = useRef(options);
    useEffect(() => { latest.current = options; });
    const [draft, setDraft] = useState<DraftFields>(empty);
    const draftRef = useRef<DraftFields>(empty);
    const baseline = useRef<DraftFields>(empty);
    const recoveryBase = useRef<DraftFields | null>(null);
    const identity = useRef<{ userId: number; chapterId: number; novelId: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('Chọn một chương để bắt đầu.');
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const historyBusy = useRef(false);
    const structureBusy = useRef(false);
    const [conflict, setConflict] = useState(false);
    const conflictRef = useRef(false);
    const [attempt, setAttempt] = useState(0);
    const backupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const chapterId = options.chapter?.id;

    const persist = useCallback(() => {
        const id = identity.current;
        if (!id) return false;
        try {
            if (sameDraft(draftRef.current, baseline.current)) {
                localStorage.removeItem(studioDraftKey(id.userId, id.chapterId));
            } else {
                const value: LocalStudioDraft = { ...id, ...draftRef.current, base: recoveryBase.current || baseline.current, updatedAt: Date.now() };
                localStorage.setItem(studioDraftKey(id.userId, id.chapterId), JSON.stringify(value));
            }
            return true;
        } catch {
            setError('Không thể lưu bản dự phòng trên máy. Hãy xuất file dự phòng hoặc lưu lên máy chủ trước khi rời trang.');
            return false;
        }
    }, []);

    const change = useCallback((fields: Partial<DraftFields>) => {
        if (!identity.current) return;
        const next = { ...draftRef.current, ...fields };
        draftRef.current = next; setDraft(next);
        const changed = !sameDraft(next, baseline.current); setDirty(changed);
        setStatus(changed ? 'Thay đổi chưa đồng bộ · đang giữ bản trên máy' : 'Đã đồng bộ với máy chủ');
        if (backupTimer.current) clearTimeout(backupTimer.current);
        backupTimer.current = setTimeout(persist, 350);
    }, [persist]);

    useEffect(() => {
        const controller = new AbortController();
        identity.current = null; recoveryBase.current = null; conflictRef.current = false; setConflict(false);
        setError(''); setDirty(false); setDraft(empty); draftRef.current = empty;
        if (!chapterId || !options.novelId) { setLoading(false); return; }
        const { contentRef, userId, novelId } = latest.current;
        setLoading(true);
        if (contentRef.current) { contentRef.current.innerHTML = ''; delete contentRef.current.dataset.loadedChapterId; }
        void (async () => {
            try {
                const response = await latest.current.fetchWithAuth(`${latest.current.API_BASE}/chapters/${chapterId}`, { signal: controller.signal });
                const data: Chapter & { error?: string } = await response.json();
                if (!response.ok) throw new Error(data.error || 'Không thể tải chương.');
                if (controller.signal.aborted) return;
                const server = { title: data.title, volumeName: data.volume_name, content: data.content || '' };
                baseline.current = server;
                const backup = readStudioDraft(userId, chapterId);
                const recovered = backup?.novelId === novelId && !sameDraft(backup, server) ? backup : null;
                const next = recovered ? { title: recovered.title, volumeName: recovered.volumeName, content: recovered.content } : server;
                identity.current = { userId, chapterId, novelId: novelId! };
                draftRef.current = next; setDraft(next); setDirty(Boolean(recovered));
                conflictRef.current = Boolean(recovered && !sameDraft(recovered.base, server));
                recoveryBase.current = conflictRef.current ? recovered!.base : null;
                setConflict(conflictRef.current);
                setStatus(recovered ? 'Đã phục hồi bản chưa lưu trên máy' : 'Đã tải bản trên máy chủ');
                if (contentRef.current) {
                    contentRef.current.innerHTML = DOMPurify.sanitize(next.content);
                    contentRef.current.dataset.loadedChapterId = String(chapterId);
                }
                if (!recovered) localStorage.removeItem(studioDraftKey(userId, chapterId));
                latest.current.onUpdated(data);
            } catch (err) {
                if (!controller.signal.aborted) {
                    const backup = readStudioDraft(userId, chapterId);
                    if (backup?.novelId === novelId) {
                        identity.current = { userId, chapterId, novelId: novelId! };
                        baseline.current = backup.base;
                        draftRef.current = { title: backup.title, volumeName: backup.volumeName, content: backup.content };
                        setDraft(draftRef.current); setDirty(true); setStatus('Đã mở bản trên máy · chưa kết nối được máy chủ');
                        if (contentRef.current) { contentRef.current.innerHTML = DOMPurify.sanitize(backup.content); contentRef.current.dataset.loadedChapterId = String(chapterId); }
                    }
                    setError(err instanceof Error ? err.message : 'Không thể tải chương.');
                }
            } finally { if (!controller.signal.aborted) setLoading(false); }
        })();
        return () => {
            controller.abort();
            if (backupTimer.current) clearTimeout(backupTimer.current);
            persist(); identity.current = null;
        };
    }, [chapterId, options.userId, options.novelId, options.API_BASE, attempt, persist]);

    const save = useCallback(async (intent: SaveIntent = 'save', scheduledRelease?: string, automatic = false) => {
        const id = identity.current; const current = latest.current;
        if (!id || busyRef.current || historyBusy.current || structureBusy.current || conflictRef.current) return false;
        const snapshot = { ...draftRef.current }; const base = { ...baseline.current };
        const backedUp = persist();
        if (intent === 'save' && current.chapter?.status === 'published') {
            if (!backedUp) return false;
            setStatus('Bản sửa đã giữ trên máy · bấm Cập nhật chương để đăng thay đổi');
            return true;
        }
        if (!snapshot.title.trim() || !snapshot.volumeName.trim()) {
            if (!automatic) setError('Hãy điền tiêu đề và chọn tập trước khi lưu.');
            return false;
        }
        if (intent === 'save' && sameDraft(snapshot, base)) return true;
        if (automatic && current.chapter?.status !== 'draft') return true;
        busyRef.current = true; setBusy(true); setError(''); setStatus('Đang lưu lên máy chủ…');
        try {
            const target = intent === 'withdraw' ? 'draft' : intent === 'schedule' ? 'scheduled' :
                intent === 'publish' ? 'published' : current.chapter?.status || 'draft';
            const response = await current.fetchWithAuth(`${current.API_BASE}/chapters`, { method: 'POST', body: JSON.stringify({
                id: id.chapterId, novelId: id.novelId, ...snapshot, status: target,
                preserveStatus: intent === 'save', source: automatic ? 'autosave' : 'save', baseDraft: base, scheduledRelease,
            }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Không thể lưu chương. Bản trên máy vẫn được giữ.');
            if (identity.current?.chapterId !== id.chapterId || identity.current.userId !== id.userId) return true;
            const saved: DraftFields = { title: data.title, volumeName: data.volume_name, content: data.content || '' };
            baseline.current = saved;
            // A request may finish after the author types more. Never replace newer input.
            if (sameDraft(draftRef.current, snapshot)) {
                draftRef.current = saved; setDraft(saved); setDirty(false);
                // Do not replace innerHTML here: that would discard selection and undo history.
            } else setDirty(!sameDraft(draftRef.current, saved));
            persist(); current.onUpdated(data);
            setStatus(sameDraft(draftRef.current, saved) ? `Đã lưu lúc ${new Date().toLocaleTimeString('vi-VN')}` : 'Còn thay đổi mới · bản trên máy đã được giữ');
            if (!automatic) current.showToast(intent === 'withdraw' ? 'Đã chuyển chương về bản nháp.' :
                data.status === 'pending' ? 'Đã gửi chương vào hàng chờ duyệt.' : data.status === 'scheduled' ? 'Đã lưu lịch đăng chương.' :
                data.status === 'published' ? 'Đã cập nhật chương công khai.' : 'Đã lưu bản nháp.');
            return true;
        } catch (err) {
            if (identity.current?.chapterId === id.chapterId) {
                setError(err instanceof Error ? err.message : 'Lưu thất bại.');
                setStatus('Chưa đồng bộ với máy chủ · bản trên máy được giữ');
            }
            return false;
        } finally { busyRef.current = false; setBusy(false); }
    }, [persist]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (identity.current && !sameDraft(draftRef.current, baseline.current)) {
                persist(); void save('save', undefined, true);
            }
        }, 30000);
        const flush = () => { persist(); };
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (!identity.current || sameDraft(draftRef.current, baseline.current)) return;
            persist(); event.preventDefault(); event.returnValue = '';
        };
        const visible = () => { if (document.visibilityState === 'hidden') flush(); };
        const online = () => { if (!sameDraft(draftRef.current, baseline.current)) void save('save', undefined, true); };
        const keydown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
        };
        window.addEventListener('pagehide', flush); window.addEventListener('beforeunload', beforeUnload);
        window.addEventListener('online', online); window.addEventListener('keydown', keydown);
        document.addEventListener('visibilitychange', visible);
        return () => {
            clearInterval(timer); window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', beforeUnload);
            window.removeEventListener('online', online); window.removeEventListener('keydown', keydown);
            document.removeEventListener('visibilitychange', visible);
        };
    }, [persist, save]);

    const restored = (chapter: Chapter) => {
        const fields = { title: chapter.title, volumeName: chapter.volume_name, content: chapter.content || '' };
        draftRef.current = fields; baseline.current = fields; setDraft(fields); setDirty(false); setError('');
        if (options.contentRef.current) options.contentRef.current.innerHTML = DOMPurify.sanitize(fields.content);
        persist(); options.onUpdated(chapter); setStatus('Đã khôi phục thành bản nháp');
    };
    const resolveConflict = (keepLocal: boolean) => {
        if (!keepLocal) {
            draftRef.current = baseline.current; setDraft(baseline.current); setDirty(false);
            if (options.contentRef.current) options.contentRef.current.innerHTML = DOMPurify.sanitize(baseline.current.content);
        }
        recoveryBase.current = null; conflictRef.current = false; setConflict(false); persist();
        setStatus(keepLocal ? 'Đã chọn bản trên máy · hãy lưu để đồng bộ' : 'Đang dùng bản trên máy chủ');
    };
    const organizationChanged = (volumeName: string) => {
        if (!identity.current) return;
        const old = baseline.current.volumeName;
        baseline.current = { ...baseline.current, volumeName };
        if (draftRef.current.volumeName === old) { draftRef.current = { ...draftRef.current, volumeName }; setDraft(draftRef.current); }
        setDirty(!sameDraft(draftRef.current, baseline.current));
        persist();
    };
    return { draft, change, save, persist, loading, error, status, dirty, busy, conflict, resolveConflict,
        ready: identity.current?.chapterId === chapterId, reload: () => setAttempt(a => a + 1),
        restored, organizationChanged, onHistoryBusyChange: (value: boolean) => { historyBusy.current = value; },
        onStructureBusyChange: (value: boolean) => { structureBusy.current = value; },
        forget: () => { if (identity.current) localStorage.removeItem(studioDraftKey(identity.current.userId, identity.current.chapterId)); identity.current = null; },
    };
}
