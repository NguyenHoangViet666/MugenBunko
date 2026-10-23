import type { Novel } from '../types';
import { getReadingProgress, getShelfStatus } from './readingProgress.ts';

export function getLastReading(novels: Novel[], username?: string) {
    let latest: { novel: Novel; chapter: NonNullable<Novel['chapters']>[number]; chapterIndex: number; updatedAt: number } | null = null;
    for (const novel of novels) {
        if (novel.status === 'suspended') continue;
        const progress = getReadingProgress(username, novel);
        if (!progress || !Number.isFinite(progress.updatedAt) || getShelfStatus(novel, progress) === 'completed') continue;
        const chapter = (novel.chapters || []).filter(c => c.status === 'published')[progress.chapterIndex];
        if (chapter && (!latest || progress.updatedAt > latest.updatedAt)) {
            latest = { novel, chapter, chapterIndex: progress.chapterIndex, updatedAt: progress.updatedAt };
        }
    }
    return latest;
}
