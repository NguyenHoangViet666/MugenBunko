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
  width = 135,
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
  const ratingValue = typeof novel.rating === 'number' ? novel.rating.toFixed(1) : (Number(novel.rating) || 5.0).toFixed(1);

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
        <Image
          source={{ uri: coverUri }}
          style={styles.horizontalCover}
          resizeMode="cover"
        />
        <View style={styles.horizontalInfo}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
              <Text style={[styles.badgeText, { color: colors.badgeText }]}>
                {novel.genre || 'Light Novel'}
              </Text>
            </View>
            {novel.type === 'oneshot' && (
              <View style={[styles.badge, { backgroundColor: colors.badgeBg, marginLeft: 4 }]}>
                <Text style={[styles.badgeText, { color: colors.badgeText }]}>Oneshot</Text>
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
              <MonochromeIcon name="star" size={13} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {ratingValue}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MonochromeIcon name="eye" size={13} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {novel.reads || 0}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MonochromeIcon name="bookmark" size={13} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {novel.bookmarksCount || novel.bookmarks_count || 0}
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
        { width, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.coverContainer, { borderColor: colors.border }]}>
        <Image
          source={{ uri: coverUri }}
          style={styles.verticalCover}
          resizeMode="cover"
        />
        <View style={[styles.genreOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          <Text style={styles.genreOverlayText} numberOfLines={1}>
            {novel.genre || 'Novel'}
          </Text>
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
          <MonochromeIcon name="star" size={12} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {ratingValue}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MonochromeIcon name="book-open" size={12} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {novel.chapters?.length || (novel as any).chapters_count || 0} ch
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
    aspectRatio: 3 / 4.3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#e8e8e8',
    position: 'relative',
  },
  verticalCover: {
    width: '100%',
    height: '100%',
  },
  genreOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genreOverlayText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  verticalTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 8,
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
    fontWeight: '500',
  },
  horizontalCard: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  horizontalCover: {
    width: 76,
    height: 106,
    borderRadius: 6,
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
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default NovelCard;
