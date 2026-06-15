import React, { useState, useEffect } from 'react';
import { calculateUserLevel, getTierName, getTierClassName } from '../utils/levelHelper';
import { User, Novel, ForumPost } from '../types';
import { formatDate } from '../utils/dateFormatter';

interface SocialUser {
    id: number;
    username: string;
    displayname: string;
    avatarSeed: string;
    level: number | string;
    status?: string;
    date?: string;
    senderId?: number;
    bio?: string;
}

interface UserProfileProps {
    currentUser: User | null;
    viewingUsername: string | null;
    setViewingUsername: (username: string | null) => void;
    novels: Novel[];
    forumPosts: ForumPost[];
    socialFriends: SocialUser[];
    receivedRequests: SocialUser[];
    sentRequests: SocialUser[];
    fetchSocialData?: () => void;
    handleSendRequest: (userId: number) => void;
    handleAcceptRequest: (userId: number) => void;
    handleDeclineRequest: (userId: number) => void;
    openNovelDetail: (id: number) => void;
    setActiveForumPostId: (id: number | null) => void;
    profileActiveTab: string;
    setProfileActiveTab: (tab: string) => void;
    profileDisplayname: string;
    setProfileDisplayname: (name: string) => void;
    profileAvatarSeed: string;
    setProfileAvatarSeed: (seed: string) => void;
    profileBio: string;
    setProfileBio: (bio: string) => void;
    profileRoles: string[];
    setProfileRoles: (roles: string[]) => void;
    regenerateProfileAvatar: () => void;
    saveBasicProfile: () => void;
    handleRoleCheckboxChange?: (role: string, checked: boolean) => void;
    saveUserRoles?: () => void;
    setCurrentView: (view: string) => void;
    handleRequestAuthorRole: () => void;
    handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    theme: string;
    handleThemeChange: (theme: string) => void;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
    triggerConfirm: (msg: string, callback: () => void) => void;
}

