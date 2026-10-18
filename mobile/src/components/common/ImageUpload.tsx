import React from 'react';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import api, { resolveCoverUrl, SERVER_HOST } from '@/services/api/client';
import { Button, ErrorNotice, useTask } from './Screen';

export default function ImageUpload({ value, onChange, label = 'Chọn ảnh từ thư viện' }: { value?: string; onChange: (url: string) => void; label?: string }) {
  const task = useTask();
  const choose = () => task.run(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const context = ImageManipulator.manipulate(asset.uri);
    if (asset.width > 1600) context.resize({ width: 1600 });
    const rendered = await context.renderAsync();
    const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    if (!image.base64 || image.base64.length > 6.6 * 1024 * 1024) throw { response: { data: { error: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5 MB.' } } };
    const { data } = await api.post<{ url: string }>('/upload', { image: `data:image/jpeg;base64,${image.base64}`, type: 'mobile' }, { timeout: 30000 });
    // Local upload servers may return localhost; the phone must use the configured backend host.
    const url = new URL(data.url, SERVER_HOST);
    onChange(['localhost', '127.0.0.1'].includes(url.hostname) ? `${SERVER_HOST}${url.pathname}` : url.href);
  });
  return <>{!!value && <Image accessibilityLabel="Ảnh đã chọn" source={{ uri: resolveCoverUrl(value) }} resizeMode="contain" style={{ width: '100%', height: 180 }} />}<ErrorNotice message={task.error} /><Button title={task.busy ? 'Đang tải ảnh…' : label} disabled={task.busy} onPress={choose} /></>;
}
