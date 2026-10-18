import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import api from '@/services/api/client';
import { getSocket, initializeSocket } from '@/services/socket/socketClient';
import { useAuth } from '@/context/AuthContext';
import { Button, ErrorNotice, Field, Row, usePalette, useTask } from '@/components/common/Screen';

type Message = { id: number; sender_id: number; receiver_id: number; message: string; message_text?: string; text?: string; created_at: string; date?: string };
export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const friendId = Number(id); const { user, token } = useAuth(); const c = usePalette(); const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]); const [text, setText] = useState('');
  const [more, setMore] = useState(true); const [connected, setConnected] = useState(false); const task = useTask();
  const initialized = useRef(false);
  const listRef = useRef<FlatList<Message>>(null);
  const merge = useCallback((items: Message[]) => setMessages(previous => [...new Map([...previous, ...items].map(m => [m.id, m])).values()].sort((a, b) => b.id - a.id)), []);
  const load = useCallback(async (before?: number) => {
    const { data } = await api.get<Message[]>(`/social/messages/chat/${friendId}`, { params: before ? { before } : {} });
    merge(data); if (before || !initialized.current) setMore(data.length === 100); initialized.current = true;
  }, [friendId, merge]);
  useFocusEffect(useCallback(() => {
    void task.run(() => load());
    const socket = token ? initializeSocket(token) : getSocket(); let active = true;
    const receive = (m: Message) => { if (Number(m.sender_id) === friendId) { merge([m]); void load().catch(() => {}); } };
    const reconnect = () => { setConnected(true); void load().catch(() => {}); };
    const disconnect = () => setConnected(false);
    setConnected(!!socket?.connected);
    socket?.on('receive_message', receive); socket?.on('connect', reconnect); socket?.on('disconnect', disconnect);
    const poll = setInterval(() => { if (active && AppState.currentState === 'active') void load().catch(() => {}); }, 15000);
    return () => { active = false; clearInterval(poll); socket?.off('receive_message', receive); socket?.off('connect', reconnect); socket?.off('disconnect', disconnect); };
  }, [friendId, load, merge, token]));
  const send = () => task.run(async () => {
    const content = text.trim(); if (!content) return;
    const socket = getSocket();
    if (socket?.connected) {
      const result = await new Promise<{ success: boolean; message?: Message; error?: string }>((resolve, reject) => socket.timeout(10000).emit('send_message', { receiverId: friendId, messageText: content }, (err: Error | null, data: any) => err ? reject(err) : resolve(data)));
      if (!result.success || !result.message) throw { response: { data: { error: result.error || 'Chưa xác nhận gửi. Tải lại cuộc trò chuyện trước khi thử lại.' } } };
      merge([result.message]);
    } else {
      await api.post('/social/messages/send', { receiverId: friendId, messageText: content }); await load();
    }
    setText(''); listRef.current?.scrollToOffset({ offset: 0, animated: true });
  });
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={{ padding: 12 }}><Row><Button title="‹ Quay lại" onPress={() => router.back()} /><Text style={{ color: c.text, fontSize: 18, flex: 1 }}>{name || 'Cuộc trò chuyện'}</Text></Row><Text style={{ color: c.textMuted, marginTop: 8 }}>{connected ? 'Đã kết nối realtime' : 'Đang kết nối · tự cập nhật mỗi 15 giây'}</Text><ErrorNotice message={task.error} retry={() => void task.run(() => load())} /></View>
    <FlatList ref={listRef} inverted data={messages} keyExtractor={m => String(m.id)} contentContainerStyle={{ padding: 16, gap: 12 }} ListFooterComponent={more && messages.length ? <Button title="Tin nhắn cũ hơn" disabled={task.busy} onPress={() => void task.run(() => load(messages[messages.length - 1].id))} /> : null} renderItem={({ item }) => <View style={{ alignSelf: item.sender_id === user?.id ? 'flex-end' : 'flex-start', maxWidth: '88%', padding: 12, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12 }}><Text selectable style={{ color: c.text, lineHeight: 22 }}>{item.message_text || item.message || item.text}</Text><Text style={{ color: c.textMuted, fontSize: 10, marginTop: 6 }}>{item.date || item.created_at}</Text></View>} />
    <View style={{ padding: 12, gap: 8 }}><Field label="Tin nhắn" value={text} onChangeText={setText} multiline maxLength={5000} style={{ minHeight: 48, maxHeight: 120 }} /><Button title={task.busy ? 'Đang gửi…' : 'Gửi'} disabled={task.busy || !text.trim()} onPress={send} /></View>
  </KeyboardAvoidingView></SafeAreaView>;
}
