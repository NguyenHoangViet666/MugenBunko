import type { Novel } from '../types';

export function publishedChapterCount(novel: Novel): number {
    return novel.detailsLoaded === false ? Number(novel.chapters_count) || 0 : (novel.chapters || []).filter(chapter => chapter.status === 'published').length;
}
