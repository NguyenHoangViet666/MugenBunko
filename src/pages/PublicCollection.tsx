import { useEffect, useState } from 'react';
import type { Novel } from '../types';
import { PageLoading, PageError } from '../components/LoadState';
import { NovelShelfCard } from '../components/NovelShelfCard';

export default function PublicCollection({ shareId, API_BASE, openNovelDetail }: { shareId: string; API_BASE: string; openNovelDetail: (id: number) => void }) {
    const [collection, setCollection] = useState<{ name: string; description: string; ownerName: string; cover?: string; novels: Novel[] } | null>(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController(); setCollection(null); setError('');
        fetch(`${API_BASE}/library/public/${shareId}`, { signal: controller.signal }).then(async response => {
            const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
        }).then(setCollection).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không thể tải bộ sưu tập.'); });
        return () => controller.abort();
    }, [shareId, API_BASE, attempt]);
    if (error) return <PageError message={error} onRetry={() => setAttempt(a => a + 1)} />;
    if (!collection) return <PageLoading />;
    return <div className="page-view active public-collection"><header className="library-hero"><div><span className="eyebrow">Bộ sưu tập của {collection.ownerName}</span><h1>{collection.name}</h1><p>{collection.description}</p><span className="library-count">{collection.novels.length} tác phẩm</span></div>{collection.cover && <img className="collection-hero-cover" src={collection.cover} alt="" />}</header>
        <div className="shelf-card-grid">{collection.novels.map(novel => <NovelShelfCard key={novel.id} novel={novel} onOpen={() => openNovelDetail(novel.id)} />)}</div>
        {!collection.novels.length && <p className="collection-empty">Bộ sưu tập chưa có tác phẩm được xuất bản.</p>}</div>;
}
