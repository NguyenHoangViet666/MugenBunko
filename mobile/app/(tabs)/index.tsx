import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Novel, ReadingProgress } from '@/types';
import { getNovels } from '@/services/api/novelService';
import { getLatestReadingProgress } from '@/services/storage/readingProgress';
import { resolveCoverUrl } from '@/services/api/client';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import HeaderBar from '@/components/common/HeaderBar';
import NovelSlider from '@/components/novel/NovelSlider';
import QuickResumeCard from '@/components/novel/QuickResumeCard';
import MonochromeIcon from '@/components/common/MonochromeIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GENRES = ['Tất cả', 'Isekai', 'Romance', 'Fantasy', 'Action', 'Slice of Life', 'Mystery'];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('Tất cả');

  const loadData = useCallback(async () => {
    try {
      const [novelList, latestProgress] = await Promise.all([
        getNovels(),
        getLatestReadingProgress(),
      ]);
      setNovels(novelList);
      setReadingProgress(latestProgress);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu Home:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Lọc theo thể loại nếu chọn
  const filteredNovels = selectedGenre === 'Tất cả'
    ? novels
    : novels.filter((n: Novel) => (n.genre || '').toLowerCase().includes(selectedGenre.toLowerCase()) || (n.tags || []).some((t: string) => t.toLowerCase().includes(selectedGenre.toLowerCase())));

  // Sắp xếp các danh mục
  const trendingNovels = [...novels].sort((a, b) => (b.reads || 0) - (a.reads || 0));
  const topRatedNovels = [...novels].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  const oneshotNovels = novels.filter((n) => n.type === 'oneshot');
  const featuredNovel = trendingNovels[0];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar
        title="MUGENBUNKO"
        rightAction={
          <Pressable
            onPress={() => router.push('/(tabs)/library' as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}
          >
            <MonochromeIcon name="bookmark" size={20} color={colors.text} />
          </Pressable>
        }
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Đang tải kho tàng light novel...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
        >
          {/* Thanh Tiếp tục đọc */}
          {readingProgress && <QuickResumeCard progress={readingProgress} />}

          {/* Hero Featured Novel */}
          {featuredNovel && (
            <Pressable
              onPress={() => router.push(`/novel/${featuredNovel.id}` as any)}
              style={({ pressed }) => [
                styles.heroContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Image
                source={{ uri: resolveCoverUrl(featuredNovel.cover) }}
                style={styles.heroCover}
                resizeMode="cover"
              />
              <View style={styles.heroContent}>
                <View style={[styles.featuredBadge, { backgroundColor: colors.tint }]}>
                  <Text style={[styles.featuredBadgeText, { color: colors.background }]}>
                    NỔI BẬT TUẦN
                  </Text>
                </View>

                <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
                  {featuredNovel.title}
                </Text>

                <Text style={[styles.heroSummary, { color: colors.textMuted }]} numberOfLines={2}>
                  {featuredNovel.summary || 'Tác phẩm Light Novel nổi bật nhất tuần tại MugenBunko.'}
                </Text>

                <View style={styles.heroActionRow}>
                  <View style={[styles.readBtn, { backgroundColor: colors.tint }]}>
                    <MonochromeIcon name="book-open" size={14} color={colors.background} />
                    <Text style={[styles.readBtnText, { color: colors.background }]}>Đọc ngay</Text>
                  </View>
                  <View style={styles.heroStats}>
                    <MonochromeIcon name="star" size={13} color={colors.textMuted} />
                    <Text style={[styles.heroStatsText, { color: colors.textMuted }]}>
                      {Number(featuredNovel.rating || 5).toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )}

          {/* Genre Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreScroll}
          >
            {GENRES.map((g) => {
              const active = selectedGenre === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setSelectedGenre(g)}
                  style={[
                    styles.genrePill,
                    {
                      backgroundColor: active ? colors.tint : colors.card,
                      borderColor: active ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.genrePillText,
                      { color: active ? colors.background : colors.text },
                    ]}
                  >
                    {g}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Sliders */}
          <NovelSlider
            title="Bảng Xếp Hạng Đọc Nhiều"
            subtitle="Các bộ truyện được wibu cày cuốc nhiều nhất"
            novels={selectedGenre === 'Tất cả' ? trendingNovels : filteredNovels}
            onSeeAll={() => router.push('/(tabs)/explore' as any)}
          />

          <NovelSlider
            title="Được Đánh Giá Cao"
            subtitle="Điểm số review ấn tượng từ độc giả"
            novels={topRatedNovels}
            onSeeAll={() => router.push('/(tabs)/explore' as any)}
          />

          {oneshotNovels.length > 0 && (
            <NovelSlider
              title="Truyện Ngắn Oneshot"
              subtitle="Trọn vẹn cảm xúc trong một chương duy nhất"
              novels={oneshotNovels}
            />
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  heroContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroCover: {
    width: 90,
    height: 126,
    borderRadius: 8,
  },
  heroContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },
  heroSummary: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  readBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroStatsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  genreScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  genrePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  genrePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
