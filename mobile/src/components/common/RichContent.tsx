import React, { useState } from 'react';
import { Image, Linking, Text, TextStyle, View } from 'react-native';
import { resolveCoverUrl } from '@/services/api/client';
import { contentBlocks, plainText } from '@/utils/content';
function ContentImage({ src }: { src: string }) {
  const [ratio, setRatio] = useState(1.5);
  return <Image accessibilityLabel="Minh hoạ" source={{ uri: resolveCoverUrl(src) }} resizeMode="contain" style={{ width: '100%', aspectRatio: ratio, marginVertical: 12 }} onLoad={e => { const { width, height } = e.nativeEvent.source; if (width && height) setRatio(width / height); }} />;
}
function inline(html: string, color: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let end = 0;
  for (const match of html.matchAll(/<(strong|b|em|i|u|s|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    result.push(plainText(html.slice(end, match.index)));
    const tag = match[1].toLowerCase(); const href = match[2].match(/href=["']([^"']+)["']/i)?.[1];
    const style: TextStyle = tag === 'strong' || tag === 'b' ? { fontWeight: '700' } : tag === 'em' || tag === 'i' ? { fontStyle: 'italic' } : { textDecorationLine: tag === 's' ? 'line-through' : 'underline' };
    result.push(<Text key={match.index} style={style} onPress={tag === 'a' && href && /^https?:\/\//i.test(href) ? () => void Linking.openURL(href).catch(() => {}) : undefined}>{inline(match[3], color)}</Text>);
    end = match.index + match[0].length;
  }
  result.push(plainText(html.slice(end)));
  return result;
}
export default function RichContent({ html, color, fontSize = 16, lineHeight = 1.75, fontFamily, onBlockLayout }: { html: string; color: string; fontSize?: number; lineHeight?: number; fontFamily?: string; onBlockLayout?: (index: number, y: number, height: number) => void }) {
  return <View>{contentBlocks(html).map((block, i) => {
    const heading = /^<h[1-6]/i.test(block); const quote = /^<blockquote/i.test(block);
    const sources = [...block.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m => plainText(m[1]));
    return <View key={i} onLayout={e => onBlockLayout?.(i, e.nativeEvent.layout.y, e.nativeEvent.layout.height)} style={{ paddingBottom: 16, ...(quote ? { borderLeftWidth: 2, borderLeftColor: color, paddingLeft: 12 } : {}) }}>
      {!!plainText(block).trim() && <Text selectable style={{ color, fontSize: heading ? fontSize + 4 : fontSize, fontFamily, lineHeight: (heading ? fontSize + 4 : fontSize) * lineHeight, fontWeight: heading ? '700' : '400' }}>{/^<li/i.test(block) ? '• ' : ''}{inline(block, color)}</Text>}
      {sources.map((src, index) => <ContentImage key={index} src={src} />)}
    </View>;
  })}</View>;
}
