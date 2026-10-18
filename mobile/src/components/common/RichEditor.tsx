import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { editorDocument } from '@/utils/editorDocument';
import { usePalette } from './Screen';

export default function RichEditor({ value, onChange, disabled = false }: { disabled?: boolean; value: string; onChange: (html: string) => void }) {
  const c = usePalette(); const ref = useRef<WebView>(null); const last = useRef(value);
  const html = useMemo(() => editorDocument(value, c.text, c.card), [c.text, c.card]);
  useEffect(() => { ref.current?.postMessage(JSON.stringify({ type: 'disabled', value: disabled })); }, [disabled]);
  useEffect(() => { if (value !== last.current) { last.current = value; ref.current?.postMessage(JSON.stringify({ type: 'set', value })); } }, [value]);
  return <View style={{ height: 440, borderWidth: 1, borderColor: c.border, borderRadius: 8, overflow: 'hidden' }}><WebView ref={ref} originWhitelist={['about:*']} source={{ html }} javaScriptEnabled nestedScrollEnabled keyboardDisplayRequiresUserAction={false} onShouldStartLoadWithRequest={request => request.url === 'about:blank'} onMessage={event => {
    try { const message = JSON.parse(event.nativeEvent.data); if (message.type === 'change' && typeof message.value === 'string') { last.current = message.value; onChange(message.value); } if (message.type === 'ready') ref.current?.postMessage(JSON.stringify({ type: 'set', value: last.current })); } catch { /* Ignore messages outside the editor contract. */ }
  }} /></View>;
}
