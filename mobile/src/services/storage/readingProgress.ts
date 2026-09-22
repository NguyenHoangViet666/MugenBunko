import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingProgress } from '@/types';

const STORAGE_KEY_PROGRESS = 'mugen_reading_progress_list';
const STORAGE_KEY_BOOKMARKS = 'mugen_bookmarks_list';

export const saveReadingProgress = async (progress: ReadingProgress): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PROGRESS);
    let list: ReadingProgress[] = raw ? JSON.parse(raw) : [];
    // Loại bỏ mục cũ của cùng novel nếu có
    list = list.filter((item) => item.novelId !== progress.novelId);
    // Đưa lên đầu danh sách
    list.unshift(progress);
    // Giữ tối đa 30 truyện gần nhất
    if (list.length > 30) list = list.slice(0, 30);
    await AsyncStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(list));
  } catch (err) {
    console.warn('Lỗi lưu tiến độ đọc:', err);
  }
};

export const getLatestReadingProgress = async (): Promise<ReadingProgress | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return null;
    const list: ReadingProgress[] = JSON.parse(raw);
    return list.length > 0 ? list[0] : null;
  } catch (err) {
    console.warn('Lỗi đọc tiến độ gần nhất:', err);
    return null;
  }
};

export const getAllReadingProgress = async (): Promise<ReadingProgress[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PROGRESS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Lỗi lấy danh sách tiến độ đọc:', err);
    return [];
  }
};

export const getNovelProgress = async (novelId: number): Promise<ReadingProgress | null> => {
  try {
    const list = await getAllReadingProgress();
    return list.find((item) => item.novelId === novelId) || null;
  } catch (err) {
    return null;
  }
};

// Quản lý Bookmark offline/local
export const getLocalBookmarks = async (): Promise<number[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_BOOKMARKS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
};

export const toggleLocalBookmark = async (novelId: number): Promise<boolean> => {
  try {
    const bookmarks = await getLocalBookmarks();
    const index = bookmarks.indexOf(novelId);
    let isBookmarked = false;
    if (index >= 0) {
      bookmarks.splice(index, 1);
      isBookmarked = false;
    } else {
      bookmarks.unshift(novelId);
      isBookmarked = true;
    }
    await AsyncStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
    return isBookmarked;
  } catch (err) {
    console.warn('Lỗi lưu bookmark:', err);
    return false;
  }
};
