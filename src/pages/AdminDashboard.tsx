import React, { useRef, useState } from 'react';
import { Icons } from '../components/Icons';
import {
    DashboardEmptyState as EmptyState,
    DashboardPagination as Pagination,
} from '../components/DashboardList';
import { getTierName } from '../utils/levelHelper';
import { User, Novel, SystemEvent } from '../types';
import '../styles/admin.css';

interface AdminEvent extends SystemEvent {
    desc?: string;
}
interface AdminDashboardProps {
    novels: Novel[];
    users: User[];
    events: AdminEvent[];
    genres: string[];
    newGenreName: string;
    setNewGenreName: (name: string) => void;
    tagMergeFrom: string;
    setTagMergeFrom: (tag: string) => void;
    tagMergeTo: string;
    setTagMergeTo: (tag: string) => void;
    adminEventTitle: string;
    setAdminEventTitle: (title: string) => void;
    adminEventDesc: string;
    setAdminEventDesc: (desc: string) => void;
    adminEventContent: string;
    setAdminEventContent: (content: string) => void;
    updateFeaturedBannerSubmit: (id: number) => void;
    createSystemEventSubmit: () => void;
    clearActiveEvent: () => void;
    toggleAdminUserRole: (username: string, role: string, checked: boolean) => void;
    deleteGenre: (genre: string) => void;
    handleAddGenre: () => void;
    modMergeTagsSubmit: () => void;
    setCurrentView: (view: string) => void;
    activeBannerId: number | null;
    reports: unknown[];
    modApproveRejectChapter?: (chapterId: number, action: 'approve' | 'reject') => void;
    handleCommentReportAction: (index: number, action: 'keep' | 'delete') => void;
    handleRejectAuthorRequest: (userId: number) => void;
    currentUser: User | null;
    openNovelDetail: (id: number) => void;
    computeAverageStars?: (id: number) => string;
    publishSystemEvent: (id: number) => void;
    deleteSystemEvent: (id: number) => void;
    setActiveEventId: (id: number | null) => void;
    loading?: boolean;
    error?: string;
    onRefresh?: () => void;
}

const tabs = [
    {
        id: 'overview',
        label: 'Tổng quan',
        icon: Icons.Activity,
        group: 'Điều hành',
        description: 'Theo dõi thư viện và những công việc đang chờ xử lý.',
    },
    {
        id: 'users',
        label: 'Tài khoản',
        icon: Icons.Users,
        group: 'Điều hành',
        description: 'Tra cứu thành viên, phân quyền và xét duyệt yêu cầu tác giả.',
    },
    {
        id: 'novels',
        label: 'Tác phẩm',
        icon: Icons.Book,
        group: 'Điều hành',
        description: 'Tra cứu tác phẩm và theo dõi trạng thái nội dung trong thư viện.',
    },
    {
        id: 'genres',
        label: 'Danh mục',
        icon: Icons.Layers,
        group: 'Cấu hình',
        description: 'Quản lý thể loại và chuẩn hóa các thẻ gắn trên tác phẩm.',
    },
    {
        id: 'events',
        label: 'Sự kiện',
        icon: Icons.Bell,
        group: 'Cấu hình',
        description: 'Soạn thông báo, lưu bản nháp và quản lý sự kiện đang phát hành.',
    },
    {
        id: 'homepage',
        label: 'Trang chủ',
        icon: Icons.Image,
        group: 'Cấu hình',
        description: 'Chọn tác phẩm tiêu điểm xuất hiện khi mở thư viện trên trình duyệt này.',
    },
] as const;
type AdminTab = (typeof tabs)[number]['id'];
const pageSize = 10;
const number = (value: number) => value.toLocaleString('vi-VN');
const searchable = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/g, 'd');
const novelStatuses: Record<Novel['status'], string> = {
    active: 'Đang hoạt động',
    suspended: 'Đã khóa',
    ongoing: 'Đang tiến hành',
    completed: 'Hoàn thành',
    paused: 'Tạm ngưng',
    draft: 'Bản nháp',
    published: 'Đã xuất bản',
};

function fallbackCover(event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (!image.src.endsWith('/assets/default_novel_cover.png')) image.src = '/assets/default_novel_cover.png';
}

