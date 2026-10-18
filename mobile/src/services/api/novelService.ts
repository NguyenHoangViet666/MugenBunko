import apiClient from './client';
import type { AxiosResponse } from 'axios';
import { Novel, Chapter } from '@/types';

export const getNovels = async (): Promise<Novel[]> => {
  try {
    const novels: Novel[] = [];
    let page: string | undefined = '1';
    while (page) {
      const response: AxiosResponse<Novel[]> = await apiClient.get<Novel[]>('/novels', { params: { page, limit: 100 } });
      if (!Array.isArray(response.data)) throw new Error('Invalid catalog response');
      novels.push(...response.data);
      page = response.headers['x-next-page'] || undefined;
    }
    return novels;
  } catch (error) {
    console.error('Error fetching novels:', error);
    throw error;
  }
};

export const getNovelById = async (id: number | string): Promise<Novel | null> => {
  try {
    const novels = await getNovels();
    const found = novels.find((n) => String(n.id) === String(id));
    return found ? { ...found, chapters: found.chapters?.filter(c => c.status === 'published') } : null;
  } catch (error) {
    console.error(`Error fetching novel #${id}:`, error);
    return null;
  }
};

export const getChapterContent = async (chapterId: number | string): Promise<Chapter | null> => {
  try {
    const response = await apiClient.get<Chapter>(`/chapters/${chapterId}`);
    return response.data || null;
  } catch (error) {
    console.error(`Error fetching chapter content #${chapterId}:`, error);
    return null;
  }
};
