import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import api from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorNotice, Label, Row, Screen, useResource, useTask } from '@/components/common/Screen';
import RichContent from '@/components/common/RichContent';
import { usePalette } from '@/components/common/Screen';
import { plainText } from '@/utils/content';

export default function UpdatesScreen() {
  const palette = usePalette();
  const { refreshUser } = useAuth(); const task = useTask(); const router = useRouter(); const [tab, setTab] = useState('notifications');
  const r = useResource(async () => { const [user, events, rules, announcements] = await Promise.all([refreshUser(), api.get<any[]>('/events'), api.get<any[]>('/policies'), api.get<any[]>('/announcements')]); return { user, events: events.data, rules: rules.data, announcements: announcements.data }; });
  return <Screen title="Thông báo & cộng đồng" error={r.error} loading={r.loading} onRefresh={r.reload}><ErrorNotice message={task.error} /><Row>{[['notifications', 'Thông báo'], ['events', 'Sự kiện'], ['announcements', 'Tin tác giả'], ['rules', 'Nội quy']].map(([key, label]) => <Button key={key} title={label} onPress={() => setTab(key)} />)}</Row>
    {tab === 'notifications' && <><Button title="Đánh dấu tất cả đã đọc" disabled={task.busy} onPress={() => void task.run(async () => { await api.post('/auth/notifications/read-all', {}); await r.reload(); })} />{!r.data?.user?.notifications?.length && <Label muted>Chưa có thông báo.</Label>}{r.data?.user?.notifications?.map(n => <Card key={n.id}><Label>{!n.read ? '● ' : ''}{n.text}</Label><Label muted>{n.date}</Label></Card>)}</>}
    {tab === 'events' && <>{r.data?.events.length === 0 && <Label muted>Chưa có sự kiện.</Label>}{r.data?.events.map(e => <Card key={e.id}><Label large>{e.title}</Label><Label muted>{e.date}</Label><Label>{e.description}</Label><RichContent html={e.content || ''} color={palette.text} /></Card>)}</>}
    {tab === 'announcements' && <>{r.data?.announcements.length === 0 && <Label muted>Chưa có tin tác giả.</Label>}{r.data?.announcements.map(a => <Card key={a.id}><Label large>{a.novelTitle}</Label><Label>{a.text}</Label><Label muted>{a.date}</Label><Button title="Mở tác phẩm" onPress={() => router.push(`/novel/${a.novel_id}` as any)} /></Card>)}</>}
    {tab === 'rules' && r.data?.rules.map(rule => <Card key={rule.id}><Label large>{rule.title}</Label><Label>{plainText(rule.content)}</Label></Card>)}
  </Screen>;
}
