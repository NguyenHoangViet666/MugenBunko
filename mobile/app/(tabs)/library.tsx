import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Novel, ReadingProgress } from '@/types';
import { getNovels } from '@/services/api/novelService';
import { getAllReadingProgress, getLocalBookmarks } from '@/services/storage/readingProgress';
import { syncReadingProgress } from '@/services/storage/readingProgress';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import NovelCard from '@/components/novel/NovelCard';
import QuickResumeCard from '@/components/novel/QuickResumeCard';
import { Button } from '@/components/common/Screen';
import MonochromeIcon from '@/components/common/MonochromeIcon';



type LibraryTab = 'reading' | 'bookmarks' | 'history';

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = Math.max(2, Math.min(4, Math.floor(width / 190)));
  const CARD_WIDTH = (width - 32 - 12 * (columns - 1)) / columns;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<LibraryTab>('reading');
  const [readingList, setReadingList] = useState<ReadingProgress[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<number[]>([]);
  const [allNovels, setAllNovels] = useState<Novel[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      setLoadError('');
      const [novels, bookmarks] = await Promise.all([
        getNovels(),
        getLocalBookmarks(),
      ]);
      setAllNovels(novels);
      try { await syncReadingProgress(novels); } catch { setLoadError('Đang dùng tiến độ trên máy. Chạm để đồng bộ lại.'); }
      setReadingList(await getAllReadingProgress());
      setBookmarkIds(bookmarks);
    } catch (err) {
      setLoadError('Không thể tải dữ liệu. Kiểm tra kết nối rồi thử lại.');
      console.warn('Lỗi tải Library:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  const visibleProgress = activeTab === 'reading' ? readingList.filter(p => p.progressPercentage < 100) : readingList;
  const bookmarkedNovels = allNovels.filter((n) => bookmarkIds.includes(n.id));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {loadError ? <Pressable accessibilityRole="button" onPress={() => void loadData()} style={{ padding: 16 }}><Text style={{ color: colors.accent }}>{loadError} Chạm để tải lại.</Text></Pressable> : null}
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>TỦ SÁCH CỦA TÔI</Text>

        {/* Tab Segments */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setActiveTab('reading')}
            style={[
              styles.segmentBtn,
              activeTab === 'reading' && { backgroundColor: colors.tint },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'reading' ? colors.background : colors.textMuted },
              ]}
            >
              Đang đọc ({readingList.filter(p => p.progressPercentage < 100).length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('bookmarks')}
            style={[
              styles.segmentBtn,
              activeTab === 'bookmarks' && { backgroundColor: colors.tint },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'bookmarks' ? colors.background : colors.textMuted },
              ]}
            >
              Yêu thích ({bookmarkedNovels.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('history')}
            style={[
              styles.segmentBtn,
              activeTab === 'history' && { backgroundColor: colors.tint },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'history' ? colors.background : colors.textMuted },
              ]}
            >
              Lịch sử
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ padding: 12 }}><Button title="Quản lý bộ sưu tập & chia sẻ" onPress={() => router.push('/collections' as any)} /></View>
      {/* Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : activeTab === 'reading' || activeTab === 'history' ? (
        visibleProgress.length === 0 ? (
          <View style={styles.centerContainer}>
            <MonochromeIcon name="book-open" size={42} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'reading' ? 'Chưa có truyện đang đọc' : 'Chưa có lịch sử đọc'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Khám phá ngay kho truyện phong phú tại MugenBunko.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/explore' as any)}
              style={[styles.exploreBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.exploreBtnText, { color: colors.background }]}>
                Khám phá ngay
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            key="reading-list"
            data={visibleProgress}
            keyExtractor={(item) => String(item.novelId)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => <QuickResumeCard progress={item} />}
          />
        )
      ) : bookmarkedNovels.length === 0 ? (
        <View style={styles.centerContainer}>
          <MonochromeIcon name="bookmark" size={42} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Chưa có truyện yêu thích
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Bấm nút biểu tượng Bookmark ở trang chi tiết để lưu truyện vào tủ sách.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/explore' as any)}
            style={[styles.exploreBtn, { backgroundColor: colors.tint }]}
          >
            <Text style={[styles.exploreBtnText, { color: colors.background }]}>
              Tìm truyện hay
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          key={`bookmarks-${columns}`}
          data={bookmarkedNovels}
          numColumns={columns}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => <NovelCard novel={item} width={CARD_WIDTH} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  exploreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exploreBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 8,
  },
  gridContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
