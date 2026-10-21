import { useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Icons } from '../components/Icons';
import { DashboardEmptyState, DashboardPagination } from '../components/DashboardList';
import { Chapter, Novel, User } from '../types';
import { getTierName } from '../utils/levelHelper';
import '../styles/admin.css';
import '../styles/moderation.css';

interface ModReport {
    id?: number;
    reportId: number;
    reason: string;
    date: string;
    commentId: number;
    commentText: string;
    commentAuthor: string;
    commentAuthorUsername: string;
    reporter: string;
    novelId: number;
}
interface PendingChapter {
    id: number;
    novelId: number;
    novelTitle: string;
    title: string;
    authorName?: string;
    date: string;
}
interface ModDashboardProps {
    pendingChapters: PendingChapter[];
    reports: ModReport[];
    users: User[];
    novels: Novel[];
    currentUser: User | null;
    loading: boolean;
    error: string;
    onRefresh: () => void;
    loadChapter: (id: number) => Promise<Chapter>;
    modApproveRejectChapter: (id: number, action: 'approve' | 'reject') => Promise<boolean>;
    handleCommentReportAction: (index: number, action: 'keep' | 'delete') => Promise<boolean>;
    toggleUserSuspension: (username: string, status: 'active' | 'suspended') => Promise<boolean>;
    modRejectChapter: (id: number) => Promise<boolean>;
}

const tabs = [
    {
        id: 'overview',
        label: 'Tổng quan',
        icon: Icons.Activity,
        description: 'Theo dõi hàng đợi và truy cập nhanh các công việc kiểm duyệt.',
    },
    {
        id: 'pending',
        label: 'Chờ duyệt',
        icon: Icons.FileText,
        description: 'Đọc nội dung, duyệt xuất bản hoặc trả chương về bản nháp.',
    },
    {
        id: 'reports',
        label: 'Báo cáo',
        icon: Icons.AlertCircle,
        description: 'Xem ngữ cảnh và xử lý các bình luận được độc giả báo cáo.',
    },
    {
        id: 'users',
        label: 'Tài khoản',
        icon: Icons.Users,
        description: 'Tra cứu thành viên và theo dõi trạng thái hoạt động của tài khoản.',
    },
    {
        id: 'published',
        label: 'Nội dung đã đăng',
        icon: Icons.Book,
        description: 'Tra cứu chương đã xuất bản và ẩn nội dung cần được chỉnh sửa.',
    },
] as const;
type ModTab = (typeof tabs)[number]['id'];
const searchText = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/g, 'd');
const matches = (text: string, query: string) => searchText(text).includes(searchText(query.trim()));
const pageSize = 10;

