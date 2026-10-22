import { useEffect, useRef, useState } from 'react';
import type { RefObject, FormEvent } from 'react';
import DOMPurify from 'dompurify';
import type { User, Novel, Chapter } from '../types';
import { Icons } from '../components/Icons';
import ChapterVersionHistory from '../components/ChapterVersionHistory';
import ScheduleModal from '../components/ScheduleModal';
import StudioDialog from '../components/StudioDialog';
import { useStudioEditor } from '../hooks/useStudioEditor';
import { htmlToText, toLocalDatetime } from '../utils/studioDraft';
import '../styles/studio.css';

interface Props {
    currentUser: User | null; novels: Novel[];
    activeStudioNovelId: number | null; setActiveStudioNovelId: (id: number | null) => void;
    activeStudioChapterId: number | null; setActiveStudioChapterId: (id: number | null) => void;
    setCurrentView: (view: string) => void; setNewNovelModalOpen: (open: boolean) => void;
    handleDeleteNovel: (id: number) => Promise<boolean>; openEditNovelModal: (id: number) => void;
    API_BASE: string; fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    onRefresh: () => Promise<Novel[]>; onChapterUpdated: (chapter: Chapter) => void;
    contentAreaRef: RefObject<HTMLDivElement | null>; insertStaticIllustration: () => void;
    showToast: (message: string) => void;
    onAnnouncementPosted: () => void;
}
const labels: Record<Chapter['status'], string> = { draft: 'Bản nháp', pending: 'Chờ duyệt', scheduled: 'Đã lên lịch', published: 'Đã đăng' };
type VolumeDialog = { kind: 'add' | 'rename' | 'move'; oldName?: string } | null;

