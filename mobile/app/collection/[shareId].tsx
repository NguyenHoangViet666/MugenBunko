import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@/services/api/client';
import { Button, Card, Label, Screen, useResource } from '@/components/common/Screen';
import { Novel } from '@/types';
export default function PublicCollectionScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>(); const router = useRouter();
  const r = useResource(async () => (await api.get<{ name: string; description: string; ownerName: string; novels: Novel[] }>(`/library/public/${encodeURIComponent(shareId)}`)).data, [shareId]);
  return <Screen title={r.data?.name || 'Bộ sưu tập'} error={r.error} loading={r.loading} onRefresh={r.reload}><Label muted>{r.data?.ownerName}</Label><Label>{r.data?.description}</Label>{r.data?.novels.map(n => <Card key={n.id}><Label large>{n.title}</Label><Label muted>{n.author_name}</Label><Button title="Mở truyện" onPress={() => router.push(`/novel/${n.id}` as any)} /></Card>)}</Screen>;
}
