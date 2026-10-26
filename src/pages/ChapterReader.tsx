import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import type { Novel, User } from '../types';
import { Icons } from '../components/Icons';
import { PageError, PageLoading, SyncIndicator } from '../components/LoadState';
import { getReadingProgress, type ReadingProgress } from '../utils/readingProgress';
import type { SyncStatus } from '../hooks/useReadingSync';
import { useDialogFocus } from '../hooks/useDialogFocus';
import '../styles/reader.css';

interface ChapterReaderProps {
    novels: Novel[];
    activeNovelId: number | null;
    activeChapterIndex: number;
    setActiveChapterIndex: (idx: number) => void;
    setCurrentView: (view: string) => void;
    startReading: (novelId: number, chapterIndex: number) => void;
    navigateToChapter: (dir: 'prev' | 'next') => void;
    theme: string;
    setTheme: (theme: string) => void;
    handleThemeChange: (theme: string) => void;
    readerFont: string;
    setReaderFont: (font: string) => void;
    readerFontSize: number;
    setReaderFontSize: (size: number) => void;
    DB_KEYS: { font: string; fontSize: string; [key: string]: string };
    openNovelDetail: (id: number) => void;
    incrementReadCount: (id: number | null) => void;
    API_BASE: string;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    currentUser: User | null;
    syncStatus: SyncStatus;
    savePosition: (novel: Novel, position: Pick<ReadingProgress, 'chapterId' | 'chapterIndex' | 'scrollRatio' | 'paragraphIndex' | 'paragraphOffset'>) => void;
    syncNovel: (novel: Novel, keepalive?: boolean) => Promise<void>;
    markCompleted: (novel: Novel, chapterId: number) => void;
    onReward: () => void;
}

export default function ChapterReader(props: ChapterReaderProps) {
    const novel = props.novels.find(n => n.id === props.activeNovelId);
    const chapter = novel?.chapters?.filter(c => c.status === 'published')[props.activeChapterIndex];
    if (!novel || !chapter) return <PageError message="Chương này hiện không thể đọc." onRetry={() => props.setCurrentView('home')} />;
    return <ReaderChapter key={chapter.id + '-' + (props.currentUser?.id || 'guest')} {...props} novel={novel} chapterId={chapter.id} />;
}

