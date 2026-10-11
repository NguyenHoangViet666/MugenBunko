import { useCallback, useEffect, useRef, useState } from 'react';
import type { Novel, User } from '../types';
import { getReadingProgress, progressKey, storeReadingProgress, type ReadingProgress } from '../utils/readingProgress';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';
type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;
export function useReadingSync(user: User | null, novels: Novel[], api: string, fetcher: Fetcher) {
    const [revision, setRevision] = useState(0);
    const [initializedFor, setInitializedFor] = useState<number | null>(null);
    const [status, setStatus] = useState<SyncStatus>(user ? 'syncing' : 'local');
    const inputs = useRef({ user, novels, fetcher });
    useEffect(() => { inputs.current = { user, novels, fetcher }; });
    const userId = user?.id;

    const syncNovel = useCallback(async (novel: Novel, keepalive = false) => {
        const activeUser = user;
        const { fetcher: fetch } = inputs.current;
        if (inputs.current.user?.id !== activeUser?.id) return;
        if (!activeUser) return;
        const local = getReadingProgress(activeUser.username, novel);
        if (!local?.pending) return;
        if (!navigator.onLine) { setStatus('offline'); return; }
        setStatus('syncing');
        try {
            const response = await fetch(`${api}/reader/progress/${novel.id}`, { method: 'PUT',
                body: JSON.stringify(local), keepalive });
            if (!response.ok) throw new Error('Sync failed');
            const remote = await response.json();
            if (inputs.current.user?.id !== activeUser.id) return;
            const latest = getReadingProgress(activeUser.username, novel);
            if (latest && latest.updatedAt <= remote.updatedAt) {
                storeReadingProgress(activeUser.username, novel, { ...latest, ...remote,
                    completedChapterIds: [...new Set([...latest.completedChapterIds, ...remote.completedChapterIds])], version: 2, pending: false });
            }
            setStatus(getReadingProgress(activeUser.username, novel)?.pending ? 'syncing' : 'synced'); setRevision(r => r + 1);
        } catch { if (inputs.current.user?.id === activeUser.id) setStatus(navigator.onLine ? 'error' : 'offline'); }
    }, [api, userId]);

    const refresh = useCallback(async () => {
        const { user: activeUser, novels: available, fetcher: fetch } = inputs.current;
        if (!activeUser) { setStatus('local'); return; }
        if (!available.length) return;
        if (!navigator.onLine) { setStatus('offline'); setInitializedFor(activeUser.id); return; }
        try {
            for (const novel of available) {
                if (getReadingProgress(activeUser.username, novel)?.pending) await syncNovel(novel);
            }
            const response = await fetch(`${api}/reader/progress`);
            if (!response.ok) throw new Error('Sync failed');
            const progress: ReadingProgress[] = await response.json();
            if (inputs.current.user?.id !== activeUser.id) return;
            for (const remote of progress) {
                const novel = available.find(n => n.id === remote.novelId);
                if (!novel) continue;
                const local = getReadingProgress(activeUser.username, novel);
                const chapters = (novel.chapters || []).filter(c => c.status === 'published');
                const chapterIndex = chapters.findIndex(c => c.id === remote.chapterId);
                if (chapterIndex < 0) continue;
                if (!local || (!local.pending && remote.updatedAt >= local.updatedAt)) {
                    storeReadingProgress(activeUser.username, novel, { ...remote, version: 2, chapterIndex,
                        readChaptersList: remote.completedChapterIds.map(id => chapters.findIndex(c => c.id === id)).filter(i => i >= 0), pending: false });
                }
            }
            setStatus(available.some(n => getReadingProgress(activeUser.username, n)?.pending) ? 'error' : 'synced'); setRevision(r => r + 1);
        } catch { if (inputs.current.user?.id === activeUser.id) setStatus(navigator.onLine ? 'error' : 'offline'); }
        finally { if (inputs.current.user?.id === activeUser.id) setInitializedFor(activeUser.id); }
    }, [api, syncNovel]);

    const savePosition = useCallback((novel: Novel, position: Pick<ReadingProgress, 'chapterId' | 'chapterIndex' | 'scrollRatio' | 'paragraphIndex' | 'paragraphOffset'>) => {
        const username = user?.username;
        const existing = getReadingProgress(username, novel);
        const completedChapterIds = existing?.completedChapterIds || [];
        const progress: ReadingProgress = { version: 2, novelId: novel.id, ...position, completedChapterIds,
            readChaptersList: existing?.readChaptersList || [], updatedAt: Date.now(), pending: Boolean(username) };
        try { storeReadingProgress(username, novel, progress); setStatus(username ? (navigator.onLine ? 'syncing' : 'offline') : 'local'); }
        catch { setStatus('error'); }
    }, [user?.username]);

    const markCompleted = useCallback((novel: Novel, chapterId: number) => {
        const username = user?.username;
        const progress = getReadingProgress(username, novel);
        if (!progress) return;
        const completedChapterIds = [...new Set([...progress.completedChapterIds, chapterId])];
        const chapters = (novel.chapters || []).filter(c => c.status === 'published');
        try { storeReadingProgress(username, novel, { ...progress, completedChapterIds,
            readChaptersList: completedChapterIds.map(id => chapters.findIndex(c => c.id === id)) }); }
        catch { setStatus('error'); }
        setRevision(r => r + 1);
    }, [user?.username]);

    // Retry queued positions on reconnect and fetch other-device progress when returning.
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
        const onStorage = (event: StorageEvent) => {
            if (event.key?.startsWith(progressKey(inputs.current.user?.username, 0).replace(/0$/, ''))) setRevision(r => r + 1);
        };
        const onOffline = () => setStatus(inputs.current.user ? 'offline' : 'local');
        window.addEventListener('online', refresh); window.addEventListener('offline', onOffline);
        document.addEventListener('visibilitychange', onVisible); window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('online', refresh); window.removeEventListener('offline', onOffline);
            document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('storage', onStorage);
        };
    }, [refresh]);
    const ready = novels.length > 0;
    useEffect(() => { void refresh(); }, [userId, ready, refresh]);
    return { revision, status, refresh, savePosition, syncNovel, markCompleted, initialized: !user || initializedFor === user.id };
}
