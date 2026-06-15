import React from 'react';
import { calculateUserLevel } from '../utils/levelHelper';
import { User } from '../types';

interface HeaderProps {
    currentUser: User | null;
    currentView: string;
    setCurrentView: (view: string) => void;
    setActiveNovelId?: (id: number | null) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    notifDropdownOpen: boolean;
    setNotifDropdownOpen: (open: boolean) => void;
    markAllNotificationsRead: () => void;
    burgerOpen?: boolean;
    setBurgerOpen?: (open: boolean) => void;
    logoutUser: () => void;
    updateUserInDatabase: (user: User) => void;
    DB_KEYS: { session: string; [key: string]: string };
    setCurrentUser: (user: User | null) => void;
    setRegisterModalOpen: (open: boolean) => void;
    setLoginModalOpen: (open: boolean) => void;
    setCategoryDrawerOpen: (open: boolean) => void;
    theme: string;
    handleThemeChange: (theme: string) => void;
}

export default function Header({
    currentUser,
    currentView,
    setCurrentView,
    setActiveNovelId,
    searchQuery,
    setSearchQuery,
    notifDropdownOpen,
    setNotifDropdownOpen,
    markAllNotificationsRead,
    burgerOpen,
    setBurgerOpen,
    logoutUser,
    updateUserInDatabase,
    DB_KEYS,
    setCurrentUser,
    setRegisterModalOpen,
    setLoginModalOpen,
    setCategoryDrawerOpen,
    theme,
    handleThemeChange
}: HeaderProps) {
    const handleSearchSubmit = (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setCurrentView('explore');
        if (setActiveNovelId) setActiveNovelId(null);
    };

    const cycleTheme = () => {
        if (theme === 'washi') handleThemeChange('charcoal');
        else if (theme === 'charcoal') handleThemeChange('sepia');
        else handleThemeChange('washi');
    };

    return (
        <header className="app-header">
             <div className="header-container">
                <div className="header-left" style={{display:'flex', alignItems:'center', gap:'20px'}}>
                    <button className="category-burger-btn" onClick={() => setCategoryDrawerOpen(true)} title="Danh mục & Bộ lọc">
                        <svg viewBox="0 0 24 24" width="22" height="22" style={{display:'block', fill:'var(--text-main)'}}>
                            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                        </svg>
                    </button>
                    
                    <div className="header-logo" onClick={() => { setCurrentView('home'); if (setActiveNovelId) setActiveNovelId(null); }}>
                        <span className="kanji">無限文庫</span>
                        <span className="alphabet">MUGENBUNKO</span>
                    </div>
                </div>
                
                <div className="header-search">
                    <form className="search-box" onSubmit={handleSearchSubmit}>
                        <button type="submit" style={{background:'none', border:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center', outline:'none'}}>
                            <svg className="icon-search" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        </button>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm truyện, tác giả, tag..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                </div>

                <nav className="header-nav" id="header-nav-links">
                    {/* Bàn làm việc đã được chuyển vào menu Khám phá */}
                </nav>

                <div className="header-actions">
                    <button 
                        className="icon-btn theme-toggle-btn" 
                        onClick={cycleTheme} 
                        title={`Giao diện: ${theme === 'washi' ? 'Sáng (Washi)' : (theme === 'charcoal' ? 'Tối (Charcoal)' : 'Cổ điển (Sepia)')} - Bấm để chuyển đổi`} 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '6px' }}
                    >
                        {theme === 'washi' && (
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'var(--text-main)' }}>
                                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm-12.37 1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zm13.43-13.43a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                            </svg>
                        )}
                        {theme === 'charcoal' && (
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'var(--text-main)' }}>
                                <path d="M12.1 22c-5.2 0-9.5-4.2-9.5-9.5 0-4.1 2.7-7.7 6.6-8.9.5-.2 1.1.1 1.2.7s-.1 1.1-.7 1.2c-2.9.9-4.8 3.5-4.8 6.6 0 3.8 3.1 6.9 6.9 6.9 2.5 0 4.8-1.4 6-3.6.3-.5.9-.7 1.4-.4s.7.9.4 1.4c-1.6 3.1-4.9 5.1-8.5 5.1-.3 0-.6 0-.7-.1z" />
                            </svg>
                        )}
                        {theme === 'sepia' && (
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'var(--text-main)' }}>
                                <path d="M21 5c-1.11-.9-2.45-1.5-4-1.5-2.3 0-5 1.7-5 1.7S9.3 3.5 7 3.5c-1.55 0-2.89.6-4 1.5v14.65c0 .22.18.35.38.35.13 0 .25-.06.35-.13C4.81 18.8 6.1 18.5 7 18.5c2.3 0 5 1.7 5 1.7s2.7-1.7 5-1.7c.95 0 2.24.3 3.3.87.1.06.2.13.33.13.2 0 .37-.13.37-.35V5zm-9 13.5c-1.67-1.11-3.79-1.5-5-1.5-1.4 0-2.97.3-4 .8V6.13c1.03-.5 2.6-.63 4-.63 1.21 0 3.33.39 5 1.5v11.5z" />
                            </svg>
                        )}
                    </button>
                    {currentUser ? (
                        <>
                            <div className="user-level-badge" onClick={() => { window.location.hash = '#/profile'; }} title="Xem trang cá nhân">
                                <div className={`avatar-frame level-${calculateUserLevel(currentUser.xp).className}`}>
                                    <img src={currentUser.avatarSeed && (currentUser.avatarSeed.startsWith('http') || currentUser.avatarSeed.startsWith('/uploads') || currentUser.avatarSeed.startsWith('data:')) ? currentUser.avatarSeed : `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.avatarSeed || 'Default'}`} alt="Avatar" className="avatar-img" />
                                </div>
                                <div className="level-tooltip">
                                    <p className="tooltip-title"><span>{currentUser.displayname}</span></p>
                                    <p className="tooltip-title" style={{fontSize:'0.75rem', marginTop:'2px', fontWeight:'normal'}}>
                                        Cấp bậc: {calculateUserLevel(currentUser.xp).tierName}
                                    </p>
                                    <p className="tooltip-xp">
                                        EXP: {calculateUserLevel(currentUser.xp).currentXpInTier} / {calculateUserLevel(currentUser.xp).nextTierXpNeeded > 0 ? calculateUserLevel(currentUser.xp).nextTierXpNeeded : 'Max'}
                                    </p>
                                </div>
                            </div>

                            <div className="notif-bell-container">
                                <button className="icon-btn" onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}>
                                    <svg className="icon-bell" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 4.36 6 6.92 6 10v5l-2 2v1h16v-1l-2-2z"/></svg>
                                    {currentUser.notifications && currentUser.notifications.filter(n => !n.read).length > 0 && (
                                        <span className="badge">{currentUser.notifications.filter(n => !n.read).length}</span>
                                    )}
                                </button>
                                {notifDropdownOpen && (
                                    <div className="dropdown-menu">
                                        <div className="dropdown-header">
                                            <h3>Thông báo mới</h3>
                                            <button className="text-link-btn" onClick={markAllNotificationsRead}>Đọc tất cả</button>
                                        </div>
                                        <ul className="notif-list">
                                            {currentUser.notifications && currentUser.notifications.length > 0 ? (
                                                currentUser.notifications.map(n => (
                                                    <li 
                                                        key={n.id} 
                                                        className={`notif-item ${n.read ? 'read' : 'unread'}`}
                                                        onClick={() => {
                                                            const updated = { ...currentUser };
                                                            const target = updated.notifications.find(item => item.id === n.id);
                                                            if (target) target.read = true;
                                                            setCurrentUser(updated);
                                                            localStorage.setItem(DB_KEYS.session, JSON.stringify(updated));
                                                            updateUserInDatabase(updated);
                                                        }}
                                                    >
                                                        <div className="notif-text">{n.text}</div>
                                                        <span className="notif-time">{n.date}</span>
                                                    </li>
                                                ))
                                            ) : (
                                                <li style={{fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', padding:'12px 0'}}>Không có thông báo mới</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <button className="icon-btn" onClick={logoutUser} title="Đăng xuất">
                                <svg viewBox="0 0 24 24" style={{width:'20px', height:'20px', fill:'var(--text-main)'}}><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                            </button>
                        </>
                    ) : (
                        <div className="guest-buttons-wrapper">
                            <button className="text-link-btn" style={{marginRight:'8px'}} onClick={() => setRegisterModalOpen(true)}>Đăng ký</button>
                            <button className="outline-btn small" onClick={() => setLoginModalOpen(true)}>Đăng nhập</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
