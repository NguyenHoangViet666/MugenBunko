import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import api from '@/services/api/client';
import { getSocket } from '@/services/socket/socketClient';
import { Button, Card, ErrorNotice, Field, Label, Row, Screen, confirmAction, useResource, useTask } from '@/components/common/Screen';
import { useAuth } from '@/context/AuthContext';

type Person = { id: number; username: string; displayname: string; status?: string; senderId?: number };
export default function SocialScreen() {
  const router = useRouter(); const { user } = useAuth();
  const resource = useResource(async () => (await api.get<{ friends: Person[]; received: Person[]; sent: Person[] }>('/social/friends')).data);
  const [query, setQuery] = useState(''); const [results, setResults] = useState<Person[]>([]);
  const [online, setOnline] = useState<Record<number, boolean>>({}); const task = useTask();
  useEffect(() => {
    const socket = getSocket(); if (!socket) return;
    const update = ({ userId, status }: { userId: number; status: string }) => setOnline(v => ({ ...v, [userId]: status === 'online' }));
    socket.emit('check_online_status', resource.data?.friends.map(p => p.id) || [], setOnline);
    socket.on('friend_status_change', update); return () => { socket.off('friend_status_change', update); };
  }, [resource.data]);
  const search = async () => { setResults((await api.get<Person[]>('/social/users/search', { params: { q: query.trim() } })).data); };
  const action = (id: number, command: string) => task.run(async () => { await api.post(`/social/friends/${command}`, { friendId: id }); await resource.reload(); if (query.trim()) await search(); });
  const person = (p: Person, group: 'friends' | 'received' | 'sent' | 'search') => <Card key={p.id}><Label large>{p.displayname || p.username}</Label><Label muted>@{p.username}{online[p.id] ? ' · Đang online' : ''}</Label><Row>
    <Button title="Hồ sơ" onPress={() => router.push(`/user/${encodeURIComponent(p.username)}` as any)} />
    {(group === 'friends' || p.status === 'accepted') ? <><Button title="Nhắn tin" onPress={() => router.push({ pathname: '/chat/[id]', params: { id: p.id, name: p.displayname } } as any)} /><Button title="Huỷ kết bạn" danger disabled={task.busy} onPress={() => confirmAction('Huỷ kết bạn?', () => void action(p.id, 'decline'))} /></> : group === 'received' || (p.status === 'pending' && p.senderId !== user?.id) ? <><Button title="Chấp nhận" disabled={task.busy} onPress={() => void action(p.id, 'accept')} /><Button title="Từ chối" disabled={task.busy} onPress={() => void action(p.id, 'decline')} /></> : group === 'sent' || p.status === 'pending' ? <Button title="Huỷ lời mời" disabled={task.busy} onPress={() => void action(p.id, 'decline')} /> : <Button title="Kết bạn" disabled={task.busy} onPress={() => void action(p.id, 'request')} />}
  </Row></Card>;
  return <Screen title="Bạn bè & tin nhắn" loading={resource.loading} error={resource.error} onRefresh={resource.reload}><ErrorNotice message={task.error} />
    <Field label="Tìm người dùng" value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={() => void task.run(search)} /><Button title="Tìm kiếm" disabled={task.busy || !query.trim()} onPress={() => void task.run(search)} />
    {results.map(p => person(p, 'search'))}
    <Label large>Lời mời nhận được ({resource.data?.received.length || 0})</Label>{resource.data?.received.map(p => person(p, 'received'))}
    <Label large>Bạn bè ({resource.data?.friends.length || 0})</Label>{resource.data?.friends.map(p => person(p, 'friends'))}
    <Label large>Đã gửi ({resource.data?.sent.length || 0})</Label>{resource.data?.sent.map(p => person(p, 'sent'))}
  </Screen>;
}
