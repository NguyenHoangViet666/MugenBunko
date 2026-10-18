import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Sheet, Field, Button } from '@/components/common/Screen';
import api from '@/services/api/client';
import { Comment, Review } from '@/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function NovelDiscussion({ novelId }: { novelId: number }) {
  const c = Colors[useColorScheme()];
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [stars, setStars] = useState(5);
  const [mode, setMode] = useState<'comments' | 'reviews'>('comments');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reportId, setReportId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [limit, setLimit] = useState(10);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.get<Review[]>(`/reviews/${novelId}`), api.get<Comment[]>(`/comments/${novelId}`)]);
      setReviews(a.data); setComments(b.data); setError('');
    } catch { setError('Không thể tải thảo luận. Chạm để thử lại.'); }
    finally { setLoading(false); }
  }, [novelId]);
  useEffect(() => { void load(); }, [load]);
  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      await api.post(`/${mode}/${novelId}`, mode === 'reviews' ? { text: text.trim(), stars } : { text: text.trim(), parentId: replyTo?.parent_id || replyTo?.id, replyToUserId: replyTo?.user_id });
      setText(''); setReplyTo(null); await load();
    } catch (e: any) { Alert.alert('Không thể gửi', e.response?.data?.error || 'Kiểm tra kết nối rồi thử lại.'); }
    finally { setBusy(false); }
  };
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{ minHeight: 44, justifyContent: 'center', padding: 10, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: c.tint, fontWeight: '700' }}>{label}</Text></Pressable>;
  const list = mode === 'reviews' ? reviews : comments;
  return <View style={{ padding: 16, gap: 12, borderTopWidth: 1, borderColor: c.border }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{button(`Bình luận (${comments.length})`, () => { setMode('comments'); setReplyTo(null); setText(''); setLimit(10); })}{button(`Đánh giá (${reviews.length})`, () => { setMode('reviews'); setReplyTo(null); setText(''); setLimit(10); })}</View>
    {loading ? <ActivityIndicator color={c.tint} /> : error ? button(error, load) : list.length === 0 ? <Text style={{ color: c.textMuted }}>Chưa có {mode === 'reviews' ? 'đánh giá' : 'bình luận'}. Chia sẻ cảm nhận của bạn nhé.</Text> : list.slice(0, limit).map(item => <View key={item.id} style={{ padding: 12, backgroundColor: c.card, borderRadius: 8, gap: 6, marginLeft: 'parent_id' in item && item.parent_id ? 12 : 0 }}>
      <Text style={{ color: c.text, fontWeight: '700' }}>{item.displayname || item.username}{'stars' in item ? ` · ${item.stars} ★` : ''}</Text><Text selectable style={{ color: c.text, lineHeight: 22 }}>{item.text}</Text>
      {mode === 'comments' ? <View style={{ flexDirection: 'row' }}>{button('Trả lời', () => setReplyTo(item as Comment))}{button('Báo cáo', () => { setReportId(item.id); setReason(''); })}</View> : null}
    </View>)}
    {list.length > limit ? button('Xem thêm', () => setLimit(n => n + 10)) : null}
    {replyTo ? button(`Đang trả lời ${replyTo.displayname || replyTo.username} · Huỷ`, () => setReplyTo(null)) : null}
    {mode === 'reviews' ? <View style={{ flexDirection: 'row' }}>{[1, 2, 3, 4, 5].map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} sao`} accessibilityState={{ selected: n === stars }} onPress={() => setStars(n)} style={{ padding: 10 }}><Text style={{ color: c.tint, fontSize: 24 }}>{n <= stars ? '★' : '☆'}</Text></Pressable>)}</View> : null}
    <TextInput accessibilityLabel={mode === 'reviews' ? 'Nội dung đánh giá' : 'Nội dung bình luận'} placeholder="Chia sẻ cảm nhận…" placeholderTextColor={c.textMuted} multiline maxLength={5000} value={text} onChangeText={setText} style={{ color: c.text, borderColor: c.border, borderWidth: 1, borderRadius: 8, padding: 14, minHeight: 90, textAlignVertical: 'top' }} />
    <Sheet title="Báo cáo bình luận" visible={reportId !== null} onClose={() => { if (!busy) setReportId(null); }}><Field label="Lý do báo cáo" multiline value={reason} onChangeText={setReason} maxLength={1000} /><Button title="Gửi báo cáo" disabled={busy || !reason.trim()} onPress={() => {
      setBusy(true);
      api.post(`/comments/${reportId}/report`, { reason: reason.trim() }).then(() => setReportId(null)).catch((e: any) => Alert.alert('Lỗi', e.response?.data?.error || 'Không thể gửi báo cáo')).finally(() => setBusy(false));
    }} /></Sheet>
    {button(busy ? 'Đang gửi…' : mode === 'reviews' ? 'Lưu đánh giá' : 'Gửi bình luận', submit, busy || !text.trim())}
  </View>;
}
