import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import type { Novel, User } from '../types';
import { Icons } from '../components/Icons';
import { PageError, PageLoading, SyncIndicator } from '../components/LoadState';
import { getReadingProgress, type ReadingProgress } from '../utils/readingProgress';
import type { SyncStatus } from '../hooks/useReadingSync';

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
    const [tocOpen, setTocOpen] = useState(false);
    const [zen, setZen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completed, setCompleted] = useState(() => getReadingProgress(currentUser?.username, novel)?.completedChapterIds.includes(chapterId) || false);
    const [spacing, setSpacing] = useState(() => localStorage.getItem('mugen_reader_spacing') || 'normal');
    const articleRef = useRef<HTMLElement>(null);
    const callbacks = useRef(props);
    const ready = useRef(false);
    const lastPosition = useRef('');
    useEffect(() => { callbacks.current = props; });

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
        const cloudTimer = window.setInterval(() => { capture(true); void callbacks.current.syncNovel(callbacks.current.novel); }, 8000);
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
            const target = event.target as HTMLElement;
            if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (event.key === 'Escape') setTocOpen(false);
            if (event.key === 'ArrowLeft' && activeChapterIndex > 0) callbacks.current.navigateToChapter('prev');
            if (event.key === 'ArrowRight' && activeChapterIndex < chapters.length - 1) callbacks.current.navigateToChapter('next');
        };
        window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
    }, [activeChapterIndex, chapters.length]);

    return <div className={'page-view active reader-page ' + (zen ? 'reader-zen' : '')}>
        {tocOpen && <div className="reader-toc-backdrop" onClick={() => setTocOpen(false)} />}
        <aside className={'reader-toc-drawer ' + (tocOpen ? 'open' : '')} aria-label="Mục lục" aria-hidden={!tocOpen} inert={!tocOpen}>
            <div className="reader-toc-header"><h3>Mục lục</h3><button className="outline-btn small" aria-label="Đóng mục lục" onClick={() => setTocOpen(false)}>✕</button></div>
            <div className="reader-toc-novel-title">{novel.title}</div>
            <div className="reader-toc-body">{chapters.map((ch, index) => <div key={ch.id}>
                {(index === 0 || ch.volume_name !== chapters[index - 1].volume_name) && <div className="reader-toc-volume-header">{ch.volume_name || 'Các chương'}</div>}
                <button className={'reader-toc-chapter-item ' + (index === activeChapterIndex ? 'active' : '')} aria-current={index === activeChapterIndex ? 'page' : undefined}
                    onClick={() => { props.startReading(novel.id, index); setTocOpen(false); }}>{ch.title}</button>
            </div>)}</div>
        </aside>
        <div className="reader-toolbar reader-toolbar-polished">
            <div className="reader-toolbar-group">
                <button className="outline-btn small" onClick={() => props.openNovelDetail(novel.id)}><Icons.ArrowLeft size={14} /> Thoát</button>
                <button className="outline-btn small" onClick={() => setTocOpen(true)}><Icons.Book size={14} /> Mục lục</button>
                <span className="reader-novel-title" title={novel.title}>{novel.title}</span>
            </div>
            <div className="reader-toolbar-group reader-preferences">
                <select aria-label="Giãn dòng" value={spacing} onChange={e => { setSpacing(e.target.value); localStorage.setItem('mugen_reader_spacing', e.target.value); }}>
                    <option value="compact">Gọn</option><option value="normal">Chuẩn</option><option value="relaxed">Thoáng</option></select>
                <select aria-label="Phông chữ" value={readerFont} onChange={e => { props.setReaderFont(e.target.value); localStorage.setItem(props.DB_KEYS.font, e.target.value); }}>
                    <option value="font-serif">Serif</option><option value="font-sans">Sans</option></select>
                <button className="outline-btn small" aria-label="Giảm cỡ chữ" onClick={() => { const size = Math.max(12, readerFontSize - 2); props.setReaderFontSize(size); localStorage.setItem(props.DB_KEYS.fontSize, String(size)); }}>A−</button>
                <span>{readerFontSize}px</span>
                <button className="outline-btn small" aria-label="Tăng cỡ chữ" onClick={() => { const size = Math.min(32, readerFontSize + 2); props.setReaderFontSize(size); localStorage.setItem(props.DB_KEYS.fontSize, String(size)); }}>A+</button>
                <button className={'outline-btn small ' + (zen ? 'active' : '')} aria-pressed={zen} onClick={() => setZen(!zen)}><Icons.Maximize size={13} /> Zen</button>
                <div className="reader-themes">{['washi', 'sepia', 'charcoal'].map(t => <button key={t} className={'theme-dot theme-dot-' + t + (theme === t ? ' active' : '')}
                    aria-label={t === 'washi' ? 'Nền giấy Washi' : t === 'sepia' ? 'Nền giấy cổ' : 'Nền tối'} aria-pressed={theme === t} onClick={() => props.handleThemeChange(t)} />)}</div>
            </div>
        </div>
        <div className="reader-scroll-progress-line-track"><div className="reader-scroll-progress-line-fill" style={{ width: progress + '%' }} /></div>
        <div className="reader-container-layout reader-reading-surface">
            <header className="reader-chapter-heading"><span className="eyebrow">{chapter.volume_name}</span><h1>{chapter.title}</h1>
                <div className="reader-chapter-meta"><SyncIndicator status={syncStatus} onRetry={() => void props.syncNovel(novel)} /><span>{progress}% {completed ? '· Đã đọc xong' : ''}</span></div>
            </header>
            {loading ? <PageLoading reader /> : error ? <PageError message={error} onRetry={() => setAttempt(a => a + 1)} />
                : <article ref={articleRef} className={'reader-content-body ' + readerFont + ' reader-spacing-' + spacing} style={{ fontSize: readerFontSize, lineHeight: spacing === 'compact' ? 1.6 : spacing === 'relaxed' ? 2.15 : 1.85 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />}
            <nav className="reader-footer-nav" aria-label="Chuyển chương">
                <button className="outline-btn" disabled={activeChapterIndex === 0} onClick={() => props.navigateToChapter('prev')}><Icons.ArrowLeft size={14} /> Chương trước</button>
                <button className="primary-btn" disabled={activeChapterIndex >= chapters.length - 1} onClick={() => props.navigateToChapter('next')}>Chương sau <Icons.ArrowRight size={14} /></button>
            </nav>
        </div>
    </div>;
}