export default function AdminDashboard(props: AdminDashboardProps) {
    const { novels, users, events, genres, currentUser, reports, loading = false, error = '' } = props;
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [menuOpen, setMenuOpen] = useState(false);
    const [userQuery, setUserQuery] = useState('');
    const [userFilter, setUserFilter] = useState('all');
    const [userPage, setUserPage] = useState(1);
    const [novelQuery, setNovelQuery] = useState('');
    const [novelFilter, setNovelFilter] = useState('all');
    const [novelPage, setNovelPage] = useState(1);
    const [busy, setBusy] = useState('');
    const [actionError, setActionError] = useState('');
    const actionRunning = useRef(false);
    const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
    const menuToggle = useRef<HTMLButtonElement | null>(null);
    const selected = tabs.find((tab) => tab.id === activeTab)!;
    const requests = users.filter((user) => user.author_request === 'pending');
    const pendingCount = novels.reduce(
        (count, novel) =>
            count + (novel.chapters?.filter((chapter) => chapter.status === 'pending').length || 0),
        0,
    );
    const drafts = events.filter((event) => event.status === 'draft');
    const activeEvent = events.find((event) => event.status === 'active');
    const featured = novels.find((novel) => novel.id === props.activeBannerId);
    const filteredUsers = users.filter(
        (user) =>
            searchable(`${user.displayname} ${user.username}`).includes(searchable(userQuery.trim())) &&
            (userFilter === 'all' ||
                (userFilter === 'pending'
                    ? user.author_request === 'pending'
                    : userFilter === 'suspended'
                      ? user.status === 'suspended'
                      : user.roles.some((role) => role === userFilter))),
    );
    const filteredNovels = novels.filter(
        (novel) =>
            searchable(
                `${novel.title} ${novel.author || novel.author_name || novel.author_username || ''}`,
            ).includes(searchable(novelQuery.trim())) &&
            (novelFilter === 'all' || novel.status === novelFilter),
    );
    const currentUserPage = Math.min(userPage, Math.max(1, Math.ceil(filteredUsers.length / pageSize)));
    const currentNovelPage = Math.min(novelPage, Math.max(1, Math.ceil(filteredNovels.length / pageSize)));

    const selectTab = (tab: AdminTab) => {
        setActiveTab(tab);
        setMenuOpen(false);
        requestAnimationFrame(() => {
            if (window.matchMedia('(max-width: 760px)').matches) menuToggle.current?.focus();
            else tabButtons.current[tabs.findIndex((item) => item.id === tab)]?.focus();
        });
    };
    const runAction = async (label: string, action: () => void) => {
        if (actionRunning.current) return;
        actionRunning.current = true;
        setBusy(label);
        setActionError('');
        try {
            await action();
        } catch {
            setActionError('Chưa thể thực hiện thao tác. Nội dung bạn nhập vẫn được giữ, hãy thử lại.');
        } finally {
            actionRunning.current = false;
            setBusy('');
        }
    };
    const panel = (tab: AdminTab) => ({
        id: `admin-panel-${tab}`,
        role: 'tabpanel',
        'aria-labelledby': `admin-tab-${tab}`,
        hidden: activeTab !== tab,
        tabIndex: 0,
    });
    const filterRequests = () => {
        setUserFilter('pending');
        setUserPage(1);
        selectTab('users');
    };
    const resetUsers = () => {
        setUserQuery('');
        setUserFilter('all');
        setUserPage(1);
    };
    const resetNovels = () => {
        setNovelQuery('');
        setNovelFilter('all');
        setNovelPage(1);
    };
    const actionsDisabled = !!busy || loading || !!error;

    return (
        <div className="admin-workspace">
            <aside className="admin-sidebar" aria-label="Không gian quản trị">
                <div className="admin-brand">
                    <span className="admin-brand-mark" aria-hidden="true">
                        <Icons.Shield size={22} />
                    </span>
                    <div>
                        <strong>MugenBunko</strong>
                        <span>Không gian quản trị</span>
                    </div>
                </div>
                <button
                    className="admin-menu-toggle"
                    ref={menuToggle}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-expanded={menuOpen}
                    aria-controls="admin-navigation"
                >
                    <span>
                        <Icons.List size={18} />
                        {selected.label}
                    </span>
                    <span>{menuOpen ? 'Thu gọn' : 'Danh mục'}</span>
                </button>
                <div id="admin-navigation" className={`admin-navigation ${menuOpen ? 'is-open' : ''}`}>
                    <div role="tablist" aria-label="Chức năng quản trị" aria-orientation="vertical">
                        {tabs.map((tab, index) => (
                            <React.Fragment key={tab.id}>
                                {(index === 0 || tabs[index - 1].group !== tab.group) && (
                                    <p className="admin-nav-group" role="presentation">
                                        {tab.group}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    id={`admin-tab-${tab.id}`}
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    aria-controls={`admin-panel-${tab.id}`}
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
                                    {tab.id === 'users' && requests.length > 0 && (
                                        <span
                                            className="admin-nav-count"
                                            aria-label={`${requests.length} yêu cầu tác giả`}
                                        >
                                            {number(requests.length)}
                                        </span>
                                    )}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="admin-sidebar-links">
                        <a href="#/mod-dashboard">
                            <Icons.Shield size={16} />
                            <span>Khu vực kiểm duyệt</span>
                            <Icons.ChevronRight size={14} />
                        </a>
                        <a href="#/manage-rules">
                            <Icons.FileText size={16} />
                            <span>Quy định cộng đồng</span>
                            <Icons.ChevronRight size={14} />
                        </a>
                    </div>
                    <div className="admin-sidebar-footer">
                        <span className="admin-avatar" aria-hidden="true">
                            {(currentUser?.displayname || currentUser?.username || 'A')
                                .charAt(0)
                                .toUpperCase()}
                        </span>
                        <div>
                            <strong>{currentUser?.displayname || currentUser?.username}</strong>
                            <span>Quản trị viên</span>
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
                        <p className="admin-eyebrow">Quản trị / {selected.label}</p>
                        <h1>{selected.label}</h1>
                        <p>{selected.description}</p>
                    </div>
                    {props.onRefresh && (
                        <button
                            className="outline-btn small admin-refresh"
                            disabled={loading || !!busy}
                            onClick={props.onRefresh}
                        >
                            <Icons.RefreshCw size={15} />
                            {loading ? 'Đang tải…' : 'Làm mới'}
                        </button>
                    )}
                </header>
                {error && (
                    <div className="admin-notice" role="alert">
                        <Icons.AlertCircle size={19} />
                        <p>{error}</p>
                        {props.onRefresh && (
                            <button className="text-action" disabled={loading} onClick={props.onRefresh}>
                                Thử lại
                            </button>
                        )}
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
                        Đang tải dữ liệu quản trị…
                    </p>
                )}
                <div className="admin-panels" aria-busy={loading}>
                    <section {...panel('overview')}>
                        <dl className="admin-metrics">
                            {[
                                ['Tài khoản', users.length],
                                ['Tác phẩm', novels.length],
                                ['Chương chờ duyệt', pendingCount],
                                ['Báo cáo', reports.length],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd>{loading || error ? '—' : number(Number(value))}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="admin-section-heading">
                            <div>
                                <h2>Cần xử lý</h2>
                                <p>Đi thẳng đến công việc cần bạn xem xét.</p>
                            </div>
                        </div>
                        <div className="admin-work-list">
                            <button onClick={filterRequests}>
                                <span className="admin-work-icon" aria-hidden="true">
                                    <Icons.UserPlus size={20} />
                                </span>
                                <span>
                                    <strong>Yêu cầu trở thành tác giả</strong>
                                    <small>Xét duyệt và cấp quyền cho thành viên.</small>
                                </span>
                                <span className="admin-work-count">
                                    {loading || error ? '—' : requests.length}
                                </span>
                                <Icons.ArrowRight size={18} />
                            </button>
                            <a href="#/mod-dashboard">
                                <span className="admin-work-icon" aria-hidden="true">
                                    <Icons.Shield size={20} />
                                </span>
                                <span>
                                    <strong>Hàng đợi kiểm duyệt</strong>
                                    <small>Chương mới và bình luận được báo cáo.</small>
                                </span>
                                <span className="admin-work-count">
                                    {loading || error ? '—' : pendingCount + reports.length}
                                </span>
                                <Icons.ArrowRight size={18} />
                            </a>
                            <button onClick={() => selectTab('events')}>
                                <span className="admin-work-icon" aria-hidden="true">
                                    <Icons.FileText size={20} />
                                </span>
                                <span>
                                    <strong>Sự kiện chưa phát hành</strong>
                                    <small>Kiểm tra nội dung trước khi hiển thị cho độc giả.</small>
                                </span>
                                <span className="admin-work-count">
                                    {loading || error ? '—' : drafts.length}
                                </span>
                                <Icons.ArrowRight size={18} />
                            </button>
                        </div>
                        <div className="admin-section-heading">
                            <div>
                                <h2>Tác phẩm trong thư viện</h2>
                                <p>Một vài tác phẩm để truy cập nhanh.</p>
                            </div>
                            <button className="text-action" onClick={() => selectTab('novels')}>
                                Xem tất cả <Icons.ArrowRight size={15} />
                            </button>
                        </div>
                        {!loading && !error && novels.length === 0 && (
                            <EmptyState
                                title="Thư viện chưa có tác phẩm"
                                description="Tác phẩm được tạo trong Studio sẽ xuất hiện tại đây."
                            />
                        )}
                        <div className="admin-recent-list">
                            {novels.slice(0, 4).map((novel) => (
                                <button key={novel.id} onClick={() => props.openNovelDetail(novel.id)}>
                                    <span>
                                        <strong>{novel.title}</strong>
                                        <small>
                                            {novel.author ||
                                                novel.author_name ||
                                                novel.author_username ||
                                                'Ẩn danh'}
                                        </small>
                                    </span>
                                    <span className="admin-status">{novelStatuses[novel.status]}</span>
                                    <Icons.ChevronRight size={16} />
                                </button>
                            ))}
                        </div>
                    </section>

                    <section {...panel('users')}>
                        <div className="admin-toolbar">
                            <label className="admin-search">
                                <Icons.Search size={17} />
                                <span className="sr-only">Tìm tài khoản</span>
                                <input
                                    type="search"
                                    placeholder="Tìm tên hoặc @username…"
                                    value={userQuery}
                                    onChange={(event) => {
                                        setUserQuery(event.target.value);
                                        setUserPage(1);
                                    }}
                                />
                            </label>
                            <label className="admin-filter">
                                <span>Lọc theo</span>
                                <select
                                    aria-label="Lọc tài khoản"
                                    value={userFilter}
                                    onChange={(event) => {
                                        setUserFilter(event.target.value);
                                        setUserPage(1);
                                    }}
                                >
                                    <option value="all">Tất cả tài khoản</option>
                                    <option value="pending">Chờ quyền tác giả</option>
                                    <option value="author">Tác giả</option>
                                    <option value="moderator">Điều phối viên</option>
                                    <option value="admin">Quản trị viên</option>
                                    <option value="suspended">Đã khóa</option>
                                </select>
                            </label>
                        </div>
                        <p className="admin-list-note">
                            Quyền độc giả luôn được giữ. Tài khoản của bạn chỉ hiển thị để tra cứu.
                        </p>
                        {filteredUsers.length > 0 ? (
                            <>
                                <table className="admin-table admin-users-table">
                                    <caption className="sr-only">Danh sách tài khoản và phân quyền</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Thành viên</th>
                                            <th scope="col">Trạng thái</th>
                                            <th scope="col">Phân quyền</th>
                                            <th scope="col">Yêu cầu tác giả</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers
                                            .slice(
                                                (currentUserPage - 1) * pageSize,
                                                currentUserPage * pageSize,
                                            )
                                            .map((user) => {
                                                const self = user.id === currentUser?.id;
                                                return (
                                                    <tr key={user.id}>
                                                        <td>
                                                            <div className="admin-user-name">
                                                                <span
                                                                    className="admin-avatar"
                                                                    aria-hidden="true"
                                                                >
                                                                    {(user.displayname || user.username)
                                                                        .charAt(0)
                                                                        .toUpperCase()}
                                                                </span>
                                                                <div>
                                                                    <strong>
                                                                        {user.displayname || user.username}
                                                                        {self && (
                                                                            <span className="admin-you">
                                                                                Bạn
                                                                            </span>
                                                                        )}
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
                                                            <fieldset
                                                                className="admin-role-options"
                                                                disabled={self || actionsDisabled}
                                                            >
                                                                <legend className="sr-only">
                                                                    Vai trò của @{user.username}
                                                                </legend>
                                                                {(
                                                                    [
                                                                        ['author', 'Tác giả'],
                                                                        ['moderator', 'Mod'],
                                                                        ['admin', 'Admin'],
                                                                    ] as const
                                                                ).map(([role, label]) => (
                                                                    <label key={role}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={user.roles.includes(
                                                                                role,
                                                                            )}
                                                                            disabled={
                                                                                (role === 'moderator' &&
                                                                                    user.roles.includes(
                                                                                        'admin',
                                                                                    )) ||
                                                                                (role === 'admin' &&
                                                                                    user.roles.includes(
                                                                                        'moderator',
                                                                                    ))
                                                                            }
                                                                            aria-label={`${label} @${user.username}`}
                                                                            onChange={(event) =>
                                                                                void runAction(
                                                                                    'Đang cập nhật quyền',
                                                                                    () =>
                                                                                        props.toggleAdminUserRole(
                                                                                            user.username,
                                                                                            role,
                                                                                            event.target
                                                                                                .checked,
                                                                                        ),
                                                                                )
                                                                            }
                                                                        />
                                                                        {label}
                                                                    </label>
                                                                ))}
                                                            </fieldset>
                                                        </td>
                                                        <td>
                                                            {user.author_request === 'pending' ? (
                                                                <div className="admin-request-actions">
                                                                    <span className="admin-status is-attention">
                                                                        Chờ duyệt
                                                                    </span>
                                                                    <button
                                                                        className="text-action"
                                                                        disabled={self || actionsDisabled}
                                                                        onClick={() =>
                                                                            void runAction(
                                                                                'Đang duyệt tác giả',
                                                                                () =>
                                                                                    props.toggleAdminUserRole(
                                                                                        user.username,
                                                                                        'author',
                                                                                        true,
                                                                                    ),
                                                                            )
                                                                        }
                                                                    >
                                                                        Duyệt
                                                                        <span className="sr-only">
                                                                            {' '}
                                                                            @{user.username}
                                                                        </span>
                                                                    </button>
                                                                    <button
                                                                        className="admin-text-danger"
                                                                        disabled={self || actionsDisabled}
                                                                        onClick={() =>
                                                                            void runAction(
                                                                                'Đang từ chối yêu cầu',
                                                                                () =>
                                                                                    props.handleRejectAuthorRequest(
                                                                                        user.id,
                                                                                    ),
                                                                            )
                                                                        }
                                                                    >
                                                                        Từ chối
                                                                        <span className="sr-only">
                                                                            {' '}
                                                                            @{user.username}
                                                                        </span>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="admin-muted">
                                                                    {user.author_request === 'approved'
                                                                        ? 'Đã duyệt'
                                                                        : user.author_request === 'rejected'
                                                                          ? 'Đã từ chối'
                                                                          : '—'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                                <Pagination
                                    page={currentUserPage}
                                    total={filteredUsers.length}
                                    onChange={setUserPage}
                                    label="tài khoản"
                                />
                            </>
                        ) : (
                            !loading &&
                            !error && (
                                <EmptyState
                                    title={
                                        users.length
                                            ? 'Không tìm thấy tài khoản'
                                            : 'Chưa có tài khoản để hiển thị'
                                    }
                                    description={
                                        users.length
                                            ? 'Thử tên khác hoặc bỏ bộ lọc đang chọn.'
                                            : 'Danh sách thành viên sẽ xuất hiện tại đây.'
                                    }
                                    onReset={userQuery || userFilter !== 'all' ? resetUsers : undefined}
                                />
                            )
                        )}
                    </section>

                    <section {...panel('novels')}>
                        <div className="admin-toolbar">
                            <label className="admin-search">
                                <Icons.Search size={17} />
                                <span className="sr-only">Tìm tác phẩm</span>
                                <input
                                    type="search"
                                    placeholder="Tìm tác phẩm hoặc tác giả…"
                                    value={novelQuery}
                                    onChange={(event) => {
                                        setNovelQuery(event.target.value);
                                        setNovelPage(1);
                                    }}
                                />
                            </label>
                            <label className="admin-filter">
                                <span>Trạng thái</span>
                                <select
                                    aria-label="Lọc trạng thái tác phẩm"
                                    value={novelFilter}
                                    onChange={(event) => {
                                        setNovelFilter(event.target.value);
                                        setNovelPage(1);
                                    }}
                                >
                                    <option value="all">Tất cả trạng thái</option>
                                    {Object.entries(novelStatuses).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        {filteredNovels.length > 0 ? (
                            <>
                                <table className="admin-table admin-novels-table">
                                    <caption className="sr-only">Danh sách tác phẩm hệ thống</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Tác phẩm</th>
                                            <th scope="col">Trạng thái</th>
                                            <th scope="col">Nội dung</th>
                                            <th scope="col">Lượt đọc</th>
                                            <th scope="col">
                                                <span className="sr-only">Thao tác</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredNovels
                                            .slice(
                                                (currentNovelPage - 1) * pageSize,
                                                currentNovelPage * pageSize,
                                            )
                                            .map((novel) => (
                                                <tr key={novel.id}>
                                                    <td>
                                                        <div className="admin-novel-name">
                                                            <img
                                                                src={
                                                                    novel.cover ||
                                                                    '/assets/default_novel_cover.png'
                                                                }
                                                                alt=""
                                                                width="38"
                                                                height="54"
                                                                loading="lazy"
                                                                onError={fallbackCover}
                                                            />
                                                            <div>
                                                                <strong>{novel.title}</strong>
                                                                <small>
                                                                    {novel.author ||
                                                                        novel.author_name ||
                                                                        novel.author_username ||
                                                                        'Ẩn danh'}{' '}
                                                                    ·{' '}
                                                                    {novel.type === 'oneshot'
                                                                        ? 'Oneshot'
                                                                        : 'Series'}
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="admin-status">
                                                            {novelStatuses[novel.status]}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span>{novel.chapters?.length || 0} chương</span>
                                                        <small>
                                                            {props.computeAverageStars?.(novel.id) ||
                                                                (Number(novel.rating) || 0).toFixed(1)}{' '}
                                                            / 5 sao
                                                        </small>
                                                    </td>
                                                    <td>{number(Number(novel.reads) || 0)}</td>
                                                    <td>
                                                        <button
                                                            className="outline-btn small"
                                                            onClick={() => props.openNovelDetail(novel.id)}
                                                        >
                                                            Chi tiết
                                                            <span className="sr-only"> {novel.title}</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                                <Pagination
                                    page={currentNovelPage}
                                    total={filteredNovels.length}
                                    onChange={setNovelPage}
                                    label="tác phẩm"
                                />
                            </>
                        ) : (
                            !loading &&
                            !error && (
                                <EmptyState
                                    title={
                                        novels.length
                                            ? 'Không tìm thấy tác phẩm'
                                            : 'Thư viện chưa có tác phẩm'
                                    }
                                    description={
                                        novels.length
                                            ? 'Thử tên khác hoặc bỏ bộ lọc trạng thái.'
                                            : 'Tác phẩm được tạo trong Studio sẽ xuất hiện tại đây.'
                                    }
                                    onReset={novelQuery || novelFilter !== 'all' ? resetNovels : undefined}
                                />
                            )
                        )}
                    </section>

                    <section {...panel('genres')}>
                        <div className="admin-section-heading">
                            <div>
                                <h2>Thể loại</h2>
                                <p>Các lựa chọn xuất hiện trong bộ lọc khám phá truyện.</p>
                            </div>
                            <span className="admin-muted">{number(genres.length)} thể loại</span>
                        </div>
                        <form
                            className="admin-inline-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void runAction('Đang thêm thể loại', props.handleAddGenre);
                            }}
                        >
                            <label className="sr-only" htmlFor="admin-new-genre">
                                Tên thể loại mới
                            </label>
                            <input
                                id="admin-new-genre"
                                disabled={!!busy}
                                placeholder="Nhập tên thể loại mới…"
                                maxLength={100}
                                value={props.newGenreName}
                                onChange={(event) => props.setNewGenreName(event.target.value)}
                            />
                            <button
                                className="primary-btn small"
                                disabled={actionsDisabled || !props.newGenreName.trim()}
                            >
                                <Icons.Plus size={16} />
                                Thêm thể loại
                            </button>
                        </form>
                        <ul className="admin-genre-list">
                            {genres.map((genre) => (
                                <li key={genre}>
                                    <span>{genre}</span>
                                    <button
                                        type="button"
                                        className="admin-icon-button"
                                        aria-label={`Xóa thể loại ${genre}`}
                                        disabled={actionsDisabled}
                                        onClick={() =>
                                            void runAction('Đang xóa thể loại', () =>
                                                props.deleteGenre(genre),
                                            )
                                        }
                                    >
                                        <Icons.X size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {!genres.length && !loading && !error && (
                            <p className="admin-muted">
                                Chưa có thể loại. Thêm thể loại đầu tiên ở phía trên.
                            </p>
                        )}
                        <div className="admin-section-heading admin-section-divider">
                            <div>
                                <h2>Chuẩn hóa thẻ</h2>
                                <p>Gộp một thẻ cũ vào thẻ đích trên các tác phẩm đang sử dụng.</p>
                            </div>
                        </div>
                        <form
                            className="admin-form admin-merge-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void runAction('Đang gộp thẻ', props.modMergeTagsSubmit);
                            }}
                        >
                            <div className="admin-form-row">
                                <label htmlFor="admin-tag-from">
                                    Thẻ cần gộp
                                    <input
                                        id="admin-tag-from"
                                        disabled={!!busy}
                                        placeholder="Ví dụ: isekai"
                                        value={props.tagMergeFrom}
                                        onChange={(event) => props.setTagMergeFrom(event.target.value)}
                                    />
                                </label>
                                <span className="admin-merge-arrow" aria-hidden="true">
                                    <Icons.ArrowRight size={20} />
                                </span>
                                <label htmlFor="admin-tag-to">
                                    Thẻ đích
                                    <input
                                        id="admin-tag-to"
                                        disabled={!!busy}
                                        placeholder="Ví dụ: chuyển sinh"
                                        value={props.tagMergeTo}
                                        onChange={(event) => props.setTagMergeTo(event.target.value)}
                                    />
                                </label>
                            </div>
                            <p className="admin-form-help">
                                Thẻ cũ sẽ được thay bằng thẻ đích. Kiểm tra lại hai tên trước khi gộp.
                            </p>
                            <div className="admin-form-actions">
                                <button
                                    className="primary-btn small"
                                    disabled={
                                        actionsDisabled ||
                                        !props.tagMergeFrom.trim() ||
                                        !props.tagMergeTo.trim() ||
                                        props.tagMergeFrom.trim() === props.tagMergeTo.trim()
                                    }
                                >
                                    Gộp thẻ
                                </button>
                            </div>
                        </form>
                    </section>

                    <section {...panel('events')}>
                        {activeEvent && (
                            <div className="admin-live-event">
                                <span aria-hidden="true">
                                    <Icons.Bell size={19} />
                                </span>
                                <div>
                                    <span className="admin-eyebrow">Đang hiển thị</span>
                                    <strong>{activeEvent.title}</strong>
                                </div>
                                <button
                                    className="outline-btn small"
                                    disabled={actionsDisabled}
                                    onClick={() =>
                                        void runAction('Đang dừng sự kiện', props.clearActiveEvent)
                                    }
                                >
                                    Dừng hiển thị
                                </button>
                            </div>
                        )}
                        <div className="admin-section-heading">
                            <div>
                                <h2>Soạn sự kiện</h2>
                                <p>Lưu nháp để kiểm tra nội dung trước khi phát hành.</p>
                            </div>
                        </div>
                        <form
                            className="admin-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void runAction('Đang lưu bản nháp', props.createSystemEventSubmit);
                            }}
                        >
                            <label htmlFor="admin-event-title">
                                Tên sự kiện
                                <input
                                    id="admin-event-title"
                                    disabled={!!busy}
                                    required
                                    maxLength={255}
                                    placeholder="Ví dụ: Tháng đọc sách mùa xuân"
                                    value={props.adminEventTitle}
                                    onChange={(event) => props.setAdminEventTitle(event.target.value)}
                                />
                            </label>
                            <label htmlFor="admin-event-description">
                                Thông báo ngắn
                                <input
                                    id="admin-event-description"
                                    disabled={!!busy}
                                    required
                                    placeholder="Nội dung hiển thị trên thanh thông báo…"
                                    value={props.adminEventDesc}
                                    onChange={(event) => props.setAdminEventDesc(event.target.value)}
                                />
                            </label>
                            <label htmlFor="admin-event-content">
                                Nội dung chi tiết
                                <textarea
                                    id="admin-event-content"
                                    disabled={!!busy}
                                    rows={7}
                                    placeholder="Viết nội dung sự kiện (hỗ trợ HTML)…"
                                    value={props.adminEventContent}
                                    onChange={(event) => props.setAdminEventContent(event.target.value)}
                                />
                            </label>
                            <p className="admin-form-help">
                                Bản nháp chưa hiển thị cho độc giả. Bạn có thể xem trước trong danh sách bên
                                dưới.
                            </p>
                            <div className="admin-form-actions">
                                <button
                                    className="primary-btn small"
                                    disabled={
                                        actionsDisabled ||
                                        !props.adminEventTitle.trim() ||
                                        !props.adminEventDesc.trim()
                                    }
                                >
                                    Lưu bản nháp
                                </button>
                            </div>
                        </form>
                        <div className="admin-section-heading admin-section-divider">
                            <div>
                                <h2>Danh sách sự kiện</h2>
                                <p>
                                    {number(events.length)} sự kiện · {number(drafts.length)} bản nháp
                                </p>
                            </div>
                        </div>
                        <ul className="admin-event-list">
                            {events.map((event) => (
                                <li key={event.id}>
                                    <div className="admin-event-summary">
                                        <div>
                                            <strong>{event.title}</strong>
                                            <span
                                                className={`admin-status ${event.status === 'active' ? 'is-attention' : ''}`}
                                            >
                                                {event.status === 'active'
                                                    ? 'Đang hiển thị'
                                                    : event.status === 'published'
                                                      ? 'Đã phát hành'
                                                      : 'Bản nháp'}
                                            </span>
                                        </div>
                                        <p>{event.desc || event.description}</p>
                                    </div>
                                    <div className="admin-row-actions">
                                        <button
                                            className="outline-btn small"
                                            onClick={() => {
                                                props.setActiveEventId(event.id);
                                                props.setCurrentView('event-detail');
                                            }}
                                        >
                                            Xem trước<span className="sr-only"> {event.title}</span>
                                        </button>
                                        {event.status === 'draft' && (
                                            <button
                                                className="primary-btn small"
                                                disabled={actionsDisabled}
                                                onClick={() =>
                                                    void runAction('Đang phát hành sự kiện', () =>
                                                        props.publishSystemEvent(event.id),
                                                    )
                                                }
                                            >
                                                Phát hành<span className="sr-only"> {event.title}</span>
                                            </button>
                                        )}
                                        <button
                                            className="admin-icon-button admin-delete"
                                            disabled={actionsDisabled}
                                            aria-label={`Xóa sự kiện ${event.title}`}
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `Xóa sự kiện “${event.title}”? Nội dung sự kiện sẽ bị xóa vĩnh viễn.`,
                                                    )
                                                )
                                                    void runAction('Đang xóa sự kiện', () =>
                                                        props.deleteSystemEvent(event.id),
                                                    );
                                            }}
                                        >
                                            <Icons.Trash size={17} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {!events.length && !loading && !error && (
                            <EmptyState
                                title="Chưa có sự kiện"
                                description="Soạn và lưu bản nháp đầu tiên bằng biểu mẫu phía trên."
                            />
                        )}
                    </section>

                    <section {...panel('homepage')}>
                        <div className="admin-section-heading">
                            <div>
                                <h2>Tác phẩm tiêu điểm</h2>
                                <p>Chọn truyện cho banner lớn trên trang chủ.</p>
                            </div>
                        </div>
                        <div className="admin-form">
                            <label htmlFor="admin-featured-novel">
                                Chọn tác phẩm
                                <select
                                    id="admin-featured-novel"
                                    value={featured?.id || ''}
                                    disabled={actionsDisabled || !novels.length}
                                    onChange={(event) => {
                                        if (event.target.value)
                                            props.updateFeaturedBannerSubmit(Number(event.target.value));
                                    }}
                                >
                                    <option value="" disabled>
                                        Chọn một tác phẩm…
                                    </option>
                                    {novels.map((novel) => (
                                        <option key={novel.id} value={novel.id}>
                                            {novel.title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <p className="admin-form-help">
                                Lựa chọn được lưu trên trình duyệt này và áp dụng ngay khi bạn quay về thư
                                viện.
                            </p>
                        </div>
                        {featured ? (
                            <div className="admin-featured-preview">
                                <img
                                    src={featured.cover || '/assets/default_novel_cover.png'}
                                    alt={`Bìa ${featured.title}`}
                                    width="120"
                                    height="172"
                                    onError={fallbackCover}
                                />
                                <div>
                                    <p className="admin-eyebrow">Tiêu điểm đã chọn</p>
                                    <h2>{featured.title}</h2>
                                    <p>
                                        {featured.author ||
                                            featured.author_name ||
                                            featured.author_username ||
                                            'Ẩn danh'}
                                    </p>
                                    <span className="admin-status">{novelStatuses[featured.status]}</span>
                                    <button
                                        className="outline-btn small"
                                        onClick={() => props.openNovelDetail(featured.id)}
                                    >
                                        Xem tác phẩm <Icons.ArrowRight size={15} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            !loading &&
                            !error && (
                                <EmptyState
                                    title="Chưa chọn tác phẩm tiêu điểm"
                                    description="Chọn tác phẩm ở phía trên để cập nhật banner của bạn."
                                />
                            )
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
