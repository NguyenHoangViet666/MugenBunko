import { useMemo, useState } from 'react';
import type { User, Novel } from '../types';
import { Icons } from '../components/Icons';
import CollectionShelves from '../components/CollectionShelves';
import { NovelShelfCard } from '../components/NovelShelfCard';
import { SyncIndicator } from '../components/LoadState';
import { getReadingProgress, getShelfStatus } from '../utils/readingProgress';
import type { SyncStatus } from '../hooks/useReadingSync';

interface LibraryProps {
    currentUser: User | null;
    novels: Novel[];
    setCurrentView: (view: string) => void;
    setActiveNovelId: (id: number | null) => void;
    toggleBookmark: (id: number) => void;
    openNovelDetail: (id: number) => void;
    startReading?: (novelId: number, chapterIndex: number) => void;
    API_BASE: string;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    progressRevision: number;
    syncStatus: SyncStatus;
    onSync: () => void;
}
type ShelfFilter = 'all' | 'reading' | 'completed' | 'caught-up' | 'unread';

export default function Library({ currentUser, novels, setCurrentView, toggleBookmark, openNovelDetail,
    startReading, API_BASE, fetchWithAuth, progressRevision, syncStatus, onSync }: LibraryProps) {
    const [filter, setFilter] = useState<ShelfFilter>('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('recent');
    const items = useMemo(() => {
        if (!currentUser) return [];
        return currentUser.bookmarks.map(id => {
            const novel = novels.find(n => n.id === id);
            if (!novel) return null;
            const progress = getReadingProgress(currentUser.username, novel);
            return { novel, progress, status: getShelfStatus(novel, progress) };
        }).filter(item => item !== null);
    }, [currentUser, novels, progressRevision]);
    if (!currentUser) return null;
    const tabs: Array<{ id: ShelfFilter; name: string }> = [
        { id: 'all', name: 'Tất cả' }, { id: 'reading', name: 'Đang đọc' },
        { id: 'caught-up', name: 'Đã đọc kịp' }, { id: 'completed', name: 'Đã đọc xong' }, { id: 'unread', name: 'Chưa đọc' }
    ];
    const filtered = items.filter(item => {
        if (filter !== 'all' && item.status !== filter) return false;
        const query = search.trim().toLocaleLowerCase('vi');
        return !query || (item.novel.title + ' ' + (item.novel.author_name || item.novel.author || '')).toLocaleLowerCase('vi').includes(query);
    }).sort((a, b) => sort === 'title' ? a.novel.title.localeCompare(b.novel.title, 'vi') : (b.progress?.updatedAt || 0) - (a.progress?.updatedAt || 0));

    return <div className="page-view active personal-library">
        <header className="library-hero"><div><span className="eyebrow">Không gian của riêng bạn</span><h1>Tủ sách cá nhân</h1><p>Mỗi câu chuyện một chỗ riêng. Mỗi lần trở lại, tiếp tục từ nơi bạn đã dừng.</p>
            <SyncIndicator status={syncStatus} onRetry={onSync} /></div><div className="library-hero-stat"><Icons.Book size={34} /><strong>{items.length}</strong><span>tác phẩm đã lưu</span></div></header>
        <CollectionShelves key={currentUser.id} currentUser={currentUser} novels={novels} API_BASE={API_BASE} fetchWithAuth={fetchWithAuth} openNovelDetail={openNovelDetail} startReading={startReading} />
        <section aria-label="Tác phẩm đã lưu"><div className="section-heading-row"><div><span className="eyebrow">Dấu trang</span><h2>Tác phẩm đã lưu</h2></div>
            <button className="outline-btn small" onClick={() => setCurrentView('explore')}>Khám phá thêm <Icons.ArrowRight size={13} /></button></div>
            <div className="library-controls"><div className="library-status-tabs" role="group" aria-label="Trạng thái đọc">{tabs.map(tab => <button key={tab.id} className={'shelf-filter-chip ' + (filter === tab.id ? 'active' : '')} aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)}>
                {tab.name}<span>{tab.id === 'all' ? items.length : items.filter(item => item.status === tab.id).length}</span></button>)}</div>
                <div className="library-search-sort"><label className="shelf-search"><Icons.Search size={15} /><input aria-label="Tìm trong tủ sách" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên truyện, tác giả…" /></label>
                    <select aria-label="Sắp xếp tủ sách" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Đọc gần đây</option><option value="title">Tên tác phẩm</option></select></div></div>
            {!items.length ? <div className="collection-empty"><Icons.Book size={36} /><h3>Những câu chuyện đang chờ bạn</h3><p>Lưu một tác phẩm yêu thích để bắt đầu xây tủ sách của mình.</p><button className="primary-btn" onClick={() => setCurrentView('explore')}>Khám phá tác phẩm</button></div>
                : !filtered.length ? <div className="collection-empty"><p>Chưa có tác phẩm khớp với bộ lọc này.</p><button className="outline-btn" onClick={() => { setSearch(''); setFilter('all'); }}>Xóa bộ lọc</button></div>
                : <div className="shelf-card-grid">{filtered.map(({ novel, progress }) => <NovelShelfCard key={novel.id} novel={novel} progress={progress} onOpen={() => openNovelDetail(novel.id)}
                    onRead={startReading ? () => startReading(novel.id, progress?.chapterIndex || 0) : undefined} onRemove={() => toggleBookmark(novel.id)} />)}</div>}
        </section>
    </div>;
}