export default function UserProfile({
    currentUser,
    viewingUsername,
    setViewingUsername,
    novels,
    forumPosts,
    socialFriends,
    receivedRequests,
    sentRequests,
    fetchSocialData,
    handleSendRequest,
    handleAcceptRequest,
    handleDeclineRequest,
    openNovelDetail,
    setActiveForumPostId,
    profileActiveTab,
    setProfileActiveTab,
    profileDisplayname,
    setProfileDisplayname,
    profileAvatarSeed,
    setProfileAvatarSeed,
    profileBio,
    setProfileBio,
    theme,
    handleThemeChange,
    fetchWithAuth,
    API_BASE,
    setCurrentView,
    handleRequestAuthorRole,
    handleAvatarUpload,
    regenerateProfileAvatar,
    saveBasicProfile
}: UserProfileProps) {
    const [socialSearchQuery, setSocialSearchQuery] = useState("");
    const [socialSearchResults, setSocialSearchResults] = useState<SocialUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // States for viewing public profile
    const [publicUser, setPublicUser] = useState<User | null>(null);
    const [loadingPublic, setLoadingPublic] = useState(false);
    const [publicFriends, setPublicFriends] = useState<SocialUser[]>([]);

    const isPublic = !!publicUser;

    useEffect(() => {
        const fetchPublicUser = async () => {
            if (!viewingUsername || (currentUser && viewingUsername === currentUser.username)) {
                setPublicUser(null);
                setPublicFriends([]);
                return;
            }
            setLoadingPublic(true);
            try {
                const res = await fetch(`${API_BASE}/auth/user/${viewingUsername}`);
                const data = await res.json();
                if (res.ok && data.user) {
                    setPublicUser(data.user);
                } else {
                    setPublicUser(null);
                }

                const friendsRes = await fetch(`${API_BASE}/social/friends/user/${viewingUsername}`);
                if (friendsRes.ok) {
                    const friendsData = await friendsRes.json();
                    setPublicFriends(friendsData.friends || []);
                } else {
                    setPublicFriends([]);
                }
            } catch (err) {
                console.error("Lỗi lấy thông tin công khai người dùng:", err);
                setPublicUser(null);
                setPublicFriends([]);
            } finally {
                setLoadingPublic(false);
            }
        };
        fetchPublicUser();
    }, [viewingUsername, currentUser, API_BASE]);

    useEffect(() => {
        if (isPublic && profileActiveTab === 'profile-tab-info') {
            setProfileActiveTab('profile-tab-novels');
        }
    }, [isPublic, profileActiveTab, setProfileActiveTab]);

    useEffect(() => {
        if (profileActiveTab === 'profile-tab-social' && fetchSocialData) {
            fetchSocialData();
        }
    }, [profileActiveTab, currentUser, fetchSocialData]);

    const handleSearchUsers = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!socialSearchQuery.trim() || !fetchWithAuth || !API_BASE) return;
        setIsSearching(true);
        try {
            const res = await fetchWithAuth(`${API_BASE}/social/users/search?q=${encodeURIComponent(socialSearchQuery.trim())}`);
            if (res.ok) {
                const data = await res.json();
                setSocialSearchResults(data);
            }
        } catch (err) {
            console.error("Lỗi tìm kiếm người dùng:", err);
        } finally {
            setIsSearching(false);
        }
    };

    if (loadingPublic) {
        return (
            <div className="page-view active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🌸</div>
                    <div>Đang tải hồ sơ wibu...</div>
                </div>
            </div>
        );
    }

    const targetUser = publicUser || currentUser;

    if (!targetUser) {
        return (
            <div className="page-view active" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Chưa đăng nhập và không có thông tin tài khoản.
            </div>
        );
    }

    const targetUserLevel = calculateUserLevel(targetUser.xp || 0);
    const filteredNovels = novels ? novels.filter(n => n.authorId === targetUser.username) : [];
    const filteredPosts = forumPosts ? forumPosts.filter(p => p.author_username === targetUser.username) : [];

    const isFriend = socialFriends.some(f => f.id === targetUser.id);
    const isReceivedPending = receivedRequests.some(r => r.id === targetUser.id);
    const isSentPending = sentRequests.some(s => s.id === targetUser.id);

    return (
        <div className="page-view active">
            <div className="studio-header">
                <div>
                    <h2>{isPublic ? `Trang Cá Nhân Của ${targetUser.displayname}` : 'Thông Tin Cá Nhân'}</h2>
                    <p className="subtitle">
                        {isPublic
                            ? `Khám phá tác phẩm, bài đăng diễn đàn của @${targetUser.username}.`
                            : 'Chỉnh sửa hồ sơ và thông tin cá nhân.'}
                    </p>
                </div>
                <button className="outline-btn small" onClick={() => { setViewingUsername(null); setCurrentView('home'); }}>
                    ← {isPublic ? 'Quay lại trang chủ' : 'Quay lại thư viện'}
                </button>
            </div>

            <div className="profile-layout-container" style={{ display: 'grid', gridTemplateColumns: '3.5fr 8.5fr', gap: '32px', marginTop: '24px' }}>
                {/* Left column info card */}
                <div className="profile-left-column">
                    <div className="sidebar-card text-center" style={{ textAlign: 'center' }}>
                        <div className={`avatar-frame level-${targetUserLevel.className}`} style={{ width: '96px', height: '96px', margin: '0 auto 16px auto' }}>
                            <img
                                src={targetUser.avatarSeed && (targetUser.avatarSeed.startsWith('http') || targetUser.avatarSeed.startsWith('/uploads') || targetUser.avatarSeed.startsWith('data:'))
                                    ? targetUser.avatarSeed
                                    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${targetUser.avatarSeed || 'Default'}`}
                                alt="Avatar"
                                className="avatar-img"
                            />
                        </div>
                        <h3 style={{ margin: 0 }}>{targetUser.displayname}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{targetUser.username}</span>

                        <div className="profile-stats-mini" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--indigo-blue)' }}>{targetUserLevel.tierName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cấp bậc Wibu</div>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.82rem', color: 'var(--text-content)', fontStyle: 'italic', padding: '0 8px', marginBottom: '16px' }}>
                            {targetUser.bio || (isPublic ? 'Wibu này lười quá, chưa viết lời giới thiệu nào...' : 'Chưa viết lời giới thiệu...')}
                        </p>

                        {/* Display User Roles Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', margin: '12px 0' }}>
                            {targetUser.roles && targetUser.roles.map(r => {
                                let label = 'Độc giả';
                                let color = 'var(--text-muted)';
                                let bg = 'var(--bg-base)';
                                if (r === 'author') { label = 'Tác giả'; color = 'var(--sakura-pink)'; bg = 'var(--sakura-pink-light)'; }
                                if (r === 'moderator') { label = 'Kiểm duyệt'; color = 'var(--indigo-blue)'; bg = '#e0e7ff'; }
                                if (r === 'admin') { label = 'Admin'; color = '#7c3aed'; bg = '#f3e8ff'; }
                                return (
                                    <span key={r} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', color, backgroundColor: bg, border: `1px solid ${color}40` }}>
                                        {label}
                                    </span>
                                );
                            })}
                        </div>

                        {/* Author Request Button / Status (Only on own profile) */}
                        {!isPublic && currentUser && !currentUser.roles.includes('author') && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                {currentUser.author_request === 'pending' && (
                                    <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>
                                        ⏱️ Đang chờ duyệt Tác giả...
                                    </div>
                                )}
                                {currentUser.author_request === 'rejected' && (
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#cc0000', fontWeight: 600, marginBottom: '6px' }}>
                                            ❌ Yêu cầu Tác giả bị từ chối
                                        </div>
                                        <button className="primary-btn small w-100" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={handleRequestAuthorRole}>Gửi lại yêu cầu</button>
                                    </div>
                                )}
                                {(!currentUser.author_request || currentUser.author_request === 'null' || currentUser.author_request === null) && (
                                    <button className="primary-btn small w-100" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={handleRequestAuthorRole}>
                                        Đăng ký làm Tác giả 🖋️
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Join Date */}
                        <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '12px 0' }}></div>
                        <div style={{ width: '100%', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Ngày gia nhập: {formatDate(targetUser.dateJoined || targetUser.date_joined)}
                        </div>

                        {/* Friendship interaction buttons (Only for public profile of another user) */}
                        {isPublic && currentUser && currentUser.username !== targetUser.username && (
                            <div style={{ marginTop: '12px' }}>
                                {isFriend ? (
                                    <button
                                        className="outline-btn small w-100"
                                        style={{ borderColor: 'rgba(255, 59, 48, 0.25)', color: '#ff3b30', fontSize: '0.8rem', padding: '6px 12px' }}
                                        onClick={() => handleDeclineRequest(targetUser.id)}
                                    >
                                        💔 Hủy kết bạn
                                    </button>
                                ) : isReceivedPending ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="primary-btn small"
                                            style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px' }}
                                            onClick={() => handleAcceptRequest(targetUser.id)}
                                        >
                                            🤝 Đồng ý
                                        </button>
                                        <button
                                            className="outline-btn small"
                                            style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px' }}
                                            onClick={() => handleDeclineRequest(targetUser.id)}
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                ) : isSentPending ? (
                                    <button
                                        className="outline-btn small w-100"
                                        style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '6px 12px' }}
                                        onClick={() => handleDeclineRequest(targetUser.id)}
                                    >
                                        ⏱️ Hủy yêu cầu kết bạn
                                    </button>
                                ) : (
                                    <button
                                        className="primary-btn small w-100"
                                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                        onClick={() => handleSendRequest(targetUser.id)}
                                    >
                                        ➕ Gửi yêu cầu kết bạn
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Wibu Level Progress Card */}
                    <div className="sidebar-card gamification-card" style={{ marginTop: '16px' }}>
                        <h3 className="card-title" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>Cấp bậc Wibu</h3>
                        <div className="level-progress-area">
                            <div className="level-sword-name" style={{ fontWeight: 600, color: 'var(--sakura-pink)', marginBottom: '6px' }}>
                                Cấp bậc: {targetUserLevel.tierName}
                            </div>
                            <div className="level-progress-bar" style={{ height: '8px', backgroundColor: 'var(--bg-base)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                                <div className="level-progress-fill" style={{ height: '100%', backgroundColor: 'var(--sakura-pink)', width: `${targetUserLevel.progressPercentage}%` }}></div>
                            </div>
                            <div className="level-xp-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                EXP: {targetUserLevel.currentXpInTier} / {targetUserLevel.nextTierXpNeeded > 0 ? targetUserLevel.nextTierXpNeeded : 'Max'}
                            </div>
                        </div>
                        {!isPublic && currentUser && (
                            <div className="avatar-badge-grid" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                <span className="badge-tag label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Danh hiệu đã đạt:</span>
                                <span className={`badge-tag ${currentUser.xp >= 0 ? 'active' : 'lock'}`} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: currentUser.xp >= 0 ? 'var(--sakura-pink-light)' : 'var(--bg-base)', color: currentUser.xp >= 0 ? 'var(--sakura-pink)' : 'var(--text-muted)', display: 'inline-block' }}>✓ Tập sự</span>
                                <span className={`badge-tag ${currentUser.xp >= 500 ? 'active' : 'lock'}`} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: currentUser.xp >= 500 ? 'var(--sakura-pink-light)' : 'var(--bg-base)', color: currentUser.xp >= 500 ? 'var(--sakura-pink)' : 'var(--text-muted)', display: 'inline-block' }}>{currentUser.xp >= 500 ? '✓' : '🔒'} C (500 XP)</span>
                                <span className={`badge-tag ${currentUser.xp >= 2500 ? 'active' : 'lock'}`} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: currentUser.xp >= 2500 ? 'var(--sakura-pink-light)' : 'var(--bg-base)', color: currentUser.xp >= 2500 ? 'var(--sakura-pink)' : 'var(--text-muted)', display: 'inline-block' }}>{currentUser.xp >= 2500 ? '✓' : '🔒'} UC (2,500 XP)</span>
                                <span className={`badge-tag ${currentUser.xp >= 12500 ? 'active' : 'lock'}`} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: currentUser.xp >= 12500 ? 'var(--sakura-pink-light)' : 'var(--bg-base)', color: currentUser.xp >= 12500 ? 'var(--sakura-pink)' : 'var(--text-muted)', display: 'inline-block' }}>{currentUser.xp >= 12500 ? '✓' : '🔒'} R (12,500 XP)</span>
                                <span className={`badge-tag ${currentUser.xp >= 62500 ? 'active' : 'lock'}`} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: currentUser.xp >= 62500 ? 'var(--sakura-pink-light)' : 'var(--bg-base)', color: currentUser.xp >= 62500 ? 'var(--sakura-pink)' : 'var(--text-muted)', display: 'inline-block' }}>{currentUser.xp >= 62500 ? '✓' : '🔒'} SR (62,500 XP)</span>
                                <span className={`badge-tag ${currentUser.xp >= 625000 ? 'active' : 'lock'}`} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: currentUser.xp >= 625000 ? 'var(--sakura-pink-light)' : 'var(--bg-base)', color: currentUser.xp >= 625000 ? 'var(--sakura-pink)' : 'var(--text-muted)', display: 'inline-block' }}>{currentUser.xp >= 625000 ? '✓' : '🔒'} SSR (625,000 XP)</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column tabs view */}
                <div className="profile-right-column">
                    <div className="content-box">
                        <div className="profile-tabs-header" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                            {!isPublic && (
                                <button
                                    className={`profile-tab-btn ${profileActiveTab === 'profile-tab-info' ? 'active' : ''}`}
                                    onClick={() => setProfileActiveTab('profile-tab-info')}
                                    style={{ background: 'none', border: 'none', borderBottom: profileActiveTab === 'profile-tab-info' ? '2.5px solid var(--sakura-pink)' : '', color: profileActiveTab === 'profile-tab-info' ? 'var(--sakura-pink)' : 'var(--text-muted)', paddingBottom: '8px', fontWeight: 600 }}
                                >
                                    Thông tin cơ bản
                                </button>
                            )}
                            <button
                                className={`profile-tab-btn ${profileActiveTab === 'profile-tab-novels' ? 'active' : ''}`}
                                onClick={() => setProfileActiveTab('profile-tab-novels')}
                                style={{ background: 'none', border: 'none', borderBottom: profileActiveTab === 'profile-tab-novels' ? '2.5px solid var(--sakura-pink)' : '', color: profileActiveTab === 'profile-tab-novels' ? 'var(--sakura-pink)' : 'var(--text-muted)', paddingBottom: '8px', fontWeight: 600 }}
                            >
                                Tác phẩm đã đăng ({filteredNovels.length})
                            </button>
                            <button
                                className={`profile-tab-btn ${profileActiveTab === 'profile-tab-posts' ? 'active' : ''}`}
                                onClick={() => setProfileActiveTab('profile-tab-posts')}
                                style={{ background: 'none', border: 'none', borderBottom: profileActiveTab === 'profile-tab-posts' ? '2.5px solid var(--sakura-pink)' : '', color: profileActiveTab === 'profile-tab-posts' ? 'var(--sakura-pink)' : 'var(--text-muted)', paddingBottom: '8px', fontWeight: 600 }}
                            >
                                Bài viết diễn đàn ({filteredPosts.length})
                            </button>
                            <button
                                className={`profile-tab-btn ${profileActiveTab === 'profile-tab-social' ? 'active' : ''}`}
                                onClick={() => setProfileActiveTab('profile-tab-social')}
                                style={{ background: 'none', border: 'none', borderBottom: profileActiveTab === 'profile-tab-social' ? '2.5px solid var(--sakura-pink)' : '', color: profileActiveTab === 'profile-tab-social' ? 'var(--sakura-pink)' : 'var(--text-muted)', paddingBottom: '8px', fontWeight: 600 }}
                            >
                                Danh sách bạn bè {isPublic ? `(${publicFriends.length})` : `(${socialFriends.length})`}
                            </button>
                        </div>

                        {/* Tab 1: Basic Info form (Own Profile Only) */}
                        {!isPublic && profileActiveTab === 'profile-tab-info' && (
                            <div className="profile-tab-content active">
                                <h3 className="section-title">Chỉnh sửa hồ sơ</h3>
                                <div className="input-field mb-4">
                                    <label>Tên hiển thị độc giả</label>
                                    <input type="text" value={profileDisplayname} onChange={(e) => setProfileDisplayname(e.target.value)} />
                                </div>
                                <div className="input-field mb-4">
                                    <label>Mã thiết kế Avatar (Seed ngẫu nhiên hoặc Đường dẫn ảnh)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" value={profileAvatarSeed} onChange={(e) => setProfileAvatarSeed(e.target.value)} placeholder="Nhập seed hoặc link ảnh..." />
                                            <button className="outline-btn small" onClick={regenerateProfileAvatar}>Tạo ngẫu nhiên</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button type="button" className="outline-btn small" onClick={() => {
                                                const el = document.getElementById('avatar-file-input');
                                                if (el) el.click();
                                            }}>
                                                Tải ảnh từ thiết bị
                                            </button>
                                            <input
                                                type="file"
                                                id="avatar-file-input"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={handleAvatarUpload}
                                            />
                                            {(profileAvatarSeed.startsWith('http') || profileAvatarSeed.startsWith('/uploads') || profileAvatarSeed.startsWith('data:')) && (
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    ✓ Đã tải ảnh cá nhân thành công
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="input-field mb-4">
                                    <label>Tiểu sử cá nhân</label>
                                    <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', fontFamily: 'inherit' }} />
                                </div>
                                <button className="primary-btn" onClick={saveBasicProfile}>Lưu thay đổi hồ sơ</button>

                                <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />

                                <div className="input-field mb-4">
                                    <label>Giao diện hiển thị (Theme)</label>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                                        <button
                                            className={`outline-btn small ${theme === 'washi' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('washi')}
                                            style={{ background: theme === 'washi' ? 'var(--sakura-pink-light)' : '', color: theme === 'washi' ? 'var(--sakura-pink)' : '', borderColor: theme === 'washi' ? 'var(--sakura-pink)' : '' }}
                                        >
                                            Chế độ sáng (Washi)
                                        </button>
                                        <button
                                            className={`outline-btn small ${theme === 'charcoal' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('charcoal')}
                                            style={{ background: theme === 'charcoal' ? 'var(--sakura-pink-light)' : '', color: theme === 'charcoal' ? 'var(--sakura-pink)' : '', borderColor: theme === 'charcoal' ? 'var(--sakura-pink)' : '' }}
                                        >
                                            Chế độ tối (Charcoal)
                                        </button>
                                        <button
                                            className={`outline-btn small ${theme === 'sepia' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('sepia')}
                                            style={{ background: theme === 'sepia' ? 'var(--sakura-pink-light)' : '', color: theme === 'sepia' ? 'var(--sakura-pink)' : '', borderColor: theme === 'sepia' ? 'var(--sakura-pink)' : '' }}
                                        >
                                            Chế độ cổ điển (Sepia)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Novels Grid */}
                        {profileActiveTab === 'profile-tab-novels' && (
                            <div className="profile-tab-content active" style={{ animation: 'slideUpChat 0.25s ease' }}>
                                {filteredNovels.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', background: 'var(--bg-base)', borderRadius: 'var(--border-radius-md)', border: '1px dashed var(--border-color)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📖</div>
                                        <p style={{ fontSize: '0.85rem' }}>
                                            {isPublic ? 'Wibu này chưa đăng tác phẩm nào.' : 'Bạn chưa đăng tác phẩm nào. Hãy vào Bàn làm việc để bắt đầu nhé!'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="novel-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                                        {filteredNovels.map(novel => (
                                            <div key={novel.id} className="novel-card" onClick={() => openNovelDetail(novel.id)} style={{ cursor: 'pointer' }}>
                                                <div className="novel-cover-wrapper">
                                                    <img src={novel.cover} alt={novel.title} className="novel-cover-img" loading="lazy" />
                                                    <div className="novel-card-badges-container">
                                                        <span className="novel-card-badge" style={{ background: 'var(--sakura-pink)' }}>{novel.status === 'completed' ? 'Hoàn' : novel.status === 'paused' ? 'Ngưng' : novel.status === 'suspended' ? 'Khóa' : 'Đang ra'}</span>
                                                        <span className="novel-card-format-badge">{novel.type === 'oneshot' ? 'Oneshot' : 'Series'}</span>
                                                    </div>
                                                </div>
                                                <div className="novel-info-block" style={{ padding: '12px 0 0 0' }}>
                                                    <h4 className="novel-card-title" style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 650 }}>{novel.title}</h4>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Thể loại: {novel.genre}</div>
                                                    <div className="novel-card-meta" style={{ display: 'flex', gap: '10px', fontSize: '0.72rem' }}>
                                                        <span className="novel-card-reads">👁️ {novel.reads}</span>
                                                        <span className="novel-card-bookmarks">📚 {novel.bookmarksCount || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 3: Forum Posts List */}
                        {profileActiveTab === 'profile-tab-posts' && (
                            <div className="profile-tab-content active" style={{ animation: 'slideUpChat 0.25s ease' }}>
                                {filteredPosts.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', background: 'var(--bg-base)', borderRadius: 'var(--border-radius-md)', border: '1px dashed var(--border-color)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
                                        <p style={{ fontSize: '0.85rem' }}>
                                            {isPublic ? 'Wibu này chưa đăng bài thảo luận nào.' : 'Bạn chưa đăng bài viết nào trên diễn đàn. Hãy viết bài thảo luận đầu tiên nhé!'}
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {filteredPosts.map(post => (
                                            <div
                                                key={post.id}
                                                onClick={() => {
                                                    setActiveForumPostId(post.id);
                                                    setCurrentView('forum');
                                                }}
                                                style={{
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border-color)',
                                                    padding: '16px',
                                                    borderRadius: 'var(--border-radius-md)',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--sakura-pink)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                                className="public-profile-post-card"
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{
                                                        fontSize: '0.68rem',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        background: post.category === 'notice' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-base)',
                                                        color: post.category === 'notice' ? '#ef4444' : 'var(--text-muted)',
                                                        fontWeight: 650
                                                    }}>
                                                        {post.category === 'notice' ? 'Thông Báo' : post.category === 'chat' ? 'Trò Chuyện' : post.category === 'review' ? 'Đánh Giá' : 'Hỏi Đáp'}
                                                    </span>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 650, margin: '0 0 6px 0', color: 'var(--text-main)' }}>{post.title}</h4>
                                                <p style={{
                                                    fontSize: '0.82rem',
                                                    color: 'var(--text-content)',
                                                    margin: '0 0 12px 0',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    lineHeight: 1.4
                                                }}>
                                                    {post.content}
                                                </p>
                                                <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    <span>❤️ {post.likes_count || 0} thích</span>
                                                    <span>💬 {post.comments_count || 0} bình luận</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 4: Friends list */}
                        {profileActiveTab === 'profile-tab-social' && (
                            <div className="profile-tab-content active" style={{ animation: 'slideUpChat 0.25s ease' }}>
                                {isPublic ? (
                                    /* Public Friends List Tab */
                                    <div>
                                        <h3 className="section-title" style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Danh sách bạn bè ({publicFriends.length})</h3>
                                        {publicFriends.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '32px 16px', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌸</div>
                                                <p style={{ fontSize: '0.82rem' }}>Chưa có bạn bè.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {publicFriends.map(friend => (
                                                    <div
                                                        key={friend.id}
                                                        onClick={() => setViewingUsername(friend.username)}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--sakura-pink)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div className={`avatar-frame level-${getTierClassName(friend.level)}`} style={{ width: '36px', height: '36px' }}>
                                                                <img src={friend.avatarSeed && (friend.avatarSeed.startsWith('http') || friend.avatarSeed.startsWith('/uploads') || friend.avatarSeed.startsWith('data:')) ? friend.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.avatarSeed || 'Default'}`} className="avatar-img" alt="Friend Avatar" />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{friend.displayname}</div>
                                                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cấp {getTierName(friend.level)} • @{friend.username}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Personal Friends Settings Tab */
                                    <>
                                        {/* 1. Lời mời kết bạn đang chờ */}
                                        {receivedRequests.length > 0 && (
                                            <div style={{ marginBottom: '24px', background: 'var(--sakura-pink-light)', padding: '16px', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(224, 82, 117, 0.2)' }}>
                                                <h4 style={{ color: 'var(--sakura-pink)', margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 600 }}>
                                                    ✉️ Lời mời kết bạn đang chờ ({receivedRequests.length})
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {receivedRequests.map(req => (
                                                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div className={`avatar-frame level-${getTierClassName(req.level)}`} style={{ width: '36px', height: '36px' }}>
                                                                    <img src={req.avatarSeed && (req.avatarSeed.startsWith('http') || req.avatarSeed.startsWith('/uploads') || req.avatarSeed.startsWith('data:')) ? req.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${req.avatarSeed || 'Default'}`} className="avatar-img" alt="Request avatar" />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{req.displayname}</div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gửi lúc {req.date}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button className="primary-btn small" onClick={() => handleAcceptRequest(req.id)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Đồng ý</button>
                                                                <button className="outline-btn small" onClick={() => handleDeclineRequest(req.id)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Từ chối</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. Tìm kiếm người dùng */}
                                        <div style={{ marginBottom: '28px' }}>
                                            <h3 className="section-title" style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '12px' }}>Tìm kiếm người dùng</h3>
                                            <form onSubmit={handleSearchUsers} style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Nhập tên hiển thị hoặc tên đăng nhập của độc giả/tác giả..."
                                                    value={socialSearchQuery}
                                                    onChange={(e) => setSocialSearchQuery(e.target.value)}
                                                    style={{ flex: 1, padding: '8px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                                <button type="submit" className="primary-btn" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Tìm kiếm</button>
                                            </form>

                                            {/* Kết quả tìm kiếm */}
                                            {socialSearchResults.length > 0 && (
                                                <div style={{ marginTop: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '16px' }}>
                                                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>Kết quả tìm kiếm ({socialSearchResults.length}):</h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                        {socialSearchResults.map(u => (
                                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setViewingUsername(u.username)}>
                                                                    <div className={`avatar-frame level-${getTierClassName(u.level)}`} style={{ width: '32px', height: '32px' }}>
                                                                        <img src={u.avatarSeed && (u.avatarSeed.startsWith('http') || u.avatarSeed.startsWith('/uploads') || u.avatarSeed.startsWith('data:')) ? u.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.avatarSeed || 'Default'}`} className="avatar-img" alt="Result avatar" />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>{u.displayname}</div>
                                                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cấp {getTierName(u.level)} • @{u.username}</div>
                                                                    </div>
                                                                </div>

                                                                {u.status === 'accepted' ? (
                                                                    <span style={{ fontSize: '0.75rem', color: '#279450', fontWeight: 600 }}>✓ Bạn bè</span>
                                                                ) : u.status === 'pending' ? (
                                                                    u.senderId === currentUser?.id ? (
                                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Đã gửi lời mời</span>
                                                                    ) : (
                                                                        <button className="primary-btn small" onClick={() => handleAcceptRequest(u.id)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Chấp nhận</button>
                                                                    )
                                                                ) : (
                                                                    <button className="outline-btn small" onClick={() => handleSendRequest(u.id)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>+ Kết bạn</button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {socialSearchQuery && socialSearchResults.length === 0 && !isSearching && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>Không tìm thấy thành viên nào khớp với tìm kiếm.</div>
                                            )}
                                        </div>

                                        {/* 3. Danh sách bạn bè hiện tại */}
                                        <div>
                                            <h3 className="section-title" style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Danh sách bạn bè ({socialFriends.length})</h3>
                                            {socialFriends.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '32px 16px', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
                                                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌸</div>
                                                    <p style={{ fontSize: '0.82rem' }}>Chưa có bạn bè. Hãy tìm kiếm độc giả ở trên để làm quen nhé!</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    {socialFriends.map(friend => (
                                                        <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setViewingUsername(friend.username)}>
                                                                <div className={`avatar-frame level-${getTierClassName(friend.level)}`} style={{ width: '36px', height: '36px' }}>
                                                                    <img src={friend.avatarSeed && (friend.avatarSeed.startsWith('http') || friend.avatarSeed.startsWith('/uploads') || friend.avatarSeed.startsWith('data:')) ? friend.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.avatarSeed || 'Default'}`} className="avatar-img" alt="Friend avatar" />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{friend.displayname}</div>
                                                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cấp {getTierName(friend.level)} • @{friend.username}</div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                className="outline-btn small"
                                                                onClick={() => handleDeclineRequest(friend.id)}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.75rem',
                                                                    borderColor: 'rgba(255, 59, 48, 0.25)',
                                                                    color: '#ff3b30'
                                                                }}
                                                            >
                                                                Hủy kết bạn
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
