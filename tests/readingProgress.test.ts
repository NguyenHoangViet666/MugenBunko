import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getReadingProgress, getShelfStatus, storeReadingProgress } from '../src/utils/readingProgress.ts';
import type { Novel } from '../src/types';
import { getLastReading } from '../src/utils/lastReading.ts';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
const novel = { id: 1, title: 'Test', status: 'ongoing', chapters: [{ id: 10, status: 'published' }, { id: 20, status: 'published' }], cover: 'cover' } as Novel;
describe('Reading progress migration and shelf semantics', () => {
    beforeEach(() => values.clear());
    it('migrates the last opened chapter without falsely marking it completed', () => {
        values.set('mugen_readprogress_reader_1', JSON.stringify({ chapterIndex: 1, readChaptersList: [0, 1] }));
        const progress = getReadingProgress('reader', novel)!;
        assert.equal(progress.chapterId, 20); assert.deepEqual(progress.completedChapterIds, []);
        assert.equal(getShelfStatus({ ...novel, status: 'completed' }, progress), 'reading');
    });
    it('uses chapter IDs when chapters are inserted or reordered', () => {
        values.set('mugen_readprogress_reader_1', JSON.stringify({ version: 2, chapterId: 20, chapterIndex: 1, completedChapterIds: [10, 20], scrollRatio: .4, paragraphIndex: 8, paragraphOffset: .2 }));
        const reordered = { ...novel, chapters: [novel.chapters![1], novel.chapters![0]] };
        const progress = getReadingProgress('reader', reordered)!;
        assert.equal(progress.chapterIndex, 0); assert.equal(progress.paragraphIndex, 8);
        assert.equal(getShelfStatus(reordered, progress), 'caught-up');
        assert.equal(getShelfStatus({ ...reordered, status: 'completed' }, progress), 'completed');
    });
    it('does not reuse a deleted chapter anchor or count deleted chapters as finished', () => {
        values.set('mugen_readprogress_reader_1', JSON.stringify({ version: 2, chapterId: 99, chapterIndex: 99, completedChapterIds: [99], scrollRatio: .9, paragraphIndex: 50 }));
        const progress = getReadingProgress('reader', novel)!;
        assert.equal(progress.chapterIndex, 1); assert.equal(progress.scrollRatio, 0); assert.equal(progress.paragraphIndex, 0);
        assert.deepEqual(progress.completedChapterIds, []);
    });
    it('isolates guest and account positions and maintains recent history', () => {
        const progress = { version: 2 as const, novelId: 1, chapterId: 10, chapterIndex: 0, scrollRatio: .5, paragraphIndex: 3, paragraphOffset: .1, completedChapterIds: [], readChaptersList: [], updatedAt: 100 };
        storeReadingProgress(undefined, novel, progress);
        assert.equal(getReadingProgress(undefined, novel)?.paragraphIndex, 3);
        assert.equal(getReadingProgress('reader', novel), null);
        const history = JSON.parse(values.get('mugen_reading_history_guest')!); assert.equal(history[0].chapterId, 10);
    });
    it('recovers from malformed caches without corrupting progress counts', () => {
        values.set('mugen_readprogress_reader_1', 'null');
        assert.equal(getReadingProgress('reader', novel), null);
        values.set('mugen_reading_history_reader', '{}');
        const progress = { version: 2 as const, novelId: 1, chapterId: 10, chapterIndex: 0, scrollRatio: .5, paragraphIndex: 0, paragraphOffset: 0, completedChapterIds: [10, 10, 99], readChaptersList: [], updatedAt: 100 };
        storeReadingProgress('reader', novel, progress);
        assert.deepEqual(getReadingProgress('reader', novel)?.completedChapterIds, [10]);
        assert.equal(JSON.parse(values.get('mugen_reading_history_reader')!).length, 1);
    });
});

describe('Header reading continuation', () => {
    beforeEach(() => values.clear());
    it('selects the newest readable story and follows chapter IDs after reordering', () => {
        values.set('mugen_readprogress_reader_1', JSON.stringify({ chapterId: 20, chapterIndex: 99, updatedAt: 100 }));
        const newer = { ...novel, id: 2, title: 'Newer story' };
        values.set('mugen_readprogress_reader_2', JSON.stringify({ chapterId: 20, chapterIndex: 0, updatedAt: 200 }));
        const continuation = getLastReading([novel, newer], 'reader');
        assert.equal(continuation?.novel.id, 2); assert.equal(continuation?.chapterIndex, 1);
        assert.equal(getLastReading([{ ...novel, chapters: novel.chapters!.slice().reverse() }], 'reader')?.chapterIndex, 0);
    });
    it('skips unavailable, completed and malformed history without leaking account history to guests', () => {
        values.set('mugen_readprogress_reader_1', JSON.stringify({ version: 2, chapterId: 20, completedChapterIds: [10, 20], updatedAt: 100 }));
        assert.equal(getLastReading([novel]), null);
        assert.equal(getLastReading([{ ...novel, status: 'suspended' }], 'reader'), null);
        assert.equal(getLastReading([{ ...novel, status: 'completed' }], 'reader'), null);
        assert.equal(getLastReading([{ ...novel, chapters: [] }], 'reader'), null);
        values.set('mugen_readprogress_reader_1', JSON.stringify({ chapterId: 10, updatedAt: 'Infinity' }));
        assert.equal(getLastReading([novel], 'reader'), null);
        values.set('mugen_readprogress_reader_1', 'invalid');
        assert.equal(getLastReading([novel], 'reader'), null);
    });
});
