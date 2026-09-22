import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Novel, Chapter } from '@/types';
import { getNovelById, getChapterContent } from '@/services/api/novelService';
import { saveReadingProgress } from '@/services/storage/readingProgress';
import MonochromeIcon from '@/components/common/MonochromeIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ReaderTheme = 'washi' | 'charcoal' | 'sepia' | 'white';

const THEME_STYLES: Record<
  ReaderTheme,
  { bg: string; text: string; textMuted: string; border: string; barBg: string }
> = {
  washi: {
    bg: '#FAF8F5',
    text: '#2A2E30',
    textMuted: '#737B82',
    border: '#EAE5DC',
    barBg: '#FFFFFF',
  },
  charcoal: {
    bg: '#121214',
    text: '#E2E2E7',
    textMuted: '#8E8E93',
    border: '#2E2E33',
    barBg: '#1C1C1F',
  },
  sepia: {
    bg: '#EFE5CC',
    text: '#3D2F1F',
    textMuted: '#7D6853',
    border: '#DBCCA9',
    barBg: '#F9F3E3',
  },
  white: {
    bg: '#FFFFFF',
    text: '#1C2D37',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    barBg: '#F9FAFB',
  },
};

export default function ChapterReaderScreen() {
  const { novelId, chapterIndex } = useLocalSearchParams<{
    novelId: string;
    chapterIndex: string;
  }>();
  const router = useRouter();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Settings
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('washi');
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans-serif'>('serif');
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState<boolean>(false);

  const currentIdx = parseInt(chapterIndex || '0', 10);
  const theme = THEME_STYLES[readerTheme];

  const loadChapter = useCallback(async () => {
    if (!novelId) return;
    setLoading(true);
    try {
      const novelData = await getNovelById(novelId);
      setNovel(novelData);

      if (novelData && novelData.chapters && novelData.chapters[currentIdx]) {
        const targetChapterSummary = novelData.chapters[currentIdx];
        const fullChapter = await getChapterContent(targetChapterSummary.id);
        setChapter(fullChapter || targetChapterSummary);

        // Lưu tiến độ đọc
        saveReadingProgress({
          novelId: novelData.id,
          novelTitle: novelData.title,
          novelCover: novelData.cover,
          authorName: novelData.author_name || novelData.author,
          lastChapterIndex: currentIdx,
          lastChapterTitle: targetChapterSummary.title,
          totalChapters: novelData.chapters.length,
          progressPercentage: Math.round(((currentIdx + 1) / novelData.chapters.length) * 100),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Lỗi tải chương đọc:', err);
    } finally {
      setLoading(false);
    }
  }, [novelId, currentIdx]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  const toggleMenu = () => {
    setMenuVisible((prev) => !prev);
  };

  const handlePrevChapter = () => {
    if (currentIdx > 0 && novel) {
      router.replace(`/reader/${novel.id}/${currentIdx - 1}` as any);
    }
  };

  const handleNextChapter = () => {
    if (novel && novel.chapters && currentIdx < novel.chapters.length - 1) {
      router.replace(`/reader/${novel.id}/${currentIdx + 1}` as any);
    }
  };

  // Làm sạch thẻ HTML từ rich text nếu có
  const formatContent = (rawHtml?: string) => {
    if (!rawHtml) return 'Nội dung chương đang được cập nhật...';
    // Đổi <p>, <br> thành xuống dòng
    return rawHtml
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .trim();
  };

  const totalChapters = novel?.chapters?.length || 0;
  const hasPrev = currentIdx > 0;
  const hasNext = totalChapters > 0 && currentIdx < totalChapters - 1;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Đang lật mở chương truyện...
        </Text>
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <MonochromeIcon name="alert-circle" size={40} color={theme.textMuted} />
        <Text style={[styles.errorTitle, { color: theme.text }]}>Không thể tải nội dung</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.text }]}
        >
          <Text style={[styles.backBtnText, { color: theme.bg }]}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header Bar (Ẩn/Hiện khi chạm) */}
      {menuVisible && (
        <SafeAreaView edges={['top']} style={[styles.topBar, { backgroundColor: theme.barBg, borderBottomColor: theme.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MonochromeIcon name="arrow-left" size={22} color={theme.text} />
          </Pressable>

          <View style={styles.topInfo}>
            <Text style={[styles.topNovelTitle, { color: theme.text }]} numberOfLines={1}>
              {novel?.title}
            </Text>
            <Text style={[styles.topChapterTitle, { color: theme.textMuted }]} numberOfLines={1}>
              Chương {currentIdx + 1}/{totalChapters}: {chapter.title}
            </Text>
          </View>

          <Pressable
            onPress={() => setShowSettingsSheet((prev) => !prev)}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MonochromeIcon name="sliders" size={20} color={theme.text} />
          </Pressable>
        </SafeAreaView>
      )}

      {/* Main Reading Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.readerScroll}
      >
        <Pressable onPress={toggleMenu}>
          {/* Chapter Header Info */}
          <View style={styles.chapterHeader}>
            <Text style={[styles.volumeTag, { color: theme.textMuted }]}>
              {(chapter.volume_name || 'TẬP 1').toUpperCase()}
            </Text>
            <Text style={[styles.chapterMainTitle, { color: theme.text }]}>
              {chapter.title}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Chapter Body Content */}
          <Text
            style={[
              styles.bodyText,
              {
                color: theme.text,
                fontSize,
                lineHeight: fontSize * 1.75,
                fontFamily: fontFamily === 'serif' ? (Platform.OS === 'ios' ? 'Georgia' : 'serif') : 'System',
              },
            ]}
          >
            {formatContent(chapter.content)}
          </Text>

          {/* Bottom Chapter Navigation Buttons */}
          <View style={[styles.navRow, { borderTopColor: theme.border }]}>
            <Pressable
              disabled={!hasPrev}
              onPress={handlePrevChapter}
              style={[
                styles.navBtn,
                { backgroundColor: theme.barBg, borderColor: theme.border, opacity: hasPrev ? 1 : 0.4 },
              ]}
            >
              <MonochromeIcon name="chevron-left" size={18} color={theme.text} />
              <Text style={[styles.navBtnText, { color: theme.text }]}>Chương trước</Text>
            </Pressable>

            <Pressable
              disabled={!hasNext}
              onPress={handleNextChapter}
              style={[
                styles.navBtn,
                { backgroundColor: theme.barBg, borderColor: theme.border, opacity: hasNext ? 1 : 0.4 },
              ]}
            >
              <Text style={[styles.navBtnText, { color: theme.text }]}>Chương sau</Text>
              <MonochromeIcon name="chevron-right" size={18} color={theme.text} />
            </Pressable>
          </View>

          <View style={{ height: 60 }} />
        </Pressable>
      </ScrollView>

      {/* Settings Bottom Sheet (Khi bật menu tuỳ chỉnh) */}
      {menuVisible && showSettingsSheet && (
        <View
          style={[
            styles.settingsSheet,
            { backgroundColor: theme.barBg, borderTopColor: theme.border },
          ]}
        >
          {/* Cỡ chữ */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textMuted }]}>CỠ CHỮ</Text>
            <View style={styles.fontAdjuster}>
              <Pressable
                onPress={() => setFontSize((s) => Math.max(14, s - 2))}
                style={[styles.adjustBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.adjustBtnText, { color: theme.text }]}>A -</Text>
              </Pressable>
              <Text style={[styles.fontSizeDisplay, { color: theme.text }]}>{fontSize}px</Text>
              <Pressable
                onPress={() => setFontSize((s) => Math.min(30, s + 2))}
                style={[styles.adjustBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.adjustBtnText, { color: theme.text }]}>A +</Text>
              </Pressable>
            </View>
          </View>

          {/* Theme màu nền */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textMuted }]}>MÀU NỀN ĐỌC</Text>
            <View style={styles.themeRow}>
              {(['washi', 'charcoal', 'sepia', 'white'] as ReaderTheme[]).map((t) => {
                const active = readerTheme === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setReaderTheme(t)}
                    style={[
                      styles.themeBtn,
                      {
                        backgroundColor: THEME_STYLES[t].bg,
                        borderColor: active ? theme.text : THEME_STYLES[t].border,
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.themeBtnText,
                        { color: THEME_STYLES[t].text, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {t === 'washi' ? 'Washi' : t === 'charcoal' ? 'Tối' : t === 'sepia' ? 'Sepia' : 'Trắng'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Kiểu font */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textMuted }]}>KIỂU CHỮ</Text>
            <View style={styles.fontFamilyRow}>
              <Pressable
                onPress={() => setFontFamily('serif')}
                style={[
                  styles.fontFamilyBtn,
                  {
                    borderColor: fontFamily === 'serif' ? theme.text : theme.border,
                    borderWidth: fontFamily === 'serif' ? 2 : 1,
                  },
                ]}
              >
                <Text style={[styles.fontFamilyText, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>
                  Sách giấy (Serif)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFontFamily('sans-serif')}
                style={[
                  styles.fontFamilyBtn,
                  {
                    borderColor: fontFamily === 'sans-serif' ? theme.text : theme.border,
                    borderWidth: fontFamily === 'sans-serif' ? 2 : 1,
                  },
                ]}
              >
                <Text style={[styles.fontFamilyText, { color: theme.text }]}>
                  Hiện đại (Sans)
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  topInfo: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  topNovelTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  topChapterTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  iconBtn: {
    padding: 6,
  },
  readerScroll: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 80,
  },
  chapterHeader: {
    alignItems: 'center',
    marginVertical: 24,
  },
  volumeTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  chapterMainTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 28,
  },
  dividerLine: {
    width: 40,
    height: 2,
    marginTop: 16,
    borderRadius: 1,
  },
  bodyText: {
    letterSpacing: 0.2,
    textAlign: 'justify',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    gap: 14,
  },
  settingRow: {
    gap: 8,
  },
  settingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  fontAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  adjustBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  fontSizeDisplay: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 6,
  },
  themeBtnText: {
    fontSize: 12,
  },
  fontFamilyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fontFamilyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 6,
  },
  fontFamilyText: {
    fontSize: 13,
  },
});
