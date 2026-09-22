import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Novel, Chapter } from '@/types';
import { getNovelById } from '@/services/api/novelService';
import {
  getNovelProgress,
  getLocalBookmarks,
  toggleLocalBookmark,
} from '@/services/storage/readingProgress';
import { resolveCoverUrl } from '@/services/api/client';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import MonochromeIcon from '@/components/common/MonochromeIcon';

type DetailTab = 'about' | 'chapters';

export default function NovelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('about');
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [lastReadIndex, setLastReadIndex] = useState<number>(0);
  const [hasProgress, setHasProgress] = useState<boolean>(false);

  const loadNovelData = useCallback(async () => {
    if (!id) return;
    try {
      const [data, progress, bookmarks] = await Promise.all([
        getNovelById(id),
        getNovelProgress(Number(id)),
        getLocalBookmarks(),
      ]);

      setNovel(data);
      setIsBookmarked(bookmarks.includes(Number(id)));

      if (progress) {
        setLastReadIndex(progress.lastChapterIndex);
        setHasProgress(true);
      }
    } catch (err) {
      console.warn('Lỗi tải chi tiết truyện:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNovelData();
  }, [loadNovelData]);

  const handleBookmarkToggle = async () => {
    if (!novel) return;
    const newState = await toggleLocalBookmark(novel.id);
    setIsBookmarked(newState);
  };

  const handleStartReading = () => {
    if (!novel) return;
    router.push(`/reader/${novel.id}/${lastReadIndex}` as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Đang tải thông tin tác phẩm...
        </Text>
      </SafeAreaView>
    );
  }

  if (!novel) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <MonochromeIcon name="alert-circle" size={40} color={colors.textMuted} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Không tìm thấy tác phẩm</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.tint }]}
        >
          <Text style={[styles.backBtnText, { color: colors.background }]}>Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const coverUri = resolveCoverUrl(novel.cover);
  const authorName = novel.author_name || novel.author || novel.author_username || 'Vô Danh';
  const chapters = novel.chapters || [];

  // Gom nhóm chapters theo volume
  const volumesMap: Record<string, { chapter: Chapter; index: number }[]> = {};
  chapters.forEach((ch: Chapter, idx: number) => {
    const vol = ch.volume_name || ch.volume || 'Tập 1';
    if (!volumesMap[vol]) volumesMap[vol] = [];
    volumesMap[vol].push({ chapter: ch, index: idx });
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MonochromeIcon name="arrow-left" size={24} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={handleBookmarkToggle}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MonochromeIcon
              name="bookmark"
              size={24}
              color={isBookmarked ? colors.accent : colors.text}
            />
          </Pressable>
        </SafeAreaView>

        {/* Novel Hero Card */}
        <View style={styles.heroSection}>
          <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />

          <Text style={[styles.novelTitle, { color: colors.text }]}>{novel.title}</Text>
          <Text style={[styles.authorName, { color: colors.textMuted }]}>
            Tác giả: {authorName}
          </Text>

          {/* Badges / Tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tagBadge, { backgroundColor: colors.badgeBg }]}>
              <Text style={[styles.tagText, { color: colors.badgeText }]}>
                {novel.genre || 'Light Novel'}
              </Text>
            </View>
            <View style={[styles.tagBadge, { backgroundColor: colors.badgeBg }]}>
              <Text style={[styles.tagText, { color: colors.badgeText }]}>
                {novel.type === 'oneshot' ? 'Oneshot' : 'Series'}
              </Text>
            </View>
            {(novel.tags || []).slice(0, 3).map((tag: string, i: number) => (
              <View key={i} style={[styles.tagBadge, { backgroundColor: colors.badgeBg }]}>
                <Text style={[styles.tagText, { color: colors.badgeText }]}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Meta Stats Bar */}
          <View
            style={[
              styles.statsBar,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: colors.text }]}>
                {Number(novel.rating || 5).toFixed(1)} ★
              </Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>Đánh giá</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: colors.text }]}>{novel.reads || 0}</Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>Lượt đọc</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: colors.text }]}>{chapters.length}</Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>Chương</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => setActiveTab('about')}
            style={[
              styles.tabBtn,
              activeTab === 'about' && { borderBottomColor: colors.tint, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'about' ? colors.tint : colors.textMuted, fontWeight: activeTab === 'about' ? '700' : '500' },
              ]}
            >
              Giới thiệu
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('chapters')}
            style={[
              styles.tabBtn,
              activeTab === 'chapters' && { borderBottomColor: colors.tint, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'chapters' ? colors.tint : colors.textMuted, fontWeight: activeTab === 'chapters' ? '700' : '500' },
              ]}
            >
              Mục lục ({chapters.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        {activeTab === 'about' ? (
          <View style={styles.aboutContent}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Tóm Tắt Tác Phẩm</Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {novel.summary || 'Tác phẩm chưa có tóm tắt chi tiết.'}
            </Text>
          </View>
        ) : (
          <View style={styles.chaptersContent}>
            {Object.keys(volumesMap).length === 0 ? (
              <Text style={[styles.emptyChapters, { color: colors.textMuted }]}>
                Chưa có chương nào được phát hành.
              </Text>
            ) : (
              Object.keys(volumesMap).map((volName) => (
                <View key={volName} style={styles.volumeGroup}>
                  <Text style={[styles.volumeHeader, { color: colors.textMuted }]}>
                    {volName.toUpperCase()}
                  </Text>
                  {volumesMap[volName].map(({ chapter, index }) => (
                    <Pressable
                      key={chapter.id || index}
                      onPress={() => router.push(`/reader/${novel.id}/${index}` as any)}
                      style={({ pressed }) => [
                        styles.chapterRow,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View style={styles.chapterLeft}>
                        <Text style={[styles.chapterIdx, { color: colors.textMuted }]}>
                          {index + 1}
                        </Text>
                        <Text style={[styles.chapterTitle, { color: colors.text }]} numberOfLines={1}>
                          {chapter.title}
                        </Text>
                      </View>
                      <MonochromeIcon name="chevron-right" size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      {chapters.length > 0 && (
        <SafeAreaView edges={['bottom']} style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleStartReading}
            style={[styles.mainActionBtn, { backgroundColor: colors.tint }]}
          >
            <MonochromeIcon name="book-open" size={18} color={colors.background} />
            <Text style={[styles.mainActionText, { color: colors.background }]}>
              {hasProgress ? `Đọc tiếp: Chương ${lastReadIndex + 1}` : 'Bắt đầu đọc'}
            </Text>
          </Pressable>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    padding: 6,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  coverImage: {
    width: 140,
    height: 196,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  novelTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 25,
  },
  authorName: {
    fontSize: 13,
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLbl: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabBtnText: {
    fontSize: 14,
  },
  aboutContent: {
    padding: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  chaptersContent: {
    padding: 16,
  },
  emptyChapters: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 13,
  },
  volumeGroup: {
    marginBottom: 16,
  },
  volumeHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  chapterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapterIdx: {
    fontSize: 12,
    fontWeight: '700',
    width: 28,
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    gap: 8,
  },
  mainActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