export default function AuthorStudio(props: Props) {
    const { currentUser, novels, activeStudioNovelId, setActiveStudioNovelId, activeStudioChapterId,
        setActiveStudioChapterId, setCurrentView, setNewNovelModalOpen, openEditNovelModal,
        API_BASE, fetchWithAuth, contentAreaRef, onRefresh, onChapterUpdated, showToast } = props;
    const novel = novels.find(n => n.id === activeStudioNovelId);
    const chapters = novel?.chapters || [];
    const chapter = chapters.find(c => c.id === activeStudioChapterId);
    const myNovels = novels.filter(n => n.authorId === currentUser?.username);
    const canWrite = currentUser?.roles.some(r => ['author', 'moderator', 'admin'].includes(r));
    const isAdmin = currentUser?.roles.includes('admin');
    const editor = useStudioEditor({ userId: currentUser?.id || 0, chapter, novelId: activeStudioNovelId,
        contentRef: contentAreaRef, API_BASE, fetchWithAuth, onUpdated: onChapterUpdated, showToast });
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | Chapter['status']>('all');
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [preview, setPreview] = useState(false);
    const previewSelection = useRef<Range | null>(null);
    const [focus, setFocus] = useState(false);
    const [mutationBusy, setMutationBusy] = useState(false);
    const mutationLock = useRef(false);
    const [mutationError, setMutationError] = useState('');
    const [dialog, setDialog] = useState<VolumeDialog>(null);
    const [volumeInput, setVolumeInput] = useState('');
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleError, setScheduleError] = useState('');
    const [announcement, setAnnouncement] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const busy = mutationBusy || editor.busy || historyOpen;
    const volumes = [...new Set(chapters.map(c => c.volume_name || 'Tập 01'))];
    const availableVolumes = [...new Set([...volumes, editor.draft.volumeName].filter(Boolean))];
    const words = htmlToText(editor.draft.content).split(/\s+/).filter(Boolean).length;
    const visibleChapters = chapters.filter(c => (filter === 'all' || c.status === filter) &&
        `${c.title} ${c.volume_name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi').trim()));

    useEffect(() => { setSelected(new Set()); setSearch(''); setFilter('all'); setCollapsed(new Set()); }, [activeStudioNovelId]);

    const leaveEditor = () => !editor.dirty || editor.persist() || window.confirm('Chưa lưu được bản dự phòng. Rời chương sẽ bỏ phần chưa lưu. Bạn vẫn muốn tiếp tục?');
    const selectNovel = (id: number) => {
        if (busy || !leaveEditor()) return;
        setActiveStudioNovelId(id); setActiveStudioChapterId(null); setPreview(false);
    };
    const selectChapter = (id: number) => {
        if (id === activeStudioChapterId || busy || !leaveEditor()) return;
        setActiveStudioChapterId(id); setPreview(false);
        try { localStorage.setItem(`mugen_studio_recent_${currentUser?.id}`, JSON.stringify({ novelId: activeStudioNovelId, chapterId: id })); } catch { /* Optional shortcut. */ }
    };
    const run = async (work: () => Promise<void>) => {
        if (mutationLock.current || editor.busy || historyOpen) return;
        mutationLock.current = true; editor.onStructureBusyChange(true); setMutationBusy(true); setMutationError('');
        try { await work(); }
        catch (error) { setMutationError(error instanceof Error ? error.message : 'Không thể thực hiện thao tác.'); }
        finally { mutationLock.current = false; editor.onStructureBusyChange(false); setMutationBusy(false); }
    };
    const request = async (path: string, body?: unknown, method = 'POST') => {
        const response = await fetchWithAuth(`${API_BASE}${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Thao tác thất bại.');
        return data;
    };
    const createChapter = (volumeName = editor.draft.volumeName || volumes[0] || 'Tập 01') => {
        if (!novel || !leaveEditor()) return;
        void run(async () => {
            const data = await request('/chapters', { novelId: novel.id, volumeName,
                title: `Chương ${chapters.length + 1}: Tiêu đề chương mới`, content: '', status: 'draft' });
            await onRefresh(); setActiveStudioChapterId(data.chapterId); setPreview(false);
            setDialog(null); showToast('Đã tạo chương nháp mới.');
        });
    };
    const organize = async (items: { id: number; volumeName: string }[]) => {
        if (!novel || (editor.dirty && !editor.persist())) throw new Error('Hãy lưu hoặc xuất file dự phòng trước khi sắp xếp chương.');
        await request('/chapters/organize', { novelId: novel.id, chapters: items });
        const current = items.find(c => c.id === activeStudioChapterId);
        if (current) editor.organizationChanged(current.volumeName);
        await onRefresh();
    };
    const reorder = (id: number, direction: -1 | 1) => void run(async () => {
        const items = chapters.map(c => ({ id: c.id, volumeName: c.volume_name }));
        const index = items.findIndex(c => c.id === id); const other = index + direction;
        if (other < 0 || other >= items.length) return;
        [items[index], items[other]] = [items[other], items[index]];
        await organize(items); showToast('Đã lưu thứ tự chương.');
    });
    const submitVolume = (event: FormEvent) => {
        event.preventDefault(); const name = volumeInput.trim();
        if (!name) return;
        if (dialog?.kind !== 'move' && volumes.includes(name)) { setMutationError('Tên tập này đã tồn tại.'); return; }
        if (dialog?.kind === 'add') { createChapter(name); return; }
        void run(async () => {
            let items = chapters.map(c => ({ id: c.id, volumeName: dialog?.kind === 'rename' && c.volume_name === dialog.oldName ? name : c.volume_name }));
            if (dialog?.kind === 'move') {
                const moved = items.filter(c => selected.has(c.id)).map(c => ({ ...c, volumeName: name }));
                items = items.filter(c => !selected.has(c.id));
                let lastTarget = -1; items.forEach((item, index) => { if (item.volumeName === name) lastTarget = index; });
                items.splice(lastTarget < 0 ? items.length : lastTarget + 1, 0, ...moved);
            }
            await organize(items); setDialog(null); setSelected(new Set()); showToast('Đã cập nhật cấu trúc tác phẩm.');
        });
    };
    const openVolume = (value: NonNullable<VolumeDialog>) => { setMutationError(''); setVolumeInput(value.oldName || ''); setDialog(value); };
    const deleteChapter = () => {
        if (!chapter || !window.confirm(`Xóa vĩnh viễn chương “${chapter.title}” và lịch sử của chương?`)) return;
        void run(async () => { await request(`/chapters/${chapter.id}`, undefined, 'DELETE'); editor.forget();
            setActiveStudioChapterId(null); await onRefresh(); showToast('Đã xóa chương.'); });
    };
    const deleteVolume = (volumeName: string) => {
        if (!window.confirm(`Xóa vĩnh viễn tập “${volumeName}” cùng tất cả chương trong tập?`)) return;
        void run(async () => { await request('/chapters/delete-volume', { novelId: activeStudioNovelId, volumeName });
            if (chapter?.volume_name === volumeName) { editor.forget(); setActiveStudioChapterId(null); }
            await onRefresh(); showToast('Đã xóa tập.'); });
    };
    const format = (command: string) => { contentAreaRef.current?.focus(); document.execCommand(command, false);
        editor.change({ content: contentAreaRef.current?.innerHTML || '' }); };
    const togglePreview = () => {
        if (!preview) {
            const selection = window.getSelection();
            previewSelection.current = selection?.rangeCount && contentAreaRef.current?.contains(selection.getRangeAt(0).commonAncestorContainer)
                ? selection.getRangeAt(0).cloneRange() : null;
        } else requestAnimationFrame(() => {
            const range = previewSelection.current;
            if (!range || !contentAreaRef.current?.contains(range.commonAncestorContainer)) return;
            contentAreaRef.current.focus();
            const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
        });
        setPreview(value => !value);
    };
    const exportBackup = (format: 'txt' | 'md') => {
        const title = editor.draft.title || 'chuong'; const text = htmlToText(editor.draft.content);
        const url = URL.createObjectURL(new Blob([`${format === 'md' ? '# ' : ''}${title}\n\n${text}`], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${title.replace(/[<>:"/\\|?*]/g, '_')}.${format}`; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const schedule = async () => {
        const date = new Date(scheduleDate);
        if (!scheduleDate || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) { setScheduleError('Hãy chọn thời gian trong tương lai.'); return; }
        setScheduleError(''); if (await editor.save('schedule', date.toISOString())) setScheduleOpen(false);
    };

    if (!currentUser) return <div className="page-view active"><h2>Studio tác giả</h2><p>Đăng nhập để quản lý bản thảo.</p></div>;

    return <div className={`page-view active author-studio${focus ? ' studio-focused' : ''}`}>
        <div className="studio-header"><div><span className="eyebrow">MugenBunko · Studio</span><h2>Bàn làm việc tác giả</h2>
            <p className="subtitle">Giữ những ý tưởng thành câu chuyện, từng chương một.</p></div>
            <div className="studio-actions"><button className="outline-btn small" onClick={() => setFocus(v => !v)}>{focus ? 'Thoát tập trung' : 'Tập trung viết'}</button>
                <button className="outline-btn small" onClick={() => { if (leaveEditor()) setCurrentView('home'); }}>Về thư viện</button></div></div>
        {!canWrite && <div className="inline-notice" role="status">Bạn cần được cấp quyền tác giả để tạo truyện và viết chương.
            <button className="text-action" onClick={() => setCurrentView('profile')}>Mở hồ sơ để đăng ký quyền tác giả</button></div>}
        <div className="studio-stats">
            <div><strong>{myNovels.length}</strong><span>Tác phẩm</span></div>
            <div><strong>{myNovels.reduce((sum, n) => sum + Number(n.reads || 0), 0).toLocaleString('vi-VN')}</strong><span>Lượt đọc</span></div>
            <div><strong>{myNovels.reduce((sum, n) => sum + Number(n.bookmarksCount || 0), 0).toLocaleString('vi-VN')}</strong><span>Lượt lưu tủ</span></div>
        </div>
        {mutationError && !dialog && <div className="inline-notice studio-error" role="alert">{mutationError}</div>}
        <div className="studio-workspace">
            <aside className="studio-sidebar" aria-label="Quản lý tác phẩm">
                <section className="studio-panel"><div className="studio-panel-heading"><h3>Tác phẩm của bạn</h3>
                    <button className="primary-btn small" disabled={!canWrite || busy} onClick={() => { if (leaveEditor()) setNewNovelModalOpen(true); }}>+ Tạo truyện</button></div>
                    <div className="studio-novels">{myNovels.map(item => <div className={`studio-novel-row${item.id === activeStudioNovelId ? ' selected' : ''}`} key={item.id}>
                        <button className="studio-novel-select" disabled={busy} aria-pressed={item.id === activeStudioNovelId} onClick={() => selectNovel(item.id)}>
                            <img src={item.cover} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/default_novel_cover.png'; }} />
                            <span>{item.title}<small>{item.chapters?.length || 0} chương</small></span></button>
                        <button className="studio-icon-btn" title="Sửa thông tin truyện" aria-label={`Sửa thông tin ${item.title}`} disabled={busy} onClick={() => openEditNovelModal(item.id)}><Icons.Edit size={15} /></button>
                        <button className="studio-icon-btn studio-danger" title="Xóa truyện" aria-label={`Xóa ${item.title}`} disabled={busy} onClick={() => {
                            if (!window.confirm(`Xóa vĩnh viễn tác phẩm “${item.title}” cùng tất cả chương?`)) return;
                            void run(async () => { if (await props.handleDeleteNovel(item.id)) { if (item.id === activeStudioNovelId) editor.forget(); } });
                        }}><Icons.Trash size={15} /></button>
                    </div>)}{!myNovels.length && <p className="muted">Chưa có tác phẩm. Tạo truyện đầu tiên để bắt đầu bản thảo của bạn.</p>}</div>
                </section>
                {novel && <section className="studio-panel"><div className="studio-panel-heading"><h3>Cấu trúc tác phẩm</h3>
                    <button className="primary-btn small" disabled={busy || !canWrite} onClick={() => createChapter()}>+ Chương</button></div>
                    <label className="studio-field">Tìm chương hoặc tập<input type="search" value={search} placeholder="Tên chương, tên tập…" onChange={event => setSearch(event.target.value)} /></label>
                    <label className="studio-field">Trạng thái<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
                        <option value="all">Tất cả ({chapters.length})</option>{Object.entries(labels).map(([status, label]) => <option key={status} value={status}>{label} ({chapters.filter(c => c.status === status).length})</option>)}</select></label>
                    <div className="studio-actions"><button className="outline-btn small" disabled={busy || !canWrite} onClick={() => openVolume({ kind: 'add' })}>+ Tập mới</button>
                        {selected.size > 0 && <><button className="outline-btn small" disabled={busy} onClick={() => openVolume({ kind: 'move' })}>Chuyển {selected.size} chương</button>
                            <button className="text-action" onClick={() => setSelected(new Set())}>Bỏ chọn</button></>}</div>
                    <div className="studio-tree">{volumes.map(volume => {
                        const items = visibleChapters.filter(c => c.volume_name === volume); if (!items.length) return null;
                        return <div key={volume} className="studio-volume"><div className="studio-volume-heading">
                            <button className="studio-volume-toggle" aria-expanded={!collapsed.has(volume)} onClick={() => setCollapsed(previous => {
                                const next = new Set(previous); if (next.has(volume)) next.delete(volume); else next.add(volume); return next;
                            })}><span aria-hidden="true">{collapsed.has(volume) ? '▸' : '▾'}</span><span>{volume}</span><small>{items.length}</small></button>
                            <button className="studio-icon-btn" aria-label={`Thêm chương vào ${volume}`} disabled={busy} onClick={() => createChapter(volume)}>+</button>
                            <button className="studio-icon-btn" aria-label={`Đổi tên ${volume}`} disabled={busy} onClick={() => openVolume({ kind: 'rename', oldName: volume })}><Icons.Edit size={13} /></button>
                            <button className="studio-icon-btn studio-danger" aria-label={`Xóa ${volume}`} disabled={busy} onClick={() => deleteVolume(volume)}><Icons.Trash size={13} /></button>
                        </div>{!collapsed.has(volume) && <div>{items.map(item => <div key={item.id} className={`studio-chapter-row${item.id === activeStudioChapterId ? ' selected' : ''}`}>
                            <input type="checkbox" aria-label={`Chọn ${item.title}`} checked={selected.has(item.id)} disabled={busy} onChange={event => setSelected(previous => {
                                const next = new Set(previous); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next;
                            })} />
                            <button className="studio-chapter-select" disabled={busy} aria-current={item.id === activeStudioChapterId ? 'true' : undefined} onClick={() => selectChapter(item.id)}>
                                <span>{item.title}</span><small className={`studio-badge ${item.status}`}>{labels[item.status]}</small>
                                {item.scheduled_release && <small>{new Date(item.scheduled_release).toLocaleString('vi-VN')}</small>}</button>
                            <div className="studio-order-buttons"><button className="studio-icon-btn" aria-label={`Đưa ${item.title} lên`} disabled={busy || chapters[0]?.id === item.id} onClick={() => reorder(item.id, -1)}>↑</button>
                                <button className="studio-icon-btn" aria-label={`Đưa ${item.title} xuống`} disabled={busy || chapters.at(-1)?.id === item.id} onClick={() => reorder(item.id, 1)}>↓</button></div>
                        </div>)}</div>}</div>;
                    })}{!visibleChapters.length && <div className="studio-tree-empty"><p>{chapters.length ? 'Không tìm thấy chương phù hợp.' : 'Tác phẩm chưa có chương nào.'}</p>
                        {chapters.length > 0 && <button className="text-action" onClick={() => { setSearch(''); setFilter('all'); }}>Xóa bộ lọc</button>}</div>}</div>
                </section>}
                {novel && <section className="studio-panel"><h3>Thông báo cho độc giả</h3><label className="studio-field"><span>Nội dung thông báo</span>
                    <textarea value={announcement} placeholder="Lịch ra chương, cập nhật tác phẩm…" onChange={event => setAnnouncement(event.target.value)} /></label>
                    <button className="outline-btn small" disabled={busy || !announcement.trim()} onClick={() => void run(async () => {
                        await request('/announcements', { novelId: novel.id, text: announcement.trim() }); setAnnouncement(''); props.onAnnouncementPosted(); showToast('Đã đăng thông báo.');
                    })}>Đăng thông báo</button></section>}
            </aside>
            <main className="studio-editor-panel">
                {chapter ? <>
                    <div className="studio-editor-heading"><div><span className={`studio-badge ${chapter.status}`}>{labels[chapter.status]}</span>
                        <span className="studio-editor-novel">{novel?.title}</span></div><button className="outline-btn small" disabled={editor.loading} onMouseDown={event => event.preventDefault()} onClick={togglePreview}><Icons.Eye size={14} /> {preview ? 'Tiếp tục viết' : 'Xem trước'}</button></div>
                    {chapter.scheduled_release && <p className="studio-schedule-info"><Icons.Clock size={15} /> Lịch đăng: {new Date(chapter.scheduled_release).toLocaleString('vi-VN')}{chapter.status === 'pending' ? ' · Đang chờ duyệt' : ''}</p>}
                    {editor.conflict && <div className="inline-notice studio-recovery" role="alert"><p>Bản trên máy chủ đã thay đổi kể từ lần viết trước. Bản đang mở là phần chưa lưu trên máy. Chọn bản muốn tiếp tục trước khi đồng bộ.</p>
                        <div className="studio-actions"><button className="outline-btn small" onClick={() => editor.resolveConflict(true)}>Tiếp tục bản trên máy</button>
                            <button className="outline-btn small" onClick={() => { if (window.confirm('Bỏ bản chưa lưu trên máy và dùng nội dung máy chủ?')) editor.resolveConflict(false); }}>Dùng bản máy chủ</button>
                            <button className="text-action" onClick={() => exportBackup('txt')}>Xuất bản trên máy ra TXT</button></div></div>}
                    {editor.error && <div className="inline-notice studio-error" role="alert">{editor.error}<button className="text-action" disabled={busy} onClick={editor.reload}>Tải lại để đối chiếu</button></div>}
                    <div className="studio-editor-meta"><label className="studio-field">Tập<select disabled={!editor.ready || busy} value={editor.draft.volumeName} onChange={event => editor.change({ volumeName: event.target.value })}>
                        {availableVolumes.map(volume => <option key={volume} value={volume}>{volume}</option>)}</select></label>
                        <label className="studio-field">Tiêu đề chương<input maxLength={255} disabled={!editor.ready || mutationBusy || historyOpen} value={editor.draft.title} placeholder="Tên chương…" onChange={event => editor.change({ title: event.target.value })} /></label></div>
                    <div className="studio-toolbar"><div className="studio-actions" hidden={preview}>
                        <button className="outline-btn small" disabled={!editor.ready || busy} aria-label="In đậm" title="In đậm (Ctrl+B)" onMouseDown={event => event.preventDefault()} onClick={() => format('bold')}><strong>B</strong></button>
                        <button className="outline-btn small" disabled={!editor.ready || busy} aria-label="In nghiêng" title="In nghiêng (Ctrl+I)" onMouseDown={event => event.preventDefault()} onClick={() => format('italic')}><em>I</em></button>
                        <button className="outline-btn small" disabled={!editor.ready || busy} onMouseDown={event => event.preventDefault()} onClick={() => format('justifyLeft')}>Căn trái</button>
                        <button className="outline-btn small" disabled={!editor.ready || busy} onMouseDown={event => event.preventDefault()} onClick={() => format('justifyCenter')}>Căn giữa</button>
                        <button className="outline-btn small" disabled={!editor.ready || busy} onMouseDown={event => event.preventDefault()} onClick={props.insertStaticIllustration}>Chèn ảnh</button>
                    </div><div className="studio-actions">
                        <ChapterVersionHistory chapter={chapter} novelId={novel!.id} API_BASE={API_BASE} fetchWithAuth={fetchWithAuth}
                            disabled={busy || !editor.ready || editor.conflict} getCurrentDraft={() => editor.ready ? editor.draft : null}
                            onRestored={editor.restored} onBusyChange={value => { editor.onHistoryBusyChange(value); setHistoryOpen(value); }} />
                        <button className="outline-btn small" disabled={!editor.ready} onClick={() => exportBackup('txt')}>TXT</button>
                        <button className="outline-btn small" disabled={!editor.ready} onClick={() => exportBackup('md')}>MD</button></div></div>
                    <div className="studio-save-status" role="status" aria-live="polite"><span>{words.toLocaleString('vi-VN')} từ · khoảng {Math.max(1, Math.ceil(words / 220))} phút đọc</span>
                        <span className={editor.dirty ? 'studio-unsaved' : ''}>{editor.loading ? 'Đang tải chương…' : editor.status}</span></div>
                    <div hidden={preview} className="studio-editor-surface"><div ref={contentAreaRef} className="editor-body-textarea studio-content font-serif"
                        contentEditable={editor.ready && !mutationBusy && !historyOpen} suppressContentEditableWarning role="textbox" aria-label="Nội dung chương" aria-multiline="true" aria-busy={editor.loading}
                        onInput={() => editor.change({ content: contentAreaRef.current?.innerHTML || '' })}
                        onPaste={event => {
                            event.preventDefault(); const html = event.clipboardData.getData('text/html');
                            if (html) document.execCommand('insertHTML', false, DOMPurify.sanitize(html));
                            else document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
                            editor.change({ content: contentAreaRef.current?.innerHTML || '' });
                        }} /></div>
                    {preview && <article className="studio-reader-preview reader-content-body font-serif" aria-label="Xem trước chương">
                        <div className="studio-preview-caption">Xem trước bản đang viết · chưa xuất bản</div><h1>{editor.draft.title}</h1>
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editor.draft.content) }} /></article>}
                    <div className="studio-publishing-note">{chapter.status === 'published' ? 'Bản sửa được giữ trên máy. Bấm “Cập nhật chương” để thay đổi nội dung độc giả đang đọc.' :
                        chapter.status === 'scheduled' ? 'Bản sửa được giữ trên máy. “Lưu thay đổi” giữ lịch đăng hiện tại; đổi lịch sẽ gửi duyệt lại nếu bạn không phải quản trị viên.' :
                        chapter.status === 'pending' ? 'Chương đang chờ duyệt. Bạn có thể lưu nội dung mới hoặc rút về bản nháp.' : 'Nháp tự lưu lên máy chủ mỗi 30 giây. Bạn cũng có thể lưu ngay bằng Ctrl+S / ⌘S.'}</div>
                    <div className="studio-editor-footer"><button className="text-action studio-danger" disabled={busy || !editor.ready} onClick={deleteChapter}>Xóa chương</button>
                        <div className="studio-actions"><button className="outline-btn" disabled={busy || !editor.ready || editor.conflict} onClick={() => void editor.save()}>{chapter.status === 'published' ? 'Giữ bản sửa trên máy' : chapter.status === 'draft' ? 'Lưu nháp' : 'Lưu thay đổi'}</button>
                            {chapter.status !== 'draft' && <button className="outline-btn" disabled={busy || !editor.ready || editor.conflict} onClick={() => {
                                if (window.confirm(chapter.status === 'published' ? 'Ẩn chương công khai và chuyển về bản nháp?' : 'Rút chương về bản nháp và hủy lịch đăng nếu có?')) void editor.save('withdraw');
                            }}>{chapter.status === 'published' ? 'Ẩn về nháp' : 'Rút về nháp'}</button>}
                            {chapter.status !== 'published' && <button className="outline-btn" disabled={busy || !editor.ready || editor.conflict} onClick={() => { setScheduleDate(toLocalDatetime(chapter.scheduled_release)); setScheduleError(''); setScheduleOpen(true); }}>{chapter.scheduled_release ? 'Đổi lịch đăng' : 'Hẹn giờ đăng'}</button>}
                            {(chapter.status === 'draft' || chapter.status === 'published') && <button className="primary-btn" disabled={busy || !editor.ready || editor.conflict} onClick={() => void editor.save('publish')}>{editor.busy ? 'Đang lưu…' : chapter.status === 'published' ? 'Cập nhật chương' : isAdmin ? 'Xuất bản chương' : 'Gửi duyệt chương'}</button>}</div></div>
                </> : <div className="studio-editor-empty"><Icons.Feather size={42} /><h3>{novel ? 'Bắt đầu chương tiếp theo' : 'Một câu chuyện đang chờ bạn'}</h3>
                    <p>{novel ? 'Chọn chương trong mục lục hoặc tạo chương mới để viết.' : 'Chọn tác phẩm bên cạnh để tiếp tục viết bản thảo.'}</p>
                    {novel ? <button className="primary-btn" disabled={!canWrite || busy} onClick={() => createChapter()}>+ Viết chương mới</button> : <button className="outline-btn" disabled={!canWrite && !myNovels.length} onClick={() => {
                        try { const recent = JSON.parse(localStorage.getItem(`mugen_studio_recent_${currentUser.id}`) || 'null');
                            if (recent && myNovels.some(n => n.id === recent.novelId && n.chapters?.some(c => c.id === recent.chapterId))) {
                                setActiveStudioNovelId(recent.novelId); setActiveStudioChapterId(recent.chapterId); return;
                            }
                        } catch { /* Fall back to a real owned work. */ }
                        if (myNovels[0]) selectNovel(myNovels[0].id); else if (canWrite) setNewNovelModalOpen(true);
                    }}>{myNovels.length ? 'Tiếp tục bản thảo gần nhất' : 'Tạo tác phẩm đầu tiên'}</button>}</div>}
            </main>
        </div>
        {dialog && <StudioDialog title={dialog.kind === 'add' ? 'Thêm tập mới' : dialog.kind === 'rename' ? 'Đổi tên tập' : `Chuyển ${selected.size} chương`} onClose={() => setDialog(null)} busy={busy}>
            <form onSubmit={submitVolume}><label className="studio-field">{dialog.kind === 'move' ? 'Tập đích (chọn hoặc nhập tên mới)' : 'Tên tập'}
                <input required maxLength={100} list={dialog.kind === 'move' ? 'studio-volume-options' : undefined} value={volumeInput} disabled={busy} onChange={event => setVolumeInput(event.target.value)} /></label>
                <datalist id="studio-volume-options">{volumes.map(volume => <option value={volume} key={volume} />)}</datalist>
                {dialog.kind === 'add' && <p className="muted">Một chương nháp trống sẽ được tạo trong tập mới.</p>}
                {mutationError && <p className="studio-error" role="alert">{mutationError}</p>}
                <div className="studio-dialog-actions"><button type="button" className="outline-btn" disabled={busy} onClick={() => setDialog(null)}>Hủy</button><button className="primary-btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div></form>
        </StudioDialog>}
        <ScheduleModal scheduleModalOpen={scheduleOpen} setScheduleModalOpen={setScheduleOpen} scheduleDatetime={scheduleDate}
            setScheduleDatetime={setScheduleDate} submitScheduleChapter={() => void schedule()} busy={editor.busy} error={scheduleError || editor.error} needsApproval={!isAdmin} />
    </div>;
}
