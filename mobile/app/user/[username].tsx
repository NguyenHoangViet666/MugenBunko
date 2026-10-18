import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@/services/api/client';
import { getNovels } from '@/services/api/novelService';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorNotice, Label, Row, Screen, useResource, useTask } from '@/components/common/Screen';
import { User } from '@/types';

export default function UserScreen() {
  const { username } = useLocalSearchParams<{ username: string }>(); const { user, refreshUser } = useAuth(); const router = useRouter(); const task = useTask();
  const r = useResource(async () => { const [profile, novels, follows] = await Promise.all([api.get<{ user: User }>(`/auth/user/${encodeURIComponent(username)}`), getNovels(), api.get<string[]>(`/auth/follows/${user?.id}`)]); return { profile: profile.data.user, novels: novels.filter(n => n.author_id === profile.data.user.id && n.chapters?.some(c => c.status === 'published')), follows: follows.data }; }, [username, user?.id]);
  return <Screen title={`@${username}`} error={r.error} loading={r.loading} onRefresh={r.reload}><ErrorNotice message={task.error} />{r.data && <><Card><Label large>{r.data.profile.displayname}</Label><Label>{r.data.profile.bio || 'Chưa có giới thiệu.'}</Label><Label muted>{r.data.profile.roles.join(', ')} · {r.data.profile.xp} XP</Label>{r.data.profile.id !== user?.id && <Row><Button title={r.data.follows.includes(username) ? 'Bỏ theo dõi' : 'Theo dõi tác giả'} disabled={task.busy} onPress={() => void task.run(async () => { await api.post('/auth/follow-author', { authorUsername: username }); await refreshUser(); await r.reload(); })} /><Button title="Gửi lời mời kết bạn" disabled={task.busy} onPress={() => void task.run(async () => { await api.post('/social/friends/request', { friendId: r.data!.profile.id }); router.push('/social' as any); })} /></Row>}</Card><Label large>Tác phẩm</Label>{r.data.novels.map(n => <Card key={n.id}><Label>{n.title}</Label><Button title="Đọc truyện" onPress={() => router.push(`/novel/${n.id}` as any)} /></Card>)}</>}</Screen>;
}
