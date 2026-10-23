import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Icons from '../components/Icons';
import { PageError, PageLoading } from '../components/LoadState';
import RuleContent from '../components/RuleContent';
import { useRules } from '../hooks/useRules';
import type { Rule } from '../types';
import '../styles/rules.css';

interface ManageRulesProps {
    API_BASE: string;
    userId: number;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    showToast: (msg: string) => void;
    triggerConfirm: (msg: string, callback: () => void) => void;
}
type RuleDraft = { base: Rule | null; title: string; content: string; orderIndex: string };
const validRule = (value: Rule) => value && Number.isSafeInteger(value.id) && typeof value.title === 'string' && typeof value.content === 'string' && Number.isInteger(value.order_index);
function recoverDraft(key: string): RuleDraft | null {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        if (value && typeof value.title === 'string' && typeof value.content === 'string' && typeof value.orderIndex === 'string' && (value.base === null || validRule(value.base))) return value;
    } catch { /* Storage may be unavailable or an old draft may be invalid. */ }
    return null;
}
const toDraft = (rule: Rule): RuleDraft => ({ base: rule, title: rule.title, content: rule.content, orderIndex: String(rule.order_index) });
const sortRules = (rules: Rule[]) => [...rules].sort((a, b) => a.order_index - b.order_index || a.id - b.id);

