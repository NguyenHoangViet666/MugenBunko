import { useEffect, useRef, useState } from 'react';
import type { Novel, User } from '../types';

type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;

// The persistent Header needs recent titles even on routes that never load Home.
// Fetch a bounded set; never fetch the entire catalog to build a resume link.
export function useRecentNovels(user: User | null, api: string, fetcher: Fetcher) {
    const owner = user?.id ?? null;
    const [state, setState] = useState<{ owner: number | null; novels: Novel[] }>({ owner: null, novels: [] });
    const fetchRef = useRef(fetcher); fetchRef.current = fetcher;
    useEffect(() => {
        const controller = new AbortController();
        const known = new Set<number>();
        let timer = 0;
        setState({ owner, novels: [] });
        const merge = (data: Novel[]) => {
            if (controller.signal.aborted) return;
            setState(previous => ({ owner, novels: [...new Map([...(previous.owner === owner ? previous.novels : []), ...data].map(novel => [novel.id, novel])).values()].slice(-50) }));
        };
        const local = async () => {
            const prefix = 'mugen_readprogress_' + (user?.username || 'guest') + '_';
            const ids: Array<{ id: number; time: number }> = [];
            try {
                for (let index = 0; index < localStorage.length; index++) {
                    const key = localStorage.key(index);
                    if (!key?.startsWith(prefix)) continue;
                    const id = Number(key.slice(prefix.length));
                    if (!Number.isSafeInteger(id) || id < 1) continue;
                    try {
                        const progress = JSON.parse(localStorage.getItem(key) || 'null');
                        if (progress && typeof progress === 'object') ids.push({ id, time: Number(progress.updatedAt) || 0 });
                    } catch { /* Skip a malformed entry without dropping other history. */ }
                }
                const missing = ids.sort((a, b) => b.time - a.time).slice(0, 20).map(item => item.id).filter(id => !known.has(id));
                if (!missing.length) return;
                const response = await fetchRef.current(api + '/novels/catalog?limit=20&ids=' + missing.join(','), { signal: controller.signal });
                if (!response.ok) return;
                const data = await response.json();
                if (Array.isArray(data.novels)) { missing.forEach(id => known.add(id)); merge(data.novels); }
            } catch { /* Resume is optional; the page's own load/error state remains usable. */ }
        };
        const personal = async () => {
            if (!user) return;
            try {
                const response = await fetchRef.current(api + '/novels/personal', { signal: controller.signal });
                if (response.ok) { const data = await response.json(); if (Array.isArray(data)) merge(data); }
            } catch { /* Local history is still available offline. */ }
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key && !event.key.startsWith('mugen_readprogress_' + (user?.username || 'guest') + '_')) return;
            clearTimeout(timer); timer = window.setTimeout(() => void local(), 150);
        };
        const reconnect = () => { void local(); void personal(); };
        void local(); void personal();
        window.addEventListener('storage', onStorage); window.addEventListener('online', reconnect);
        return () => { controller.abort(); clearTimeout(timer); window.removeEventListener('storage', onStorage); window.removeEventListener('online', reconnect); };
    }, [owner, user?.username, api]);
    return state.owner === owner ? state.novels : [];
}
