import React, { PropsWithChildren, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export const usePalette = () => Colors[useColorScheme()];
export const errorMessage = (error: unknown) => (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Không thể hoàn tất. Kiểm tra kết nối và thử lại.';
export const confirmAction = (title: string, action: () => void, detail = 'Thao tác này sẽ thay đổi dữ liệu đã lưu.') => {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n${detail}`)) action(); }
  else Alert.alert(title, detail, [{ text: 'Huỷ', style: 'cancel' }, { text: 'Xác nhận', style: 'destructive', onPress: action }]);
};

export function useTask() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(errorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  return { busy, error, run };
}

export function useResource<T>(loader: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try { const result = await loader(); if (current === generation.current) setData(result); }
    catch (e) { if (current === generation.current) setError(errorMessage(e)); }
    finally { if (current === generation.current) setLoading(false); }
  }, deps);
  useFocusEffect(useCallback(() => { void reload(); return () => { generation.current++; }; }, [reload]));
  return { data, setData, loading, error, reload };
}

export function Label({ children, muted = false, large = false }: PropsWithChildren<{ muted?: boolean; large?: boolean }>) {
  const c = usePalette();
  return <Text selectable style={{ color: muted ? c.textMuted : c.text, fontSize: large ? 19 : 14, fontWeight: large ? '700' : '400', lineHeight: large ? 27 : 22 }}>{children}</Text>;
}
export function Button({ title, onPress, disabled, danger = false }: { title: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const c = usePalette();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, { borderColor: danger ? c.accent : c.border, backgroundColor: c.card, opacity: disabled || pressed ? 0.5 : 1 }]}><Text style={{ color: danger ? c.accent : c.text, fontWeight: '600', textAlign: 'center' }}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = usePalette();
  return <View style={{ gap: 6 }}><Label muted>{label}</Label><TextInput accessibilityLabel={label} placeholderTextColor={c.textMuted} {...props} style={[s.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }, props.multiline && { minHeight: 110, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Card({ children }: PropsWithChildren) {
  const c = usePalette(); return <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>{children}</View>;
}
export function Row({ children }: PropsWithChildren) { return <View style={s.row}>{children}</View>; }
export function ErrorNotice({ message, retry }: { message?: string; retry?: () => void }) {
  return message ? <Card><Label>{message}</Label>{retry && <Button title="Thử lại" onPress={retry} />}</Card> : null;
}
export function Screen({ title, children, loading, error, onRefresh }: PropsWithChildren<{ title: string; loading?: boolean; error?: string; onRefresh?: () => void }>) {
  const c = usePalette(); const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={s.header}><Button title="‹ Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} /><View style={{ flex: 1 }}><Label large>{title}</Label></View></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} refreshControl={onRefresh ? <RefreshControl refreshing={!!loading} onRefresh={onRefresh} tintColor={c.tint} /> : undefined}>
      <ErrorNotice message={error} retry={onRefresh} />{loading && !onRefresh ? <ActivityIndicator color={c.tint} /> : null}{children}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Sheet({ title, visible, onClose, children }: PropsWithChildren<{ title: string; visible: boolean; onClose: () => void }>) {
  const c = usePalette();
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: c.background }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={s.header}><View style={{ flex: 1 }}><Label large>{title}</Label></View><Button title="Đóng" onPress={onClose} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>;
}
const s = StyleSheet.create({ header: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, content: { padding: 16, gap: 16, paddingBottom: 40 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { minHeight: 44, borderWidth: 1, borderRadius: 8, padding: 12, justifyContent: 'center' }, input: { minHeight: 48, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 }, card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 } });
