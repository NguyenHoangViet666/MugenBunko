import RichEditor from '@/components/common/RichEditor';
import ImageUpload from '@/components/common/ImageUpload';
import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorNotice, Field, Label, Row, Screen, Sheet, confirmAction, useTask } from '@/components/common/Screen';
import { plainText, textHtml } from '@/utils/content';
import RichContent from '@/components/common/RichContent';
import { usePalette } from '@/components/common/Screen';
import { Chapter } from '@/types';

type Draft = { title: string; volumeName: string; content: string; html: boolean; schedule: string };
type Version = { id: number; title: string; createdAt: string; source: string; editorName: string };
const blank: Draft = { title: '', volumeName: 'Tập 1', content: '', html: false, schedule: '' };
const localSchedule = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
export default function EditorScreen() {
  const { novelId, chapterId } = useLocalSearchParams<{ novelId: string; chapterId?: string }>();
  const palette = usePalette();
  const { user } = useAuth(); const router = useRouter(); const task = useTask();
  const [draft, setDraft] = useState<Draft>(blank); const [ready, setReady] = useState(false); const [status, setStatus] = useState('');
  const [versions, setVersions] = useState<Version[] | null>(null); const [preview, setPreview] = useState(false);
  const [versionPreview, setVersionPreview] = useState<Chapter | null>(null);
  const [localDraft, setLocalDraft] = useState<Draft | null>(null); const [saveError, setSaveError] = useState('');
  const key = `mugen_draft_${user?.id}_${novelId}_${chapterId || 'new'}`;
  const latest = useRef(draft); latest.current = draft;
  const saved = useRef(false);
  const dirty = useRef(false);
  const [loadError, setLoadError] = useState('');
  const changeDraft = (value: Draft | ((previous: Draft) => Draft)) => { dirty.current = true; saved.current = false; setDraft(value); };
  useEffect(() => {
    let active = true;
    setReady(false); setLoadError(''); setLocalDraft(null); dirty.current = false;
    const load = async () => {
      const cached = await AsyncStorage.getItem(key);
      const ch = chapterId ? (await api.get<Chapter>(`/chapters/${chapterId}`)).data : null;
      if (!active) return;
      if (ch && ch.novel_id !== Number(novelId)) throw new Error('Invalid chapter');
      setDraft(ch ? { title: ch.title, volumeName: ch.volume_name, content: ch.content || '', html: true, schedule: localSchedule(ch.scheduled_release) } : blank);
      setStatus(ch?.status || 'draft'); if (cached) setLocalDraft(JSON.parse(cached)); setReady(true);
    };
    void load().catch(() => { if (active) setLoadError('Không thể tải bản thảo. Quay lại rồi mở chương để thử lại.'); });
    return () => { active = false; };
  }, [key]);
  useEffect(() => {
    if (!ready || !dirty.current) return;
    const timer = setTimeout(() => { if (saved.current) return; void AsyncStorage.setItem(key, JSON.stringify(draft)).catch(() => setSaveError('Không thể lưu bản nháp trên máy. Hãy lưu lên máy chủ.')); }, 600);
    return () => clearTimeout(timer);
  }, [draft, ready, key]);
  useEffect(() => () => { if (ready && dirty.current && !saved.current) void AsyncStorage.setItem(key, JSON.stringify(latest.current)).catch(() => {}); }, [key, ready]);
  const html = () => draft.html ? draft.content : textHtml(draft.content);
  const hasContent = !!plainText(html()).trim() || /<img\b/i.test(html());
  const save = (target: 'draft' | 'published' | 'scheduled') => task.run(async () => {
    let scheduledRelease: string | null = null;
    if (target === 'scheduled') {
      const date = new Date(draft.schedule);
      if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw { response: { data: { error: 'Nhập thời gian trong tương lai, dạng 2026-12-20T20:00.' } } };
      // Keep the same local datetime contract used by the web Studio.
      scheduledRelease = draft.schedule.trim();
    }
    const { data } = await api.post('/chapters', { id: chapterId ? Number(chapterId) : undefined, novelId: Number(novelId), title: draft.title.trim(), volumeName: draft.volumeName.trim(), content: html(), status: target, scheduledRelease, source: 'save' });
    saved.current = true; dirty.current = false; await AsyncStorage.removeItem(key);
    router.replace({ pathname: '/studio/chapter/[novelId]', params: { novelId, chapterId: data.chapterId } } as any);
    setStatus(data.status);
  });
  return <Screen title={chapterId ? 'Soạn thảo chương' : 'Chương mới'} error={loadError || task.error || saveError} loading={!ready && task.busy}>
    {localDraft && <Card><Label>Có bản nháp trên thiết bị chưa gửi lên máy chủ.</Label><Row><Button title="Khôi phục bản nháp" onPress={() => { changeDraft(localDraft); setLocalDraft(null); }} /><Button title="Dùng bản máy chủ" onPress={() => { setLocalDraft(null); void AsyncStorage.removeItem(key); }} /></Row></Card>}
    {ready && <><Label muted>Trạng thái: {status} · Bản nháp được tự lưu trên thiết bị.</Label>
      <Field label="Tên tập" maxLength={100} value={draft.volumeName} editable={!task.busy} onChangeText={volumeName => changeDraft(previous => ({ ...previous, volumeName }))} /><Field label="Tiêu đề chương" maxLength={255} value={draft.title} editable={!task.busy} onChangeText={title => changeDraft(previous => ({ ...previous, title }))} />
      <Button title="Xem trước" onPress={() => setPreview(true)} />
      <RichEditor disabled={task.busy} value={html()} onChange={content => changeDraft(previous => ({ ...previous, content, html: true }))} />
      <ImageUpload label="Chèn ảnh minh hoạ" onChange={url => changeDraft(previous => ({ ...previous, html: true, content: `${previous.html ? previous.content : textHtml(previous.content)}<figure><img src="${url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" /></figure>` }))} />
      <Label muted>{plainText(draft.content).trim().split(/\s+/).filter(Boolean).length} từ</Label>
      <Row><Button title="Lưu nháp" disabled={task.busy || !draft.title.trim() || !hasContent} onPress={() => void save('draft')} /><Button title={user?.roles.includes('admin') || status === 'published' ? 'Xuất bản / cập nhật' : 'Gửi kiểm duyệt'} disabled={task.busy || !draft.title.trim() || !hasContent} onPress={() => confirmAction('Gửi nội dung chương?', () => void save('published'))} /></Row>
      <Field label="Lịch phát hành (giờ máy, YYYY-MM-DDTHH:mm)" value={draft.schedule} editable={!task.busy} onChangeText={schedule => changeDraft(previous => ({ ...previous, schedule }))} placeholder="2026-12-20T20:00" /><Button title="Gửi duyệt với lịch phát hành" disabled={task.busy || !draft.schedule || !draft.title.trim() || !hasContent} onPress={() => void save('scheduled')} />
      {chapterId && <Button title="Lịch sử phiên bản" disabled={task.busy} onPress={() => void task.run(async () => setVersions((await api.get<Version[]>(`/chapters/${chapterId}/versions`)).data))} />}
    </>}
    <Sheet title="Xem trước nội dung" visible={preview} onClose={() => setPreview(false)}><Label large>{draft.title}</Label><RichContent html={html()} color={palette.text} /></Sheet>
    <Sheet title="Lịch sử bản thảo" visible={versions !== null} onClose={() => { setVersions(null); setVersionPreview(null); }}><ErrorNotice message={task.error} />
      {versionPreview && <Card><Label large>{versionPreview.title}</Label><RichContent html={versionPreview.content || ''} color={palette.text} /></Card>}
      {versions?.map(v => <Card key={v.id}><Label>{v.title}</Label><Label muted>{v.createdAt} · {v.editorName} · {v.source}</Label><Row><Button title="Xem bản này" disabled={task.busy} onPress={() => void task.run(async () => setVersionPreview((await api.get(`/chapters/${chapterId}/versions/${v.id}`)).data))} /><Button title="Khôi phục" disabled={task.busy} onPress={() => confirmAction('Khôi phục phiên bản về bản nháp?', () => void task.run(async () => { const { data } = await api.post<Chapter>(`/chapters/${chapterId}/versions/${v.id}/restore`, { currentDraft: { title: draft.title, volumeName: draft.volumeName, content: html() } }); changeDraft({ title: data.title, volumeName: data.volume_name, content: data.content || '', html: true, schedule: '' }); setStatus('draft'); setVersions(null); }))} /></Row></Card>)}
    </Sheet>
  </Screen>;
}