export default function ModDashboard(props: ModDashboardProps) {
    const { currentUser, pendingChapters, reports, users, novels, loading, error } = props;
    const [activeTab, setActiveTab] = useState<ModTab>('overview');
    const [menuOpen, setMenuOpen] = useState(false);
    const [queries, setQueries] = useState({ pending: '', reports: '', users: '', published: '' });
    const [pages, setPages] = useState({ pending: 1, reports: 1, users: 1, published: 1 });
    const [userStatus, setUserStatus] = useState('all');
    const [busy, setBusy] = useState('');
    const [actionError, setActionError] = useState('');
    const [preview, setPreview] = useState<{
        id: number;
        novelTitle: string;
        title: string;
        source: 'pending' | 'published';
    } | null>(null);
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [chapterLoading, setChapterLoading] = useState(false);
    const [chapterError, setChapterError] = useState('');
    const requestId = useRef(0);
    const operationRunning = useRef(false);
    const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
    const menuToggle = useRef<HTMLButtonElement | null>(null);
    const previewHeading = useRef<HTMLHeadingElement | null>(null);
    const isAdmin = !!currentUser?.roles.includes('admin');
    const selected = tabs.find((tab) => tab.id === activeTab)!;
    const members = users.filter((user) => !user.roles.includes('admin') && user.id !== currentUser?.id);
    const suspendedCount = members.filter((user) => user.status === 'suspended').length;
    const published = novels.flatMap((novel) =>
        (novel.chapters || [])
            .filter((item) => item.status === 'published')
            .map((item) => ({
                id: item.id,
                title: item.title,
                novelTitle: novel.title,
                author: novel.author || novel.author_name || novel.author_username || 'Ẩn danh',
            })),
    );
    const pendingList = pendingChapters.filter((item) =>
        matches(`${item.novelTitle} ${item.title} ${item.authorName || ''}`, queries.pending),
    );
    // Preserve the original index expected by the existing callback after filtering/paging.
    const reportList = reports
        .map((report, index) => ({ report, index }))
        .filter(({ report }) =>
            matches(
                `${report.commentText} ${report.commentAuthor} ${report.commentAuthorUsername} ${report.reason} ${report.reporter}`,
                queries.reports,
            ),
        );
    const memberList = members.filter(
        (user) =>
            matches(`${user.displayname} ${user.username}`, queries.users) &&
            (userStatus === 'all' || user.status === userStatus),
    );
    const publishedList = published.filter((item) =>
        matches(`${item.novelTitle} ${item.title} ${item.author}`, queries.published),
    );
    const counts = {
        pending: pendingChapters.length,
        reports: reports.length,
        users: members.length,
        published: published.length,
    };
    const disabled = !!busy || loading || !!error;
    const panel = (tab: ModTab) => ({
        id: `mod-panel-${tab}`,
        role: 'tabpanel',
        'aria-labelledby': `mod-tab-${tab}`,
        hidden: activeTab !== tab,
        tabIndex: 0,
    });
    const selectTab = (tab: ModTab) => {
        setActiveTab(tab);
        setMenuOpen(false);
        requestAnimationFrame(() => {
            if (window.matchMedia('(max-width: 760px)').matches) menuToggle.current?.focus();
            else tabButtons.current[tabs.findIndex((item) => item.id === tab)]?.focus();
        });
    };
    const setQuery = (tab: keyof typeof queries, value: string) => {
        setQueries((old) => ({ ...old, [tab]: value }));
        setPages((old) => ({ ...old, [tab]: 1 }));
    };
    const runAction = async (label: string, action: () => Promise<boolean>, afterSuccess?: () => void) => {
        if (operationRunning.current) return;
        operationRunning.current = true;
        setBusy(label);
        setActionError('');
        try {
            if (await action()) afterSuccess?.();
            else setActionError('Chưa xác nhận được kết quả. Hãy làm mới danh sách trước khi thử lại.');
        } catch {
            setActionError('Không thể kết nối để thực hiện thao tác. Hãy thử lại.');
        } finally {
            operationRunning.current = false;
            setBusy('');
        }
    };
    const closePreview = () => {
        requestId.current++;
        setPreview(null);
        setChapter(null);
        setChapterError('');
        setChapterLoading(false);
        requestAnimationFrame(() => {
            const next =
                document.querySelector<HTMLButtonElement>(
                    '.mod-workspace section:not([hidden]) .mod-preview-button',
                ) ||
                (window.matchMedia('(max-width: 760px)').matches
                    ? menuToggle.current
                    : document.querySelector<HTMLButtonElement>(
                          '.mod-workspace [role="tab"][aria-selected="true"]',
                      ));
            next?.focus();
        });
    };
    const openPreview = async (
        item: { id: number; novelTitle: string; title: string },
        source: 'pending' | 'published',
    ) => {
        const currentRequest = ++requestId.current;
        setPreview({ ...item, source });
        setChapter(null);
        setChapterLoading(true);
        setChapterError('');
        requestAnimationFrame(() => previewHeading.current?.focus());
        try {
            const result = await props.loadChapter(item.id);
            if (requestId.current === currentRequest) setChapter(result);
        } catch {
            if (requestId.current === currentRequest)
                setChapterError('Không thể tải nội dung chương. Hãy thử lại trước khi quyết định.');
        } finally {
            if (requestId.current === currentRequest) setChapterLoading(false);
        }
    };
    const reject = (id: number, title: string, afterSuccess?: () => void) => {
        if (window.confirm(`Trả chương “${title}” về bản nháp để tác giả chỉnh sửa?`))
            void runAction(
                'Đang trả chương về nháp',
                () => props.modApproveRejectChapter(id, 'reject'),
                afterSuccess,
            );
    };
    const hideChapter = (id: number, title: string, afterSuccess?: () => void) => {
        if (window.confirm(`Ẩn chương “${title}” và trả về bản nháp để tác giả chỉnh sửa?`)) {
            void runAction('Đang ẩn chương', () => props.modRejectChapter(id), afterSuccess);
        }
    };
    const toolbar = (tab: keyof typeof queries, placeholder: string) => (
        <div className="admin-toolbar">
            <label className="admin-search">
                <Icons.Search size={17} />
                <span className="sr-only">
                    Tìm {tabs.find((item) => item.id === tab)?.label.toLowerCase()}
                </span>
                <input
                    type="search"
                    aria-label={`Tìm ${tabs.find((item) => item.id === tab)?.label.toLowerCase()}`}
                    placeholder={placeholder}
                    value={queries[tab]}
                    onChange={(event) => setQuery(tab, event.target.value)}
                />
            </label>
            <span className="admin-muted">
                {loading || error ? '—' : counts[tab].toLocaleString('vi-VN')} mục
            </span>
        </div>
    );
    const pagination = (tab: keyof typeof pages, total: number) => {
        const page = Math.min(pages[tab], Math.max(1, Math.ceil(total / pageSize)));
        return {
            page,
            start: (page - 1) * pageSize,
            element: (
                <DashboardPagination
                    page={page}
                    total={total}
                    onChange={(next) => setPages((old) => ({ ...old, [tab]: next }))}
                    label={tabs.find((item) => item.id === tab)!.label.toLowerCase()}
                />
            ),
        };
    };
    const pendingPagination = pagination('pending', pendingList.length);
    const reportPagination = pagination('reports', reportList.length);
    const memberPagination = pagination('users', memberList.length);
    const publishedPagination = pagination('published', publishedList.length);
    const reviewPreview = (source: 'pending' | 'published') =>
        preview?.source === source && (
            <div className="mod-preview">
                <button className="text-action mod-preview-back" onClick={closePreview} disabled={!!busy}>
                    <Icons.ArrowLeft size={16} />
                    Trở lại danh sách
                </button>
                <p className="admin-eyebrow">{preview.novelTitle}</p>
                <h2 ref={previewHeading} tabIndex={-1}>
                    {preview.title}
                </h2>
                {chapterLoading && (
                    <p className="admin-operation" role="status">
                        Đang tải nội dung chương…
                    </p>
                )}
                {chapterError && (
                    <div className="admin-notice" role="alert">
                        <p>{chapterError}</p>
                        <button className="text-action" onClick={() => void openPreview(preview, source)}>
                            Thử lại
                        </button>
                    </div>
                )}
                {chapter && (
                    <>
                        <p className="admin-list-note">
                            {chapter.word_count?.toLocaleString('vi-VN') || 0} từ ·{' '}
                            {chapter.status === 'pending'
                                ? 'Đang chờ duyệt'
                                : chapter.status === 'published'
                                  ? 'Đã xuất bản'
                                  : chapter.status === 'scheduled'
                                    ? 'Đã lên lịch'
                                    : 'Bản nháp'}
                        </p>
                        <article
                            className="mod-chapter-body"
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(
                                    chapter.content || '<p>Chương chưa có nội dung.</p>',
                                ),
                            }}
                        />
                        <div className="mod-review-actions">
                            <p>Thao tác áp dụng cho chương đang xem.</p>
                            <div className="admin-row-actions">
                                {source === 'pending' && chapter.status === 'pending' && (
                                    <>
                                        <button
                                            className="outline-btn small"
                                            disabled={disabled}
                                            onClick={() => reject(chapter.id, chapter.title, closePreview)}
                                        >
                                            Trả về nháp
                                        </button>
                                        <button
                                            className="primary-btn small"
                                            disabled={disabled}
                                            onClick={() =>
                                                void runAction(
                                                    'Đang duyệt chương',
                                                    () =>
                                                        props.modApproveRejectChapter(chapter.id, 'approve'),
                                                    closePreview,
                                                )
                                            }
                                        >
                                            Duyệt xuất bản
                                        </button>
                                    </>
                                )}
                                {source === 'published' && chapter.status === 'published' && (
                                    <button
                                        className="outline-btn small mod-danger-button"
                                        disabled={disabled}
                                        onClick={() => hideChapter(chapter.id, chapter.title, closePreview)}
                                    >
                                        Ẩn chương
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );

    return (
        <div className="admin-workspace mod-workspace">
            <aside className="admin-sidebar" aria-label="Không gian kiểm duyệt">
                <div className="admin-brand">
                    <span className="admin-brand-mark" aria-hidden="true">
                        <Icons.Shield size={22} />
                    </span>
                    <div>
                        <strong>MugenBunko</strong>
                        <span>Không gian kiểm duyệt</span>
                    </div>
                </div>
                <button
                    className="admin-menu-toggle"
                    ref={menuToggle}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-expanded={menuOpen}
                    aria-controls="mod-navigation"
                >
                    <span>
                        <Icons.List size={18} />
                        {selected.label}
                    </span>
                    <span>{menuOpen ? 'Thu gọn' : 'Danh mục'}</span>
                </button>
                <div id="mod-navigation" className={`admin-navigation ${menuOpen ? 'is-open' : ''}`}>
                    <p className="admin-nav-group">Kiểm duyệt</p>
                    <div role="tablist" aria-label="Chức năng kiểm duyệt" aria-orientation="vertical">
                        {tabs.map((tab, index) => (
                            <button
                                key={tab.id}
                                id={`mod-tab-${tab.id}`}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`mod-panel-${tab.id}`}
                                tabIndex={activeTab === tab.id ? 0 : -1}
                                ref={(element) => {
                                    tabButtons.current[index] = element;
                                }}
                                className={`admin-nav-item ${activeTab === tab.id ? 'is-active' : ''}`}
                                onClick={() => selectTab(tab.id)}
                                onKeyDown={(event) => {
                                    let next = index;
                                    if (event.key === 'ArrowDown') next = (index + 1) % tabs.length;
                                    else if (event.key === 'ArrowUp')
                                        next = (index + tabs.length - 1) % tabs.length;
                                    else if (event.key === 'Home') next = 0;
                                    else if (event.key === 'End') next = tabs.length - 1;
                                    else return;
                                    event.preventDefault();
                                    setActiveTab(tabs[next].id);
                                    tabButtons.current[next]?.focus();
                                }}
                            >
                                <span aria-hidden="true">
                                    <tab.icon size={18} />
                                </span>
                                <span>{tab.label}</span>
                                {(tab.id === 'pending' || tab.id === 'reports') && counts[tab.id] > 0 && (
                                    <span
                                        className="admin-nav-count"
                                        aria-label={`${counts[tab.id]} mục chờ xử lý`}
                                    >
                                        {counts[tab.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    {isAdmin && (
                        <div className="admin-sidebar-links">
                            <a href="#/admin-dashboard">
                                <Icons.Key size={16} />
                                <span>Khu vực quản trị</span>
                                <Icons.ChevronRight size={14} />
                            </a>
                        </div>
                    )}
                    <div className="admin-sidebar-footer">
                        <span className="admin-avatar" aria-hidden="true">
                            {(currentUser?.displayname || currentUser?.username || 'M')
                                .charAt(0)
                                .toUpperCase()}
                        </span>
                        <div>
                            <strong>{currentUser?.displayname || currentUser?.username}</strong>
                            <span>{isAdmin ? 'Quản trị viên' : 'Điều phối viên'}</span>
                        </div>
                    </div>
                    <a href="#/" className="admin-return">
                        <Icons.ArrowLeft size={16} />
                        Trở về thư viện
                    </a>
                </div>
            </aside>
            <div className="admin-main">
                <header className="admin-page-heading">
                    <div>
                        <p className="admin-eyebrow">Kiểm duyệt / {selected.label}</p>
                        <h1>{selected.label}</h1>
                        <p>{selected.description}</p>
                    </div>
                    <button
                        className="outline-btn small admin-refresh"
                        disabled={loading || !!busy}
                        onClick={props.onRefresh}
                    >
                        <Icons.RefreshCw size={15} />
                        {loading ? 'Đang tải…' : 'Làm mới'}
                    </button>
                </header>
                {error && (
                    <div className="admin-notice" role="alert">
                        <Icons.AlertCircle size={19} />
                        <p>{error}</p>
                        <button className="text-action" disabled={loading} onClick={props.onRefresh}>
                            Thử lại
                        </button>
                    </div>
                )}
                {actionError && (
                    <div className="admin-notice" role="alert">
                        <p>{actionError}</p>
                    </div>
                )}
                {busy && (
                    <p className="admin-operation" role="status">
                        {busy}…
                    </p>
                )}
                {loading && (
                    <p className="admin-operation" role="status">
                        Đang tải dữ liệu kiểm duyệt…
                    </p>
                )}
                <div className="admin-panels" aria-busy={loading}>
                    <section {...panel('overview')}>
                        <dl className="admin-metrics">
                            {[
                                ['Chương chờ duyệt', pendingChapters.length],
                                ['Bình luận bị báo cáo', reports.length],
                                ['Tài khoản đã khóa', suspendedCount],
                            ].map(([label, count]) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd>{loading || error ? '—' : Number(count).toLocaleString('vi-VN')}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="admin-section-heading">
                            <div>
                                <h2>Công việc kiểm duyệt</h2>
                                <p>Kiểm tra ngữ cảnh trước khi đưa ra quyết định.</p>
                            </div>
                        </div>
                        <div className="admin-work-list">
                            {[
                                {
                                    tab: 'pending' as const,
                                    title: 'Duyệt chương mới',
                                    description: 'Đọc nội dung và xét duyệt chương đang chờ.',
                                    icon: Icons.FileText,
                                },
                                {
                                    tab: 'reports' as const,
                                    title: 'Xử lý báo cáo bình luận',
                                    description: 'Giữ bình luận hợp lệ hoặc xóa nội dung vi phạm.',
                                    icon: Icons.AlertCircle,
                                },
                                {
                                    tab: 'published' as const,
                                    title: 'Rà soát nội dung đã đăng',
                                    description: 'Tra cứu và trả chương cần chỉnh sửa về bản nháp.',
                                    icon: Icons.Book,
                                },
                            ].map((item) => (
                                <button key={item.tab} onClick={() => selectTab(item.tab)}>
                                    <span className="admin-work-icon" aria-hidden="true">
                                        <item.icon size={20} />
                                    </span>
                                    <span>
                                        <strong>{item.title}</strong>
                                        <small>{item.description}</small>
                                    </span>
                                    <span className="admin-work-count">
                                        {loading || error ? '—' : counts[item.tab]}
                                    </span>
                                    <Icons.ArrowRight size={18} />
                                </button>
                            ))}
                        </div>
                        <div className="admin-section-heading">
                            <div>
                                <h2>Tiếp theo trong hàng đợi</h2>
                                <p>Chương được sắp theo thời điểm gửi duyệt.</p>
                            </div>
                            <button className="text-action" onClick={() => selectTab('pending')}>
                                Xem tất cả <Icons.ArrowRight size={15} />
                            </button>
                        </div>
                        <div className="admin-recent-list">
                            {pendingChapters.slice(0, 4).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        selectTab('pending');
                                        void openPreview(item, 'pending');
                                    }}
                                >
                                    <span>
                                        <strong>{item.title}</strong>
                                        <small>
                                            {item.novelTitle} · {item.authorName || 'Ẩn danh'}
                                        </small>
                                    </span>
                                    <span className="admin-status">Chờ duyệt</span>
                                    <Icons.ChevronRight size={16} />
                                </button>
                            ))}
                        </div>
                        {!pendingChapters.length && !loading && !error && (
                            <DashboardEmptyState
                                title="Không còn chương chờ duyệt"
                                description="Chương mới gửi duyệt sẽ xuất hiện trong hàng đợi này."
                            />
                        )}
                    </section>
                    <section {...panel('pending')}>
                        {preview?.source === 'pending' ? (
                            reviewPreview('pending')
                        ) : (
                            <>
                                {toolbar('pending', 'Tìm chương, tác phẩm hoặc tác giả…')}
                                {pendingList.length > 0 ? (
                                    <>
                                        <table className="admin-table mod-content-table">
                                            <caption className="sr-only">Chương chờ duyệt</caption>
                                            <thead>
                                                <tr>
                                                    <th scope="col">Chương / tác phẩm</th>
                                                    <th scope="col">Người gửi</th>
                                                    <th scope="col">Gửi duyệt</th>
                                                    <th scope="col">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingList
                                                    .slice(
                                                        pendingPagination.start,
                                                        pendingPagination.start + pageSize,
                                                    )
                                                    .map((item) => (
                                                        <tr key={item.id}>
                                                            <td>
                                                                <strong>{item.title}</strong>
                                                                <small>{item.novelTitle}</small>
                                                            </td>
                                                            <td>{item.authorName || 'Ẩn danh'}</td>
                                                            <td>
                                                                <time>{item.date}</time>
                                                            </td>
                                                            <td>
                                                                <div className="admin-row-actions">
                                                                    <button
                                                                        className="outline-btn small mod-preview-button"
                                                                        onClick={() =>
                                                                            void openPreview(item, 'pending')
                                                                        }
                                                                        aria-label={`Xem chương ${item.title}`}
                                                                    >
                                                                        Xem
                                                                    </button>
                                                                    <button
                                                                        className="outline-btn small"
                                                                        disabled={disabled}
                                                                        onClick={() =>
                                                                            reject(item.id, item.title)
                                                                        }
                                                                        aria-label={`Trả về nháp ${item.title}`}
                                                                    >
                                                                        Trả về nháp
                                                                    </button>
                                                                    <button
                                                                        className="primary-btn small"
                                                                        disabled={disabled}
                                                                        onClick={() =>
                                                                            void runAction(
                                                                                'Đang duyệt chương',
                                                                                () =>
                                                                                    props.modApproveRejectChapter(
                                                                                        item.id,
                                                                                        'approve',
                                                                                    ),
                                                                            )
                                                                        }
                                                                        aria-label={`Duyệt ${item.title}`}
                                                                    >
                                                                        Duyệt
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        {pendingPagination.element}
                                    </>
                                ) : (
                                    !loading &&
                                    !error && (
                                        <DashboardEmptyState
                                            title={
                                                queries.pending
                                                    ? 'Không tìm thấy chương phù hợp'
                                                    : 'Không còn chương chờ duyệt'
                                            }
                                            description={
                                                queries.pending
                                                    ? 'Thử tên khác hoặc xóa từ khóa tìm kiếm.'
                                                    : 'Chương mới gửi duyệt sẽ xuất hiện tại đây.'
                                            }
                                            onReset={
                                                queries.pending ? () => setQuery('pending', '') : undefined
                                            }
                                        />
                                    )
                                )}
                            </>
                        )}
                    </section>
                    <section {...panel('reports')}>
                        {toolbar('reports', 'Tìm nội dung, người dùng hoặc lý do…')}
                        <ol className="mod-report-list">
                            {reportList
                                .slice(reportPagination.start, reportPagination.start + pageSize)
                                .map(({ report, index }) => (
                                    <li key={report.reportId || report.id}>
                                        <div className="mod-report-heading">
                                            <div>
                                                <strong>
                                                    {report.commentAuthor || report.commentAuthorUsername}
                                                </strong>
                                                <span className="admin-muted">
                                                    @{report.commentAuthorUsername}
                                                </span>
                                            </div>
                                            <time>{report.date}</time>
                                        </div>
                                        <blockquote>{report.commentText}</blockquote>
                                        <dl className="mod-report-context">
                                            <div>
                                                <dt>Lý do</dt>
                                                <dd>{report.reason}</dd>
                                            </div>
                                            <div>
                                                <dt>Người báo cáo</dt>
                                                <dd>{report.reporter}</dd>
                                            </div>
                                        </dl>
                                        <div className="admin-row-actions">
                                            <button
                                                className="outline-btn small"
                                                disabled={disabled}
                                                aria-label={`Giữ bình luận báo cáo ${report.reportId || report.id}`}
                                                onClick={() =>
                                                    void runAction('Đang đóng báo cáo', () =>
                                                        props.handleCommentReportAction(index, 'keep'),
                                                    )
                                                }
                                            >
                                                Giữ bình luận
                                            </button>
                                            <button
                                                className="outline-btn small mod-danger-button"
                                                disabled={disabled}
                                                aria-label={`Xóa bình luận báo cáo ${report.reportId || report.id}`}
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            'Xóa bình luận bị báo cáo? Các phản hồi thuộc bình luận cũng có thể bị xóa.',
                                                        )
                                                    )
                                                        void runAction('Đang xóa bình luận', () =>
                                                            props.handleCommentReportAction(index, 'delete'),
                                                        );
                                                }}
                                            >
                                                <Icons.Trash size={15} />
                                                Xóa bình luận
                                            </button>
                                        </div>
                                    </li>
                                ))}
                        </ol>
                        {reportList.length > 0
                            ? reportPagination.element
                            : !loading &&
                              !error && (
                                  <DashboardEmptyState
                                      title={
                                          queries.reports
                                              ? 'Không tìm thấy báo cáo phù hợp'
                                              : 'Không còn báo cáo chờ xử lý'
                                      }
                                      description={
                                          queries.reports
                                              ? 'Thử từ khóa khác hoặc xóa bộ lọc.'
                                              : 'Báo cáo mới từ độc giả sẽ xuất hiện tại đây.'
                                      }
                                      onReset={queries.reports ? () => setQuery('reports', '') : undefined}
                                  />
                              )}
                    </section>
                    <section {...panel('users')}>
                        {toolbar('users', 'Tìm tên hoặc @username…')}
                        <div className="mod-user-filter">
                            <label className="admin-filter">
                                <span>Trạng thái</span>
                                <select
                                    aria-label="Lọc trạng thái tài khoản kiểm duyệt"
                                    value={userStatus}
                                    onChange={(event) => {
                                        setUserStatus(event.target.value);
                                        setPages((old) => ({ ...old, users: 1 }));
                                    }}
                                >
                                    <option value="all">Tất cả trạng thái</option>
                                    <option value="active">Hoạt động</option>
                                    <option value="suspended">Đã khóa</option>
                                </select>
                            </label>
                        </div>
                        <p className="admin-list-note">
                            {isAdmin
                                ? 'Khóa tài khoản sẽ ngăn thành viên đăng nhập và tương tác.'
                                : 'Điều phối viên có thể tra cứu trạng thái. Khóa và mở khóa tài khoản do quản trị viên thực hiện.'}
                        </p>
                        {memberList.length > 0 ? (
                            <>
                                <table className="admin-table mod-users-table">
                                    <caption className="sr-only">Tài khoản trong khu vực kiểm duyệt</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Thành viên</th>
                                            <th scope="col">Trạng thái</th>
                                            <th scope="col">Vai trò</th>
                                            {isAdmin && <th scope="col">Thao tác</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {memberList
                                            .slice(memberPagination.start, memberPagination.start + pageSize)
                                            .map((user) => (
                                                <tr key={user.id}>
                                                    <td>
                                                        <div className="admin-user-name">
                                                            <span className="admin-avatar" aria-hidden="true">
                                                                {(user.displayname || user.username)
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </span>
                                                            <div>
                                                                <strong>
                                                                    {user.displayname || user.username}
                                                                </strong>
                                                                <small>
                                                                    @{user.username} ·{' '}
                                                                    {getTierName(user.level)}
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`admin-status ${user.status === 'suspended' ? 'is-attention' : ''}`}
                                                        >
                                                            {user.status === 'suspended'
                                                                ? 'Đã khóa'
                                                                : 'Hoạt động'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {user.roles
                                                            .map(
                                                                (role) =>
                                                                    ({
                                                                        reader: 'Độc giả',
                                                                        author: 'Tác giả',
                                                                        moderator: 'Điều phối viên',
                                                                        admin: 'Quản trị viên',
                                                                    })[role],
                                                            )
                                                            .join(', ')}
                                                    </td>
                                                    {isAdmin && (
                                                        <td>
                                                            <button
                                                                className="outline-btn small"
                                                                disabled={disabled}
                                                                aria-label={`${user.status === 'suspended' ? 'Mở khóa' : 'Khóa'} @${user.username}`}
                                                                onClick={() => {
                                                                    if (
                                                                        window.confirm(
                                                                            `${user.status === 'suspended' ? 'Mở khóa' : 'Khóa'} tài khoản @${user.username}?`,
                                                                        )
                                                                    )
                                                                        void runAction(
                                                                            'Đang cập nhật tài khoản',
                                                                            () =>
                                                                                props.toggleUserSuspension(
                                                                                    user.username,
                                                                                    user.status ===
                                                                                        'suspended'
                                                                                        ? 'active'
                                                                                        : 'suspended',
                                                                                ),
                                                                        );
                                                                }}
                                                            >
                                                                {user.status === 'suspended'
                                                                    ? 'Mở khóa'
                                                                    : 'Khóa tài khoản'}
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                                {memberPagination.element}
                            </>
                        ) : (
                            !loading &&
                            !error && (
                                <DashboardEmptyState
                                    title={
                                        queries.users || userStatus !== 'all'
                                            ? 'Không tìm thấy tài khoản'
                                            : 'Chưa có tài khoản để tra cứu'
                                    }
                                    description="Thử từ khóa khác hoặc đặt lại bộ lọc trạng thái."
                                    onReset={
                                        queries.users || userStatus !== 'all'
                                            ? () => {
                                                  setQuery('users', '');
                                                  setUserStatus('all');
                                              }
                                            : undefined
                                    }
                                />
                            )
                        )}
                    </section>
                    <section {...panel('published')}>
                        {preview?.source === 'published' ? (
                            reviewPreview('published')
                        ) : (
                            <>
                                {toolbar('published', 'Tìm chương, tác phẩm hoặc tác giả…')}
                                <p className="admin-list-note">
                                    Ẩn chương sẽ trả nội dung về bản nháp để tác giả chỉnh sửa, không xóa vĩnh
                                    viễn.
                                </p>
                                {publishedList.length > 0 ? (
                                    <>
                                        <table className="admin-table mod-content-table">
                                            <caption className="sr-only">Nội dung đã xuất bản</caption>
                                            <thead>
                                                <tr>
                                                    <th scope="col">Chương / tác phẩm</th>
                                                    <th scope="col">Tác giả</th>
                                                    <th scope="col">Trạng thái</th>
                                                    <th scope="col">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {publishedList
                                                    .slice(
                                                        publishedPagination.start,
                                                        publishedPagination.start + pageSize,
                                                    )
                                                    .map((item) => (
                                                        <tr key={item.id}>
                                                            <td>
                                                                <strong>{item.title}</strong>
                                                                <small>{item.novelTitle}</small>
                                                            </td>
                                                            <td>{item.author}</td>
                                                            <td>
                                                                <span className="admin-status">
                                                                    Đã xuất bản
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="admin-row-actions">
                                                                    <button
                                                                        className="outline-btn small mod-preview-button"
                                                                        onClick={() =>
                                                                            void openPreview(
                                                                                item,
                                                                                'published',
                                                                            )
                                                                        }
                                                                        aria-label={`Xem chương ${item.title}`}
                                                                    >
                                                                        Xem
                                                                    </button>
                                                                    <button
                                                                        className="outline-btn small mod-danger-button"
                                                                        disabled={disabled}
                                                                        onClick={() =>
                                                                            hideChapter(item.id, item.title)
                                                                        }
                                                                        aria-label={`Ẩn chương ${item.title}`}
                                                                    >
                                                                        Ẩn chương
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        {publishedPagination.element}
                                    </>
                                ) : (
                                    !loading &&
                                    !error && (
                                        <DashboardEmptyState
                                            title={
                                                queries.published
                                                    ? 'Không tìm thấy chương phù hợp'
                                                    : 'Chưa có chương đã xuất bản'
                                            }
                                            description={
                                                queries.published
                                                    ? 'Thử từ khóa khác hoặc xóa bộ lọc.'
                                                    : 'Các chương được xuất bản sẽ xuất hiện tại đây.'
                                            }
                                            onReset={
                                                queries.published
                                                    ? () => setQuery('published', '')
                                                    : undefined
                                            }
                                        />
                                    )
                                )}
                            </>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
