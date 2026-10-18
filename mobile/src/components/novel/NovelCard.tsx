import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Novel } from '@/types';
import { resolveCoverUrl } from '@/services/api/client';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import MonochromeIcon from '@/components/common/MonochromeIcon';

interface NovelCardProps {
  novel: Novel;
  width?: number;
  layout?: 'vertical' | 'horizontal';
}

export const NovelCard: React.FC<NovelCardProps> = ({
  novel,
  width = 138,
  layout = 'vertical',
}) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handlePress = () => {
    router.push(`/novel/${novel.id}` as any);
  };

  const coverUri = resolveCoverUrl(novel.cover);
  const authorName = novel.author_name || novel.author || novel.author_username || 'Vô Danh';
  const ratingValue =
    typeof novel.rating === 'number'
      ? novel.rating.toFixed(1)
      : (Number(novel.rating) || 5.0).toFixed(1);
  const chapterCount = novel.chapters?.length || (novel as any).chapters_count || 0;

  if (layout === 'horizontal') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.horizontalCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.horizontalCoverWrap}>
          <Image
            source={{ uri: coverUri }}
            style={styles.horizontalCover}
            resizeMode="cover"
          />
          <View style={styles.bookSpineOverlay} />
        </View>
        <View style={styles.horizontalInfo}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
              <Text style={[styles.badgeText, { color: colors.badgeText }]}>
                {novel.genre || 'Light Novel'}
              </Text>
            </View>
            {novel.type === 'oneshot' && (
              <View style={[styles.badge, { backgroundColor: colors.accent, marginLeft: 4 }]}>
                <Text style={[styles.badgeText, { color: '#ffffff' }]}>Oneshot</Text>
              </View>
            )}
          </View>

          <Text
            style={[styles.horizontalTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {novel.title}
          </Text>

          <Text
            style={[styles.authorText, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {authorName}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MonochromeIcon name="star-fill" size={12} color="#F59E0B" />
              <Text style={[styles.metaText, { color: colors.text }]}>
                {ratingValue}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MonochromeIcon name="eye" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {(novel.reads || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MonochromeIcon name="book-open" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {chapterCount} ch.
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.verticalCard,
        { width, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={[styles.coverContainer, { borderColor: colors.border }]}>
        <Image
          source={{ uri: coverUri }}
          style={styles.verticalCover}
          resizeMode="cover"
        />
        <View style={styles.bookSpineOverlay} />

        {/* Rating Pill Top Right */}
        <View style={styles.ratingBadgeTop}>
          <MonochromeIcon name="star-fill" size={10} color="#FBBF24" />
          <Text style={styles.ratingBadgeTopText}>{ratingValue}</Text>
        </View>

        {/* Genre Pill Bottom Left */}
        <View style={styles.genreOverlay}>
          <Text style={styles.genreOverlayText} numberOfLines={1}>
            {novel.genre || 'Novel'}
          </Text>
        </View>

        {/* Chapter Count Bottom Right */}
        <View style={styles.chapOverlay}>
          <Text style={styles.chapOverlayText}>{chapterCount} ch.</Text>
        </View>
      </View>

      <Text
        style={[styles.verticalTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {novel.title}
      </Text>

      <Text
        style={[styles.authorText, { color: colors.textMuted }]}
        numberOfLines={1}
      >
        {authorName}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.metaItem}>
          <MonochromeIcon name="eye" size={11} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {(novel.reads || 0).toLocaleString()} đọc
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  verticalCard: {
    marginRight: 14,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 1 / 1.42,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#1a1d24',
    position: 'relative',
  },
  verticalCover: {
    width: '100%',
    height: '100%',
  },
  bookSpineOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0, 0, 0, 0.25)',
  },
  ratingBadgeTop: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(11, 15, 20, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  ratingBadgeTopText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  genreOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(11, 15, 20, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '58%',
  },
  genreOverlayText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chapOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(224, 82, 117, 0.92)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chapOverlayText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  verticalTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17.5,
    marginTop: 8,
    height: 35,
  },
  authorText: {
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  horizontalCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  horizontalCoverWrap: {
    width: 76,
    height: 108,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  horizontalCover: {
    width: '100%',
    height: '100%',
  },
  horizontalInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  horizontalTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default NovelCard;
