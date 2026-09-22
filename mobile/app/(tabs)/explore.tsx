import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Novel } from '@/types';
import { getNovels } from '@/services/api/novelService';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import NovelCard from '@/components/novel/NovelCard';
import MonochromeIcon from '@/components/common/MonochromeIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

const GENRES = ['Tất cả', 'Isekai', 'Romance', 'Fantasy', 'Action', 'Slice of Life', 'Mystery'];
const SORTS = [
  { label: 'Đọc nhiều', value: 'reads' },
  { label: 'Đánh giá', value: 'rating' },
  { label: 'Mới nhất', value: 'newest' },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Tất cả');
  const [selectedSort, setSelectedSort] = useState<string>('reads');

  useEffect(() => {
    getNovels().then((list: Novel[]) => {
      setNovels(list);
      setLoading(false);
    });
  }, []);

  const filteredNovels = useMemo(() => {
    let result = [...novels];

    // Filter theo từ khoá
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n: Novel) =>
          n.title.toLowerCase().includes(q) ||
          (n.author || n.author_name || '').toLowerCase().includes(q) ||
          (n.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    }

    // Filter theo thể loại
    if (selectedGenre !== 'Tất cả') {
      result = result.filter(
        (n: Novel) =>
          (n.genre || '').toLowerCase().includes(selectedGenre.toLowerCase()) ||
          (n.tags || []).some((t: string) => t.toLowerCase().includes(selectedGenre.toLowerCase()))
      );
    }

    // Sắp xếp
    if (selectedSort === 'reads') {
      result.sort((a: Novel, b: Novel) => (b.reads || 0) - (a.reads || 0));
    } else if (selectedSort === 'rating') {
      result.sort((a: Novel, b: Novel) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (selectedSort === 'newest') {
      result.sort((a: Novel, b: Novel) => (b.id || 0) - (a.id || 0));
    }

    return result;
  }, [novels, searchQuery, selectedGenre, selectedSort]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search Header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <MonochromeIcon name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm tên truyện, tác giả, tag..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <MonochromeIcon name="x" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Pills */}
        <FlatList
          data={GENRES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterPillList}
          renderItem={({ item }) => {
            const active = selectedGenre === item;
            return (
              <Pressable
                onPress={() => setSelectedGenre(item)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.tint : colors.card,
                    borderColor: active ? colors.tint : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? colors.background : colors.text },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />

        {/* Sort Row */}
        <View style={styles.sortRow}>
          <Text style={[styles.resultCount, { color: colors.textMuted }]}>
            {filteredNovels.length} tác phẩm
          </Text>
          <View style={styles.sortOptions}>
            {SORTS.map((s) => {
              const active = selectedSort === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setSelectedSort(s.value)}
                  style={[
                    styles.sortBtn,
                    active && { borderBottomColor: colors.tint, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortBtnText,
                      { color: active ? colors.tint : colors.textMuted, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Novel Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : filteredNovels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MonochromeIcon name="search" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Không tìm thấy truyện</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Hãy thử tìm kiếm với từ khoá hoặc thể loại khác.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNovels}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <NovelCard novel={item} width={CARD_WIDTH} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
  },
  filterPillList: {
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  resultCount: {
    fontSize: 12,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  sortBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  sortBtnText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  gridContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
