import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ReadingProgress } from '@/types';
import { resolveCoverUrl } from '@/services/api/client';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import MonochromeIcon from '@/components/common/MonochromeIcon';

interface QuickResumeCardProps {
  progress: ReadingProgress;
}

export const QuickResumeCard: React.FC<QuickResumeCardProps> = ({ progress }) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handleResume = () => {
    router.push(`/reader/${progress.novelId}/${progress.lastChapterIndex}` as any);
  };

  const coverUri = resolveCoverUrl(progress.novelCover);

  return (
    <Pressable
      onPress={handleResume}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />

      <View style={styles.content}>
        <View style={styles.labelRow}>
          <MonochromeIcon name="bookmark" size={12} color={colors.tint} />
          <Text style={[styles.labelText, { color: colors.tint }]}>
            TIẾP TỤC ĐỌC
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {progress.novelTitle}
        </Text>

        <Text style={[styles.chapterTitle, { color: colors.textMuted }]} numberOfLines={1}>
          {progress.lastChapterTitle || `Chương ${progress.lastChapterIndex + 1}`}
        </Text>

        {/* Thanh tiến độ */}
        <View style={[styles.progressBarBg, { backgroundColor: colors.badgeBg }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.tint,
                width: `${Math.max(5, Math.min(100, progress.progressPercentage || 10))}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={[styles.playButton, { backgroundColor: colors.tint }]}>
        <MonochromeIcon name="play" size={14} color={colors.background} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cover: {
    width: 48,
    height: 68,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  chapterTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QuickResumeCard;
