import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/services/api/client';
import { Novel, ReadingProgress } from '@/types';

type Saved = ReadingProgress & { pending?: boolean; completedChapterIds?: number[] };
type Remote = { novelId: number; chapterId: number; scrollRatio: number; paragraphIndex?: number; paragraphOffset?: number; updatedAt: number; completedChapterIds: number[] };
async function account() {
  const values = await AsyncStorage.multiGet(['mugen_session', 'mugen_mobile_token']);
  const user = values[0][1] ? JSON.parse(values[0][1]) : null;
  if (!user?.id || !values[1][1]) throw new Error('Yêu cầu đăng nhập.');
  return { id: Number(user.id), config: { headers: { Authorization: `Bearer ${values[1][1]}` } } };
}
const key = (id: number) => `mugen_progress_${id}`;
const bookmarkKey = (id: number) => `mugen_bookmarks_${id}`;
const read = async (id: number): Promise<Saved[]> => {
  const raw = await AsyncStorage.getItem(key(id));
  try { const list = raw ? JSON.parse(raw) : []; return Array.isArray(list) ? list : []; } catch { return []; }
};
let localQueue: Promise<unknown> = Promise.resolve();
function update(id: number, change: (list: Saved[]) => Saved[]) {
  const work = localQueue.then(async () => {
    const list = change(await read(id)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    await AsyncStorage.setItem(key(id), JSON.stringify(list));
  });
  localQueue = work.catch(() => {}); return work;
}
const syncing = new Map<number, Promise<void>>();
async function upload(a: Awaited<ReturnType<typeof account>>) {
  if (syncing.has(a.id)) return syncing.get(a.id)!;
  const work = (async () => {
    while (true) {
      const p = (await read(a.id)).find(item => item.pending && item.lastChapterId);
      if (!p) break;
      let data: Remote;
      try {
        ({ data } = await api.put<Remote>(`/reader/progress/${p.novelId}`, {
          chapterId: p.lastChapterId, scrollRatio: Number(p.scrollRatio) || 0,
          paragraphIndex: Number(p.paragraphIndex) || 0, paragraphOffset: Number(p.paragraphOffset) || 0, updatedAt: Date.parse(p.updatedAt),
        }, a.config));
      } catch (error) {
        if ((error as { response?: { status?: number } }).response?.status !== 404) throw error;
        // Removed or suspended chapters must not block syncing the remaining library.
        await update(a.id, list => list.filter(latest => latest.novelId !== p.novelId || latest.updatedAt !== p.updatedAt));
        continue;
      }
      await update(a.id, list => list.map(latest => latest.novelId === p.novelId && latest.updatedAt === p.updatedAt
        ? { ...latest, pending: false, completedChapterIds: data.completedChapterIds || [] } : latest));
    }
  })().finally(() => syncing.delete(a.id));
  syncing.set(a.id, work); return work;
}
export async function saveReadingProgress(progress: ReadingProgress, ownerId?: number): Promise<void> {
  const a = await account();
  if (ownerId !== undefined && ownerId !== a.id) return;
  await update(a.id, list => [{ ...list.find(p => p.novelId === progress.novelId), ...progress, pending: true }, ...list.filter(p => p.novelId !== progress.novelId)]);
  void upload(a).catch(() => {});
}
export async function syncReadingProgress(novels: Novel[]) {
  const a = await account(); await upload(a);
  const { data } = await api.get<Remote[]>('/reader/progress', a.config);
  await update(a.id, list => {
    for (const remote of data) {
      const novel = novels.find(n => n.id === remote.novelId);
      const chapters = novel?.chapters?.filter(c => c.status === 'published') || [];
      const index = chapters.findIndex(c => c.id === remote.chapterId);
      if (!novel || index < 0) continue;
      const existing = list.find(p => p.novelId === remote.novelId);
      if (existing && (existing.pending || Date.parse(existing.updatedAt) > remote.updatedAt)) continue;
      const item: Saved = { novelId: novel.id, novelTitle: novel.title, novelCover: novel.cover, authorName: novel.author || novel.author_name,
        lastChapterIndex: index, lastChapterId: remote.chapterId, lastChapterTitle: chapters[index].title,
        totalChapters: chapters.length, scrollRatio: remote.scrollRatio, paragraphIndex: remote.paragraphIndex || 0, paragraphOffset: remote.paragraphOffset || 0,
        progressPercentage: Math.floor((remote.completedChapterIds.length / chapters.length) * 100),
        updatedAt: new Date(remote.updatedAt).toISOString(), pending: false, completedChapterIds: remote.completedChapterIds };
      list = [item, ...list.filter(p => p.novelId !== novel.id)];
    }
    return list;
  });
}
export async function getAllReadingProgress(): Promise<ReadingProgress[]> { return read((await account()).id); }
export async function getLatestReadingProgress() { return (await getAllReadingProgress())[0] || null; }
export async function getNovelProgress(novelId: number) { return (await getAllReadingProgress()).find(p => p.novelId === novelId) || null; }
export async function clearLocalReadingProgress() { const a = await account(); await localQueue; await AsyncStorage.removeItem(key(a.id)); }
export async function getLocalBookmarks(): Promise<number[]> {
  const a = await account();
  try {
    const { data } = await api.get(`/auth/refresh/${a.id}`, a.config);
    const ids: number[] = data.user.bookmarks || [];
    await AsyncStorage.setItem(bookmarkKey(a.id), JSON.stringify(ids)); return ids;
  } catch (error) {
    const cached = await AsyncStorage.getItem(bookmarkKey(a.id));
    if (cached) return JSON.parse(cached); throw error;
  }
}
export async function toggleLocalBookmark(novelId: number) {
  const a = await account();
  const { data } = await api.post(`/novels/${novelId}/bookmark`, {}, a.config);
  const ids: number[] = data.user.bookmarks || [];
  await AsyncStorage.setItem(bookmarkKey(a.id), JSON.stringify(ids)); return ids.includes(novelId);
}