export default function ManageRules({ API_BASE, userId, fetchWithAuth, showToast, triggerConfirm }: ManageRulesProps) {
    const { rules, setRules, loading, error, retry } = useRules(API_BASE);
    const draftKey = `mugen_rule_draft:${userId}`;
    const [draft, setDraft] = useState<RuleDraft | null>(() => recoverDraft(draftKey));
    const [recovered, setRecovered] = useState(() => Boolean(recoverDraft(draftKey)));
    const [preview, setPreview] = useState(false);
    const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
    const busyRef = useRef(false);
    const [saveError, setSaveError] = useState('');
    const [storageError, setStorageError] = useState(false);
    const [conflict, setConflict] = useState<Rule | null>(null);
    const dirty = Boolean(draft && (draft.base
        ? draft.title !== draft.base.title || draft.content !== draft.base.content || draft.orderIndex !== String(draft.base.order_index)
        : draft.title || draft.content));

    useEffect(() => {
        try {
            if (dirty && draft) localStorage.setItem(draftKey, JSON.stringify(draft));
            else localStorage.removeItem(draftKey);
            setStorageError(false);
        } catch { setStorageError(true); }
    }, [draft, dirty, draftKey]);
    useEffect(() => {
        if (!dirty || !storageError) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty, storageError]);

    const replaceDraft = (next: RuleDraft | null) => {
        if (busyRef.current) return;
        const apply = () => { setDraft(next); setPreview(false); setSaveError(''); setConflict(null); setRecovered(false); };
        if (dirty) triggerConfirm('Bỏ các thay đổi chưa công bố của điều khoản đang soạn? Bản đã công bố vẫn được giữ nguyên.', apply);
        else apply();
    };
    const updateDraft = (field: 'title' | 'content' | 'orderIndex', value: string) => {
        setDraft(previous => previous ? { ...previous, [field]: value } : previous);
        setSaveError('');
    };
    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!draft || !dirty || busyRef.current) return;
        const title = draft.title.trim(), content = draft.content.trim(), orderIndex = Number(draft.orderIndex);
        if (!title || !content || title.length > 255 || new TextEncoder().encode(content).length > 60000 || draft.orderIndex.trim() === '' || !Number.isInteger(orderIndex) || orderIndex < 0 || orderIndex > 1000000) {
            setSaveError('Nhập tiêu đề (tối đa 255 ký tự), nội dung (tối đa 60 KB) và thứ tự nguyên từ 0 đến 1.000.000.'); return;
        }
        busyRef.current = true; setBusy('save'); setSaveError(''); setConflict(null);
        try {
            const response = await fetchWithAuth(`${API_BASE}/admin/rules${draft.base ? `/${draft.base.id}` : ''}`, {
                method: draft.base ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, orderIndex, ...(draft.base ? { baseRule: draft.base } : {}) })
            });
            const data = await response.json();
            if (!response.ok || !data.success || !validRule(data.rule)) {
                if (response.status === 409 && validRule(data.rule)) setConflict(data.rule);
                throw new Error(data.error || 'Chưa công bố được thay đổi. Vui lòng thử lại.');
            }
            setRules(previous => sortRules([...previous.filter(rule => rule.id !== data.rule.id), data.rule]));
            setDraft(toDraft(data.rule)); setRecovered(false);
            showToast(draft.base ? 'Đã cập nhật quy định công khai.' : 'Đã công bố điều khoản mới.');
        } catch (error) {
            setSaveError(error instanceof Error && error.message !== 'Failed to fetch' ? error.message : 'Mất kết nối. Nội dung đang soạn vẫn được giữ lại, bạn có thể thử lại.');
        } finally { busyRef.current = false; setBusy(null); }
    };
    const deleteRule = () => {
        const rule = draft?.base;
        if (!rule || busyRef.current) return;
        triggerConfirm(`Xóa “${rule.title}” khỏi quy định công khai? Thao tác này không thể hoàn tác.${dirty ? ' Nội dung đang sửa của điều khoản này cũng sẽ bị bỏ.' : ''}`, () => {
            if (busyRef.current) return;
            busyRef.current = true; setBusy('delete'); setSaveError('');
            void (async () => {
                try {
                    const response = await fetchWithAuth(`${API_BASE}/admin/rules/${rule.id}`, {
                        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseRule: rule })
                    });
                    const data = await response.json();
                    if (!response.ok || !data.success) {
                        if (response.status === 409 && validRule(data.rule)) setConflict(data.rule);
                        throw new Error(data.error || 'Chưa xóa được điều khoản.');
                    }
                    setRules(previous => previous.filter(item => item.id !== rule.id));
                    setDraft(null); setRecovered(false); setConflict(null); showToast('Đã xóa điều khoản khỏi trang công khai.');
                } catch (error) { setSaveError(error instanceof Error ? error.message : 'Chưa xóa được điều khoản. Vui lòng thử lại.'); }
                finally { busyRef.current = false; setBusy(null); }
            })();
        });
    };

    return <div className="rules-page rules-admin">
        <header className="rules-heading">
            <div className="rules-heading-top"><a className="rules-back-link" href="#/admin-dashboard"><Icons.ArrowLeft size={15} /> Quản trị</a><a className="outline-btn" href="#/rules"><Icons.Eye size={15} /> Xem trang công khai</a></div>
            <span className="rules-eyebrow">QUẢN TRỊ NỘI DUNG</span><h1>Quy định cộng đồng</h1>
            <p>Soạn từng điều khoản, kiểm tra cách hiển thị rồi công bố cho cộng đồng.</p>
        </header>
        {loading && !rules.length && !draft ? <PageLoading reader /> : <>
            {error && <PageError message={error} onRetry={retry} />}
            <div className="rules-admin-layout">
                <aside className="rules-admin-list" aria-label="Danh sách điều khoản">
                    <div className="rules-list-heading"><h2>Điều khoản <span>{rules.length}</span></h2><button type="button" className="primary-btn" disabled={Boolean(busy) || loading || Boolean(error)} onClick={() => replaceDraft({ base: null, title: '', content: '', orderIndex: String(Math.min(1000000, Math.max(0, ...rules.map(rule => rule.order_index)) + 10)) })}><Icons.Plus size={15} /> Thêm mới</button></div>
                    {!loading && !error && !rules.length && <p className="rules-list-empty">Chưa có điều khoản nào. Bắt đầu bằng một bản soạn mới.</p>}
                    {rules.map((rule, index) => <button type="button" key={rule.id} disabled={Boolean(busy)} className={`rules-list-item ${draft?.base?.id === rule.id ? 'selected' : ''}`} aria-pressed={draft?.base?.id === rule.id} onClick={() => { if (draft?.base?.id !== rule.id) replaceDraft(toDraft(rule)); }}><span>{String(index + 1).padStart(2, '0')}</span><span>{rule.title}<small>Thứ tự: {rule.order_index}</small></span><Icons.Edit size={14} /></button>)}
                    <p className="rules-sidebar-note">Danh sách này là nội dung đang công khai. Bản đang soạn chỉ được lưu trên trình duyệt cho tài khoản của bạn.</p>
                </aside>
                <section className="rules-editor" aria-label="Soạn điều khoản">
                    {!draft ? <div className="rules-empty"><Icons.FileText size={32} /><h2>Chọn một điều khoản để chỉnh sửa</h2><p>Hoặc thêm điều khoản mới. Bạn có thể xem trước trước khi công bố.</p></div> : <form onSubmit={save} noValidate>
                        <div className="rules-editor-heading"><div><span className="rules-eyebrow">{draft.base ? 'CHỈNH SỬA ĐIỀU KHOẢN' : 'ĐIỀU KHOẢN MỚI'}</span><h2>{draft.base ? draft.base.title : 'Soạn điều khoản'}</h2></div><span className={`rules-draft-status ${dirty ? 'is-dirty' : ''}`} role="status">{busy === 'save' ? 'Đang công bố…' : dirty ? (storageError ? 'Chưa lưu bản soạn' : 'Bản soạn trên thiết bị') : draft.base ? 'Đã công bố' : 'Chưa công bố'}</span></div>
                        {recovered && dirty && <p className="rules-notice" role="status">Đã khôi phục nội dung đang soạn trên thiết bị này. Thay đổi chưa được công bố.</p>}
                        {storageError && dirty && <p className="rules-form-error" role="alert">Trình duyệt chưa lưu được bản soạn. Hãy sao chép nội dung trước khi rời trang.</p>}
                        <div className="rules-editor-tabs" aria-label="Chế độ soạn thảo"><button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}><Icons.Edit size={15} /> Soạn thảo</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)}><Icons.Eye size={15} /> Xem trước</button></div>
                        <fieldset disabled={Boolean(busy)} className={preview ? 'rules-fields is-hidden' : 'rules-fields'}>
                            <div className="rules-field-row"><label htmlFor="rule-title">Tiêu đề điều khoản<input id="rule-title" value={draft.title} onChange={event => updateDraft('title', event.target.value)} maxLength={255} placeholder="Ví dụ: Điều 1. Quy chuẩn đăng tải" required /></label><label htmlFor="rule-order">Thứ tự hiển thị<input id="rule-order" type="number" min="0" max="1000000" step="1" value={draft.orderIndex} onChange={event => updateDraft('orderIndex', event.target.value)} aria-describedby="rule-order-hint" required /><small id="rule-order-hint">Số nhỏ hiển thị trước.</small></label></div>
                            <label htmlFor="rule-content">Nội dung<textarea id="rule-content" value={draft.content} onChange={event => updateDraft('content', event.target.value)} rows={17} placeholder="Nhập nội dung quy định…" aria-describedby="rule-content-hint" required /></label><p id="rule-content-hint" className="rules-field-hint">Văn bản thuần. Xuống dòng để ngắt ý; để một dòng trống để tách đoạn.</p>
                        </fieldset>
                        {preview && <div className="rules-preview"><p className="rules-preview-label">BẢN XEM TRƯỚC · CHƯA CÔNG BỐ</p><RuleContent preview rule={{ id: draft.base?.id || 0, title: draft.title.trim() || 'Tiêu đề điều khoản', content: draft.content.trim() || 'Nội dung điều khoản sẽ hiển thị tại đây.' }} /></div>}
                        {saveError && <div className="rules-form-error" role="alert"><p>{saveError}</p>{conflict && <button type="button" className="outline-btn" disabled={Boolean(busy)} onClick={() => {
                            const latest = conflict;
                            triggerConfirm('Nạp bản đã được cập nhật trên máy chủ? Nội dung đang soạn sẽ được thay thế bằng bản này.', () => { setRules(previous => sortRules([...previous.filter(rule => rule.id !== latest.id), latest])); setDraft(toDraft(latest)); setConflict(null); setSaveError(''); setRecovered(false); });
                        }}>Nạp bản mới từ máy chủ</button>}</div>}
                        <div className="rules-publish-note"><Icons.Eye size={16} /><p>“{draft.base ? 'Công bố thay đổi' : 'Công bố điều khoản'}” sẽ cập nhật trang quy định ngay lập tức. Nội dung đang soạn chưa ảnh hưởng đến độc giả.</p></div>
                        <div className="rules-editor-actions"><div>{draft.base && <button type="button" className="rules-delete-btn" disabled={Boolean(busy)} onClick={deleteRule}><Icons.Trash size={15} /> {busy === 'delete' ? 'Đang xóa…' : 'Xóa điều khoản'}</button>}</div><div><button type="button" className="outline-btn" disabled={Boolean(busy)} onClick={() => replaceDraft(null)}>Đóng bản soạn</button><button type="submit" className="primary-btn" disabled={!dirty || Boolean(busy)}>{busy === 'save' ? 'Đang công bố…' : draft.base ? 'Công bố thay đổi' : 'Công bố điều khoản'}</button></div></div>
                    </form>}
                </section>
            </div>
        </>}
    </div>;
}