function ReaderChapter(props: ChapterReaderProps & { novel: Novel; chapterId: number }) {
    const { novel, chapterId, activeChapterIndex, theme, readerFont, readerFontSize, currentUser, syncStatus } = props;
    const chapters = (novel.chapters || []).filter(c => c.status === 'published');
    const chapter = chapters[activeChapterIndex];
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [panel, setPanel] = useState<'toc' | 'settings' | null>(null);
    const [zen, setZen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completed, setCompleted] = useState(() => getReadingProgress(currentUser?.username, novel)?.completedChapterIds.includes(chapterId) || false);
    const [spacing, setSpacing] = useState(() => localStorage.getItem('mugen_reader_spacing') || 'normal');
    const articleRef = useRef<HTMLElement>(null);
    const panelRef = useDialogFocus(panel !== null);
    const reflowAnchor = useRef<{ element: HTMLElement; offset: number } | null>(null);
    const callbacks = useRef(props);
    const ready = useRef(false);
    const lastPosition = useRef('');
    useEffect(() => { callbacks.current = props; });

    const changeReadingLayout = (update: () => void) => {
        if (ready.current && window.scrollY > 0) {
            const anchor = [...(articleRef.current?.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, blockquote, li, figure') || [])]
                .find(element => element.getBoundingClientRect().bottom > 96);
            if (anchor) reflowAnchor.current = { element: anchor, offset: (96 - anchor.getBoundingClientRect().top) / Math.max(1, anchor.offsetHeight) };
        }
        update();
    };

    useLayoutEffect(() => {
        const anchor = reflowAnchor.current;
        reflowAnchor.current = null;
        if (anchor?.element.isConnected) {
            window.scrollTo({ top: Math.max(0, window.scrollY + anchor.element.getBoundingClientRect().top + anchor.element.offsetHeight * anchor.offset - 96), behavior: 'instant' });
        }
    }, [readerFont, readerFontSize, spacing]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(''); ready.current = false;
        callbacks.current.fetchWithAuth(props.API_BASE + '/chapters/' + chapterId, { signal: controller.signal })
            .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
            .then(data => { if (!controller.signal.aborted) { setContent(data.content || ''); setLoading(false); } })
            .catch(() => { if (!controller.signal.aborted) { setError('Không thể tải chương. Kiểm tra kết nối rồi thử lại nhé.'); setLoading(false); } });
        return () => controller.abort();
    }, [props.API_BASE, chapterId, attempt]);

    useEffect(() => {
        if (loading || error || !content) return;
        let disposed = false;
        let frame = 0;
        let savedAt = 0;
        const capture = (force = false) => {
            const article = articleRef.current;
            if (!ready.current || !article) return;
            if (document.visibilityState !== 'visible' && !force) return;
            const bounds = article.getBoundingClientRect();
            const travel = bounds.height - window.innerHeight + 96;
            const scrollRatio = travel <= 0 ? 1 : Math.min(1, Math.max(0, (96 - bounds.top) / travel));
            setProgress(Math.round(scrollRatio * 100));
            const paragraphs = [...article.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, blockquote, li, figure')];
            let paragraphIndex = paragraphs.findIndex(p => p.getBoundingClientRect().bottom > 96);
            if (paragraphIndex < 0) paragraphIndex = Math.max(0, paragraphs.length - 1);
            const anchor = paragraphs[paragraphIndex];
            const paragraphOffset = anchor ? Math.min(1, Math.max(0, (96 - anchor.getBoundingClientRect().top) / Math.max(1, anchor.offsetHeight))) : 0;
            const position = { chapterId, chapterIndex: activeChapterIndex, scrollRatio, paragraphIndex, paragraphOffset };
            const fingerprint = JSON.stringify(position);
            if (fingerprint !== lastPosition.current && (force || Date.now() - savedAt >= 1000)) {
                savedAt = Date.now();
                lastPosition.current = fingerprint;
                callbacks.current.savePosition(callbacks.current.novel, position);
            }
        };
        const restore = async () => {
            await document.fonts.ready;
            if (disposed) return;
            frame = requestAnimationFrame(() => {
                const article = articleRef.current;
                if (!article) return;
                const saved = getReadingProgress(currentUser?.username, novel);
                if (saved?.chapterId === chapterId && saved.scrollRatio > 0) {
                    const paragraphs = article.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, blockquote, li, figure');
                    const anchor = paragraphs[saved.paragraphIndex];
                    const target = anchor ? window.scrollY + anchor.getBoundingClientRect().top + anchor.offsetHeight * saved.paragraphOffset - 96
                        : window.scrollY + article.getBoundingClientRect().top + saved.scrollRatio * Math.max(0, article.offsetHeight - window.innerHeight + 96) - 96;
                    window.scrollTo({ top: Math.max(0, target), behavior: 'instant' });
                } else window.scrollTo({ top: 0, behavior: 'instant' });
                ready.current = true; capture(true);
            });
        };
        void restore();
        const localTimer = window.setInterval(capture, 2000);
        const cloudTimer = window.setInterval(() => { capture(true); void callbacks.current.syncNovel(callbacks.current.novel); }, 8000 + Math.random() * 4000);
        const flush = () => { capture(true); void callbacks.current.syncNovel(callbacks.current.novel, true); };
        const onScroll = () => capture();
        const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
        window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('pagehide', flush);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            flush(); disposed = true; ready.current = false; cancelAnimationFrame(frame);
            clearInterval(localTimer); clearInterval(cloudTimer); window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onVisibility);
        };
        // Restore once per loaded chapter; callbacks stay current without resetting the position.
    }, [content, loading, error, chapterId, activeChapterIndex, currentUser?.username]);

    useEffect(() => {
        if (loading || error || !content) return;
        let disposed = false;
        let sessionId = '';
        let visibleSeconds = 0;
        let inFlight = false;
        let retryAt = 0;
        let counted = false;
        let finished = completed;
        const beginSession = async () => {
            if (!currentUser || finished || inFlight || !navigator.onLine || disposed) return;
            inFlight = true;
            try {
                const response = await callbacks.current.fetchWithAuth(props.API_BASE + '/reader/sessions', { method: 'POST', body: JSON.stringify({ chapterId }) });
                if (response.ok && !disposed) sessionId = (await response.json()).sessionId;
                else retryAt = Date.now() + 15000;
            } catch { retryAt = Date.now() + 15000; }
            finally { inFlight = false; }
        };
        void beginSession();
        const timer = window.setInterval(async () => {
            if (document.visibilityState !== 'visible' || !ready.current) return;
            visibleSeconds += 1;
            if (visibleSeconds >= 15 && !counted) { counted = true; callbacks.current.incrementReadCount(novel.id); }
            const saved = getReadingProgress(currentUser?.username, callbacks.current.novel);
            if (currentUser && !sessionId && !finished && Date.now() >= retryAt) { void beginSession(); return; }
            if (visibleSeconds < 15 || finished || inFlight || disposed || Date.now() < retryAt || saved?.chapterId !== chapterId || saved.scrollRatio < 0.9) return;
            if (!currentUser) { finished = true; setCompleted(true); callbacks.current.markCompleted(callbacks.current.novel, chapterId); return; }
            if (!sessionId) return;
            inFlight = true;
            try {
                const response = await callbacks.current.fetchWithAuth(props.API_BASE + '/reader/complete', {
                    method: 'POST', body: JSON.stringify({ chapterId, sessionId, scrollRatio: saved!.scrollRatio }) });
                if (response.ok && !disposed) {
                    const reward = await response.json(); sessionId = ''; finished = true; setCompleted(true);
                    callbacks.current.markCompleted(callbacks.current.novel, chapterId);
                    if (reward.xpAwarded) callbacks.current.onReward();
                } else { if (response.status === 409) sessionId = ''; retryAt = Date.now() + 15000; }
            } catch { retryAt = Date.now() + 15000; }
            finally { inFlight = false; }
        }, 1000);
        return () => { disposed = true; clearInterval(timer); };
    }, [content, loading, error, chapterId, currentUser?.id, props.API_BASE]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (panel) setPanel(null);
                else setZen(false);
                return;
            }
            const target = event.target as HTMLElement;
            if (panel || event.altKey || event.ctrlKey || event.metaKey || target.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (event.key === 'ArrowLeft' && activeChapterIndex > 0) callbacks.current.navigateToChapter('prev');
            if (event.key === 'ArrowRight' && activeChapterIndex < chapters.length - 1) callbacks.current.navigateToChapter('next');
        };
        window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
    }, [activeChapterIndex, chapters.length, panel]);

    return <div className={'page-view active reader-page ' + (zen ? 'reader-zen' : '')}>
        {panel && <>
            <div className="reader-panel-backdrop" onClick={() => setPanel(null)} />
            <aside ref={panelRef} id="reader-panel" className={'reader-panel ' + (panel === 'toc' ? 'reader-toc-drawer open' : 'reader-settings-drawer')}
                role="dialog" aria-modal="true" aria-labelledby="reader-panel-title">
                <div className="reader-panel-heading">
                    <h2 id="reader-panel-title">{panel === 'toc' ? 'Mục lục' : 'Tùy chỉnh trang đọc'}</h2>
                    <button className="reader-tool-button reader-icon-button" aria-label={panel === 'toc' ? 'Đóng mục lục' : 'Đóng tùy chỉnh'} onClick={() => setPanel(null)}><Icons.X size={18} /></button>
                </div>
                {panel === 'toc' ? <>
                    <div className="reader-toc-novel-title">{novel.title}</div>
                    <div className="reader-toc-body">{chapters.map((ch, index) => <div key={ch.id}>
                        {(index === 0 || ch.volume_name !== chapters[index - 1].volume_name) && <div className="reader-toc-volume-header">{ch.volume_name || 'Các chương'}</div>}
                        <button className={'reader-toc-chapter-item ' + (index === activeChapterIndex ? 'active' : '')} aria-current={index === activeChapterIndex ? 'page' : undefined}
                            onClick={() => { setPanel(null); props.startReading(novel.id, index); }}>
                            <span className="reader-toc-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{ch.title}</span>
                        </button>
                    </div>)}</div>
                </> : <div className="reader-settings-body">
                    <fieldset className="reader-setting"><legend>Màu nền</legend>
                        <div className="reader-setting-options">{[
                            { value: 'washi', label: 'Giấy', name: 'Nền giấy Washi' },
                            { value: 'sepia', label: 'Sepia', name: 'Nền giấy cổ' },
                            { value: 'charcoal', label: 'Tối', name: 'Nền tối' },
                        ].map(option => <button key={option.value} className="reader-setting-option" aria-label={option.name} aria-pressed={theme === option.value} onClick={() => props.handleThemeChange(option.value)}>
                            <span className={'theme-dot theme-dot-' + option.value} aria-hidden="true" />{option.label}
                        </button>)}</div>
                    </fieldset>
                    <fieldset className="reader-setting"><legend>Phông chữ</legend>
                        <div className="reader-setting-options">{[{ value: 'font-serif', label: 'Có chân' }, { value: 'font-sans', label: 'Không chân' }].map(option =>
                            <button key={option.value} className={'reader-setting-option ' + option.value} aria-pressed={readerFont === option.value}
                                onClick={() => changeReadingLayout(() => { props.setReaderFont(option.value); localStorage.setItem(props.DB_KEYS.font, option.value); })}>{option.label}</button>)}</div>
                    </fieldset>
                    <fieldset className="reader-setting"><legend>Cỡ chữ</legend>
                        <div className="reader-font-stepper">
                            <button className="reader-tool-button" aria-label="Giảm cỡ chữ" disabled={readerFontSize <= 12} onClick={() => changeReadingLayout(() => { const size = Math.max(12, readerFontSize - 2); props.setReaderFontSize(size); localStorage.setItem(props.DB_KEYS.fontSize, String(size)); })}>A−</button>
                            <output aria-live="polite" aria-label="Cỡ chữ hiện tại">{readerFontSize}<span> px</span></output>
                            <button className="reader-tool-button" aria-label="Tăng cỡ chữ" disabled={readerFontSize >= 32} onClick={() => changeReadingLayout(() => { const size = Math.min(32, readerFontSize + 2); props.setReaderFontSize(size); localStorage.setItem(props.DB_KEYS.fontSize, String(size)); })}>A+</button>
                        </div>
                    </fieldset>
                    <fieldset className="reader-setting"><legend>Giãn dòng</legend>
                        <div className="reader-setting-options">{[{ value: 'compact', label: 'Gọn' }, { value: 'normal', label: 'Chuẩn' }, { value: 'relaxed', label: 'Thoáng' }].map(option =>
                            <button key={option.value} className="reader-setting-option" aria-pressed={spacing === option.value}
                                onClick={() => changeReadingLayout(() => { setSpacing(option.value); localStorage.setItem('mugen_reader_spacing', option.value); })}>{option.label}</button>)}</div>
                    </fieldset>
                    <div className="reader-settings-sync"><SyncIndicator status={syncStatus} onRetry={() => void props.syncNovel(novel)} /></div>
                </div>}
            </aside>
        </>}
        <div className="reader-workspace" inert={panel !== null}>
        <div className="reader-toolbar-shell">
            <div className="reader-toolbar">
                <a className="reader-tool-button reader-back-link" href={'#/novel/' + novel.id} aria-label="Về trang truyện" onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); props.openNovelDetail(novel.id); } }}><Icons.ArrowLeft size={18} /><span>Trang truyện</span></a>
                <span className="reader-novel-title" title={novel.title}>{novel.title}</span>
                <div className="reader-toolbar-group">
                    <button className="reader-tool-button" aria-label="Mục lục" aria-haspopup="dialog" aria-expanded={panel === 'toc'} aria-controls={panel === 'toc' ? 'reader-panel' : undefined} onClick={() => setPanel('toc')}><Icons.List size={18} /><span className="reader-tool-label">Mục lục</span></button>
                    <button className="reader-tool-button" aria-label="Tùy chỉnh trang đọc" aria-haspopup="dialog" aria-expanded={panel === 'settings'} aria-controls={panel === 'settings' ? 'reader-panel' : undefined} onClick={() => setPanel('settings')}><span className="reader-type-icon" aria-hidden="true">Aa</span><span className="reader-tool-label">Tùy chỉnh</span></button>
                    <button className="reader-tool-button reader-icon-button" aria-label={zen ? 'Thoát chế độ tập trung' : 'Đọc tập trung'} title="Đọc tập trung" aria-pressed={zen} onClick={event => { setZen(!zen); if (event.detail > 0) event.currentTarget.blur(); }}><Icons.Maximize size={17} /></button>
                </div>
            </div>
            <div className="reader-scroll-progress-line-track" role="progressbar" aria-label="Tiến độ chương" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="reader-scroll-progress-line-fill" style={{ width: progress + '%' }} /></div>
        </div>
        <div className="reader-container-layout reader-reading-surface">
            <header className="reader-chapter-heading">{chapter.volume_name && <span className="reader-volume-label">{chapter.volume_name}</span>}<h1>{chapter.title}</h1>
            </header>
            {(syncStatus === 'offline' || syncStatus === 'error') && <div className="reader-sync-notice"><SyncIndicator status={syncStatus} onRetry={() => void props.syncNovel(novel)} /></div>}
            {loading ? <PageLoading reader /> : error ? <PageError message={error} onRetry={() => setAttempt(a => a + 1)} />
                : <article ref={articleRef} className={'reader-content-body ' + readerFont + ' reader-spacing-' + spacing} style={{ fontSize: readerFontSize, lineHeight: spacing === 'compact' ? 1.6 : spacing === 'relaxed' ? 2.15 : 1.85 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />}
            <nav className="reader-footer-nav" aria-label="Chuyển chương">
                <button className="outline-btn" disabled={activeChapterIndex === 0} onClick={() => props.navigateToChapter('prev')}><Icons.ArrowLeft size={14} /> Chương trước</button>
                <span className="reader-chapter-position">{activeChapterIndex + 1} / {chapters.length}{completed && <span>Đã đọc xong</span>}</span>
                <button className="primary-btn" disabled={activeChapterIndex >= chapters.length - 1} onClick={() => props.navigateToChapter('next')}>Chương sau <Icons.ArrowRight size={14} /></button>
            </nav>
        </div>
        {zen && <button className="reader-zen-exit reader-tool-button" aria-label="Thoát chế độ tập trung" onClick={() => setZen(false)}><Icons.Maximize size={15} /><span>Thoát tập trung</span></button>}
        </div>
    </div>;
}
