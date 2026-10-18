import ImageUpload from '@/components/common/ImageUpload';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import api from '@/services/api/client';
import { getNovels } from '@/services/api/novelService';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorNotice, Field, Label, Row, Screen, Sheet, useResource, useTask } from '@/components/common/Screen';

export default function StudioScreen() {
  const { user, refreshUser } = useAuth(); const router = useRouter(); const task = useTask();
  const resource = useResource(async () => (await getNovels()).filter(n => n.author_id === user?.id), [user?.id]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(''); const [genre, setGenre] = useState('Fantasy');
  const [summary, setSummary] = useState(''); const [cover, setCover] = useState(''); const [type, setType] = useState('series');
  return <Screen title="Studio tác giả" loading={resource.loading} error={resource.error} onRefresh={resource.reload}>
    <ErrorNotice message={task.error} /><Label muted>Quản lý tác phẩm, bản nháp, lịch phát hành và lịch sử chỉnh sửa.</Label>
    {!user?.roles.includes('author') && <Card><Label>Tác phẩm mới sẽ được kiểm duyệt trước khi xuất bản. Bạn vẫn có thể bắt đầu viết ngay.</Label><Button title={user?.author_request === 'pending' ? 'Đã gửi yêu cầu tác giả' : 'Xin quyền tác giả'} disabled={task.busy || user?.author_request === 'pending'} onPress={() => void task.run(async () => { await api.post('/auth/request-author-role', {}); await refreshUser(); })} /></Card>}
    <Button title="+ Tác phẩm mới" onPress={() => setCreating(true)} />
    {resource.data?.length === 0 && <Label muted>Chưa có tác phẩm. Bắt đầu câu chuyện đầu tiên của bạn.</Label>}
    {resource.data?.map(n => <Card key={n.id}><Label large>{n.title}</Label><Label muted>{n.chapters?.length || 0} chương · {n.reads} lượt đọc · {n.bookmarksCount || 0} yêu thích</Label><Button title="Quản lý tác phẩm" onPress={() => router.push(`/studio/${n.id}` as any)} /></Card>)}
    <Sheet title="Tạo tác phẩm" visible={creating} onClose={() => { if (!task.busy) setCreating(false); }}><ErrorNotice message={task.error} />
      <Field label="Tên tác phẩm" value={title} onChangeText={setTitle} maxLength={255} /><Field label="Thể loại" value={genre} onChangeText={setGenre} maxLength={500} />
      <Field label="Tóm tắt" value={summary} onChangeText={setSummary} multiline maxLength={20000} /><Field label="URL ảnh bìa (tuỳ chọn)" value={cover} onChangeText={setCover} autoCapitalize="none" maxLength={255} />
      <ImageUpload value={cover} onChange={setCover} />
      <Row><Button title={`${type === 'series' ? '✓ ' : ''}Truyện dài`} onPress={() => setType('series')} /><Button title={`${type === 'oneshot' ? '✓ ' : ''}Oneshot`} onPress={() => setType('oneshot')} /></Row>
      <Button title="Tạo tác phẩm" disabled={task.busy || !title.trim() || !genre.trim()} onPress={() => void task.run(async () => { const { data } = await api.post('/novels', { title: title.trim(), genre: genre.trim(), summary, cover: cover.trim() || undefined, type, status: 'ongoing' }); setCreating(false); router.push(`/studio/${data.novelId}` as any); })} />
    </Sheet>
  </Screen>;
}
