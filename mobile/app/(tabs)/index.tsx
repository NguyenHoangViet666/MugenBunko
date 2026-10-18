import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Novel, ReadingProgress } from '@/types';
import { getNovels } from '@/services/api/novelService';
import { getLatestReadingProgress, syncReadingProgress } from '@/services/storage/readingProgress';
import { resolveCoverUrl } from '@/services/api/client';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import HeaderBar from '@/components/common/HeaderBar';
import NovelSlider from '@/components/novel/NovelSlider';
import QuickResumeCard from '@/components/novel/QuickResumeCard';
import MonochromeIcon from '@/components/common/MonochromeIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BENTO_CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

const GENRES = ['Tất cả', 'Isekai', 'Romance', 'Fantasy', 'Action', 'Slice of Life', 'Mystery', 'Sci-Fi'];

type DiscoveryTab = 'trending' | 'newest' | 'topRated' | 'completed';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('Tất cả');
  const [heroIndex, setHeroIndex] = useState<number>(0);
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('trending');
  const [showAllBento, setShowAllBento] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setLoadError('');
      const novelList = await getNovels();
      setNovels(novelList);
      try {
        await syncReadingProgress(novelList);
      } catch {
        setLoadError('Đang dùng tiến độ trên máy. Chạm để đồng bộ lại.');
      }
      setReadingProgress(await getLatestReadingProgress());
    } catch (err) {
      setLoadError('Không thể tải dữ liệu. Kiểm tra kết nối rồi thử lại.');
      console.warn('Lỗi tải dữ liệu Home:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  // Sắp xếp các danh mục cơ bản
  const trendingNovels = useMemo(
    () => [...novels].sort((a, b) => (b.reads || 0) - (a.reads || 0)),
    [novels]
  );

  const topRatedNovels = useMemo(
    () => [...novels].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)),
    [novels]
  );

  const heroList = useMemo(() => trendingNovels.slice(0, 5), [trendingNovels]);

  // Auto-advance Hero Carousel mỗi 6.5 giây
  useEffect(() => {
    if (heroList.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroList.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroList.length, heroIndex]);

  const currentHero = heroList[heroIndex] || heroList[0];

  // Thống kê Bento Platform Pulse
  const platformStats = useMemo(() => {
    const totalChapters = novels.reduce(
      (acc, n) => acc + (n.chapters ? n.chapters.filter((c) => c.status !== 'draft').length : 0),
      0
    );
    const totalReads = novels.reduce((acc, n) => acc + (n.reads || 0), 0);
    return {
      totalNovels: novels.length,
      totalChapters,
      totalReads,
    };
  }, [novels]);

  // Lọc theo thể loại nếu chọn
  const filteredNovels = useMemo(() => {
    if (selectedGenre === 'Tất cả') return novels;
    const q = selectedGenre.toLowerCase();
    return novels.filter(
      (n: Novel) =>
        (n.genre || '').toLowerCase().includes(q) ||
        (n.tags || []).some((t: string) => t.toLowerCase().includes(q))
    );
  }, [novels, selectedGenre]);

  // Danh sách cho Interactive Discovery Bento Grid (2 cột cân đối)
  const discoveryBentoNovels = useMemo(() => {
    const base = [...filteredNovels];
    let sorted = base;
    if (discoveryTab === 'trending') {
      sorted = base.sort((a, b) => (b.reads || 0) - (a.reads || 0));
    } else if (discoveryTab === 'newest') {
      sorted = base.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (discoveryTab === 'topRated') {
      sorted = base.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (discoveryTab === 'completed') {
      const comp = base.filter((n) => n.status === 'completed');
      sorted = comp.length > 0 ? comp : base;
    }
    return sorted.slice(0, showAllBento ? 8 : 4);
  }, [filteredNovels, discoveryTab, showAllBento]);

  // Chương mới cập nhật (Live Chapter Feed)
  const latestChapters = useMemo(() => {
    const list: {
      novel: Novel;
      chapterTitle: string;
      chapterIndex: number;
      chapterNumber: number;
    }[] = [];

    novels.forEach((n) => {
      if (n.chapters && n.chapters.length > 0) {
        const published = n.chapters.filter((c) => c.status !== 'draft');
        if (published.length > 0) {
          const lastChap = published[published.length - 1];
          const realIdx = n.chapters.findIndex((c) => c.id === lastChap.id);
          list.push({
            novel: n,
            chapterTitle: lastChap.title || `Chương ${published.length}`,
            chapterIndex: realIdx >= 0 ? realIdx : published.length - 1,
            chapterNumber: published.length,
          });
        }
      }
    });

    return list.slice(0, 4);
  }, [novels]);

  const oneshotNovels = useMemo(
    () => filteredNovels.filter((n) => n.type === 'oneshot'),
    [filteredNovels]
  );

  const handleHeroPrimaryAction = (novel: Novel) => {
    if (readingProgress && readingProgress.novelId === novel.id) {
      router.push(`/reader/${novel.id}/${readingProgress.lastChapterIndex}` as any);
      return;
    }
    if (novel.chapters && novel.chapters.length > 0) {
      router.push(`/reader/${novel.id}/0` as any);
      return;
    }
    router.push(`/novel/${novel.id}` as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {loadError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadData()}
          style={[styles.errorBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>
            {loadError} Chạm để tải lại.
          </Text>
        </Pressable>
      ) : null}

      <HeaderBar
        title="MUGENBUNKO"
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              onPress={() => router.push('/(tabs)/explore' as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}
            >
              <MonochromeIcon name="search" size={19} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/library' as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}
            >
              <MonochromeIcon name="bookmark" size={19} color={colors.text} />
            </Pressable>
          </View>
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
          {/* 1. HERO BANNER 3.0 CAROUSEL + THUMBNAIL STRIP */}
          {currentHero && (
            <View
              style={[
                styles.heroCardOuter,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => router.push(`/novel/${currentHero.id}` as any)}
                style={({ pressed }) => [
                  styles.heroMainRow,
                  { opacity: pressed ? 0.94 : 1 },
                ]}
              >
                <View style={styles.heroCoverWrapper}>
                  <Image
                    source={{ uri: resolveCoverUrl(currentHero.cover) }}
                    style={styles.heroCover}
                    resizeMode="cover"
                  />
                  <View style={[styles.heroRankOverlay, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.heroRankOverlayText, { color: colors.background }]}>
                      #{heroIndex + 1}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroBadgeRow}>
                    <View style={[styles.featuredBadge, { backgroundColor: colors.tint }]}>
                      <Text style={[styles.featuredBadgeText, { color: colors.background }]}>
                        {heroIndex === 0 ? 'TOP 1 THỊNH HÀNH' : `TOP #${heroIndex + 1} ĐỀ CỬ`}
                      </Text>
                    </View>
                    {currentHero.genre ? (
                      <View
                        style={[
                          styles.heroGenreBadge,
                          { backgroundColor: colors.badgeBg, borderColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.heroGenreBadgeText, { color: colors.textMuted }]}>
                          {currentHero.genre}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
                    {currentHero.title}
                  </Text>

                  <Text style={[styles.heroSummary, { color: colors.textMuted }]} numberOfLines={2}>
                    {currentHero.summary ||
                      'Tác phẩm Light Novel đặc sắc được biên tập viên MugenBunko đề cử.'}
                  </Text>

                  <View style={styles.heroMetaRow}>
                    <View style={styles.heroStatsItem}>
                      <MonochromeIcon name="star" size={12} color={colors.text} />
                      <Text style={[styles.heroStatsText, { color: colors.text }]}>
                        {Number(currentHero.rating || 5).toFixed(1)}
                      </Text>
                    </View>
                    <Text style={{ color: colors.border, fontSize: 11 }}>•</Text>
                    <View style={styles.heroStatsItem}>
                      <MonochromeIcon name="eye" size={12} color={colors.textMuted} />
                      <Text style={[styles.heroStatsText, { color: colors.textMuted }]}>
                        {(currentHero.reads || 0).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={{ color: colors.border, fontSize: 11 }}>•</Text>
                    <Text style={[styles.heroStatsText, { color: colors.textMuted }]}>
                      {currentHero.chapters ? currentHero.chapters.length : 0} ch.
                    </Text>
                  </View>

                  <View style={styles.heroActionRow}>
                    <Pressable
                      onPress={() => handleHeroPrimaryAction(currentHero)}
                      style={({ pressed }) => [
                        styles.readBtn,
                        {
                          backgroundColor: colors.tint,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <MonochromeIcon name="book-open" size={13} color={colors.background} />
                      <Text style={[styles.readBtnText, { color: colors.background }]}>
                        {readingProgress?.novelId === currentHero.id
                          ? `Đọc tiếp C.${readingProgress.lastChapterIndex + 1}`
                          : 'Đọc ngay'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => router.push(`/novel/${currentHero.id}` as any)}
                      style={({ pressed }) => [
                        styles.detailBtn,
                        {
                          backgroundColor: colors.badgeBg,
                          borderColor: colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.detailBtnText, { color: colors.text }]}>Chi tiết</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>

              {/* Thanh Thumbnail Strip Queue chọn nhanh Top 5 */}
              {heroList.length > 1 && (
                <View style={[styles.heroThumbStrip, { borderTopColor: colors.border }]}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.heroThumbScrollContent}
                  >
                    {heroList.map((item, idx) => {
                      const isActive = idx === heroIndex;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setHeroIndex(idx)}
                          style={[
                            styles.heroThumbPill,
                            {
                              backgroundColor: isActive ? colors.tint : colors.badgeBg,
                              borderColor: isActive ? colors.tint : colors.border,
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: resolveCoverUrl(item.cover) }}
                            style={styles.heroThumbAvatar}
                            resizeMode="cover"
                          />
                          <Text
                            style={[
                              styles.heroThumbText,
                              { color: isActive ? colors.background : colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            #{idx + 1} {item.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* 2. THANH TIẾP TỤC ĐỌC */}
          {readingProgress && <QuickResumeCard progress={readingProgress} />}

          {/* 3. BENTO PLATFORM PULSE STATS */}
          <View style={styles.pulseRow}>
            <View
              style={[
                styles.pulseBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.pulseNum, { color: colors.text }]}>
                {platformStats.totalNovels}
              </Text>
              <Text style={[styles.pulseLabel, { color: colors.textMuted }]}>Tác phẩm</Text>
            </View>
            <View
              style={[
                styles.pulseBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.pulseNum, { color: colors.text }]}>
                {platformStats.totalChapters}
              </Text>
              <Text style={[styles.pulseLabel, { color: colors.textMuted }]}>Chương truyện</Text>
            </View>
            <View
              style={[
                styles.pulseBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.pulseNum, { color: colors.text }]}>
                {platformStats.totalReads.toLocaleString()}
              </Text>
              <Text style={[styles.pulseLabel, { color: colors.textMuted }]}>Lượt đọc</Text>
            </View>
          </View>

          {/* 4. GENRE FILTER PILLS */}
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

          {/* 5. INTERACTIVE DISCOVERY BENTO GRID (2 CỘT CÂN ĐỐI) */}
          <View style={styles.bentoSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Khám Phá Nhanh
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  {selectedGenre === 'Tất cả'
                    ? 'Tuyển tập chọn lọc theo xu hướng đọc'
                    : `Đang lọc theo thể loại: ${selectedGenre}`}
                </Text>
              </View>
              {selectedGenre !== 'Tất cả' && (
                <Pressable
                  onPress={() => setSelectedGenre('Tất cả')}
                  style={[
                    styles.clearFilterBtn,
                    { backgroundColor: colors.badgeBg, borderColor: colors.border },
                  ]}
                >
                  <MonochromeIcon name="x" size={11} color={colors.text} />
                  <Text style={[styles.clearFilterText, { color: colors.text }]}>Xóa lọc</Text>
                </Pressable>
              )}
            </View>

            {/* Discovery Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.discoveryTabsRow}
            >
              {(
                [
                  { id: 'trending', label: 'Thịnh Hành' },
                  { id: 'newest', label: 'Mới Nhất' },
                  { id: 'topRated', label: 'Đánh Giá Cao' },
                  { id: 'completed', label: 'Hoàn Thành' },
                ] as { id: DiscoveryTab; label: string }[]
              ).map((tab) => {
                const isActive = discoveryTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setDiscoveryTab(tab.id)}
                    style={[
                      styles.discoveryTabBtn,
                      {
                        backgroundColor: isActive ? colors.text : colors.card,
                        borderColor: isActive ? colors.text : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.discoveryTabText,
                        { color: isActive ? colors.background : colors.textMuted },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 2-Column Balanced Bento Grid */}
            <View style={styles.bentoGrid}>
              {discoveryBentoNovels.map((novel) => {
                const chapCount = novel.chapters ? novel.chapters.length : 0;
                return (
                  <Pressable
                    key={novel.id}
                    onPress={() => router.push(`/novel/${novel.id}` as any)}
                    style={({ pressed }) => [
                      styles.bentoNovelCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={styles.bentoCoverWrap}>
                      <Image
                        source={{ uri: resolveCoverUrl(novel.cover) }}
                        style={styles.bentoCoverImg}
                        resizeMode="cover"
                      />
                      <View style={styles.bentoStatusBadge}>
                        <Text style={styles.bentoStatusText}>
                          {novel.status === 'completed' ? 'FULL' : 'ONGOING'}
                        </Text>
                      </View>
                      <View style={styles.bentoChapBadge}>
                        <Text style={styles.bentoChapBadgeText}>
                          {chapCount > 0 ? `${chapCount} ch.` : 'Mới'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bentoCardBody}>
                      <Text style={[styles.bentoCardTitle, { color: colors.text }]} numberOfLines={2}>
                        {novel.title}
                      </Text>
                      <Text
                        style={[styles.bentoCardAuthor, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {novel.author || novel.author_name || 'Tác giả ẩn danh'}
                      </Text>

                      <View style={[styles.bentoCardMeta, { borderTopColor: colors.border }]}>
                        <View style={styles.bentoMetaStat}>
                          <MonochromeIcon name="star" size={11} color={colors.text} />
                          <Text style={[styles.bentoMetaText, { color: colors.text }]}>
                            {Number(novel.rating || 5).toFixed(1)}
                          </Text>
                        </View>
                        <View style={styles.bentoMetaStat}>
                          <MonochromeIcon name="eye" size={11} color={colors.textMuted} />
                          <Text style={[styles.bentoMetaText, { color: colors.textMuted }]}>
                            {(novel.reads || 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {filteredNovels.length > 4 && (
              <Pressable
                onPress={() => setShowAllBento((prev) => !prev)}
                style={[
                  styles.bentoExpandBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.bentoExpandBtnText, { color: colors.text }]}>
                  {showAllBento ? 'Thu gọn danh sách' : 'Xem thêm 4 tác phẩm'}
                </Text>
                <MonochromeIcon
                  name="chevron-right"
                  size={14}
                  color={colors.text}
                />
              </Pressable>
            )}
          </View>

          {/* 6. CHƯƠNG MỚI CẬP NHẬT (LIVE CHAPTER FEED) */}
          {latestChapters.length > 0 && (
            <View
              style={[
                styles.liveFeedCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.liveFeedHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.liveFeedTitleRow}>
                  <View style={styles.liveGreenDot} />
                  <Text style={[styles.liveFeedTitle, { color: colors.text }]}>
                    Chương Mới Cập Nhật
                  </Text>
                </View>
                <Pressable onPress={() => router.push('/(tabs)/explore' as any)}>
                  <Text style={[styles.liveFeedMore, { color: colors.textMuted }]}>Tất cả</Text>
                </Pressable>
              </View>

              <View style={styles.liveFeedList}>
                {latestChapters.map((item, idx) => (
                  <Pressable
                    key={`${item.novel.id}-${idx}`}
                    onPress={() =>
                      router.push(`/reader/${item.novel.id}/${item.chapterIndex}` as any)
                    }
                    style={({ pressed }) => [
                      styles.liveFeedItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: resolveCoverUrl(item.novel.cover) }}
                      style={styles.liveFeedCover}
                      resizeMode="cover"
                    />
                    <View style={styles.liveFeedInfo}>
                      <Text
                        style={[styles.liveFeedNovelTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.novel.title}
                      </Text>
                      <Text
                        style={[styles.liveFeedChapTitle, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {item.chapterTitle}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.liveFeedChapPill,
                        { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text style={[styles.liveFeedChapPillText, { color: colors.background }]}>
                        Ch.{item.chapterNumber}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* 7. HORIZONTAL SLIDERS */}
          <NovelSlider
            title="Bảng Xếp Hạng Đọc Nhiều"
            subtitle="Các bộ truyện được cày cuốc nhiều nhất"
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

          <View style={{ height: 28 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
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
  heroCardOuter: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroMainRow: {
    flexDirection: 'row',
    padding: 14,
  },
  heroCoverWrapper: {
    position: 'relative',
    width: 98,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
  },
  heroCover: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  heroRankOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heroRankOverlayText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  featuredBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroGenreBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  heroGenreBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },
  heroSummary: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  heroStatsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  heroStatsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 6,
  },
  readBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  detailBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  heroThumbStrip: {
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  heroThumbScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  heroThumbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 150,
  },
  heroThumbAvatar: {
    width: 18,
    height: 24,
    borderRadius: 3,
  },
  heroThumbText: {
    fontSize: 10.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  pulseRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    gap: 8,
  },
  pulseBox: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  pulseLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
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
  bentoSection: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  discoveryTabsRow: {
    gap: 8,
    paddingBottom: 12,
  },
  discoveryTabBtn: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  discoveryTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  bentoNovelCard: {
    width: BENTO_CARD_WIDTH,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bentoCoverWrap: {
    width: '100%',
    height: BENTO_CARD_WIDTH * 1.38,
    position: 'relative',
  },
  bentoCoverImg: {
    width: '100%',
    height: '100%',
  },
  bentoStatusBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 18, 24, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bentoStatusText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  bentoChapBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 18, 24, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bentoChapBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  bentoCardBody: {
    padding: 9,
    flex: 1,
    justifyContent: 'space-between',
  },
  bentoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    height: 34,
  },
  bentoCardAuthor: {
    fontSize: 11,
    marginTop: 3,
    marginBottom: 6,
  },
  bentoCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bentoMetaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bentoMetaText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  bentoExpandBtn: {
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bentoExpandBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  liveFeedCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  liveFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  liveFeedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ecc71',
  },
  liveFeedTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  liveFeedMore: {
    fontSize: 12,
    fontWeight: '600',
  },
  liveFeedList: {
    gap: 8,
  },
  liveFeedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  liveFeedCover: {
    width: 34,
    height: 48,
    borderRadius: 4,
  },
  liveFeedInfo: {
    flex: 1,
  },
  liveFeedNovelTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  liveFeedChapTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  liveFeedChapPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveFeedChapPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
