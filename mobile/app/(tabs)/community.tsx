import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/api/client';
import { ForumPost } from '@/types';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import MonochromeIcon from '@/components/common/MonochromeIcon';

export default function CommunityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiClient
      .get<ForumPost[]>('/forum/posts')
      .then((res: { data: ForumPost[] }) => {
        setPosts(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err: unknown) => {
        console.warn('Lỗi tải bài viết diễn đàn:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>DIỄN ĐÀN MUGEN</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Không gian thảo luận, review và giao lưu tác giả
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <MonochromeIcon name="message-square" size={42} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có bài viết nào</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Hãy là người đầu tiên chia sẻ cảm nhận về tác phẩm!
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.postCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.postHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: colors.badgeBg }]}>
                  <Text style={[styles.categoryText, { color: colors.badgeText }]}>
                    {item.category || 'Thảo luận'}
                  </Text>
                </View>
                <Text style={[styles.authorName, { color: colors.textMuted }]}>
                  {item.author_displayname || item.author_username || 'Wibu Vô Danh'}
                </Text>
              </View>

              <Text style={[styles.postTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.postContent, { color: colors.textSecondary }]} numberOfLines={3}>
                {item.content?.replace(/<[^>]*>/g, '') || ''}
              </Text>

              <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
                <View style={styles.footerItem}>
                  <MonochromeIcon name="heart" size={14} color={colors.textMuted} />
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    {item.likes_count || 0} thích
                  </Text>
                </View>
                <View style={styles.footerItem}>
                  <MonochromeIcon name="message-circle" size={14} color={colors.textMuted} />
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    {item.comments_count || 0} phản hồi
                  </Text>
                </View>
              </View>
            </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
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
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  postCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  authorName: {
    fontSize: 12,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  postContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
  },
});
