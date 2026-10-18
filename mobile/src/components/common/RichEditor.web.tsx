import React, { useEffect, useMemo, useRef } from 'react';
import { editorDocument } from '@/utils/editorDocument';
import { usePalette } from './Screen';

export default function RichEditor({ value, onChange, disabled = false }: { disabled?: boolean; value: string; onChange: (html: string) => void }) {
  const c = usePalette(); const ref = useRef<HTMLIFrameElement>(null); const last = useRef(value); const change = useRef(onChange); change.current = onChange;
  const html = useMemo(() => editorDocument(value, c.text, c.card), [c.text, c.card]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      if (event.data?.type === 'change' && typeof event.data.value === 'string') { last.current = event.data.value; change.current(event.data.value); }
      if (event.data?.type === 'ready') ref.current?.contentWindow?.postMessage({ type: 'set', value: last.current }, '*');
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => { ref.current?.contentWindow?.postMessage({ type: 'disabled', value: disabled }, '*'); }, [disabled]);
  useEffect(() => { if (value !== last.current) { last.current = value; ref.current?.contentWindow?.postMessage({ type: 'set', value }, '*'); } }, [value]);
  return <iframe ref={ref} title="Nội dung chương" sandbox="allow-scripts" srcDoc={html} style={{ height: 440, width: '100%', border: `1px solid ${c.border}`, borderRadius: 8, background: c.card }} />;
}
