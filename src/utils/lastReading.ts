import type { Novel } from '../types';
import { getReadingProgress, getShelfStatus } from './readingProgress.ts';

export function getLastReading(novels: Novel[], username?: string) {
    let latest: { novel: Novel; chapter: Pick<NonNullable<Novel['chapters']>[number], 'id' | 'title'>; chapterIndex: number; updatedAt: number } | null = null;
    for (const novel of novels) {
        if (novel.status === 'suspended') continue;
        const progress = getReadingProgress(username, novel);
        if (!progress || !Number.isFinite(progress.updatedAt) || getShelfStatus(novel, progress) === 'completed') continue;
        const published = (novel.chapters || []).filter(c => c.status === 'published');
        const chapter = novel.detailsLoaded === false
            ? published.find(item => item.id === progress.chapterId) || { id: progress.chapterId, title: `Chương ${progress.chapterIndex + 1}` }
            : published[progress.chapterIndex];
        if (chapter && (!latest || progress.updatedAt > latest.updatedAt)) {
            latest = { novel, chapter, chapterIndex: progress.chapterIndex, updatedAt: progress.updatedAt };
        }
    }
    return latest;
}
