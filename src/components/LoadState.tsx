import { Icons } from './Icons';
import type { SyncStatus } from '../hooks/useReadingSync';

export function PageLoading({ reader = false }: { reader?: boolean }) {
    return <div className={`page-skeleton ${reader ? 'page-skeleton-reader' : ''}`} role="status" aria-label="Đang tải nội dung" aria-busy="true">
        <span className="sr-only">Đang tải nội dung…</span><div className="skeleton skeleton-heading" />
        {reader ? Array.from({ length: 9 }, (_, i) => <div key={i} className="skeleton skeleton-line" style={{ width: `${i % 3 === 2 ? 72 : 100}%` }} />)
            : <div className="skeleton-card-grid">{Array.from({ length: 6 }, (_, i) => <div className="skeleton-book" key={i}><div className="skeleton skeleton-cover" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div>)}</div>}
    </div>;
}
export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return <div className="load-error-card" role="alert"><Icons.Book size={32} /><p>{message}</p><button className="primary-btn" onClick={onRetry}>Thử lại</button></div>;
}
export function SyncIndicator({ status, onRetry }: { status: SyncStatus; onRetry?: () => void }) {
    const labels: Record<SyncStatus, string> = { local: 'Lưu trên thiết bị', syncing: 'Đang đồng bộ…', synced: 'Đã đồng bộ', offline: 'Ngoại tuyến · sẽ đồng bộ khi có mạng', error: 'Chưa đồng bộ · đã giữ tiến độ trên thiết bị' };
    return <div className={`sync-indicator sync-${status}`} role="status"><span className="sync-dot" /><span>{labels[status]}</span>
        {(status === 'error' || status === 'offline') && onRetry && <button className="text-action" onClick={onRetry}>Thử lại</button>}</div>;
}
