import { useCallback, useEffect, useRef, useState } from 'react';
import type { Novel, User } from '../types';
import { Icons } from './Icons';
import { PageError, PageLoading } from './LoadState';
import { NovelShelfCard } from './NovelShelfCard';
import { getReadingProgress } from '../utils/readingProgress';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface Collection { id: number; name: string; description: string; isPublic: boolean; shareId: string; coverNovelId: number | null; cover?: string; novelIds: number[] }
interface Props { currentUser: User; novels: Novel[]; API_BASE: string; fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>; openNovelDetail: (id: number) => void; startReading?: (id: number, index: number) => void }
export default function CollectionShelves({ currentUser, novels, API_BASE, fetchWithAuth, openNovelDetail, startReading }: Props) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<Partial<Collection> | null>(null);
    const dialogRef = useDialogFocus(Boolean(editing));
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [coverNovelId, setCoverNovelId] = useState<number | null>(null);
    const [novelToAdd, setNovelToAdd] = useState('');
    const [search, setSearch] = useState('');
    const fetchRef = useRef(fetchWithAuth);
    useEffect(() => { fetchRef.current = fetchWithAuth; });
    const load = useCallback(async () => {
        setLoading(true); setError('');
        try { const response = await fetchRef.current(`${API_BASE}/library/collections`); const data = await response.json();
            if (!response.ok) throw new Error(data.error); setCollections(data); }
        catch (err) { setError(err instanceof Error ? err.message : 'Không thể tải các kệ sách.'); }
        finally { setLoading(false); }
    }, [API_BASE]);
    useEffect(() => { void load(); }, [load, currentUser.id]);
    const selected = collections.find(c => c.id === selectedId);
    const published = novels.filter(n => n.status !== 'suspended' && n.chapters?.some(c => c.status === 'published'));
    const available = published.filter(n => !selected?.novelIds.includes(n.id) && (!search.trim() || n.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))));
    const openEditor = (collection?: Collection) => {
        setEditing(collection || {}); setName(collection?.name || ''); setDescription(collection?.description || '');
        setIsPublic(collection?.isPublic || false); setCoverNovelId(collection?.coverNovelId || null); setNotice('');
    };
    const mutate = async (path: string, method: string, body?: unknown) => {
        setBusy(true); setNotice('');
        try { const response = await fetchRef.current(`${API_BASE}/library/${path}`, { method, body: body ? JSON.stringify(body) : undefined });
            const data = await response.json(); if (!response.ok) throw new Error(data.error);
            await load(); return true;
        } catch (err) { setNotice(err instanceof Error ? err.message : 'Chưa lưu được thay đổi. Hãy thử lại.'); return false; }
        finally { setBusy(false); }
    };
    const saveCollection = async (event: React.FormEvent) => {
        event.preventDefault();
        if (await mutate(editing?.id ? `collections/${editing.id}` : 'collections', editing?.id ? 'PUT' : 'POST', { name, description, isPublic, coverNovelId })) setEditing(null);
    };
    const share = async (collection: Collection) => {
        const url = `${window.location.origin}${window.location.pathname}#/collection/${collection.shareId}`;
        try { await navigator.clipboard.writeText(url); setNotice('Đã sao chép liên kết chia sẻ.'); }
        catch { setNotice(`Liên kết chia sẻ: ${url}`); }
    };
    return <section className="collection-shelves" aria-label="Bộ sưu tập cá nhân">
        <div className="section-heading-row"><div><span className="eyebrow">Góc đọc của bạn</span><h2>Bộ sưu tập</h2><p>Sắp những câu chuyện theo cách của riêng bạn.</p></div>
            <button className="primary-btn" onClick={() => openEditor()}><Icons.Plus size={15} /> Tạo kệ sách</button></div>
        {notice && <p className="inline-notice" role="status">{notice}</p>}
        {loading ? <PageLoading /> : error ? <PageError message={error} onRetry={() => void load()} /> : <>
            <div className="collection-grid">{collections.map(collection => {
                const cover = collection.cover || novels.find(n => collection.novelIds.includes(n.id))?.cover;
                return <article key={collection.id} className={`collection-tile ${selectedId === collection.id ? 'selected' : ''}`}>
                    <button className="collection-select-button" onClick={() => { setSelectedId(selectedId === collection.id ? null : collection.id); setNovelToAdd(''); }} aria-pressed={selectedId === collection.id}>
                        <div className="collection-art">{cover ? <img src={cover} alt="" loading="lazy" /> : <Icons.Book size={36} />}<span>{collection.novelIds.length} tác phẩm</span></div>
                        <div className="collection-tile-text"><span className="eyebrow">{collection.isPublic ? 'Công khai' : 'Chỉ mình bạn'}</span><h3>{collection.name}</h3><p>{collection.description || 'Một kệ sách chờ những câu chuyện hay.'}</p></div>
                    </button>
                    <div className="collection-tile-actions"><button className="text-action" onClick={() => openEditor(collection)}>Chỉnh sửa</button>
                        {collection.isPublic && <button className="text-action" onClick={() => void share(collection)}>Chia sẻ</button>}
                        <button className="text-action danger" disabled={busy} onClick={async () => { if (window.confirm(`Xóa kệ “${collection.name}”? Tác phẩm và dấu trang vẫn được giữ.`)) { if (await mutate(`collections/${collection.id}`, 'DELETE')) setSelectedId(null); } }}>Xóa kệ</button></div>
                </article>;
            })}</div>
            {!collections.length && <div className="collection-empty"><Icons.Book size={24} /><p>Tạo kệ đầu tiên: “Để dành cuối tuần”, “Truyện chữa lành” hay bất cứ tên nào bạn thích.</p></div>}
            {selected && <div className="selected-collection-panel"><div className="section-heading-row"><div><h3>{selected.name}</h3><p>{selected.description}</p></div><button className="outline-btn small" onClick={() => setSelectedId(null)}>Thu gọn</button></div>
                <form className="collection-add-form" onSubmit={async event => { event.preventDefault(); if (novelToAdd && await mutate(`collections/${selected.id}/novels/${novelToAdd}`, 'PUT')) setNovelToAdd(''); }}>
                    <input aria-label="Tìm tác phẩm để thêm" placeholder="Tìm tác phẩm…" value={search} onChange={e => { setSearch(e.target.value); setNovelToAdd(''); }} />
                    <select aria-label="Tác phẩm cần thêm" value={novelToAdd} onChange={e => setNovelToAdd(e.target.value)}><option value="">Chọn tác phẩm để thêm vào kệ</option>{available.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select>
                    <button className="primary-btn small" disabled={busy || !novelToAdd}>Thêm vào kệ</button></form>
                <div className="shelf-card-grid">{selected.novelIds.map(id => {
                    const novel = novels.find(n => n.id === id); if (!novel) return null;
                    const progress = getReadingProgress(currentUser.username, novel);
                    return <NovelShelfCard key={id} novel={novel} progress={progress} onOpen={() => openNovelDetail(id)}
                        onRead={startReading ? () => startReading(id, progress?.chapterIndex || 0) : undefined}
                        onRemove={() => { if (!busy) void mutate(`collections/${selected.id}/novels/${id}`, 'DELETE'); }} />;
                })}</div>
                {!selected.novelIds.length && <p className="muted">Kệ còn trống. Chọn một tác phẩm ở trên để bắt đầu.</p>}
            </div>}
        </>}
        {editing && <div className="feature-modal-backdrop" onClick={() => { if (!busy) setEditing(null); }}><section ref={dialogRef} className="feature-modal" role="dialog" aria-modal="true" aria-labelledby="collection-dialog-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape' && !busy) setEditing(null); }}>
            <div className="section-heading-row"><h2 id="collection-dialog-title">{editing.id ? 'Chỉnh sửa kệ sách' : 'Kệ sách mới'}</h2><button className="outline-btn small" aria-label="Đóng" disabled={busy} onClick={() => setEditing(null)}>✕</button></div>
            <form className="feature-form" onSubmit={saveCollection}><label>Tên kệ<input autoFocus required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Để dành cuối tuần" /></label>
                <label>Mô tả<textarea maxLength={280} value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Một vài lời về bộ sưu tập này…" /></label>
                <label>Bìa kệ<select value={coverNovelId || ''} onChange={e => setCoverNovelId(e.target.value ? Number(e.target.value) : null)}><option value="">Tự chọn từ tác phẩm trong kệ</option>{published.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select></label>
                <label className="checkbox-label"><input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> Công khai để chia sẻ bằng liên kết</label>
                <p className="muted">Kệ riêng tư chỉ hiển thị với tài khoản của bạn. Bạn có thể đổi lựa chọn này bất cứ lúc nào.</p>
                {notice && <p role="alert" className="inline-notice">{notice}</p>}<button className="primary-btn" disabled={busy || !name.trim()}>{busy ? 'Đang lưu…' : 'Lưu kệ sách'}</button></form>
        </section></div>}
    </section>;
}
