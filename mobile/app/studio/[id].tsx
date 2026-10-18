import ImageUpload from '@/components/common/ImageUpload';
import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@/services/api/client';
import { getNovels } from '@/services/api/novelService';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorNotice, Field, Label, Row, Screen, Sheet, confirmAction, useResource, useTask } from '@/components/common/Screen';
import { Novel } from '@/types';

export default function StudioNovelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const router = useRouter(); const { user } = useAuth(); const task = useTask();
  const resource = useResource(async () => { const n = (await getNovels()).find(n => n.id === Number(id)); if (!n || (n.author_id !== user?.id && !user?.roles.includes('admin'))) throw new Error('Forbidden'); return n; }, [id, user?.id]);
  const [form, setForm] = useState<Novel | null>(null); const [tags, setTags] = useState(''); const [announcement, setAnnouncement] = useState('');
  const novel = resource.data;
  const statuses: Record<string, string> = { draft: 'Bản nháp', pending: 'Chờ duyệt', published: 'Đã xuất bản', scheduled: 'Đã lên lịch' };
  return <Screen title={novel?.title || 'Quản lý tác phẩm'} error={resource.error} loading={resource.loading} onRefresh={resource.reload}>
    <ErrorNotice message={task.error} />{novel && <>
      <Card><Label>{novel.reads} lượt đọc · {novel.bookmarksCount || 0} yêu thích · {novel.rating} sao</Label><Row><Button title="Sửa thông tin" onPress={() => { setForm(novel); setTags((novel.tags || []).join(', ')); }} /><Button title="+ Viết chương" onPress={() => router.push(`/studio/chapter/${id}` as any)} /><Button title="Xem trang truyện" onPress={() => router.push(`/novel/${id}` as any)} /></Row></Card>
      {Array.from(new Set(novel.chapters?.map(c => c.volume_name) || [])).map(volume => <Card key={volume}><Label large>{volume}</Label>{novel.chapters?.filter(c => c.volume_name === volume).map(ch => <Card key={ch.id}><Label>{ch.title}</Label><Label muted>{statuses[ch.status]} · {ch.word_count || 0} từ{ch.scheduled_release ? ` · ${ch.scheduled_release}` : ''}</Label><Row><Button title="Soạn thảo" onPress={() => router.push({ pathname: '/studio/chapter/[novelId]', params: { novelId: id, chapterId: ch.id } } as any)} /><Button title="Xoá chương" danger disabled={task.busy} onPress={() => confirmAction(`Xoá “${ch.title}”?`, () => void task.run(async () => { await api.delete(`/chapters/${ch.id}`); await resource.reload(); }))} /></Row></Card>)}<Button title="Xoá cả tập" danger disabled={task.busy} onPress={() => confirmAction(`Xoá tập “${volume}” và toàn bộ chương?`, () => void task.run(async () => { await api.post('/chapters/delete-volume', { novelId: Number(id), volumeName: volume }); await resource.reload(); }))} /></Card>)}
      <Card><Label large>Thông báo tới độc giả</Label><Field label="Nội dung thông báo" multiline maxLength={5000} value={announcement} onChangeText={setAnnouncement} /><Button title="Đăng thông báo" disabled={task.busy || !announcement.trim()} onPress={() => void task.run(async () => { await api.post('/announcements', { novelId: Number(id), text: announcement.trim() }); setAnnouncement(''); })} /></Card>
      <Button title="Xoá tác phẩm" danger disabled={task.busy} onPress={() => confirmAction('Xoá tác phẩm và tất cả chương?', () => void task.run(async () => { await api.delete(`/novels/${id}`, { data: { reason: 'Tác giả xoá từ Studio mobile' } }); router.replace('/studio' as any); }))} />
    </>}
    <Sheet title="Thông tin tác phẩm" visible={!!form} onClose={() => { if (!task.busy) setForm(null); }}>{form && <><ErrorNotice message={task.error} />
      <Field label="Tên tác phẩm" value={form.title} onChangeText={title => setForm({ ...form, title })} maxLength={255} /><Field label="Thể loại" value={form.genre} onChangeText={genre => setForm({ ...form, genre })} maxLength={500} />
      <Field label="Tóm tắt" multiline value={form.summary || ''} onChangeText={summary => setForm({ ...form, summary })} maxLength={20000} /><Field label="URL ảnh bìa" value={form.cover} onChangeText={cover => setForm({ ...form, cover })} maxLength={255} autoCapitalize="none" />
      <ImageUpload value={form.cover} onChange={cover => setForm({ ...form, cover })} />
      <Field label="Tags (cách nhau bằng dấu phẩy)" value={tags} onChangeText={setTags} /><Row>{(['series', 'oneshot'] as const).map(type => <Button key={type} title={`${form.type === type ? '✓ ' : ''}${type}`} onPress={() => setForm({ ...form, type })} />)}</Row><Row>{(['ongoing', 'completed', 'paused'] as const).map(status => <Button key={status} title={`${form.status === status ? '✓ ' : ''}${{ ongoing: 'Đang viết', completed: 'Hoàn thành', paused: 'Tạm dừng' }[status]}`} onPress={() => setForm({ ...form, status })} />)}</Row>
      <Button title="Lưu thay đổi" disabled={task.busy || !form.title.trim() || !form.genre.trim()} onPress={() => void task.run(async () => { await api.put(`/novels/${id}`, { ...form, tags: tags.split(',').map(t => t.trim()).filter(Boolean) }); setForm(null); await resource.reload(); })} />
    </>}</Sheet>
  </Screen>;
}
