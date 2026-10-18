import ImageUpload from '@/components/common/ImageUpload';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import api from '@/services/api/client';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Button, confirmAction } from '@/components/common/Screen';
import RichContent from '@/components/common/RichContent';
import { ForumPost } from '@/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Reply = { id: number; user_id: number; parent_id?: number; text: string; author_displayname?: string; author_username?: string; replies?: Reply[] };
type Post = ForumPost & { image_url?: string; is_liked?: boolean | number; restrictComments?: boolean; comments?: Reply[] };
const plain = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const message = (e: any) => e.response?.data?.error || 'Không thể kết nối. Vui lòng thử lại.';

export default function CommunityScreen() {
  const c = Colors[useColorScheme()];
  const { user } = useAuth(); const router = useRouter();
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Post | null>(null);
  const [compose, setCompose] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('Thảo luận');
  const [comment, setComment] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Post[]>('/forum/posts', { params: { comments: 'none', limit: 20 } });
      setPosts(res.data); setNext(res.headers['x-next-page'] || null); setError('');
    } catch (e) { setError(message(e)); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const open = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try { setSelected((await api.get<Post>(`/forum/posts/${id}`)).data); setComment(''); setReplyTo(null); }
    catch (e) { Alert.alert('Lỗi', message(e)); } finally { setBusy(false); }
  };
  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (compose) {
        if (!title.trim() || !content.trim()) return;
        await api.post('/forum/posts', { title: title.trim(), content: content.trim(), category, imageUrl: imageUrl || undefined });
        setCompose(false); setTitle(''); setContent(''); setImageUrl(''); await load();
      } else if (selected && comment.trim()) {
        await api.post(`/forum/posts/${selected.id}/comments`, { text: comment.trim(), parentId: replyTo?.parent_id || replyTo?.id, replyToUserId: replyTo?.user_id });
        setComment(''); setReplyTo(null);
        setPosts(list => list.map(p => p.id === selected.id ? { ...p, comments_count: Number(p.comments_count || 0) + 1 } : p));
        setSelected((await api.get<Post>(`/forum/posts/${selected.id}`)).data);
      }
    } catch (e) { Alert.alert('Không thể gửi', message(e)); } finally { setBusy(false); }
  };
  const like = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/forum/posts/${selected.id}/like`);
      const updated = { ...selected, is_liked: data.liked, likes_count: Math.max(0, Number(selected.likes_count || 0) + (data.liked ? 1 : -1)) };
      setSelected(updated); setPosts(list => list.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    } catch (e) { Alert.alert('Lỗi', message(e)); } finally { setBusy(false); }
  };
  const more = async () => {
    if (!next || busy) return;
    setBusy(true);
    try {
      const res = await api.get<Post[]>('/forum/posts', { params: { page: next, limit: 20, comments: 'none' } });
      setPosts(list => [...list, ...res.data.filter(p => !list.some(old => old.id === p.id))]);
      setNext(res.headers['x-next-page'] || null);
    } catch (e) { Alert.alert('Lỗi', message(e)); } finally { setBusy(false); }
  };
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button, { backgroundColor: c.tint, opacity: disabled ? 0.5 : 1 }]}><Text style={{ color: c.background, fontWeight: '700' }}>{label}</Text></Pressable>;
  const reply = (r: Reply) => <View key={r.id} style={[s.reply, { borderColor: c.border }]}><Text style={{ color: c.text, fontWeight: '700' }}>{r.author_displayname || r.author_username}</Text><Text selectable style={{ color: c.text, marginTop: 6 }}>{plain(r.text)}</Text><Button title="Trả lời" onPress={() => setReplyTo(r)} />{r.replies?.map(reply)}</View>;
  return <SafeAreaView style={[s.screen, { backgroundColor: c.background }]} edges={['top']}>
    <View style={s.header}><Text style={[s.heading, { color: c.text }]}>DIỄN ĐÀN MUGEN</Text><Button title="Bạn bè & chat" onPress={() => router.push('/social' as any)} />{button('Viết bài', () => setCompose(true))}</View>
    {error ? <View style={s.header}><Text style={{ color: c.text, flex: 1 }}>{error}</Text>{button('Thử lại', load)}</View> : null}
    <FlatList data={posts} refreshing={loading} onRefresh={load} keyExtractor={p => String(p.id)} contentContainerStyle={s.list}
      ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: 'center', padding: 30 }}>{loading ? 'Đang tải…' : error ? '' : 'Chưa có bài viết. Chia sẻ đầu tiên nhé!'}</Text>}
      ListFooterComponent={next ? button(busy ? 'Đang tải…' : 'Xem thêm', more, busy) : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => open(item.id)} style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={{ color: c.textMuted }}>{item.category} · {item.author_displayname || item.author_username}</Text>
        <Text style={[s.heading, { color: c.text, marginVertical: 10 }]}>{item.title}</Text>
        <Text numberOfLines={3} style={{ color: c.textSecondary }}>{plain(item.content || '')}</Text>
        <Text style={{ color: c.textMuted, marginTop: 14 }}>{item.likes_count || 0} thích · {item.comments_count || 0} phản hồi</Text>
      </Pressable>} />
    <Modal visible={compose || !!selected} animationType="slide" onRequestClose={() => { if (!busy) { setCompose(false); setSelected(null); } }}>
      <SafeAreaView style={[s.screen, { backgroundColor: c.background }]}>
        <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.header}><Text style={[s.heading, { color: c.text }]}>{compose ? 'Bài viết mới' : 'Thảo luận'}</Text>{button('Đóng', () => { setCompose(false); setSelected(null); }, busy)}</View>
          <ScrollView contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
            {compose ? <>
              <TextInput accessibilityLabel="Tiêu đề" placeholder="Tiêu đề" placeholderTextColor={c.textMuted} value={title} onChangeText={setTitle} maxLength={200} style={[s.input, { color: c.text, borderColor: c.border }]} />
              <View style={s.categories}>{['Thảo luận', 'Review', 'Giao lưu'].map(t => <Pressable key={t} onPress={() => setCategory(t)} style={s.button}><Text style={{ color: c.text, fontWeight: category === t ? '800' : '400' }}>{t}</Text></Pressable>)}</View>
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
              <TextInput accessibilityLabel="Nội dung" placeholder="Chia sẻ của bạn…" placeholderTextColor={c.textMuted} multiline textAlignVertical="top" value={content} onChangeText={setContent} maxLength={20000} style={[s.input, { minHeight: 200, color: c.text, borderColor: c.border }]} />
            </> : selected ? <>
              <Text style={[s.heading, { color: c.text }]}>{selected.title}</Text><RichContent html={selected.content + (selected.image_url ? `<figure><img src="${selected.image_url}" /></figure>` : '')} color={c.text} />
              {button(`${selected.is_liked ? 'Bỏ thích' : 'Thích'} · ${selected.likes_count || 0}`, like, busy)}
              {selected.comments?.map(reply)}
              {replyTo && <Button title={`Trả lời ${replyTo.author_displayname || replyTo.author_username} · Huỷ`} onPress={() => setReplyTo(null)} />}
              {(selected.author_id === user?.id || user?.roles.includes('admin')) && <Button title="Xoá bài viết" danger disabled={busy} onPress={() => confirmAction('Xoá bài viết?', () => {
                setBusy(true); api.delete(`/forum/posts/${selected.id}`).then(async () => { setSelected(null); await load(); }).catch(e => Alert.alert('Lỗi', message(e))).finally(() => setBusy(false));
              })} />}
              {user?.roles.includes('admin') && <Button title={selected.restrictComments ? 'Mở bình luận' : 'Giới hạn bình luận'} disabled={busy} onPress={() => {
                setBusy(true); api.put(`/forum/posts/${selected.id}/restrict-comments`, { restrict: !selected.restrictComments }).then(({ data }) => setSelected({ ...selected, restrictComments: data.restrictComments })).catch(e => Alert.alert('Lỗi', message(e))).finally(() => setBusy(false));
              }} />}
              {selected.restrictComments ? <Text style={{ color: c.textMuted }}>Bài viết giới hạn người được bình luận.</Text> : null}
              <TextInput accessibilityLabel="Bình luận" placeholder="Viết bình luận…" placeholderTextColor={c.textMuted} multiline value={comment} onChangeText={setComment} maxLength={5000} style={[s.input, { color: c.text, borderColor: c.border }]} />
            </> : null}
            {button(busy ? 'Đang gửi…' : compose ? 'Đăng bài' : 'Gửi bình luận', send, busy || (compose ? !title.trim() || !content.trim() : !comment.trim() || (!!selected?.restrictComments && !user?.roles.some(r => r === 'admin' || r === 'moderator'))))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
    {busy && !selected && !compose ? <ActivityIndicator color={c.tint} /> : null}
  </SafeAreaView>;
}
const s = StyleSheet.create({ screen: { flex: 1 }, header: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, heading: { fontSize: 18, fontWeight: '800', flexShrink: 1 }, list: { padding: 16, gap: 16, paddingBottom: 32 }, card: { borderWidth: 1, borderRadius: 12, padding: 16 }, button: { minHeight: 44, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 16, minHeight: 48 }, categories: { flexDirection: 'row', flexWrap: 'wrap' }, reply: { padding: 12, borderLeftWidth: 2, gap: 8 } });
