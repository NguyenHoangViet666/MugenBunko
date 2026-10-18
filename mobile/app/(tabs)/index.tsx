import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  Animated,
  Easing,
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
const HERO_SLIDE_DURATION = 6500;

const GENRES = [
  'Tất cả',
  'Isekai',
  'Romance',
  'Fantasy',
  'Action',
  'Slice of Life',
  'Mystery',
  'Sci-Fi',
];

type DiscoveryTab = 'trending' | 'newest' | 'topRated' | 'completed';
type RankingTab = 'reads' | 'rating' | 'bookmarks';

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
  const [rankingTab, setRankingTab] = useState<RankingTab>('reads');
  const [showAllBento, setShowAllBento] = useState<boolean>(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

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

  // Auto-advance Hero Carousel + Animated Progress Bar
  useEffect(() => {
    if (heroList.length <= 1) return;
    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: HERO_SLIDE_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) {
        setHeroIndex((prev) => (prev + 1) % heroList.length);
      }
    });
    return () => anim.stop();
  }, [heroList.length, heroIndex, progressAnim]);

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

  // Bảng Phong Thần Top 5
  const top5Leaderboard = useMemo(() => {
    const copy = [...novels];
    if (rankingTab === 'reads') {
      copy.sort((a, b) => (b.reads || 0) - (a.reads || 0));
    } else if (rankingTab === 'rating') {
      copy.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else {
      copy.sort(
        (a, b) =>
          (b.bookmarksCount || b.bookmarks_count || 0) -
          (a.bookmarksCount || a.bookmarks_count || 0)
      );
    }
    return copy.slice(0, 5);
  }, [novels, rankingTab]);

  // Tuyển Tập Chủ Đề Bento (Curated Collections)
  const themedCollections = useMemo(() => {
    const isekaiFantasy = novels.filter((n) =>
      /isekai|fantasy|chuyển sinh|phép thuật|adventure/i.test(
        `${n.genre || ''} ${(n.tags || []).join(' ')}`
      )
    );
    const romanceSlice = novels.filter((n) =>
      /romance|slice of life|học đường|đời thường|tình cảm|comedy/i.test(
        `${n.genre || ''} ${(n.tags || []).join(' ')}`
      )
    );
    const mysteryAction = novels.filter((n) =>
      /mystery|action|sci-fi|psychological|thriller|bí ẩn|hành động/i.test(
        `${n.genre || ''} ${(n.tags || []).join(' ')}`
      )
    );

    return [
      {
        id: 'isekai',
        badge: 'DỊ GIỚI & MA THUẬT',
        title: 'Siêu Phẩm Chuyển Sinh',
        desc: 'Những hành trình dị giới kỳ vĩ được săn đón nhất tuần qua.',
        filterKey: 'Isekai',
        items: (isekaiFantasy.length >= 3 ? isekaiFantasy : trendingNovels).slice(0, 3),
        totalCount: Math.max(isekaiFantasy.length, 3),
      },
      {
        id: 'romance',
        badge: 'THANH XUÂN & NGỌT NGÀO',
        title: 'Chữa Lành Tâm Hồn',
        desc: 'Tình cảm nhẹ nhàng, sâu lắng dưới tán hoa anh đào.',
        filterKey: 'Romance',
        items: (romanceSlice.length >= 3 ? romanceSlice : topRatedNovels).slice(0, 3),
        totalCount: Math.max(romanceSlice.length, 3),
      },
      {
        id: 'mystery',
        badge: 'KỊCH TÍNH & BÍ ẨN',
        title: 'Đấu Trí Đỉnh Cao',
        desc: 'Cốt truyện gay cấn với những cú twist không thể đoán trước.',
        filterKey: 'Mystery',
        items: (mysteryAction.length >= 3 ? mysteryAction : trendingNovels.slice().reverse()).slice(
          0,
          3
        ),
        totalCount: Math.max(mysteryAction.length, 3),
      },
    ];
  }, [novels, trendingNovels, topRatedNovels]);

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

  const handleRandomGacha = () => {
    if (novels.length === 0) return;
    const randomNovel = novels[Math.floor(Math.random() * novels.length)];
    router.push(`/novel/${randomNovel.id}` as any);
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
        showSearch={false}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              onPress={handleRandomGacha}
              style={({ pressed }) => [
                styles.headerGachaPill,
                {
                  backgroundColor: colors.badgeBg,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MonochromeIcon name="shuffle" size={13} color={colors.accent} />
              <Text style={[styles.headerGachaText, { color: colors.text }]}>Gacha</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/library' as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}
            >
              <MonochromeIcon name="bookmark" size={20} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Đang mở kho tàng Light Novel...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          {/* 0. QUICK SEARCH & DISCOVERY BAR */}
          <View style={styles.searchRowWrap}>
            <Pressable
              onPress={() => router.push('/(tabs)/explore' as any)}
              style={({ pressed }) => [
                styles.quickSearchBar,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <MonochromeIcon name="search" size={16} color={colors.textMuted} />
              <Text style={[styles.quickSearchPlaceholder, { color: colors.textMuted }]}>
                Tìm tên truyện, tác giả, thể loại...
              </Text>
              <View style={[styles.searchTagHint, { backgroundColor: colors.badgeBg }]}>
                <Text style={[styles.searchTagHintText, { color: colors.textSecondary }]}>
                  {novels.length} bộ
                </Text>
              </View>
            </Pressable>
          </View>

          {/* 1. CINEMATIC DARK-GLASS HERO BANNER 4.0 */}
          {currentHero && (
            <View style={styles.heroCardOuter}>
              {/* Blurred Cover Background */}
              <Image
                source={{ uri: resolveCoverUrl(currentHero.cover) }}
                style={styles.heroBlurredBg}
                blurRadius={26}
                resizeMode="cover"
              />
              <View style={styles.heroDarkOverlay} />
              <Text style={styles.heroKanjiWatermark}>無限文庫</Text>

              <Pressable
                onPress={() => router.push(`/novel/${currentHero.id}` as any)}
                style={({ pressed }) => [
                  styles.heroMainRow,
                  { opacity: pressed ? 0.94 : 1 },
                ]}
              >
                {/* 3D Book Cover Showcase */}
                <View style={styles.heroCoverWrapper}>
                  <Image
                    source={{ uri: resolveCoverUrl(currentHero.cover) }}
                    style={styles.heroCover}
                    resizeMode="cover"
                  />
                  <View style={styles.heroBookSpine} />
                  <View style={styles.heroRankOverlay}>
                    <MonochromeIcon name="flame" size={10} color="#ffffff" />
                    <Text style={styles.heroRankOverlayText}>#{heroIndex + 1}</Text>
                  </View>
                </View>

                {/* Editorial Details */}
                <View style={styles.heroContent}>
                  <View style={styles.heroBadgeRow}>
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>
                        {heroIndex === 0 ? 'TOP 1 THỊNH HÀNH' : `TOP #${heroIndex + 1} ĐỀ CỬ`}
                      </Text>
                    </View>
                    {currentHero.genre ? (
                      <Pressable
                        onPress={() => setSelectedGenre(currentHero.genre)}
                        style={styles.heroGenreBadge}
                      >
                        <Text style={styles.heroGenreBadgeText}>{currentHero.genre}</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {currentHero.title}
                  </Text>

                  <Text style={styles.heroSummary} numberOfLines={2}>
                    {currentHero.summary ||
                      'Tác phẩm Light Novel đặc sắc được biên tập viên MugenBunko đề cử trong tuần.'}
                  </Text>

                  <View style={styles.heroMetaRow}>
                    <View style={styles.heroStatsItem}>
                      <MonochromeIcon name="star-fill" size={12} color="#FBBF24" />
                      <Text style={styles.heroRatingValue}>
                        {Number(currentHero.rating || 5).toFixed(1)}
                      </Text>
                    </View>
                    <Text style={styles.heroMetaDot}>•</Text>
                    <View style={styles.heroStatsItem}>
                      <MonochromeIcon name="eye" size={12} color="rgba(255,255,255,0.75)" />
                      <Text style={styles.heroStatsText}>
                        {(currentHero.reads || 0).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.heroMetaDot}>•</Text>
                    <View style={styles.heroStatsItem}>
                      <MonochromeIcon name="book-open" size={12} color="rgba(255,255,255,0.75)" />
                      <Text style={styles.heroStatsText}>
                        {currentHero.chapters ? currentHero.chapters.length : 0} ch.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.heroActionRow}>
                    <Pressable
                      onPress={() => handleHeroPrimaryAction(currentHero)}
                      style={({ pressed }) => [
                        styles.readBtn,
                        { opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <MonochromeIcon name="play" size={11} color="#ffffff" />
                      <Text style={styles.readBtnText}>
                        {readingProgress?.novelId === currentHero.id
                          ? `Đọc tiếp C.${readingProgress.lastChapterIndex + 1}`
                          : 'Đọc ngay'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => router.push(`/novel/${currentHero.id}` as any)}
                      style={({ pressed }) => [
                        styles.detailBtn,
                        { opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={styles.detailBtnText}>Chi tiết</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>

              {/* Interactive Thumbnail Queue Dock */}
              {heroList.length > 1 && (
                <View style={styles.heroThumbStrip}>
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
                            isActive && styles.heroThumbPillActive,
                          ]}
                        >
                          <Image
                            source={{ uri: resolveCoverUrl(item.cover) }}
                            style={styles.heroThumbAvatar}
                            resizeMode="cover"
                          />
                          <View style={styles.heroThumbMeta}>
                            <Text style={styles.heroThumbRank}>TOP #{idx + 1}</Text>
                            <Text style={styles.heroThumbText} numberOfLines={1}>
                              {item.title}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Animated Auto-Advance Progress Bar */}
              <View style={styles.heroProgressTrack}>
                <Animated.View
                  style={[
                    styles.heroProgressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* 2. THANH TIẾP TỤC ĐỌC */}
          {readingProgress && <QuickResumeCard progress={readingProgress} />}

          {/* 3. BENTO PLATFORM PULSE STATS */}
          <View style={styles.pulseRow}>
            <Pressable
              onPress={() => router.push('/(tabs)/explore' as any)}
              style={[
                styles.pulseBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.pulseIconWrap, { backgroundColor: colors.badgeBg }]}>
                <MonochromeIcon name="book-open" size={14} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.pulseNum, { color: colors.text }]}>
                  {platformStats.totalNovels}
                </Text>
                <Text style={[styles.pulseLabel, { color: colors.textMuted }]}>Tác phẩm</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/explore' as any)}
              style={[
                styles.pulseBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.pulseIconWrap, { backgroundColor: colors.badgeBg }]}>
                <MonochromeIcon name="layers" size={14} color={colors.text} />
              </View>
              <View>
                <Text style={[styles.pulseNum, { color: colors.text }]}>
                  {platformStats.totalChapters}
                </Text>
                <Text style={[styles.pulseLabel, { color: colors.textMuted }]}>Chương</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleRandomGacha}
              style={[
                styles.pulseBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.pulseIconWrap,
                  { backgroundColor: 'rgba(224, 82, 117, 0.14)' },
                ]}
              >
                <MonochromeIcon name="sparkles" size={14} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.pulseNum, { color: colors.accent }]}>Khám phá</Text>
                <Text style={[styles.pulseLabel, { color: colors.textMuted }]}>Ngẫu nhiên</Text>
              </View>
            </Pressable>
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
                      backgroundColor: active ? colors.accent : colors.card,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.genrePillText,
                      { color: active ? '#ffffff' : colors.text },
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
              <View style={styles.sectionTitleWrap}>
                <View style={[styles.sectionAccentBar, { backgroundColor: colors.accent }]} />
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
                  { id: 'trending', label: 'Thịnh Hành', icon: 'flame' },
                  { id: 'newest', label: 'Mới Nhất', icon: 'zap' },
                  { id: 'topRated', label: 'Đánh Giá Cao', icon: 'star' },
                  { id: 'completed', label: 'Hoàn Thành', icon: 'award' },
                ] as { id: DiscoveryTab; label: string; icon: string }[]
              ).map((tab) => {
                const isActive = discoveryTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setDiscoveryTab(tab.id)}
                    style={[
                      styles.discoveryTabBtn,
                      {
                        backgroundColor: isActive ? colors.tint : colors.card,
                        borderColor: isActive ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <MonochromeIcon
                      name={tab.icon}
                      size={12}
                      color={isActive ? colors.background : colors.textMuted}
                    />
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
                      <View style={styles.bentoSpineHighlight} />
                      <View style={styles.bentoStatusBadge}>
                        <Text style={styles.bentoStatusText}>
                          {novel.status === 'completed' ? 'FULL' : 'ONGOING'}
                        </Text>
                      </View>
                      <View style={styles.bentoRatingBadge}>
                        <MonochromeIcon name="star-fill" size={9} color="#FBBF24" />
                        <Text style={styles.bentoRatingBadgeText}>
                          {Number(novel.rating || 5).toFixed(1)}
                        </Text>
                      </View>
                      {novel.genre ? (
                        <View style={styles.bentoGenreOverlay}>
                          <Text style={styles.bentoGenreOverlayText} numberOfLines={1}>
                            {novel.genre}
                          </Text>
                        </View>
                      ) : null}
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
                          <MonochromeIcon name="eye" size={11} color={colors.textMuted} />
                          <Text style={[styles.bentoMetaText, { color: colors.textMuted }]}>
                            {(novel.reads || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={[styles.bentoQuickReadPill, { backgroundColor: colors.badgeBg }]}>
                          <Text style={[styles.bentoQuickReadText, { color: colors.text }]}>
                            Đọc →
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
                <MonochromeIcon name="chevron-right" size={14} color={colors.text} />
              </Pressable>
            )}
          </View>

          {/* 6. TUYỂN TẬP CHỦ ĐỀ BENTO (CURATED COLLECTIONS CAROUSEL) */}
          <View style={styles.curatedSection}>
            <View style={[styles.sectionHeaderRow, { paddingHorizontal: 16 }]}>
              <View style={styles.sectionTitleWrap}>
                <View style={[styles.sectionAccentBar, { backgroundColor: colors.accent }]} />
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Tuyển Tập Chủ Đề
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                    Bộ sưu tập biên tập theo tâm trạng đọc
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.curatedScrollContent}
            >
              {themedCollections.map((col) => (
                <Pressable
                  key={col.id}
                  onPress={() => setSelectedGenre(col.filterKey)}
                  style={({ pressed }) => [
                    styles.curatedCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={[styles.curatedTopBar, { backgroundColor: colors.accent }]} />
                  <View style={styles.curatedHeaderRow}>
                    <View style={[styles.curatedBadge, { backgroundColor: colors.badgeBg }]}>
                      <Text style={[styles.curatedBadgeText, { color: colors.textSecondary }]}>
                        {col.badge}
                      </Text>
                    </View>
                    <Text style={[styles.curatedCount, { color: colors.textMuted }]}>
                      {col.totalCount} bộ
                    </Text>
                  </View>

                  <Text style={[styles.curatedTitle, { color: colors.text }]} numberOfLines={1}>
                    {col.title}
                  </Text>
                  <Text style={[styles.curatedDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {col.desc}
                  </Text>

                  <View style={[styles.curatedFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.curatedCoverStack}>
                      {col.items.map((item, idx) => (
                        <Image
                          key={item.id}
                          source={{ uri: resolveCoverUrl(item.cover) }}
                          style={[
                            styles.curatedStackImg,
                            {
                              borderColor: colors.card,
                              marginLeft: idx === 0 ? 0 : -10,
                              zIndex: 3 - idx,
                            },
                          ]}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                    <View style={styles.curatedActionRow}>
                      <Text style={[styles.curatedActionText, { color: colors.accent }]}>
                        Lọc ngay
                      </Text>
                      <MonochromeIcon name="chevron-right" size={13} color={colors.accent} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 7. BẢNG PHONG THẦN TOP 5 (PODIUM & LEADERBOARD BENTO) */}
          <View
            style={[
              styles.leaderboardCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.leaderboardHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.sectionTitleWrap}>
                <MonochromeIcon name="award" size={18} color={colors.accent} />
                <Text style={[styles.leaderboardTitle, { color: colors.text }]}>
                  Bảng Phong Thần Top 5
                </Text>
              </View>

              <View style={[styles.leaderboardTabs, { backgroundColor: colors.badgeBg }]}>
                {(
                  [
                    { id: 'reads', label: 'Đọc' },
                    { id: 'rating', label: 'Điểm' },
                    { id: 'bookmarks', label: 'Lưu' },
                  ] as { id: RankingTab; label: string }[]
                ).map((t) => {
                  const active = rankingTab === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setRankingTab(t.id)}
                      style={[
                        styles.leaderboardTabBtn,
                        active && { backgroundColor: colors.card },
                      ]}
                    >
                      <Text
                        style={[
                          styles.leaderboardTabText,
                          { color: active ? colors.text : colors.textMuted },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.leaderboardList}>
              {top5Leaderboard.map((novel, idx) => {
                const rankColors = ['#F59E0B', '#94A3B8', '#D97706'];
                const badgeBg = idx < 3 ? rankColors[idx] : colors.badgeBg;
                const badgeColor = idx < 3 ? '#ffffff' : colors.textMuted;

                return (
                  <Pressable
                    key={novel.id}
                    onPress={() => router.push(`/novel/${novel.id}` as any)}
                    style={({ pressed }) => [
                      styles.leaderboardItem,
                      idx === 0 && {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderWidth: 1,
                      },
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View style={[styles.rankBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.rankBadgeText, { color: badgeColor }]}>{idx + 1}</Text>
                    </View>

                    <Image
                      source={{ uri: resolveCoverUrl(novel.cover) }}
                      style={[
                        styles.leaderboardCover,
                        idx === 0 && { width: 42, height: 58 },
                      ]}
                      resizeMode="cover"
                    />

                    <View style={styles.leaderboardInfo}>
                      <Text
                        style={[
                          styles.leaderboardNovelTitle,
                          { color: colors.text },
                          idx === 0 && { fontSize: 14 },
                        ]}
                        numberOfLines={1}
                      >
                        {novel.title}
                      </Text>
                      <Text
                        style={[styles.leaderboardNovelSub, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {novel.genre || 'Light Novel'} •{' '}
                        {novel.author || novel.author_name || 'Vô Danh'}
                      </Text>
                    </View>

                    <View style={[styles.leaderboardScorePill, { backgroundColor: colors.badgeBg }]}>
                      {rankingTab === 'reads' && (
                        <>
                          <MonochromeIcon name="eye" size={11} color={colors.text} />
                          <Text style={[styles.leaderboardScoreText, { color: colors.text }]}>
                            {(novel.reads || 0).toLocaleString()}
                          </Text>
                        </>
                      )}
                      {rankingTab === 'rating' && (
                        <>
                          <MonochromeIcon name="star-fill" size={11} color="#F59E0B" />
                          <Text style={[styles.leaderboardScoreText, { color: colors.text }]}>
                            {Number(novel.rating || 5).toFixed(1)}
                          </Text>
                        </>
                      )}
                      {rankingTab === 'bookmarks' && (
                        <>
                          <MonochromeIcon name="bookmark" size={11} color={colors.accent} />
                          <Text style={[styles.leaderboardScoreText, { color: colors.text }]}>
                            {novel.bookmarksCount || novel.bookmarks_count || 0}
                          </Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 8. CHƯƠNG MỚI CẬP NHẬT (LIVE CHAPTER FEED) */}
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
                  <Text style={[styles.liveFeedMore, { color: colors.accent }]}>Tất cả →</Text>
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
                    <View style={[styles.liveFeedChapPill, { backgroundColor: colors.accent }]}>
                      <Text style={styles.liveFeedChapPillText}>Ch.{item.chapterNumber}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* 9. TRÍCH DẪN VĂN HỌC (LITERARY QUOTE SPOTLIGHT) */}
          {currentHero && (
            <Pressable
              onPress={() => router.push(`/novel/${currentHero.id}` as any)}
              style={[
                styles.quoteCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.quoteWatermark, { color: colors.text }]}>物語</Text>
              <View style={styles.quoteBadgeRow}>
                <MonochromeIcon name="feather" size={12} color={colors.accent} />
                <Text style={[styles.quoteBadgeLabel, { color: colors.accent }]}>
                  TRÍCH DẪN HÔM NAY
                </Text>
              </View>
              <Text style={[styles.quoteBody, { color: colors.text }]} numberOfLines={3}>
                “{currentHero.summary ||
                  'Mỗi trang sách mở ra là một thế giới nơi những giấc mơ chưa từng kể được viết tiếp dưới ánh trăng.'}”
              </Text>
              <Text style={[styles.quoteFooter, { color: colors.textMuted }]} numberOfLines={1}>
                — Trích từ 《{currentHero.title}》
              </Text>
            </Pressable>
          )}

          {/* 10. HORIZONTAL SLIDERS */}
          <NovelSlider
            title="Thịnh Hành Trong Tuần"
            subtitle="Các bộ truyện được độc giả cày cuốc nhiều nhất"
            novels={selectedGenre === 'Tất cả' ? trendingNovels : filteredNovels}
            onSeeAll={() => router.push('/(tabs)/explore' as any)}
          />

          <NovelSlider
            title="Được Đánh Giá Cao"
            subtitle="Điểm số review ấn tượng từ cộng đồng"
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

          <View style={{ height: 32 }} />
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
  headerGachaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerGachaText: {
    fontSize: 11.5,
    fontWeight: '700',
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
  searchRowWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  quickSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  quickSearchPlaceholder: {
    flex: 1,
    fontSize: 12.5,
  },
  searchTagHint: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  searchTagHintText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  /* Hero 4.0 Dark-Glass Showcase */
  heroCardOuter: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#0B0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  heroBlurredBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.42,
    transform: [{ scale: 1.15 }],
  },
  heroDarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 15, 20, 0.72)',
  },
  heroKanjiWatermark: {
    position: 'absolute',
    right: 12,
    bottom: 52,
    fontSize: 38,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.04)',
    letterSpacing: 4,
  },
  heroMainRow: {
    flexDirection: 'row',
    padding: 15,
    zIndex: 2,
  },
  heroCoverWrapper: {
    position: 'relative',
    width: 104,
    height: 148,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: '#1a1a1a',
  },
  heroCover: {
    width: '100%',
    height: '100%',
  },
  heroBookSpine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0, 0, 0, 0.35)',
  },
  heroRankOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#E05275',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  heroRankOverlayText: {
    color: '#ffffff',
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
    backgroundColor: '#E05275',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featuredBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroGenreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroGenreBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 5,
  },
  heroSummary: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  heroStatsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  heroRatingValue: {
    color: '#FBBF24',
    fontSize: 11.5,
    fontWeight: '700',
  },
  heroStatsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  heroMetaDot: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
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
    backgroundColor: '#E05275',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
  },
  readBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 8,
  },
  detailBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '600',
  },
  heroThumbStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    paddingVertical: 8,
    zIndex: 2,
  },
  heroThumbScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  heroThumbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    width: 132,
  },
  heroThumbPillActive: {
    backgroundColor: 'rgba(224, 82, 117, 0.24)',
    borderColor: '#E05275',
  },
  heroThumbAvatar: {
    width: 22,
    height: 30,
    borderRadius: 3,
  },
  heroThumbMeta: {
    flex: 1,
  },
  heroThumbRank: {
    color: '#E05275',
    fontSize: 8.5,
    fontWeight: '800',
  },
  heroThumbText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '600',
  },
  heroProgressTrack: {
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#E05275',
  },
  /* Platform Pulse Row */
  pulseRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    gap: 8,
  },
  pulseBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pulseIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  pulseLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  /* Genre Pills */
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
    fontWeight: '700',
  },
  /* Discovery Bento Grid */
  bentoSection: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccentBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 18,
    borderWidth: 1,
  },
  discoveryTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  bentoNovelCard: {
    width: BENTO_CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bentoCoverWrap: {
    width: '100%',
    height: BENTO_CARD_WIDTH * 1.38,
    position: 'relative',
    backgroundColor: '#1a1d24',
  },
  bentoCoverImg: {
    width: '100%',
    height: '100%',
  },
  bentoSpineHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  bentoStatusBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(11, 15, 20, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bentoStatusText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800',
  },
  bentoRatingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(11, 15, 20, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bentoRatingBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  bentoGenreOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(11, 15, 20, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '58%',
  },
  bentoGenreOverlayText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  bentoChapBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(224, 82, 117, 0.92)',
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
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  bentoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17.5,
    height: 35,
  },
  bentoCardAuthor: {
    fontSize: 11,
    marginTop: 2,
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
  bentoQuickReadPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  bentoQuickReadText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bentoExpandBtn: {
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bentoExpandBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  /* Curated Collections Carousel */
  curatedSection: {
    marginBottom: 16,
  },
  curatedScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  curatedCard: {
    width: 245,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  curatedTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  curatedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  curatedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  curatedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  curatedCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  curatedTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  curatedDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  curatedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  curatedCoverStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  curatedStackImg: {
    width: 26,
    height: 36,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  curatedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  curatedActionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  /* Top 5 Leaderboard Bento */
  leaderboardCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leaderboardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  leaderboardTabs: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
    gap: 2,
  },
  leaderboardTabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaderboardTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  leaderboardList: {
    gap: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    borderRadius: 10,
    gap: 10,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  leaderboardCover: {
    width: 34,
    height: 48,
    borderRadius: 5,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardNovelTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  leaderboardNovelSub: {
    fontSize: 11,
    marginTop: 2,
  },
  leaderboardScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  leaderboardScoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  /* Live Chapter Feed */
  liveFeedCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
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
    fontWeight: '800',
  },
  liveFeedMore: {
    fontSize: 12,
    fontWeight: '700',
  },
  liveFeedList: {
    gap: 8,
  },
  liveFeedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  liveFeedCover: {
    width: 36,
    height: 50,
    borderRadius: 5,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveFeedChapPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  /* Literary Quote Spotlight */
  quoteCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteWatermark: {
    position: 'absolute',
    right: 12,
    top: 4,
    fontSize: 48,
    fontWeight: '900',
    opacity: 0.04,
  },
  quoteBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  quoteBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quoteBody: {
    fontSize: 12.5,
    fontStyle: 'italic',
    lineHeight: 19,
    marginBottom: 8,
  },
  quoteFooter: {
    fontSize: 11,
    fontWeight: '600',
  },
});
