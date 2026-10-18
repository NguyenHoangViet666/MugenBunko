import React, { useState } from 'react';
import { Share, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import api, { SERVER_HOST } from '@/services/api/client';
import { getNovels } from '@/services/api/novelService';
import { Button, Card, ErrorNotice, Field, Label, Row, Screen, Sheet, confirmAction, useResource, useTask } from '@/components/common/Screen';

type Collection = { id: number; name: string; description: string; isPublic: boolean; shareId: string; coverNovelId: number | null; novelIds: number[] };
const blank = { name: '', description: '', isPublic: false, coverNovelId: null as number | null };
export default function CollectionsScreen() {
  const router = useRouter();
  const resource = useResource(async () => ({ collections: (await api.get<Collection[]>('/library/collections')).data, novels: await getNovels() }));
  const task = useTask();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const collection = resource.data?.collections.find(c => c.id === selected);
  const save = () => task.run(async () => {
    if (editing === 'new') await api.post('/library/collections', form);
    else await api.put(`/library/collections/${editing}`, form);
    setEditing(null); await resource.reload();
  });
  return <Screen title="Bộ sưu tập" loading={resource.loading} error={resource.error} onRefresh={resource.reload}>
    <ErrorNotice message={task.error} /><Button title="+ Tạo kệ sách" onPress={() => { setForm(blank); setEditing('new'); }} />
    {resource.data?.collections.length === 0 && <Label muted>Chưa có kệ sách. Tạo một kệ để sắp xếp truyện theo ý bạn.</Label>}
    {resource.data?.collections.map(c => <Card key={c.id}><Label large>{c.name}</Label><Label>{c.description}</Label><Label muted>{c.novelIds.length} tác phẩm · {c.isPublic ? 'Công khai' : 'Riêng tư'}</Label><Row>
      <Button title="Xem / thêm truyện" onPress={() => setSelected(c.id)} />
      <Button title="Sửa" onPress={() => { setForm({ name: c.name, description: c.description, isPublic: c.isPublic, coverNovelId: c.coverNovelId }); setEditing(c.id); }} />
      {c.isPublic && <Button title="Chia sẻ" onPress={() => void task.run(async () => { await Share.share({ message: `${c.name}\n${process.env.EXPO_PUBLIC_WEB_URL || SERVER_HOST}/#/collection/${c.shareId}` }); })} />}
      <Button title="Xoá kệ" danger disabled={task.busy} onPress={() => confirmAction('Xoá kệ sách?', () => void task.run(async () => { await api.delete(`/library/collections/${c.id}`); await resource.reload(); }))} />
    </Row></Card>)}
    <Sheet title={editing === 'new' ? 'Tạo kệ sách' : 'Sửa kệ sách'} visible={editing !== null} onClose={() => { if (!task.busy) setEditing(null); }}>
      <ErrorNotice message={task.error} /><Field label="Tên kệ" value={form.name} onChangeText={name => setForm({ ...form, name })} maxLength={80} />
      <Field label="Mô tả" value={form.description} onChangeText={description => setForm({ ...form, description })} maxLength={280} multiline />
      <Row><Label>Công khai bộ sưu tập</Label><Switch value={form.isPublic} onValueChange={isPublic => setForm({ ...form, isPublic })} /></Row>
      <Label muted>Ảnh bìa kệ</Label><Button title="Không chọn ảnh bìa" onPress={() => setForm({ ...form, coverNovelId: null })} />
      {resource.data?.novels.filter(n => editing === 'new' || resource.data?.collections.find(c => c.id === editing)?.novelIds.includes(n.id)).map(n => <Button key={n.id} title={`${form.coverNovelId === n.id ? '✓ ' : ''}${n.title}`} onPress={() => setForm({ ...form, coverNovelId: n.id })} />)}
      <Button title={task.busy ? 'Đang lưu…' : 'Lưu kệ'} disabled={task.busy || !form.name.trim()} onPress={save} />
    </Sheet>
    <Sheet title={collection?.name || 'Truyện trong kệ'} visible={selected !== null} onClose={() => setSelected(null)}>
      <ErrorNotice message={task.error} /><Field label="Tìm truyện để thêm vào kệ" value={search} onChangeText={setSearch} />
      {resource.data?.novels.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) && n.chapters?.some(ch => ch.status === 'published')).map(n => <Card key={n.id}><Label>{n.title}</Label><Row><Button title="Mở truyện" onPress={() => { setSelected(null); router.push(`/novel/${n.id}` as any); }} /><Button disabled={task.busy} title={collection?.novelIds.includes(n.id) ? 'Bỏ khỏi kệ' : 'Thêm vào kệ'} onPress={() => void task.run(async () => { const url = `/library/collections/${selected}/novels/${n.id}`; if (collection?.novelIds.includes(n.id)) await api.delete(url); else await api.put(url); await resource.reload(); })} /></Row></Card>)}
    </Sheet>
  </Screen>;
}
