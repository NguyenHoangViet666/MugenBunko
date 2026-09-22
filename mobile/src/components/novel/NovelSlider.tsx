import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Novel } from '@/types';
import NovelCard from './NovelCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import MonochromeIcon from '@/components/common/MonochromeIcon';

interface NovelSliderProps {
  title: string;
  subtitle?: string;
  novels: Novel[];
  onSeeAll?: () => void;
  cardWidth?: number;
}

export const NovelSlider: React.FC<NovelSliderProps> = ({
  title,
  subtitle,
  novels,
  onSeeAll,
  cardWidth = 130,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  if (!novels || novels.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {onSeeAll && (
          <Pressable
            onPress={onSeeAll}
            style={({ pressed }) => [
              styles.seeAllButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.seeAllText, { color: colors.textMuted }]}>
              Xem tất cả
            </Text>
            <MonochromeIcon name="chevron-right" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={novels}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <NovelCard novel={item} width={cardWidth} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
  },
});

export default NovelSlider;
