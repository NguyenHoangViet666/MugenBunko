import { Icons } from './Icons';

export function DashboardEmptyState({
    title,
    description,
    onReset,
}: {
    title: string;
    description: string;
    onReset?: () => void;
}) {
    return (
        <div className="admin-empty">
            <span aria-hidden="true">
                <Icons.Search size={26} />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
            {onReset && (
                <button className="outline-btn small" onClick={onReset}>
                    Xóa bộ lọc
                </button>
            )}
        </div>
    );
}

export function DashboardPagination({
    page,
    total,
    onChange,
    label,
    pageSize = 10,
}: {
    page: number;
    total: number;
    onChange: (page: number) => void;
    label: string;
    pageSize?: number;
}) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    return (
        <nav className="admin-pagination" aria-label={`Phân trang ${label}`}>
            <span>
                {total
                    ? `${((page - 1) * pageSize + 1).toLocaleString('vi-VN')}–${Math.min(page * pageSize, total).toLocaleString('vi-VN')} / ${total.toLocaleString('vi-VN')}`
                    : '0 kết quả'}
            </span>
            <div>
                <button
                    className="outline-btn small"
                    disabled={page <= 1}
                    onClick={() => onChange(page - 1)}
                    aria-label={`Trang trước ${label}`}
                >
                    <Icons.ChevronLeft />
                </button>
                <span>
                    Trang {page} / {pages}
                </span>
                <button
                    className="outline-btn small"
                    disabled={page >= pages}
                    onClick={() => onChange(page + 1)}
                    aria-label={`Trang sau ${label}`}
                >
                    <Icons.ChevronRight />
                </button>
            </div>
        </nav>
    );
}
