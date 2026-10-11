import type { Novel } from '../types';
import { Icons } from './Icons';
import type { ReadingProgress } from '../utils/readingProgress';

export function NovelShelfCard({ novel, progress, onOpen, onRead, onRemove }: {
    novel: Novel; progress?: ReadingProgress | null; onOpen: () => void;
    onRead?: () => void; onRemove?: () => void;
}) {
    const chapters = (novel.chapters || []).filter(c => c.status === 'published');
    const read = chapters.filter(c => progress?.completedChapterIds.includes(c.id)).length;
    const percentage = chapters.length ? Math.round(read / chapters.length * 100) : 0;
    return <article className="novel-shelf-card">
        <button className="shelf-cover-button" onClick={onOpen} aria-label={`Xem ${novel.title}`}><img className="shelf-novel-cover" src={novel.cover || '/assets/default_novel_cover.png'} alt="" loading="lazy"
            onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/default_novel_cover.png'; }} /></button>
        <div className="shelf-novel-info"><span className="eyebrow">{novel.genre?.split(',')[0] || 'Tiểu thuyết'}</span>
            <button className="shelf-title-button" onClick={onOpen}><h3>{novel.title}</h3></button>
            <p className="shelf-novel-author">{novel.author_name || novel.author || ''}</p>
            {progress && <div className="shelf-progress"><div><span>Đọc tiếp chương {progress.chapterIndex + 1}</span><span>{percentage}% đã xong</span></div>
                <progress max="100" value={percentage} aria-label="Số chương đã đọc xong" /></div>}
            <div className="shelf-card-actions">{onRead && <button className="primary-btn small" onClick={onRead}><Icons.Play size={12} /> {progress ? 'Đọc tiếp' : 'Đọc ngay'}</button>}
                {onRemove && <button className="outline-btn small" onClick={onRemove} aria-label={`Bỏ ${novel.title} khỏi kệ`}><Icons.Trash size={12} /> Bỏ khỏi kệ</button>}</div>
        </div>
    </article>;
}
