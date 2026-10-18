import React, { useState } from 'react';
import api from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorNotice, Field, Label, Row, Screen, Sheet, confirmAction, useResource, useTask } from '@/components/common/Screen';

type Rule = { id: number; title: string; content: string; order_index: number };
type Event = { id: number; title: string; description: string; content: string; status: string };
type Form = { id?: number; title: string; description: string; content: string; status: string; order: string };
const blank: Form = { title: '', description: '', content: '', status: 'draft', order: '0' };
export default function ManageScreen() {
  const { user } = useAuth(); const allowed = !!user?.roles.includes('admin'); const task = useTask();
  const [tab, setTab] = useState<'events' | 'rules' | 'genres'>('events');
  const [form, setForm] = useState<Form | null>(null); const [genre, setGenre] = useState('');
  const [fromTag, setFromTag] = useState(''); const [toTag, setToTag] = useState('');
  const resource = useResource(async () => {
    if (!allowed) return null;
    const [events, rules, genres] = await Promise.all([api.get<Event[]>('/events'), api.get<Rule[]>('/policies'), api.get<{ name: string }[]>('/genres')]);
    return { events: events.data, rules: rules.data, genres: genres.data };
  }, [allowed]);
  if (!allowed) return <Screen title="Quản lý nội dung"><Label>Chức năng dành cho quản trị viên.</Label></Screen>;
  return <Screen title="Quản lý nội dung" error={resource.error} loading={resource.loading} onRefresh={resource.reload}><ErrorNotice message={task.error} />
    <Row><Button title="Sự kiện" onPress={() => setTab('events')} /><Button title="Nội quy" onPress={() => setTab('rules')} /><Button title="Thể loại & tags" onPress={() => setTab('genres')} /></Row>
    {tab !== 'genres' && <Button title={tab === 'events' ? '+ Sự kiện mới' : '+ Quy định mới'} onPress={() => setForm(blank)} />}
    {tab === 'events' && resource.data?.events.map(e => <Card key={e.id}><Label large>{e.title}</Label><Label>{e.description}</Label><Label muted>{e.status}</Label><Row><Button title="Sửa" onPress={() => setForm({ ...e, order: '0' })} /><Button title="Xoá" danger disabled={task.busy} onPress={() => confirmAction('Xoá sự kiện?', () => void task.run(async () => { await api.delete(`/events/${e.id}`); await resource.reload(); }))} /></Row></Card>)}
    {tab === 'rules' && resource.data?.rules.map(r => <Card key={r.id}><Label large>{r.title}</Label><Label>{r.content}</Label><Row><Button title="Sửa" onPress={() => setForm({ ...blank, ...r, order: String(r.order_index) })} /><Button title="Xoá" danger disabled={task.busy} onPress={() => confirmAction('Xoá quy định?', () => void task.run(async () => { await api.delete(`/admin/rules/${r.id}`); await resource.reload(); }))} /></Row></Card>)}
    {tab === 'genres' && <><Card><Field label="Thể loại mới" value={genre} onChangeText={setGenre} maxLength={100} /><Button title="Thêm thể loại" disabled={task.busy || !genre.trim()} onPress={() => void task.run(async () => { await api.post('/admin/genres', { name: genre.trim() }); setGenre(''); await resource.reload(); })} /></Card>{resource.data?.genres.map(g => <Card key={g.name}><Label>{g.name}</Label><Button title="Xoá thể loại" danger disabled={task.busy} onPress={() => confirmAction(`Xoá thể loại ${g.name}?`, () => void task.run(async () => { await api.delete(`/admin/genres/${encodeURIComponent(g.name)}`); await resource.reload(); }))} /></Card>)}<Card><Label large>Gộp tags</Label><Field label="Tag cũ" value={fromTag} onChangeText={setFromTag} /><Field label="Tag đích" value={toTag} onChangeText={setToTag} /><Button title="Gộp tag" disabled={task.busy || !fromTag.trim() || !toTag.trim() || fromTag.trim() === toTag.trim()} onPress={() => confirmAction(`Gộp ${fromTag} vào ${toTag}?`, () => void task.run(async () => { await api.post('/admin/tags/merge', { fromTag: fromTag.trim(), toTag: toTag.trim() }); setFromTag(''); setToTag(''); }))} /></Card></>}
    <Sheet title={tab === 'events' ? 'Biên tập sự kiện' : 'Biên tập nội quy'} visible={!!form} onClose={() => { if (!task.busy) setForm(null); }}>{form && <><ErrorNotice message={task.error} /><Field label="Tiêu đề" maxLength={255} value={form.title} onChangeText={title => setForm({ ...form, title })} />{tab === 'events' && <Field label="Mô tả" multiline maxLength={5000} value={form.description} onChangeText={description => setForm({ ...form, description })} />}<Field label="Nội dung (hỗ trợ HTML)" multiline value={form.content} onChangeText={content => setForm({ ...form, content })} />
      {tab === 'events' ? <Row>{['draft', 'published', 'archived'].map(status => <Button key={status} title={`${form.status === status ? '✓ ' : ''}${{ draft: 'Nháp', published: 'Công khai', archived: 'Lưu trữ' }[status]}`} onPress={() => setForm({ ...form, status })} />)}</Row> : <Field label="Thứ tự" keyboardType="number-pad" value={form.order} onChangeText={order => setForm({ ...form, order })} />}
      <Button title="Lưu" disabled={task.busy || !form.title.trim() || (tab === 'rules' && !form.content.trim())} onPress={() => void task.run(async () => { const base = tab === 'events' ? '/events' : '/admin/rules'; const payload = tab === 'events' ? form : { title: form.title, content: form.content, orderIndex: Number(form.order) || 0 }; if (form.id) await api.put(`${base}/${form.id}`, payload); else await api.post(base, payload); setForm(null); await resource.reload(); })} />
    </>}</Sheet>
  </Screen>;
}
