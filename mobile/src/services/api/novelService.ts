import apiClient from './client';
import { Novel, Chapter } from '@/types';

export const getNovels = async (): Promise<Novel[]> => {
  try {
    const response = await apiClient.get<Novel[]>('/novels');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching novels:', error);
    return [];
  }
};

export const getNovelById = async (id: number | string): Promise<Novel | null> => {
  try {
    const novels = await getNovels();
    const found = novels.find((n) => String(n.id) === String(id));
    return found || null;
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
