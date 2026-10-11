import type { Novel } from '../types';

export interface ReadingProgress {
    version: 2;
    novelId: number;
    chapterId: number;
    chapterIndex: number;
    scrollRatio: number;
    paragraphIndex: number;
    paragraphOffset: number;
    completedChapterIds: number[];
    readChaptersList: number[];
    updatedAt: number;
    pending?: boolean;
}

export const progressKey = (username: string | undefined, novelId: number) => `mugen_readprogress_${username || 'guest'}_${novelId}`;

export function getReadingProgress(username: string | undefined, novel: Novel): ReadingProgress | null {
    try {
        const raw = localStorage.getItem(progressKey(username, novel.id));
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (!saved || typeof saved !== 'object') return null;
        const chapters = (novel.chapters || []).filter(c => c.status === 'published');
        if (!chapters.length) return null;
        const found = chapters.findIndex(c => c.id === saved.chapterId);
        const chapterIndex = found >= 0 ? found : Math.max(0, Math.min(chapters.length - 1, Number(saved.chapterIndex) || 0));
        // The old list recorded opened chapters; it is not proof of completion.
        const completedChapterIds: number[] = saved.version === 2 && Array.isArray(saved.completedChapterIds)
            ? [...new Set<number>(saved.completedChapterIds.filter((id: number) => chapters.some(c => c.id === id)))] : [];
        const sameChapter = !saved.chapterId || found >= 0;
        return { version: 2, novelId: novel.id, chapterId: chapters[chapterIndex].id, chapterIndex,
            scrollRatio: sameChapter ? Math.max(0, Math.min(1, Number(saved.scrollRatio) || 0)) : 0,
            paragraphIndex: sameChapter ? Math.max(0, Math.floor(Number(saved.paragraphIndex) || 0)) : 0,
            paragraphOffset: sameChapter ? Math.max(0, Math.min(1, Number(saved.paragraphOffset) || 0)) : 0,
            completedChapterIds, readChaptersList: completedChapterIds.map((id: number) => chapters.findIndex(c => c.id === id)),
            updatedAt: Number(saved.updatedAt) || 0, pending: Boolean(saved.pending) };
    } catch { return null; }
}

export function storeReadingProgress(username: string | undefined, novel: Novel, progress: ReadingProgress) {
    localStorage.setItem(progressKey(username, novel.id), JSON.stringify(progress));
    const chapter = (novel.chapters || []).find(c => c.id === progress.chapterId);
    const historyKey = `mugen_reading_history_${username || 'guest'}`;
    let history: Array<{ novelId: number; updatedAt?: number }> = [];
    try { const saved = JSON.parse(localStorage.getItem(historyKey) || '[]'); history = Array.isArray(saved) ? saved.filter(item => item && Number.isInteger(item.novelId)) : []; } catch { /* Replace malformed history. */ }
    const item = { novelId: novel.id, novelTitle: novel.title, novelCover: novel.cover,
        chapterId: progress.chapterId, chapterIndex: progress.chapterIndex,
        chapterTitle: chapter?.title || '', updatedAt: progress.updatedAt };
    const next = [item, ...history.filter(h => h.novelId !== novel.id)].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 20);
    localStorage.setItem(historyKey, JSON.stringify(next));
}

export function getShelfStatus(novel: Novel, progress: ReadingProgress | null): 'unread' | 'reading' | 'caught-up' | 'completed' {
    if (!progress) return 'unread';
    const published = (novel.chapters || []).filter(c => c.status === 'published');
    const allRead = published.length > 0 && published.every(c => progress.completedChapterIds.includes(c.id));
    if (allRead) return novel.status === 'completed' ? 'completed' : 'caught-up';
    return 'reading';
}
