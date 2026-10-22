import { fetchArrayPages } from './utils/pagedFetch';
import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthPage from './pages/AuthPage';
import type { LoginFields, RegisterFields } from './pages/AuthPage';
import { authHref, parseAuthHash, safeAuthReturn } from './utils/authNavigation';
import type { AuthMode } from './utils/authNavigation';
import NewNovelModal from './components/NewNovelModal';
import EditNovelModal from './components/EditNovelModal';
import ChatWidget from './components/ChatWidget';
import MobileGateOverlay from './components/MobileGateOverlay';
import { Icons } from './components/Icons';

import Home from './pages/Home';
import NovelDetail from './pages/NovelDetail';
import ChapterReader from './pages/ChapterReader';
import Explore from './pages/Explore';
import ErrorBoundary from './components/ErrorBoundary';
import { PageLoading, PageError } from './components/LoadState';
import { useReadingSync } from './hooks/useReadingSync';

import { User, Novel, Comment, Review, SystemEvent, Report, ForumPost, Message, UserRole } from './types';
import { compressImage } from './utils/imageCompressor';
import { formatDate } from './utils/dateFormatter';

const AuthorStudio = lazy(() => import('./pages/AuthorStudio'));
const ModDashboard = lazy(() => import('./pages/ModDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Forum = lazy(() => import('./pages/Forum'));
const ManageRules = lazy(() => import('./pages/ManageRules'));
const ViewRules = lazy(() => import('./pages/ViewRules'));
const About = lazy(() => import('./pages/About'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const PublicCollection = lazy(() => import('./pages/PublicCollection'));
const Library = lazy(() => import('./pages/Library'));
const Elections = lazy(() => import('./pages/Elections'));

/* ================= DATABASE CONFIG ================= */
const DB_KEYS = {
    session: 'mugen_session',
    theme: 'mugen_theme',
    font: 'mugen_font',
    fontSize: 'mugen_fontsize',
    activeBannerId: 'mugen_active_banner_id',
    genres: 'mugen_genres'
};

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 
    (import.meta.env.DEV
        ? 'http://localhost:5000/api'
        : '/api');


const CACHE_KEYS = {
    novels: 'mugen_cache_novels',
    announcements: 'mugen_cache_announcements',
    events: 'mugen_cache_events',
    forumPosts: 'mugen_cache_forum_posts',
    latestComments: 'mugen_cache_latest_comments',
    latestReviews: 'mugen_cache_latest_reviews'
};

const getCachedData = (key: string, ttlMs: number): any => {
    try {
        const cached = sessionStorage.getItem(key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttlMs) {
            return data;
        }
        sessionStorage.removeItem(key);
    } catch (e) {
        console.error("Lỗi đọc cache:", e);
    }
    return null;
};

const setCachedData = (key: string, data: any): void => {
    try {
        sessionStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error("Lỗi ghi cache:", e);
    }
};

const clearCache = (key: string): void => {
    for (const storedKey of Object.keys(sessionStorage)) {
        if (storedKey === key || storedKey.startsWith(key + ':')) sessionStorage.removeItem(storedKey);
    }
};

interface InitialRoute {
    authReturnTo?: string;
    view: string;
    novelId: number | null;
    chapterIndex: number | null;
    triggerLogin: boolean;
    profileViewingUsername: string | null;
    eventId?: number;
}

// Helper to parse hash on initial load to prevent state races
const getInitialRoute = (): InitialRoute => {
    if (typeof window === 'undefined') return { view: 'home', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    const hash = window.location.hash;
    
    // Private routes protection (requires check user from localStorage)
    const privateRoutes = ['#/library', '#/studio', '#/mod-dashboard', '#/admin-dashboard', '#/manage-rules', '#/profile'];
    const isPrivate = privateRoutes.includes(hash);
    
    let sessionUser: User | null = null;
    try {
        const raw = localStorage.getItem('mugen_session');
        if (raw) {
            sessionUser = JSON.parse(raw);
        }
    } catch (e) {}

    if (isPrivate && !sessionUser) {
        return { view: 'login', authReturnTo: hash, novelId: null, chapterIndex: null, triggerLogin: true, profileViewingUsername: null };
    }

    const auth = parseAuthHash(hash);
    if (auth) return { view: auth.mode, authReturnTo: auth.returnTo, novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };

    if (sessionUser) {
        const rolesData = sessionUser.roles || [];
        if (hash === '#/mod-dashboard' && !rolesData.includes('moderator') && !rolesData.includes('admin')) {
            return { view: 'home', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
        }
        if (['#/admin-dashboard', '#/manage-rules'].includes(hash) && !rolesData.includes('admin')) {
            return { view: 'home', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
        }
    }

    if (hash === '#/library') return { view: 'library', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/forum') return { view: 'forum', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/explore') return { view: 'explore', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/studio') return { view: 'studio', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/mod-dashboard') return { view: 'mod-dashboard', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/admin-dashboard') return { view: 'admin-dashboard', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/manage-rules') return { view: 'manage-rules', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/profile') return { view: 'profile', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/about') return { view: 'about', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (/^#\/elections(?:\/[1-9]\d*)?$/.test(hash)) return { view: 'elections', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (/^#\/collection\/[a-f0-9]{32}$/.test(hash)) return { view: 'collection', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };

    const eventMatch = hash.match(/^#\/event\/([1-9]\d{0,14})$/);
    if (eventMatch) return { view: 'event-detail', eventId: Number(eventMatch[1]), novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    const profileMatch = hash.match(/^#\/profile\/([^/]+)$/);
    if (profileMatch) {
        const username = decodeURIComponent(profileMatch[1]);
        return { view: 'profile', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: username };
    }

    const readerMatch = hash.match(/^#\/novel\/(\d+)\/reader\/(\d+)$/);
    if (readerMatch) {
        return { view: 'reader', novelId: parseInt(readerMatch[1]), chapterIndex: parseInt(readerMatch[2]), triggerLogin: false, profileViewingUsername: null };
    }

    const detailMatch = hash.match(/^#\/novel\/(\d+)$/);
    if (detailMatch) {
        return { view: 'detail', novelId: parseInt(detailMatch[1]), chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    }

    return { view: 'home', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
};

const initialRoute = getInitialRoute();

const getCachedSession = (): any => {
    try {
        const rawSession = localStorage.getItem('mugen_session');
        if (rawSession) {
            const sessionUser = JSON.parse(rawSession);
            if (sessionUser && sessionUser.id) {
                return sessionUser;
            }
        }
    } catch (e) {}
    return null;
};

const cachedSession = getCachedSession();

interface Petal {
    id: string;
    left: number;
    delay: number;
    duration: number;
    scale: number;
}

export default function App() {
    const isSessionExpiringRef = useRef(false);

    const handleSessionExpired = (customMsg?: string) => {
        if (isSessionExpiringRef.current) return;
        isSessionExpiringRef.current = true;

        // 1. Xóa sạch token và session khỏi localStorage
        localStorage.removeItem('mugen_token');
        localStorage.removeItem(DB_KEYS.session);

        // 2. Reset state người dùng
        setCurrentUser(null);
        setProfileDisplayname("");
        setProfileAvatarSeed("");
        setProfileBio("");
        setProfileRoles(['reader']);

        // 3. Hiển thị Toast thông báo nhẹ nhàng thay vì alert lặp vô hạn
        showToast(customMsg || "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");

        if (['studio', 'library', 'profile', 'mod-dashboard', 'admin-dashboard', 'manage-rules'].includes(currentView)) {
            openAuth('login', window.location.hash, true);
        }

        setTimeout(() => {
            isSessionExpiringRef.current = false;
        }, 3000);
    };

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('mugen_token');
        const headers: Record<string, string> = {};
        if (options.headers) {
            if (options.headers instanceof Headers) {
                options.headers.forEach((value, key) => {
                    headers[key] = value;
                });
            } else if (Array.isArray(options.headers)) {
                options.headers.forEach(([key, value]) => {
                    headers[key] = value;
                });
            } else {
                Object.assign(headers, options.headers);
            }
        }
        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const res = await window.fetch(url, { ...options, headers, credentials: 'include' });

            // 401 Unauthorized: Token không hợp lệ hoặc đã hết hạn
            if (res.status === 401) {
                const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/send-otp') || url.includes('/auth/reset-password');
                if (!isAuthAttempt && (token || currentUser)) {
                    try {
                        const clone = res.clone();
                        const data = await clone.json();
                        handleSessionExpired(data?.error);
                    } catch {
                        handleSessionExpired();
                    }
                }
            } else if (res.status === 403) {
                try {
                    const clone = res.clone();
                    const data = await clone.json();
                    if (data?.code === 'TOKEN_EXPIRED' || data?.code === 'ACCOUNT_SUSPENDED' || (typeof data?.error === 'string' && data.error.toLowerCase().includes('hết hạn'))) {
                        handleSessionExpired(data.error);
                    } else if (data && data.error) {
                        showToast(data.error);
                    }
                } catch (jsonErr) {
                    console.error("Failed to parse 403 response JSON:", jsonErr);
                }
            }
            return res;
        } catch (fetchErr) {
            console.error("Fetch network error:", fetchErr);
            throw fetchErr;
        }
    };

    const openNovelDetail = (novelId: number) => {
        setActiveNovelId(novelId);
        setCurrentView('detail');
    };

    // ----------------------------------------------------
    // React Database States (Synchronized with MySQL Backend)
    // ----------------------------------------------------
    const [users, setUsers] = useState<User[]>([]);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState('');
    const [novels, setNovels] = useState<Novel[]>([]);
    const [novelsLoading, setNovelsLoading] = useState(true);
    const [novelsError, setNovelsError] = useState('');
    const [exploreType, setExploreType] = useState<string>('all');
    const [exploreGenre, setExploreGenre] = useState<string>('Tất cả');
    const [exploreSort, setExploreSort] = useState<string>('reads');
    const [comments, setComments] = useState<Record<number, Comment[]>>({});
    const [reviews, setReviews] = useState<Record<number, Review[]>>({});
    const [reports, setReports] = useState<Report[]>([]);
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(initialRoute.view === 'event-detail');
    const [eventsError, setEventsError] = useState('');
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
    const [latestComments, setLatestComments] = useState<any[]>([]);
    const [latestReviews, setLatestReviews] = useState<any[]>([]);
    const [activeForumPostId, setActiveForumPostId] = useState<number | null>(null);
    const [activeBannerId, setActiveBannerId] = useState<number | null>(null);
    const [activeEventId, setActiveEventId] = useState<number | null>(initialRoute.eventId || null);
    const [adminEventContent, setAdminEventContent] = useState<string>("");
    const [wibuRanking, setWibuRanking] = useState<any[]>([]);

    // ----------------------------------------------------
    // User Session & System state
    // ----------------------------------------------------
    const [currentUser, setCurrentUser] = useState<User | null>(cachedSession);
    const [currentView, setCurrentView] = useState<string>(initialRoute.view);
    const [authReturnTo, setAuthReturnTo] = useState(initialRoute.authReturnTo || '#/');
    const openAuth = (mode: AuthMode, returnTo = window.location.hash, replace = false) => {
        const existing = parseAuthHash(returnTo);
        const target = existing?.returnTo || safeAuthReturn(returnTo);
        setAuthReturnTo(target); setCurrentView(mode);
        const href = authHref(mode, target);
        if (replace) window.history.replaceState(null, '', href);
        else if (window.location.hash !== href) window.location.hash = href;
    };
    // Keep callbacks consumed by existing reading/community screens while routing to full pages.
    const setLoginModalOpen = (open: boolean) => { if (open) openAuth('login'); };
    const readingSync = useReadingSync(currentUser, novels, API_BASE, fetchWithAuth);

    // ----------------------------------------------------
    // Mobile Gate State (Standalone clean rendering)
    // ----------------------------------------------------
    const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    });
    const [mobileBypassed, setMobileBypassed] = useState<boolean>(() => {
        return sessionStorage.getItem('mugen_mobile_bypass') === 'true';
    });

    useEffect(() => {
        const handleResize = () => {
            const isSmall = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobileDevice(isSmall);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [activeNovelId, setActiveNovelId] = useState<number | null>(initialRoute.novelId);
    const [activeCollectionShareId, setActiveCollectionShareId] = useState<string | null>(() => window.location.hash.match(/^#\/collection\/([a-f0-9]{32})$/)?.[1] || null);
    const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(initialRoute.chapterIndex);
    
    // Author studio selections
    const [activeStudioNovelId, setActiveStudioNovelId] = useState<number | null>(null);
    const [activeStudioChapterId, setActiveStudioChapterId] = useState<number | null>(null);

    // UI overlays & Widgets states
    const [newNovelModalOpen, setNewNovelModalOpen] = useState<boolean>(false);
    const [editNovelModalOpen, setEditNovelModalOpen] = useState<boolean>(false);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);
    
    // Toast state
    const [toastShow, setToastShow] = useState<boolean>(false);
    const [toastMsg, setToastMsg] = useState<string>("");

    // Back to top floating button state
    const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 380) {
                setShowBackToTop(true);
            } else {
                setShowBackToTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Global Confirmation Modal State
    const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
    const [confirmModalMessage, setConfirmModalMessage] = useState<string>( "");
    const [confirmModalOnConfirm, setConfirmModalOnConfirm] = useState<(() => void) | null>(null);

    const triggerConfirm = (message: string, onConfirm: () => void) => {
        setConfirmModalMessage(message);
        setConfirmModalOnConfirm(() => onConfirm);
        setConfirmModalOpen(true);
    };
    
    // Burger Dashboard state
    const [burgerOpen, setBurgerOpen] = useState<boolean>(false);
    
    // Sakura petals
    const [petals, setPetals] = useState<Petal[]>([]);

    // Preferences
    const [theme, setTheme] = useState<string>('washi');
    const [readerFont, setReaderFont] = useState<string>('font-serif');
    const [readerFontSize, setReaderFontSize] = useState<number>(18);

    // Filter Feed values
    const [filterGenre, setFilterGenre] = useState<string>("Tất cả");
    const [filterType, setFilterType] = useState<string>("all");
    const [categoryDrawerOpen, setCategoryDrawerOpen] = useState<boolean>(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterSort, setFilterSort] = useState<string>("reads");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [newNovelType, setNewNovelType] = useState<'series' | 'oneshot'>("series");

    // Details/Interactive states
    const [commentText, setCommentText] = useState<string>("");
    const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState<string>("");
    const [replyToUserId, setReplyToUserId] = useState<number | null>(null);
    const [reviewText, setReviewText] = useState<string>("");
    const [selectedRatingStars, setSelectedRatingStars] = useState<number>(5);
    const [detailSummaryExpanded, setDetailSummaryExpanded] = useState<boolean>(false);

    // Editor inputs (Refs to prevent lagging key renders)
    const contentAreaRef = useRef<HTMLDivElement>(null);

    // Form inputs (Controlled/Uncontrolled states)

    const [profileDisplayname, setProfileDisplayname] = useState<string>(cachedSession?.displayname || "");
    const [profileAvatarSeed, setProfileAvatarSeed] = useState<string>(cachedSession?.avatar_seed || "");
    const [profileBio, setProfileBio] = useState<string>(cachedSession?.bio || "");
    const [profileRoles, setProfileRoles] = useState<UserRole[]>(cachedSession?.roles || ['reader']);

    const [newGenreName, setNewGenreName] = useState<string>("");
    const [tagMergeFrom, setTagMergeFrom] = useState<string>("");
    const [tagMergeTo, setTagMergeTo] = useState<string>("");

    const [adminEventTitle, setAdminEventTitle] = useState<string>("");
    const [adminEventDesc, setAdminEventDesc] = useState<string>("");

    const [newNovelTitle, setNewNovelTitle] = useState<string>("");
    const [newNovelGenres, setNewNovelGenres] = useState<string[]>(["Isekai"]);
    const [newNovelStatus, setNewNovelStatus] = useState<'active' | 'suspended' | 'ongoing' | 'completed' | 'paused' | 'draft' | 'published'>("active");
    const [newNovelCover, setNewNovelCover] = useState<string>("assets/default_novel_cover.png");
    const [newNovelSummary, setNewNovelSummary] = useState<string>("");

    const [editNovelId, setEditNovelId] = useState<number | null>(null);
    const [editNovelTitle, setEditNovelTitle] = useState<string>("");
    const [editNovelGenres, setEditNovelGenres] = useState<string[]>(["Isekai"]);
    const [editNovelStatus, setEditNovelStatus] = useState<'active' | 'suspended' | 'ongoing' | 'completed' | 'paused' | 'draft' | 'published'>("active");
    const [editNovelCover, setEditNovelCover] = useState<string>("assets/default_novel_cover.png");
    const [editNovelSummary, setEditNovelSummary] = useState<string>("");
    const [editNovelType, setEditNovelType] = useState<'series' | 'oneshot'>("series");
    const [editNovelTags, setEditNovelTags] = useState<string[]>([]);

    const [profileActiveTab, setProfileActiveTab] = useState<string>('profile-tab-info');

    // States for custom Image upload/URL modal
    const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
    const [imageUrlInput, setImageUrlInput] = useState<string>("");
    const [imageUploading, setImageUploading] = useState<boolean>(false);
    const savedSelectionRangeRef = useRef<Range | null>(null);
    
    // States for viewing other wibu profile details
    const [publicProfileData, setPublicProfileData] = useState<User | null>(null);
    const [showPublicProfileModal, setShowPublicProfileModal] = useState<boolean>(false);
    const [loadingPublicProfile, setLoadingPublicProfile] = useState<boolean>(false);
    const [profileViewingUsername, setProfileViewingUsername] = useState<string | null>(initialRoute.profileViewingUsername);
    const [socialFriends, setSocialFriends] = useState<any[]>([]);
    const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]);

    // ----------------------------------------------------
    // INITIAL MOUNT LOAD & BOOTSTRAP
    // ----------------------------------------------------
    useEffect(() => {
        // Load preferences
        const savedTheme = localStorage.getItem(DB_KEYS.theme) || 'washi';
        setTheme(savedTheme);
        document.body.className = `theme-${savedTheme}`;

        const savedFont = localStorage.getItem(DB_KEYS.font) || 'font-serif';
        setReaderFont(savedFont);

        const savedSize = parseInt(localStorage.getItem(DB_KEYS.fontSize) || '18') || 18;
        setReaderFontSize(savedSize);

        try {
            const activeB = JSON.parse(localStorage.getItem(DB_KEYS.activeBannerId) || 'null');
            setActiveBannerId(activeB);
        } catch (e) {}

        // Load session and refresh details from server
        try {
            const rawSession = localStorage.getItem(DB_KEYS.session);
            if (rawSession) {
                const sessionUser = JSON.parse(rawSession);
                if (sessionUser && sessionUser.id) {
                    refreshSession(sessionUser.id);
                }
            }
        } catch (e) {}

        if (initialRoute.triggerLogin) {
            openAuth('login', initialRoute.authReturnTo, true);
        }
    }, []);

    // Lazy loading data based on currentView to optimize performance
    useEffect(() => {
        if (currentView === 'home') {
            fetchNovels();
            fetchAnnouncements();
            fetchEvents();
            fetchLatestComments();
            fetchLatestReviews();
            fetchWibuRanking();
            fetchForumPosts();
        } else if (currentView === 'explore' || currentView === 'library' || currentView === 'studio' || currentView === 'reader' || currentView === 'collection' || currentView === 'detail' || currentView === 'admin-dashboard' || currentView === 'mod-dashboard') {
            fetchNovels();
        } else if (currentView === 'forum') {
            fetchForumPosts();
        } else if (currentView === 'event-detail') {
            fetchEvents();
        } else if (currentView === 'profile') {
            fetchNovels();
            fetchForumPosts();
        }
    }, [currentView, currentUser?.id]);

    // ----------------------------------------------------
    // BIDIRECTIONAL HASH ROUTER
    // ----------------------------------------------------
    // Parse URL Hash to update React States with authentication & RBAC guards
    const parseHashAndSetStates = () => {
        const hash = window.location.hash;
        
        // Clear public profile view when navigating elsewhere
        setProfileViewingUsername(null);
        
        // Private routes protection
        const privateRoutes = ['#/library', '#/studio', '#/mod-dashboard', '#/admin-dashboard', '#/manage-rules', '#/profile'];
        const isPrivate = privateRoutes.includes(hash);
        
        let sessionUser: User | null = null;
        try {
            const raw = localStorage.getItem(DB_KEYS.session);
            if (raw) {
                sessionUser = JSON.parse(raw);
            }
        } catch (e) {}
        if (!sessionUser) {
            sessionUser = currentUser;
        }
        
        if (isPrivate && !sessionUser) {
            openAuth('login', hash, true);
            return;
        }

        const auth = parseAuthHash(hash);
        if (auth) {
            if (sessionUser) {
                window.history.replaceState(null, '', auth.returnTo);
                parseHashAndSetStates();
            } else {
                setAuthReturnTo(auth.returnTo); setCurrentView(auth.mode);
            }
            return;
        }

        if (sessionUser) {
            const rolesData = sessionUser.roles || [];
            if (hash === '#/mod-dashboard' && !rolesData.includes('moderator') && !rolesData.includes('admin')) {
                setCurrentView('home');
                window.location.hash = '#/';
                return;
            }
            if (['#/admin-dashboard', '#/manage-rules'].includes(hash) && !rolesData.includes('admin')) {
                setCurrentView('home');
                window.location.hash = '#/';
                return;
            }
        }

        if (!hash || hash === '#/') {
            setCurrentView('home');
            setActiveNovelId(null);
            setActiveChapterIndex(null);
            return;
        }

        if (hash === '#/library') {
            setCurrentView('library');
            setActiveNovelId(null);
            setActiveChapterIndex(null);
            return;
        }

        if (/^#\/collection\/[a-f0-9]{32}$/.test(hash)) {
            setActiveCollectionShareId(hash.split('/')[2]);
            setCurrentView('collection'); setActiveNovelId(null); setActiveChapterIndex(null); return;
        }

        // Match #/forum?post=123
        const forumPostMatch = hash.match(/^#\/forum\?post=(\d+)$/);
        if (forumPostMatch) {
            const postId = parseInt(forumPostMatch[1]);
            setActiveForumPostId(postId);
            setCurrentView('forum');
            setActiveNovelId(null);
            setActiveChapterIndex(null);
            return;
        }

        if (hash === '#/forum') {
            setActiveForumPostId(null);
            setCurrentView('forum');
            setActiveNovelId(null);
            setActiveChapterIndex(null);
            return;
        }

        if (hash === '#/explore') {
            setCurrentView('explore');
            setActiveNovelId(null);
            setActiveChapterIndex(null);
            return;
        }

        if (/^#\/elections(?:\/[1-9]\d*)?$/.test(hash)) {
            setCurrentView('elections'); setActiveNovelId(null); setActiveChapterIndex(null); return;
        }

        if (hash === '#/studio') {
            setCurrentView('studio');
            return;
        }

        if (hash === '#/mod-dashboard') {
            setCurrentView('mod-dashboard');
            return;
        }

        if (hash === '#/admin-dashboard') {
            setCurrentView('admin-dashboard');
            return;
        }

        if (hash === '#/manage-rules') {
            setCurrentView('manage-rules');
            return;
        }

        const eventMatch = hash.match(/^#\/event\/([1-9]\d{0,14})$/);
        if (eventMatch) {
            setActiveEventId(Number(eventMatch[1]));
            setCurrentView('event-detail');
            return;
        }

        if (hash === '#/profile') {
            setCurrentView('profile');
            setProfileViewingUsername(null);
            return;
        }

        if (hash === '#/about') {
            setCurrentView('about');
            return;
        }

        const profileMatch = hash.match(/^#\/profile\/([^/]+)$/);
        if (profileMatch) {
            const username = decodeURIComponent(profileMatch[1]);
            setProfileViewingUsername(username);
            setCurrentView('profile');
            return;
        }

        // Match #/novel/:id/reader/:chapterIndex
        const readerMatch = hash.match(/^#\/novel\/(\d+)\/reader\/(\d+)$/);
        if (readerMatch) {
            const novelId = parseInt(readerMatch[1]);
            const chapterIndex = parseInt(readerMatch[2]);
            setActiveNovelId(novelId);
            setActiveChapterIndex(chapterIndex);
            setCurrentView('reader');
            return;
        }

        // Match #/novel/:id
        const detailMatch = hash.match(/^#\/novel\/(\d+)$/);
        if (detailMatch) {
            const novelId = parseInt(detailMatch[1]);
            setActiveNovelId(novelId);
            setActiveChapterIndex(null);
            setCurrentView('detail');
            return;
        }

        // Fallback
        setCurrentView('home');
        setActiveNovelId(null);
        setActiveChapterIndex(null);
    };

    // Listen to window hash changes and run initial parse
    useEffect(() => {
        const handleHashChange = () => {
            parseHashAndSetStates();
        };

        parseHashAndSetStates(); // Run initial routing checks on mount

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [currentUser]);

    // Synchronize React States to URL Hash
    useEffect(() => {
        let expectedHash = '#/';

        if (currentView === 'login' || currentView === 'register') {
            expectedHash = authHref(currentView, authReturnTo);
        } else if (currentView === 'library') {
            expectedHash = '#/library';
        } else if (currentView === 'studio') {
            expectedHash = '#/studio';
        } else if (currentView === 'mod-dashboard') {
            expectedHash = '#/mod-dashboard';
        } else if (currentView === 'admin-dashboard') {
            expectedHash = '#/admin-dashboard';
        } else if (currentView === 'manage-rules') {
            expectedHash = '#/manage-rules';
        } else if (currentView === 'event-detail' && activeEventId !== null) {
            expectedHash = `#/event/${activeEventId}`;
        } else if (currentView === 'profile') {
            if (profileViewingUsername && (!currentUser || profileViewingUsername !== currentUser.username)) {
                expectedHash = `#/profile/${encodeURIComponent(profileViewingUsername)}`;
            } else {
                expectedHash = '#/profile';
            }
        } else if (currentView === 'forum') {
            expectedHash = activeForumPostId ? `#/forum?post=${activeForumPostId}` : '#/forum';
        } else if (currentView === 'explore') {
            expectedHash = '#/explore';
        } else if (currentView === 'about') {
            expectedHash = '#/about';
        } else if (currentView === 'elections') {
            expectedHash = /^#\/elections(?:\/[1-9]\d*)?$/.test(window.location.hash) ? window.location.hash : '#/elections';
        } else if (currentView === 'collection') {
            expectedHash = activeCollectionShareId ? `#/collection/${activeCollectionShareId}` : '#/';
        } else if (currentView === 'detail' && activeNovelId !== null) {
            expectedHash = `#/novel/${activeNovelId}`;
        } else if (currentView === 'reader' && activeNovelId !== null && activeChapterIndex !== null) {
            expectedHash = `#/novel/${activeNovelId}/reader/${activeChapterIndex}`;
        }

        if (window.location.hash !== expectedHash) {
            window.location.hash = expectedHash;
        }
    }, [currentView, authReturnTo, activeNovelId, activeChapterIndex, profileViewingUsername, activeForumPostId, activeCollectionShareId, activeEventId, currentUser]);

    // ----------------------------------------------------
    // FETCH HELPER METHOD INTEGRATIONS WITH REST API
    // ----------------------------------------------------
    const fetchNovels = async (forceRefresh = false): Promise<Novel[]> => {
        if (!forceRefresh) {
            const cached = getCachedData(CACHE_KEYS.novels + ':' + (currentUser?.id || 'guest'), 120000);
            if (cached) {
                setNovels(cached);
                setNovelsLoading(false); setNovelsError('');
                return cached;
            }
        }
        setNovelsLoading(true); setNovelsError('');
        try {
            const list = await fetchArrayPages<Novel>(fetchWithAuth, `${API_BASE}/novels`);
            setNovels(list);
            setCachedData(CACHE_KEYS.novels + ':' + (currentUser?.id || 'guest'), list);
            return list;
        } catch (err) {
            console.error("Error fetching novels:", err);
            setNovelsError(err instanceof Error ? err.message : 'Không thể kết nối đến thư viện.');
            return novels;
        } finally {
            setNovelsLoading(false);
        }
    };

    const fetchAnnouncements = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cached = getCachedData(CACHE_KEYS.announcements, 120000);
            if (cached) {
                setAnnouncements(cached);
                return;
            }
        }
        try {
            const res = await fetchWithAuth(`${API_BASE}/announcements`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setAnnouncements(list);
            setCachedData(CACHE_KEYS.announcements, list);
        } catch (err) {
            console.error("Error fetching announcements:", err);
            setAnnouncements([]);
        }
    };

    const fetchEvents = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cached = getCachedData(CACHE_KEYS.events + ':' + (currentUser?.id || 'guest'), 120000);
            if (cached) {
                setEvents(cached);
                setEventsError('');
                setEventsLoading(false);
                return;
            }
        }
        setEventsLoading(true);
        setEventsError('');
        try {
            const res = await fetchWithAuth(`${API_BASE}/events`);
            if (!res.ok) throw new Error('Không thể tải danh sách sự kiện.');
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('Dữ liệu sự kiện không hợp lệ.');
            const mapped: SystemEvent[] = (Array.isArray(data) ? data : []).map((ev: any) => ({
                id: ev.id,
                title: ev.title,
                description: ev.description || null,
                content: ev.content || null,
                status: ev.status === 'active' || ev.status === 'published' ? ev.status : 'draft',
                created_at: ev.created_at || new Date().toISOString()
            }));
            setEvents(mapped);
            setCachedData(CACHE_KEYS.events + ':' + (currentUser?.id || 'guest'), mapped);
        } catch (err) {
            console.error("Error fetching events:", err);
            setEventsError('Không thể tải danh sách sự kiện. Hãy thử làm mới.');
        } finally {
            setEventsLoading(false);
        }
    };

    const fetchForumPosts = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cached = getCachedData(CACHE_KEYS.forumPosts + ':' + (currentUser?.id || 'guest'), 45000);
            if (cached) {
                setForumPosts(cached);
                return;
            }
        }
        try {
            const list = await fetchArrayPages<ForumPost>(fetchWithAuth, `${API_BASE}/forum/posts?comments=none`);
            setForumPosts(list);
            setCachedData(CACHE_KEYS.forumPosts + ':' + (currentUser?.id || 'guest'), list);
        } catch (err) {
            console.error("Error fetching forum posts:", err);
            setForumPosts([]);
        }
    };

    const fetchLatestComments = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cached = getCachedData(CACHE_KEYS.latestComments, 45000);
            if (cached) {
                setLatestComments(cached);
                return;
            }
        }
        try {
            const res = await fetchWithAuth(`${API_BASE}/comments/global/latest`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setLatestComments(list);
            setCachedData(CACHE_KEYS.latestComments, list);
        } catch (err) {
            console.error("Error fetching latest comments:", err);
            setLatestComments([]);
        }
    };

    const fetchLatestReviews = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cached = getCachedData(CACHE_KEYS.latestReviews, 45000);
            if (cached) {
                setLatestReviews(cached);
                return;
            }
        }
        try {
            const res = await fetchWithAuth(`${API_BASE}/reviews/global/latest`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setLatestReviews(list);
            setCachedData(CACHE_KEYS.latestReviews, list);
        } catch (err) {
            console.error("Error fetching latest reviews:", err);
            setLatestReviews([]);
        }
    };

    const fetchWibuRanking = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/social/wibu-ranking`);
            const data = await res.json();
            setWibuRanking(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching wibu ranking:", err);
            setWibuRanking([]);
        }
    };

    const fetchReviews = async (novelId: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/reviews/${novelId}`);
            const data = await res.json();
            setReviews(prev => ({ ...prev, [novelId]: Array.isArray(data) ? data : [] }));
        } catch (err) {
            console.error("Error fetching reviews:", err);
        }
    };

    const fetchComments = async (novelId: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/comments/${novelId}`);
            const list = await res.json();
            if (!Array.isArray(list)) return;
            const roots = list.filter((c: any) => c.parent_id === null) as Comment[];
            const replies = list.filter((c: any) => c.parent_id !== null) as Comment[];
            roots.forEach((r: Comment) => {
                r.replies = replies.filter((rep: Comment) => rep.parent_id === r.id);
            });
            setComments(prev => ({ ...prev, [novelId]: roots }));
        } catch (err) {
            console.error("Error fetching comments:", err);
        }
    };

    const [pendingChapters, setPendingChapters] = useState<any[]>([]);
    const fetchDashboardData = async () => {
        setDashboardLoading(true);
        setDashboardError('');
        try {
            const res = await fetchWithAuth(`${API_BASE}/mod/dashboard`);
            if (!res.ok) throw new Error('Không thể tải dữ liệu quản trị.');
            const data = await res.json();
            if (!Array.isArray(data.usersList) || !Array.isArray(data.pendingChapters) || !Array.isArray(data.reportedComments)) {
                throw new Error('Dữ liệu quản trị không hợp lệ.');
            }
            setPendingChapters(data.pendingChapters || []);
            setReports(data.reportedComments || []);
            setUsers(data.usersList || []);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            setDashboardError('Không thể tải tài khoản và hàng đợi kiểm duyệt. Hãy thử làm mới.');
        } finally {
            setDashboardLoading(false);
        }
    };

    const refreshSession = async (userId: number) => {
        // Invalidate dynamic caches that could change when user gains XP/performs actions
        clearCache(CACHE_KEYS.forumPosts);
        clearCache(CACHE_KEYS.latestComments);
        clearCache(CACHE_KEYS.latestReviews);
        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/refresh/${userId}`);
            const data = await res.json();
            if (data.user) {
                localStorage.removeItem('mugen_token');
                setCurrentUser(data.user);
                localStorage.setItem(DB_KEYS.session, JSON.stringify(data.user));
                setProfileDisplayname(data.user.displayname || "");
                setProfileAvatarSeed(data.user.avatar_seed || "");
                setProfileBio(data.user.bio || "");
                setProfileRoles(data.user.roles || ['reader']);
            }
        } catch (err) {
            console.error("Refresh session error:", err);
        }
    };

    const viewPublicProfile = async (username: string) => {
        if (!username) return;
        setLoadingPublicProfile(true);
        setPublicProfileData(null);
        setShowPublicProfileModal(true);
        try {
            const res = await fetch(`${API_BASE}/auth/user/${username}`);
            const data = await res.json();
            if (res.ok && data.user) {
                setPublicProfileData(data.user);
                if (currentUser) {
                    fetchSocialData();
                }
            } else {
                alert(data.error || "Không thể tải thông tin cá nhân người dùng.");
                setShowPublicProfileModal(false);
            }
        } catch (err) {
            console.error("Error fetching public profile:", err);
            alert("Lỗi kết nối máy chủ.");
            setShowPublicProfileModal(false);
        } finally {
            setLoadingPublicProfile(false);
        }
    };

    // Auto hooks trigger
    useEffect(() => {
        if (activeNovelId !== null) {
            fetchReviews(activeNovelId);
            fetchComments(activeNovelId);
        }
    }, [activeNovelId]);

    useEffect(() => {
        if (currentView === 'mod-dashboard' || currentView === 'admin-dashboard') {
            fetchDashboardData();
            fetchNovels(true);
            if (currentView === 'admin-dashboard') fetchEvents(true);
        }
    }, [currentView]);

    // Click outside handler to auto-close dropdown menus
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (burgerOpen && !target.closest('.burger-menu-container')) {
                setBurgerOpen(false);
            }
            if (notifDropdownOpen && !target.closest('.notif-bell-container')) {
                setNotifDropdownOpen(false);
            }
            if (categoryDrawerOpen && !target.closest('.category-drawer') && !target.closest('.category-burger-btn')) {
                setCategoryDrawerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [burgerOpen, notifDropdownOpen, categoryDrawerOpen]);

    // Theme changer sync
    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        localStorage.setItem(DB_KEYS.theme, newTheme);
        document.body.className = `theme-${newTheme}`;
    };

    // Sync database hooks (Placeholders mapping client variables changes to backend queries)
    const updateUserInDatabase = () => { if (currentUser) refreshSession(currentUser.id); };

    // ----------------------------------------------------
    // TOAST & SAKURA WIDGET SERVICES
    // ----------------------------------------------------
    const showToast = (msg: string) => {
        setToastMsg(msg);
        setToastShow(true);
        setTimeout(() => setToastShow(false), 3000);
    };

    const triggerSakuraPetals = (count = 10) => {
        const newPetals: Petal[] = [];
        for (let i = 0; i < count; i++) {
            newPetals.push({
                id: Math.random() + '-' + Date.now(),
                left: Math.random() * 100,
                delay: Math.random() * 5,
                duration: Math.random() * 5 + 5,
                scale: Math.random() * 0.6 + 0.4
            });
        }
        setPetals(prev => [...prev, ...newPetals]);
    };

    const removePetal = (id: string) => {
        setPetals(prev => prev.filter(p => p.id !== id));
    };

    // ----------------------------------------------------
    // AUTHENTICATION CONTROLLER FLOWS
    // ----------------------------------------------------
    const finishAuthentication = (user: User) => {
        localStorage.setItem(DB_KEYS.session, JSON.stringify(user));
        localStorage.removeItem('mugen_token');
        setCurrentUser(user);
        setProfileDisplayname(user.displayname || '');
        setProfileAvatarSeed(user.avatarSeed || '');
        setProfileBio(user.bio || '');
        setProfileRoles(user.roles || ['reader']);
        window.history.replaceState(null, '', safeAuthReturn(authReturnTo));
        parseHashAndSetStates();
    };
    const handleLoginSubmit = async (fields: LoginFields) => {
        let response: Response;
        try {
            response = await fetchWithAuth(`${API_BASE}/auth/login`, {
                method: 'POST', body: JSON.stringify({ username: fields.username.trim(), password: fields.password })
            });
        } catch { throw new Error('Không thể kết nối máy chủ. Hãy kiểm tra mạng rồi thử lại.'); }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Đăng nhập không thành công.');
        finishAuthentication(data.user);
        showToast(`Chào mừng trở lại, ${data.user.displayname}.`);
    };

    const sendRegistrationOtp = async (email: string): Promise<string | undefined> => {
        let response: Response;
        try {
            response = await fetchWithAuth(`${API_BASE}/auth/send-otp`, {
                method: 'POST', body: JSON.stringify({ email })
            });
        } catch { throw new Error('Không thể kết nối để gửi mã. Hãy kiểm tra mạng rồi thử lại.'); }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể gửi mã xác thực.');
        return data.devOtp;
    };
    const handleRegisterSubmit = async (fields: RegisterFields) => {
        let response: Response;
        try {
            response = await fetchWithAuth(`${API_BASE}/auth/register`, {
                method: 'POST', body: JSON.stringify({ ...fields, username: fields.username.trim().toLowerCase(),
                    displayname: fields.displayname.trim(), email: fields.email.trim(), role: 'reader' })
            });
        } catch { throw new Error('Không thể kết nối máy chủ. Hãy kiểm tra mạng rồi thử lại.'); }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Đăng ký không thành công.');
        finishAuthentication(data.user);
        showToast('Chào mừng bạn đến với MugenBunko.');
        void fetchNovels(true);
    };

    const logoutUser = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE}/auth/logout`, { method: 'POST' });
            if (!response.ok && response.status !== 401) throw new Error();
        } catch {
            showToast('Không thể kết thúc phiên trên máy chủ. Kiểm tra kết nối rồi thử lại.');
            return;
        }
        setCurrentUser(null);
        localStorage.removeItem(DB_KEYS.session);
        localStorage.removeItem('mugen_token');
        for (const key of Object.keys(sessionStorage)) {
            if (key.startsWith('mugen_cache_')) sessionStorage.removeItem(key);
        }
        setCurrentView('home');
        showToast("Đã đăng xuất tài khoản an toàn.");
    };

    // ----------------------------------------------------
    // BREADCRUMBS BUILDER
    // ----------------------------------------------------
    const renderBreadcrumbs = () => {
        const items = [
            <span key="home" onClick={() => { setCurrentView('home'); setActiveNovelId(null); }} className="breadcrumb-item link">Thư Viện</span>
        ];

        if (currentView === 'library') {
            items.push(<span key="lib" className="breadcrumb-item active">Tủ Sách Cá Nhân</span>);
        } else if (currentView === 'detail') {
            const novel = novels.find(n => n.id === activeNovelId);
            items.push(<span key="det" className="breadcrumb-item active">{novel ? novel.title : 'Chi tiết tác phẩm'}</span>);
        } else if (currentView === 'studio') {
            items.push(<span key="std" className="breadcrumb-item active">Studio Tác Giả</span>);
        } else if (currentView === 'mod-dashboard') {
            items.push(<span key="mod" className="breadcrumb-item active">Bảng Kiểm Duyệt Mod</span>);
        } else if (currentView === 'admin-dashboard') {
            items.push(<span key="adm" className="breadcrumb-item active">Trang Quản Trị Admin</span>);
        } else if (currentView === 'profile') {
            items.push(<span key="prof" className="breadcrumb-item active">Thông Tin Cá Nhân</span>);
        } else if (currentView === 'about') {
            items.push(<span key="about" className="breadcrumb-item active">Về MugenBunko</span>);
        }
        return items;
    };

    // ----------------------------------------------------
    // COMMON UTILITY RATING AVERAGE
    // ----------------------------------------------------
    const computeAverageStars = (novelId: number) => {
        if (reviews[novelId] !== undefined) {
            const list = reviews[novelId];
            if (list.length === 0) return "N/A";
            const sum = list.reduce((acc, r) => acc + r.stars, 0);
            return (sum / list.length).toFixed(1);
        }
        const n = novels.find(x => x.id === novelId);
        if (!n) return "N/A";
        if (n.bookmarks_count > 0 && n.rating) {
            return parseFloat(n.rating as string).toFixed(1);
        }
        return "N/A";
    };

    // ----------------------------------------------------
    // PERSONAL LIBRARY ACCUMULATOR
    // ----------------------------------------------------
    const toggleBookmark = async (novelId: number) => {
        if (!currentUser) {
            setLoginModalOpen(true);
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/novels/${novelId}/bookmark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id })
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentUser(data.user);
                localStorage.setItem(DB_KEYS.session, JSON.stringify(data.user));
                fetchNovels(true);
                showToast("Đã cập nhật Tủ sách cá nhân!");
            }
        } catch (err) {
            console.error("Bookmark toggle error:", err);
        }
    };

    // ----------------------------------------------------
    // COMMUNITY REVIEWS & RATINGS LOGIC
    // ----------------------------------------------------
    const submitReview = async () => {
        if (!currentUser || activeNovelId === null) return;
        const text = reviewText.trim();
        if (text.length < 15) {
            alert("Nội dung nhận xét đánh giá tối thiểu phải chứa 15 ký tự!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/reviews/${activeNovelId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, stars: selectedRatingStars, text })
            });
            if (res.ok) {
                setReviewText("");
                fetchReviews(activeNovelId);
                fetchNovels(true);
                fetchLatestReviews(true);
                showToast("Đã gửi đánh giá thành công! ⭐");
                refreshSession(currentUser.id);
            }
        } catch (err) {
            console.error("Submit review error:", err);
        }
    };

    // ----------------------------------------------------
    // IMMERSIVE READER WORKFLOWS
    // ----------------------------------------------------
    const startReading = async (novelId: number, chapterIndex: number) => {
        const novel = novels.find(n => n.id === novelId);
        if (!novel) {
            openNovelDetail(novelId);
            return;
        }

        const publishedChapters = (novel.chapters || []).filter(ch => ch.status === 'published');
        if (publishedChapters.length === 0) {
            alert("Tác phẩm này chưa có chương nào được xuất bản!");
            return;
        }

        chapterIndex = Math.max(0, Math.min(publishedChapters.length - 1, chapterIndex));
        setActiveNovelId(novelId);
        setActiveChapterIndex(chapterIndex);

        // Save to reading history in localStorage
        try {
            const historyKey = currentUser ? `mugen_reading_history_${currentUser.username}` : 'mugen_reading_history_guest';
            let history: any[] = [];
            try {
                const rawHistory = localStorage.getItem(historyKey);
                if (rawHistory) history = JSON.parse(rawHistory);
            } catch (e) {}
            
            // Remove existing entry for this novel to bubble it to top
            history = history.filter(item => item.novelId !== novelId);
            
            const chapterObj = publishedChapters[chapterIndex];
            
            history.unshift({
                novelId: novelId,
                novelTitle: novel.title,
                novelCover: novel.cover,
                chapterIndex: chapterIndex,
                chapterTitle: chapterObj ? chapterObj.title : `Chương ${chapterIndex + 1}`,
                updatedAt: Date.now()
            });
            
            // Limit to 5 recent books
            history = history.slice(0, 5);
            localStorage.setItem(historyKey, JSON.stringify(history));
        } catch (historyErr) {
            console.error("Save reading history error:", historyErr);
        }

        setCurrentView('reader');
    };

    const incrementReadCount = async (novelId: number | null) => {
        if (novelId === null) return;
        try {
            await fetchWithAuth(`${API_BASE}/novels/${novelId}/read-increment`, { method: 'POST' });
            fetchNovels();
        } catch (err) {
            console.error("Increment read count error:", err);
        }
    };

    const navigateToChapter = (direction: 'next' | 'prev') => {
        if (activeNovelId === null || activeChapterIndex === null) return;
        const novel = novels.find(n => n.id === activeNovelId);
        if (!novel) return;

        const publishedChapters = (novel.chapters || []).filter(ch => ch.status === 'published');
        let nextIdx = activeChapterIndex;
        if (direction === 'next') nextIdx++;
        else nextIdx--;

        if (nextIdx >= 0 && nextIdx < publishedChapters.length) {
            startReading(activeNovelId, nextIdx);
        }
    };

    // ----------------------------------------------------
    // NESTED COMMENTS 2-LEVELS
    // ----------------------------------------------------
    const submitComment = async () => {
        if (!currentUser || activeNovelId === null) return;
        const text = commentText.trim();
        if (!text) {
            alert("Bình luận không được bỏ trống!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/comments/${activeNovelId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, text })
            });
            if (res.ok) {
                setCommentText("");
                fetchComments(activeNovelId);
                fetchLatestComments();
                showToast("Bình luận đã được đăng thành công!");
                refreshSession(currentUser.id);
            }
        } catch (err) {
            console.error("Submit comment error:", err);
        }
    };

    const submitCommentReply = async (parentCommentId: number) => {
        if (!currentUser || activeNovelId === null) return;
        const text = replyText.trim();
        if (!text) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/comments/${activeNovelId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, parentId: parentCommentId, text, replyToUserId })
            });
            if (res.ok) {
                setReplyText("");
                setReplyToCommentId(null);
                setReplyToUserId(null);
                fetchComments(activeNovelId);
                fetchLatestComments();
                showToast("Đã gửi phản hồi thành công! 🌸");
                refreshSession(currentUser.id);
            }
        } catch (err) {
            console.error("Comment reply error:", err);
        }
    };

    const reportComment = async (commentId: number) => {
        if (!currentUser) return;
        const reason = prompt("Nhập lý do báo cáo vi phạm nội dung bình luận này:");
        if (reason === null) return;
        if (reason.trim().length === 0) {
            alert("Lý do báo cáo không được để trống!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/comments/${commentId}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reporterId: currentUser.id, reason: reason.trim() })
            });
            if (res.ok) {
                showToast("Đã báo cáo bình luận vi phạm đến Moderator! ");
            }
        } catch (err) {
            console.error("Report comment error:", err);
        }
    };

    const handleCommentReportAction = async (index: number, action: 'keep' | 'delete') => {
        const report = reports[index] as any;
        if (!report) return false;
        const reportId = report.reportId || report.id;
        const commentId = report.commentId || report.comment_id;
        try {
            const res = await fetchWithAuth(`${API_BASE}/mod/reports/${reportId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, commentId })
            });
            if (res.ok) {
                showToast(action === 'delete' ? "Đã xóa bình luận vi phạm!" : "Đã giữ bình luận và đóng báo cáo.");
                await fetchDashboardData();
                return true;
            }
            const data = await res.json();
            showToast(data.error || 'Không thể xử lý báo cáo.');
        } catch (err) {
            console.error("Report action error:", err);
            showToast('Không thể xử lý báo cáo. Kiểm tra kết nối rồi thử lại.');
        }
        return false;
    };

    // ----------------------------------------------------
    // FOLLOW AUTHOR LOGIC
    // ----------------------------------------------------
    const toggleFollowAuthor = async (authorId: string, authorName: string) => {
        if (!currentUser) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/follow-author`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followerId: currentUser.id, authorUsername: authorId })
            });
            const data = await res.json();
            if (res.ok) {
                const updatedSession = { ...currentUser, followedAuthors: data.followedAuthors };
                setCurrentUser(updatedSession);
                localStorage.setItem(DB_KEYS.session, JSON.stringify(updatedSession));
                showToast(`Đã thay đổi trạng thái theo dõi tác giả ${authorName}.`);
            }
        } catch (err) {
            console.error("Follow author error:", err);
        }
    };

    // ----------------------------------------------------
    // AUTHOR STUDIO CHAPTER CREATOR & EDITOR
    // ----------------------------------------------------
    const createNewNovelSubmit = async () => {
        if (!currentUser) return;
        const title = newNovelTitle.trim();
        const summary = newNovelSummary.trim();
        
        if (!title || !summary || newNovelGenres.length === 0) {
            alert("Vui lòng điền đầy đủ Tên tác phẩm, Tóm tắt và chọn ít nhất một Thể loại!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/novels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    authorId: currentUser.username,
                    cover: newNovelCover,
                    summary,
                    genre: newNovelGenres.join(', '),
                    tags: [...newNovelGenres.map(g => g.toLowerCase()), 'light novel'],
                    type: newNovelType,
                    status: newNovelStatus
                })
            });
            const data = await res.json();
            if (res.ok) {
                setNewNovelTitle("");
                setNewNovelSummary("");
                setNewNovelType("series");
                setNewNovelGenres(["Isekai"]);
                setNewNovelStatus("active");
                setNewNovelModalOpen(false);
                await fetchNovels(true);
                setActiveStudioNovelId(data.novelId);
                setActiveStudioChapterId(null);
                showToast(`Đã tạo tác phẩm '${title}' thành công! 📚`);
            } else {
                alert(data.error || "Có lỗi xảy ra khi tạo tác phẩm.");
            }
        } catch (err) {
            alert("Lỗi kết nối máy chủ API!");
        }
    };

    const openEditNovelModal = (novelId: number) => {
        const novel = novels.find(n => n.id === novelId);
        if (!novel) return;
        setEditNovelId(novelId);
        setEditNovelTitle(novel.title || "");
        setEditNovelGenres(novel.genre ? novel.genre.split(',').map(g => g.trim()) : ["Isekai"]);
        setEditNovelStatus(novel.status || "active");
        setEditNovelCover(novel.cover || "assets/default_novel_cover.png");
        setEditNovelSummary(novel.summary || "");
        setEditNovelType(novel.type || "series");
        setEditNovelTags(novel.tags || []);
        setEditNovelModalOpen(true);
    };

    const submitEditNovel = async () => {
        if (!currentUser || editNovelId === null) return;
        const title = editNovelTitle.trim();
        const summary = editNovelSummary.trim();
        
        if (!title || !summary || editNovelGenres.length === 0) {
            alert("Vui lòng điền đầy đủ Tên tác phẩm, Tóm tắt và chọn ít nhất một Thể loại!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/novels/${editNovelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    cover: editNovelCover,
                    summary,
                    genre: editNovelGenres.join(', '),
                    type: editNovelType,
                    tags: [...editNovelGenres.map(g => g.toLowerCase()), 'light novel'],
                    status: editNovelStatus
                })
            });
            const data = await res.json();
            if (res.ok) {
                setEditNovelModalOpen(false);
                await fetchNovels(true);
                showToast(`Đã lưu thay đổi thông tin tác phẩm '${title}' thành công! ✏️`);
            } else {
                alert(data.error || "Có lỗi xảy ra khi chỉnh sửa tác phẩm.");
            }
        } catch (err) {
            alert("Lỗi kết nối máy chủ API!");
        }
    };

    const handleDeleteNovel = async (novelId: number, reason: string): Promise<boolean> => {
        if (!currentUser) return false;
        try {
            const res = await fetchWithAuth(`${API_BASE}/novels/${novelId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: currentUser.id, reason })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("Đã xóa tác phẩm thành công.");
                await fetchNovels(true);
                if (activeNovelId === novelId) {
                    setActiveNovelId(null);
                    setCurrentView('home');
                }
                if (activeStudioNovelId === novelId) {
                    setActiveStudioNovelId(null);
                    setActiveStudioChapterId(null);
                }
                return true;
            } else {
                alert(data.error || "Có lỗi xảy ra khi xóa tác phẩm.");
                return false;
            }
        } catch (err) {
            console.error("Delete novel error:", err);
            alert("Lỗi kết nối máy chủ API!");
            return false;
        }
    };


    // ----------------------------------------------------
    // MODERATOR ACTIONS
    // ----------------------------------------------------
    const modApproveRejectChapter = async (chapterId: number, action: 'approve' | 'reject') => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/mod/chapters/${chapterId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                await Promise.all([fetchNovels(true), fetchDashboardData()]);
                showToast(action === 'approve' ? "Đã phê duyệt chương truyện." : "Đã trả chương về nháp để chỉnh sửa.");
                return true;
            }
            const data = await res.json();
            showToast(data.error || 'Không thể xét duyệt chương.');
        } catch (err) {
            console.error("Chapter review action error:", err);
            showToast('Không thể xét duyệt chương. Kiểm tra kết nối rồi thử lại.');
        }
        return false;
    };

    const modRejectChapter = async (chapterId: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/mod/chapters/${chapterId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
            });
            if (res.ok) {
                await Promise.all([fetchNovels(true), fetchDashboardData()]);
                showToast("Đã gỡ chương truyện và chuyển về bản nháp.");
                return true;
            }
            const data = await res.json();
            showToast(data.error || 'Không thể ẩn chương.');
        } catch (err) {
            console.error("Reject chapter error:", err);
            showToast('Không thể ẩn chương. Kiểm tra kết nối rồi thử lại.');
        }
        return false;
    };

    const toggleUserSuspension = async (username: string, nextStatus: 'active' | 'suspended') => {
        const user = users.find(u => u.username === username);
        if (!user) return false;

        try {
            const res = await fetchWithAuth(`${API_BASE}/admin/users/${user.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            if (res.ok) {
                await fetchDashboardData();
                if (nextStatus === 'suspended' && currentUser && currentUser.username === username) {
                    logoutUser();
                }
                showToast(nextStatus === 'suspended' ? `Đã khóa tài khoản @${username}.` : `Đã mở khóa hoạt động lại cho @${username}.`);
                return true;
            }
            const data = await res.json();
            showToast(data.error || 'Không thể thay đổi trạng thái tài khoản.');
        } catch (err) {
            console.error("Toggle suspension error:", err);
            showToast('Không thể cập nhật tài khoản. Kiểm tra kết nối rồi thử lại.');
        }
        return false;
    };

    const modMergeTagsSubmit = async () => {
        if (!tagMergeFrom || !tagMergeTo) {
            alert("Vui lòng điền đủ tag để gộp!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/admin/tags/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromTag: tagMergeFrom, toTag: tagMergeTo })
            });
            const data = await res.json();
            if (res.ok) {
                fetchNovels(true);
                showToast("Gộp tag thành công!");
                setTagMergeFrom("");
                setTagMergeTo("");
            } else {
                alert(data.error || "Giao dịch gộp tag lỗi!");
            }
        } catch (err) {
            console.error("Merge tags error:", err);
        }
    };

    // ----------------------------------------------------
    // ADMIN ACTION IMPLEMENTATIONS
    // ----------------------------------------------------
    const updateFeaturedBannerSubmit = (novelId: number) => {
        if (!novelId) return;
        setActiveBannerId(novelId);
        localStorage.setItem(DB_KEYS.activeBannerId, JSON.stringify(novelId));
        showToast("Đã cập nhật banner tiêu điểm trang chủ! 🌸");
    };

    const createSystemEventSubmit = async () => {
        if (!adminEventTitle || !adminEventDesc) {
            alert("Vui lòng nhập đầy đủ tiêu đề và nội dung sự kiện!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: adminEventTitle, 
                    description: adminEventDesc,
                    content: adminEventContent,
                    status: 'draft'
                })
            });
            if (res.ok) {
                setAdminEventTitle("");
                setAdminEventDesc("");
                setAdminEventContent("");
                await fetchEvents(true);
                showToast("Đã lưu sự kiện bản nháp! Bạn có thể xem trước hoặc phát sự kiện.");
            } else {
                const data = await res.json();
                showToast(data.error || 'Không thể lưu bản nháp. Nội dung đã nhập vẫn được giữ.');
            }
        } catch (err) {
            console.error("Create event error:", err);
            showToast('Không thể lưu bản nháp. Kiểm tra kết nối rồi thử lại.');
        }
    };

    const publishSystemEvent = async (eventId: number) => {
        const ev = events.find(x => x.id === eventId);
        if (!ev) return;
        try {
            // Deactivate other events first
            for (const other of events) {
                if (other.status === 'active') {
                    const stopped = await fetchWithAuth(`${API_BASE}/events/${other.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            title: other.title, 
                            description: other.description, 
                            content: other.content, 
                            status: 'draft' 
                        })
                    });
                    if (!stopped.ok) throw new Error('Không thể dừng sự kiện đang hiển thị.');
                }
            }

            // Publish this event
            const res = await fetchWithAuth(`${API_BASE}/events/${eventId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: ev.title, 
                    description: ev.description, 
                    content: ev.content, 
                    status: 'active' 
                })
            });
            if (res.ok) {
                await fetchEvents(true);
                showToast("Sự kiện hệ thống đã được phát trực tiếp toàn trang! 🌸");
            } else {
                const data = await res.json();
                showToast(data.error || 'Không thể phát hành sự kiện.');
                await fetchEvents(true);
            }
        } catch (err) {
            console.error("Publish event error:", err);
            showToast('Chưa thể phát hành sự kiện. Hãy kiểm tra kết nối và thử lại.');
            await fetchEvents(true);
        }
    };

    const deleteSystemEvent = async (eventId: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/events/${eventId}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchEvents(true);
                showToast("Đã xóa sự kiện hoàn toàn.");
            } else {
                const data = await res.json();
                showToast(data.error || 'Không thể xóa sự kiện.');
            }
        } catch (err) {
            console.error("Delete event error:", err);
            showToast('Không thể xóa sự kiện. Kiểm tra kết nối rồi thử lại.');
        }
    };

    const clearActiveEvent = async () => {
        try {
            let cleared = false;
            for (const ev of events) {
                if (ev.status === 'active') {
                    const stopped = await fetchWithAuth(`${API_BASE}/events/${ev.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            title: ev.title, 
                            description: ev.description, 
                            content: ev.content, 
                            status: 'draft' 
                        })
                    });
                    if (!stopped.ok) throw new Error('Không thể dừng sự kiện.');
                    cleared = true;
                }
            }
            await fetchEvents(true);
            if (cleared) {
                showToast("Đã gỡ bỏ sự kiện đang chạy toàn trang.");
            } else {
                showToast("Không có sự kiện nào đang chạy.");
            }
        } catch (err) {
            console.error("Clear events error:", err);
            showToast('Chưa thể dừng sự kiện. Hãy làm mới và thử lại.');
            await fetchEvents(true);
        }
    };


    const toggleAdminUserRole = async (username: string, role: string, enable: boolean) => {
        const user = users.find(u => u.username === username);
        if (!user) return;

        const roles = [...user.roles];
        if (role === 'admin' && enable) {
            const idx = roles.indexOf('moderator');
            if (idx > -1) roles.splice(idx, 1);
        } else if (role === 'moderator' && enable) {
            const idx = roles.indexOf('admin');
            if (idx > -1) roles.splice(idx, 1);
        }

        const idx = roles.indexOf(role as UserRole);
        if (enable) {
            if (idx === -1) roles.push(role as UserRole);
        } else {
            if (idx > -1 && role !== 'reader') {
                roles.splice(idx, 1);
            }
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/update-roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, roles, requesterId: currentUser?.id })
            });
            if (res.ok) {
                await fetchDashboardData();
                if (currentUser && currentUser.username === username) {
                    refreshSession(currentUser.id);
                }
                showToast(`Đã cập nhật vai trò cho @${username}.`);
            } else {
                const data = await res.json();
                showToast(data.error || 'Không thể cập nhật vai trò.');
            }
        } catch (err) {
            console.error("Update roles error:", err);
            showToast('Không thể cập nhật vai trò. Kiểm tra kết nối rồi thử lại.');
        }
    };

    // ----------------------------------------------------
    // SOCIAL NETWORK INTERACTIONS
    // ----------------------------------------------------
    const fetchSocialData = async () => {
        if (!currentUser || !fetchWithAuth || !API_BASE) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/social/friends`);
            if (res.ok) {
                const data = await res.json();
                setSocialFriends(data.friends || []);
                setReceivedRequests(data.received || []);
                setSentRequests(data.sent || []);
            }
        } catch (err) {
            console.error("Lỗi tải thông tin bạn bè:", err);
        }
    };

    const handleSendRequest = async (friendId: number) => {
        if (!fetchWithAuth || !API_BASE) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/social/friends/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendId })
            });
            if (res.ok) {
                await fetchSocialData();
                showToast("Đã gửi yêu cầu kết bạn! 🤝");
            }
        } catch (err) {
            console.error("Lỗi gửi lời mời kết bạn:", err);
        }
    };

    const handleAcceptRequest = async (friendId: number) => {
        if (!fetchWithAuth || !API_BASE) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/social/friends/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendId })
            });
            if (res.ok) {
                await fetchSocialData();
                showToast("Hai bạn đã trở thành bạn bè! 🌸");
            }
        } catch (err) {
            console.error("Lỗi chấp nhận kết bạn:", err);
        }
    };

    const handleDeclineRequest = async (friendId: number) => {
        if (!fetchWithAuth || !API_BASE) return;
        triggerConfirm("Bạn có chắc chắn muốn hủy kết bạn hoặc từ chối yêu cầu này không?", async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/social/friends/decline`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ friendId })
                });
                if (res.ok) {
                    await fetchSocialData();
                    showToast("Đã hủy liên kết kết bạn.");
                }
            } catch (err) {
                console.error("Lỗi hủy kết bạn:", err);
            }
        });
    };

    useEffect(() => {
        if (currentUser) {
            fetchSocialData();
        } else {
            setSocialFriends([]);
            setReceivedRequests([]);
            setSentRequests([]);
        }
    }, [currentUser]);

    // ----------------------------------------------------
    // PROFILE BASIC SETTINGS EDITORS
    // ----------------------------------------------------
    const saveBasicProfile = async () => {
        if (!currentUser) return;
        if (!profileDisplayname.trim()) {
            alert("Tên hiển thị không được để trống!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    displayname: profileDisplayname.trim(),
                    bio: profileBio.trim(),
                    avatarSeed: profileAvatarSeed.trim()
                })
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentUser(data.user);
                localStorage.setItem(DB_KEYS.session, JSON.stringify(data.user));
                showToast("Đã lưu hồ sơ thành công! 🌸");
            }
        } catch (err) {
            console.error("Save profile error:", err);
        }
    };

    const saveUserRoles = async () => {
        if (!currentUser) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/update-roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    roles: profileRoles,
                    requesterId: currentUser.id
                })
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentUser(data.user);
                localStorage.setItem(DB_KEYS.session, JSON.stringify(data.user));
                showToast("Đã cập nhật phân quyền vai trò tài khoản thành công!");
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error("Save roles error:", err);
        }
    };

    const handleRequestAuthorRole = async () => {
        if (!currentUser) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/request-author-role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id })
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentUser(data.user);
                localStorage.setItem(DB_KEYS.session, JSON.stringify(data.user));
                showToast("Đã gửi yêu cầu cấp quyền Tác giả! ⏱️");
            } else {
                alert(data.error || "Gửi yêu cầu thất bại!");
            }
        } catch (err) {
            console.error("Request author role error:", err);
        }
    };

    const handleRejectAuthorRequest = async (targetUserId: number) => {
        if (!currentUser) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/reject-author-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, requesterId: currentUser.id })
            });
            const data = await res.json();
            if (res.ok) {
                fetchDashboardData();
                showToast("Đã từ chối yêu cầu cấp quyền Tác giả.");
            } else {
                alert(data.error || "Không thể từ chối yêu cầu!");
            }
        } catch (err) {
            console.error("Reject author request error:", err);
        }
    };

    const handleRoleCheckboxChange = (role: string, checked: boolean) => {
        const roles = [...profileRoles];
        
        if (role === 'admin' && checked) {
            const idx = roles.indexOf('moderator');
            if (idx > -1) roles.splice(idx, 1);
        } else if (role === 'moderator' && checked) {
            const idx = roles.indexOf('admin');
            if (idx > -1) roles.splice(idx, 1);
        }

        const idx = roles.indexOf(role as UserRole);
        if (checked) {
            if (idx === -1) roles.push(role as UserRole);
        } else {
            if (idx > -1 && role !== 'reader') {
                roles.splice(idx, 1);
            }
        }
        setProfileRoles(roles);
    };

    const regenerateProfileAvatar = () => {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let seed = "";
        for (let i = 0; i < 8; i++) {
            seed += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setProfileAvatarSeed(seed);
    };

    const uploadImageFile = async (file: File, type: string): Promise<string> => {
        try {
            // Compress avatar/cover images to max 1000px and 80% quality
            const compressedBase64 = await compressImage(file, 1000, 1000, 0.8);
            const res = await fetchWithAuth(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: compressedBase64, type })
            });
            const data = await res.json();
            if (res.ok && data.url) {
                return data.url;
            } else {
                throw data.error || "Lỗi tải ảnh lên máy chủ.";
            }
        } catch (err: any) {
            throw err.message || err || "Lỗi kết nối API tải ảnh.";
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            showToast("Đang tải ảnh đại diện lên...");
            const url = await uploadImageFile(file, 'avatar');
            setProfileAvatarSeed(url);
            showToast("Đã tải ảnh đại diện thành công!");
        } catch (err: any) {
            alert(err);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            showToast("Đang tải ảnh bìa truyện lên...");
            const url = await uploadImageFile(file, 'cover');
            setNewNovelCover(url);
            showToast("Đã tải ảnh bìa thành công!");
        } catch (err: any) {
            alert(err);
        }
    };

    const handleEditCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            showToast("Đang tải ảnh bìa truyện mới lên...");
            const url = await uploadImageFile(file, 'cover');
            setEditNovelCover(url);
            showToast("Đã tải ảnh bìa mới thành công!");
        } catch (err: any) {
            alert(err);
        }
    };


    const markAllNotificationsRead = async () => {
        if (!currentUser) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/notifications/read-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id })
            });
            if (res.ok) {
                const updated = { ...currentUser };
                if (Array.isArray(updated.notifications)) {
                    updated.notifications = updated.notifications.map(n => ({ ...n, read: true }));
                }
                setCurrentUser(updated);
                localStorage.setItem(DB_KEYS.session, JSON.stringify(updated));
                showToast("Đã đánh dấu đọc tất cả thông báo! 🌸");
            }
        } catch (err) {
            console.error("Mark notifications read error:", err);
        }
    };

    // ----------------------------------------------------
    // NOVEL DISCOVERY DRAWER FILTER HANDLERS
    // ----------------------------------------------------
    const handleGenreClick = (genre: string) => {
        const normalized = genre || 'Tất cả';
        setFilterGenre(normalized);
        setExploreGenre(normalized);
        setCurrentView('explore');
    };

    const handleTagClick = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag));
        } else {
            setSelectedTags(prev => [...prev, tag]);
        }
    };

    // ----------------------------------------------------
    // FORMAT DOCUMENT WIDGET HELPERS
    // ----------------------------------------------------
    const insertStaticIllustration = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedSelectionRangeRef.current = selection.getRangeAt(0);
        } else {
            savedSelectionRangeRef.current = null;
        }
        setImageUrlInput("");
        setImageUploading(false);
        setImageModalOpen(true);
    };

    const handleImageModalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageUploading(true);
        try {
            // Compress chapter illustrations to max 1600px and 80% quality
            const compressedBase64 = await compressImage(file, 1600, 1600, 0.8);
            const res = await fetchWithAuth(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: compressedBase64, type: 'chapter' })
            });
            const data = await res.json();
            if (res.ok && data.url) {
                confirmInsertImage(data.url);
            } else {
                alert(data.error || "Không thể tải hình ảnh lên máy chủ.");
            }
        } catch (err: any) {
            console.error("Upload error:", err);
            alert(err.message || err || "Lỗi kết nối máy chủ khi tải ảnh.");
        } finally {
            setImageUploading(false);
        }
    };

    const confirmInsertImage = (url: string) => {
        if (!url || !contentAreaRef.current || currentView !== 'studio') return;
        try {
            if (!['http:', 'https:'].includes(new URL(url, window.location.href).protocol)) {
                showToast('Hãy dùng liên kết ảnh HTTP hoặc HTTPS.'); return;
            }
        } catch { showToast('Liên kết ảnh không hợp lệ.'); return; }

        if (contentAreaRef.current) {
            contentAreaRef.current.focus();
            const sel = window.getSelection();
            if (savedSelectionRangeRef.current && sel && contentAreaRef.current.contains(savedSelectionRangeRef.current.commonAncestorContainer)) {
                sel.removeAllRanges();
                sel.addRange(savedSelectionRangeRef.current);
            }
        }

        const image = document.createElement('img'); image.src = url; image.alt = 'Minh họa';
        document.execCommand('insertHTML', false, `<div style="text-align: center">${image.outerHTML}</div><p><br></p>`);

        contentAreaRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
        setImageModalOpen(false);
    };

    // ----------------------------------------------------
    // SYSTEM GENRES CONST DATABASE
    // ----------------------------------------------------
    const [genres, setGenres] = useState<string[]>(() => {
        const saved = localStorage.getItem(DB_KEYS.genres);
        return saved ? JSON.parse(saved) : ["Isekai", "Fantasy", "Romance", "Sci-Fi", "Slice of Life"];
    });

    useEffect(() => {
        const fetchGenresList = async () => {
            try {
                const res = await fetch(`${API_BASE}/genres`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const list = data.map((g: any) => g.name);
                        setGenres(list);
                        localStorage.setItem(DB_KEYS.genres, JSON.stringify(list));
                    }
                }
            } catch (e) {
                console.error("Lỗi tải thể loại từ API, dùng cache:", e);
            }
        };
        fetchGenresList();
    }, []);

    const deleteGenre = async (name: string) => {
        if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa thể loại '${name}' không? Các truyện thuộc thể loại này vẫn giữ nhãn cũ nhưng thể loại này sẽ biến mất khỏi bộ lọc.`)) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/admin/genres/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setGenres(prev => prev.filter(g => g !== name));
                localStorage.setItem(DB_KEYS.genres, JSON.stringify(genres.filter(g => g !== name)));
                showToast(`Đã xóa thể loại '${name}'.`);
            } else {
                const data = await res.json();
                alert(data.error || "Lỗi xóa thể loại.");
            }
        } catch (err) {
            console.error("Delete genre error:", err);
            alert("Lỗi kết nối máy chủ API!");
        }
    };

    const handleAddGenre = async () => {
        const name = newGenreName.trim();
        if (!name) return;
        if (genres.includes(name)) {
            alert("Thể loại này đã tồn tại!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/admin/genres`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                const nextGenres = [...genres, name];
                setGenres(nextGenres);
                localStorage.setItem(DB_KEYS.genres, JSON.stringify(nextGenres));
                setNewGenreName("");
                showToast(`Đã thêm thể loại '${name}' thành công! 🌸`);
            } else {
                const data = await res.json();
                alert(data.error || "Lỗi thêm thể loại mới.");
            }
        } catch (err) {
            console.error("Add genre error:", err);
            alert("Lỗi kết nối máy chủ API!");
        }
    };

    // If visiting from a mobile device and not bypassed, render ONLY the Mobile Gate Splash Screen
    if (isMobileDevice && !mobileBypassed) {
        return (
            <MobileGateOverlay onBypass={() => {
                sessionStorage.setItem('mugen_mobile_bypass', 'true');
                setMobileBypassed(true);
            }} />
        );
    }

    if (currentView === 'login' || currentView === 'register') {
        return <AuthPage mode={currentView} returnTo={authReturnTo} theme={theme}
            onThemeChange={handleThemeChange} onLogin={handleLoginSubmit} onRegister={handleRegisterSubmit}
            sendRegistrationOtp={sendRegistrationOtp} />;
    }

    return (
        <>
            {/* Sakura floating petals overlay */}
            <div id="sakura-container">
                {petals.map(p => (
                    <div
                        key={p.id}
                        className="sakura-petal"
                        style={{
                            left: `${p.left}vw`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            transform: `scale(${p.scale})`
                        }}
                        onAnimationEnd={() => removePetal(p.id)}
                    />
                ))}
            </div>

            {/* Category Drawer (Left Slide-out menu) */}
            {categoryDrawerOpen && (
                <div className="category-drawer-overlay" onClick={() => setCategoryDrawerOpen(false)}>
                    <div className="category-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-header">
                            <h3>KHÁM PHÁ</h3>
                            <button className="close-drawer-btn" onClick={() => setCategoryDrawerOpen(false)}>&times;</button>
                        </div>
                        <div className="drawer-body">
                            <div className="drawer-section">
                                <h4>Điều hướng</h4>
                                <div className="drawer-options">
                                    <button 
                                        className={`drawer-opt-btn ${currentView === 'home' ? 'active' : ''}`}
                                        onClick={() => { setCurrentView('home'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}
                                    >
                                        Thư Viện (Trang chủ)
                                    </button>
                                    <button 
                                        className={`drawer-opt-btn ${currentView === 'forum' ? 'active' : ''}`}
                                        onClick={() => { setCurrentView('forum'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}
                                    >
                                        Diễn Đàn Thảo Luận
                                    </button>
                                    {currentUser && (
                                        <button 
                                            className={`drawer-opt-btn ${currentView === 'library' ? 'active' : ''}`}
                                            onClick={() => { setCurrentView('library'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}
                                        >
                                            Tủ Sách Cá Nhân
                                        </button>
                                    )}
                                    <button className={`drawer-opt-btn ${currentView === 'elections' ? 'active' : ''}`} onClick={() => { setCurrentView('elections'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}>Bầu chọn kiểm duyệt viên</button>
                                    <button
                                        className={`drawer-opt-btn ${currentView === 'about' ? 'active' : ''}`}
                                        onClick={() => { setCurrentView('about'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}
                                    >
                                        Về MugenBunko
                                    </button>
                                </div>
                            </div>

                            {currentUser && (
                                <div className="drawer-section">
                                    <h4>Bàn làm việc</h4>
                                    <div className="drawer-options">
                                        <button 
                                            className={`drawer-opt-btn ${currentView === 'studio' ? 'active' : ''}`}
                                            onClick={() => { setCurrentView('studio'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}
                                        >
                                            Studio Sáng Tác
                                        </button>
                                        {(currentUser.roles.includes('moderator') || currentUser.roles.includes('admin')) && (
                                            <button 
                                                className={`drawer-opt-btn ${currentView === 'mod-dashboard' ? 'active' : ''}`}
                                                onClick={() => { setCurrentView('mod-dashboard'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}
                                            >
                                                Bảng Kiểm Duyệt
                                            </button>
                                        )}
                                        {currentUser.roles.includes('admin') && (
                                            <>
                                                <button 
                                                    className={`drawer-opt-btn ${currentView === 'admin-dashboard' ? 'active' : ''}`}
                                                    onClick={() => { setCurrentView('admin-dashboard'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}
                                                >
                                                    Trang Quản Trị
                                                </button>
                                                <button 
                                                    className={`drawer-opt-btn ${currentView === 'manage-rules' ? 'active' : ''}`}
                                                    onClick={() => { setCurrentView('manage-rules'); setActiveNovelId(null); setCategoryDrawerOpen(false); }}
                                                >
                                                    Sửa đổi quy định
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="drawer-section">
                                <h4>Thể loại</h4>
                                <div className="drawer-options">
                                    <button 
                                        className={`drawer-opt-btn ${exploreGenre === 'Tất cả' && currentView === 'explore' ? 'active' : ''}`}
                                        onClick={() => { setExploreGenre('Tất cả'); setCategoryDrawerOpen(false); setCurrentView('explore'); }}
                                    >
                                        Tất cả thể loại
                                    </button>
                                    {genres.map(g => (
                                        <button 
                                            key={g} 
                                            className={`drawer-opt-btn ${exploreGenre === g && currentView === 'explore' ? 'active' : ''}`}
                                            onClick={() => { setExploreGenre(g); setCategoryDrawerOpen(false); setCurrentView('explore'); }}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            <div id="toast-notification" className={`toast ${toastShow ? 'show' : 'hidden'}`}>
                <span className="toast-message">{toastMsg}</span>
            </div>

            {/* Navbar Header (Conditionally hidden inside reader mode) */}
            {currentView !== 'reader' && (
                <Header
                    currentUser={currentUser}
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    setActiveNovelId={setActiveNovelId}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    notifDropdownOpen={notifDropdownOpen}
                    setNotifDropdownOpen={setNotifDropdownOpen}
                    markAllNotificationsRead={markAllNotificationsRead}
                    burgerOpen={burgerOpen}
                    setBurgerOpen={setBurgerOpen}
                    logoutUser={logoutUser}
                    updateUserInDatabase={updateUserInDatabase}
                    DB_KEYS={DB_KEYS}
                    setCurrentUser={setCurrentUser}
                    setCategoryDrawerOpen={setCategoryDrawerOpen}
                    theme={theme}
                    handleThemeChange={handleThemeChange}
                />
            )}

            {/* Breadcrumbs bar (Conditionally hidden inside reader mode) */}
            {currentView !== 'reader' && (
                <div className="top-meta-bar">
                    <div className="flex-row-between top-meta-bar-inner">
                        <div className="breadcrumbs">
                            {renderBreadcrumbs()}
                        </div>
                        <div className="role-status">
                            Vai trò: <span className="role-badge" style={{
                                background: currentUser && (currentUser.roles.includes('admin') || currentUser.roles.includes('moderator')) 
                                    ? 'var(--text-main)' 
                                    : 'var(--bg-base)',
                                color: currentUser && (currentUser.roles.includes('admin') || currentUser.roles.includes('moderator'))
                                    ? 'var(--bg-card)'
                                    : 'var(--text-main)',
                                border: '1px solid var(--border-color)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                            }}>
                                {currentUser ? (currentUser.roles.includes('admin') ? 'Admin' : (currentUser.roles.includes('moderator') ? 'Mod' : (currentUser.roles.includes('author') ? 'Author' : 'Reader'))) : "Khách"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <main className={`app-content-container ${currentView === 'reader' ? '' : ['admin-dashboard', 'mod-dashboard'].includes(currentView) ? 'staff-content' : 'container'}`}>
                <ErrorBoundary key={currentView}>
                <Suspense fallback={<PageLoading reader={currentView === 'reader'} />}>
                {novelsError && novels.length > 0 && <div className="inline-notice" role="alert">{novelsError} <button className="text-action" onClick={() => void fetchNovels(true)}>Thử lại</button></div>}
                {(['home', 'explore', 'library', 'detail', 'reader', 'studio'].includes(currentView) && novelsLoading && !novels.length) || (currentView === 'reader' && novels.length > 0 && !readingSync.initialized)
                    ? <PageLoading reader={currentView === 'reader'} />
                    : ['home', 'explore', 'library', 'detail', 'reader', 'studio'].includes(currentView) && novelsError && !novels.length
                        ? <PageError message={novelsError} onRetry={() => void fetchNovels(true)} /> : <>
                {currentView === 'collection' && activeCollectionShareId && <PublicCollection key={activeCollectionShareId} shareId={activeCollectionShareId} API_BASE={API_BASE} openNovelDetail={openNovelDetail} />}
                {/* ================= PAGES RENDERING ================= */}
                {currentView === 'home' && (
                    <Home
                        progressRevision={readingSync.revision}
                        novels={novels}
                        currentUser={currentUser}
                        activeNovelId={activeNovelId}
                        setActiveNovelId={setActiveNovelId}
                        currentView={currentView}
                        setCurrentView={setCurrentView}
                        filterGenre={filterGenre}
                        setFilterGenre={(g) => { const norm = g || 'Tất cả'; setFilterGenre(norm); setExploreGenre(norm); }}
                        filterType={filterType}
                        setFilterType={(t) => { setFilterType(t); setExploreType(t); }}
                        selectedTags={selectedTags}
                        setSelectedTags={setSelectedTags}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterSort={filterSort}
                        setFilterSort={(s) => { setFilterSort(s); setExploreSort(s === 'newest' ? 'new' : s); }}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        activeBannerId={activeBannerId}
                        setActiveBannerId={setActiveBannerId}
                        genres={genres}
                        setLoginModalOpen={setLoginModalOpen}
                        startReading={startReading}
                        toggleBookmark={toggleBookmark}
                        computeAverageStars={computeAverageStars}
                        announcements={announcements}
                        forumPosts={forumPosts}
                        setActiveForumPostId={setActiveForumPostId}
                        openNovelDetail={openNovelDetail}
                        filterDrawerOpen={filterDrawerOpen}
                        setFilterDrawerOpen={setFilterDrawerOpen}
                        handleGenreClick={handleGenreClick}
                        handleTagClick={handleTagClick}
                        latestComments={latestComments}
                        latestReviews={latestReviews}
                        events={events}
                        setActiveEventId={setActiveEventId}
                        wibuRanking={wibuRanking}
                    />
                )}

                {currentView === 'library' && (
                    <Library
                        API_BASE={API_BASE}
                        fetchWithAuth={fetchWithAuth}
                        progressRevision={readingSync.revision}
                        syncStatus={readingSync.status}
                        onSync={() => void readingSync.refresh()}
                        currentUser={currentUser}
                        novels={novels}
                        setCurrentView={setCurrentView}
                        setActiveNovelId={setActiveNovelId}
                        toggleBookmark={toggleBookmark}
                        openNovelDetail={openNovelDetail}
                        startReading={startReading}
                    />
                )}

                {currentView === 'detail' && (
                    <NovelDetail
                        API_BASE={API_BASE}
                        novels={novels}
                        activeNovelId={activeNovelId}
                        currentUser={currentUser}
                        users={users}
                        setLoginModalOpen={setLoginModalOpen}
                        setCurrentView={setCurrentView}
                        setActiveNovelId={setActiveNovelId}
                        startReading={startReading}
                        toggleBookmark={toggleBookmark}
                        toggleFollowAuthor={toggleFollowAuthor}
                        reviewText={reviewText}
                        setReviewText={setReviewText}
                        selectedRatingStars={selectedRatingStars}
                        setSelectedRatingStars={setSelectedRatingStars}
                        submitReview={submitReview}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        submitComment={submitComment}
                        comments={comments}
                        setComments={setComments}
                        replyToCommentId={replyToCommentId}
                        setReplyToCommentId={setReplyToCommentId}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        replyToUserId={replyToUserId}
                        setReplyToUserId={setReplyToUserId}
                        submitCommentReply={submitCommentReply}
                        reportComment={reportComment}
                        computeAverageStars={computeAverageStars}
                        reviews={reviews}
                        detailSummaryExpanded={detailSummaryExpanded}
                        setDetailSummaryExpanded={setDetailSummaryExpanded}
                        announcements={announcements}
                        handleDeleteNovel={handleDeleteNovel}
                        viewPublicProfile={viewPublicProfile}
                    />
                )}

                {currentView === 'reader' && (
                    <ChapterReader
                        currentUser={currentUser}
                        syncStatus={readingSync.status}
                        savePosition={readingSync.savePosition}
                        syncNovel={readingSync.syncNovel}
                        markCompleted={readingSync.markCompleted}
                        onReward={() => { if (currentUser) void refreshSession(currentUser.id); }}
                        novels={novels}
                        activeNovelId={activeNovelId}
                        activeChapterIndex={activeChapterIndex !== null ? activeChapterIndex : 0}
                        setActiveChapterIndex={setActiveChapterIndex as any}
                        setCurrentView={setCurrentView}
                        startReading={startReading}
                        navigateToChapter={navigateToChapter}
                        theme={theme}
                        setTheme={setTheme}
                        handleThemeChange={handleThemeChange}
                        readerFont={readerFont}
                        setReaderFont={setReaderFont}
                        readerFontSize={readerFontSize}
                        setReaderFontSize={setReaderFontSize}
                        DB_KEYS={DB_KEYS}
                        openNovelDetail={openNovelDetail}
                        incrementReadCount={incrementReadCount}
                        API_BASE={API_BASE}
                        fetchWithAuth={fetchWithAuth}
                    />
                )}

                {currentView === 'studio' && (
                    <AuthorStudio
                        currentUser={currentUser}
                        novels={novels}
                        activeStudioNovelId={activeStudioNovelId}
                        setActiveStudioNovelId={setActiveStudioNovelId}
                        activeStudioChapterId={activeStudioChapterId}
                        setActiveStudioChapterId={setActiveStudioChapterId}
                        setCurrentView={setCurrentView}
                        setNewNovelModalOpen={setNewNovelModalOpen}
                        handleDeleteNovel={id => handleDeleteNovel(id, "Tác giả tự xóa truyện")}
                        openEditNovelModal={openEditNovelModal}
                        API_BASE={API_BASE}
                        fetchWithAuth={fetchWithAuth}
                        onRefresh={() => fetchNovels(true)}
                        onChapterUpdated={chapter => {
                            setNovels(prev => prev.map(n => n.id === chapter.novel_id ? {
                                ...n, chapters: (n.chapters || []).map(c => c.id === chapter.id ? { ...c, ...chapter } : c)
                            } : n));
                            clearCache(CACHE_KEYS.novels);
                        }}
                        contentAreaRef={contentAreaRef}
                        insertStaticIllustration={insertStaticIllustration}
                        onAnnouncementPosted={() => { void fetchAnnouncements(true); }}
                        showToast={showToast}
                    />
                )}

                {currentView === 'mod-dashboard' && (
                    <ModDashboard
                        API_BASE={API_BASE}
                        fetchWithAuth={fetchWithAuth}
                        pendingChapters={pendingChapters}
                        reports={reports as any}
                        users={users}
                        modApproveRejectChapter={modApproveRejectChapter}
                        modRejectChapter={modRejectChapter}
                        handleCommentReportAction={handleCommentReportAction}
                        toggleUserSuspension={toggleUserSuspension}
                        novels={novels}
                        currentUser={currentUser}
                        loading={dashboardLoading || novelsLoading}
                        error={[dashboardError, novelsError].filter(Boolean).join(' ')}
                        onRefresh={() => { void Promise.all([fetchDashboardData(), fetchNovels(true)]); }}
                        loadChapter={async id => {
                            const response = await fetchWithAuth(`${API_BASE}/chapters/${id}`);
                            if (!response.ok) throw new Error('Không thể tải nội dung chương.');
                            return response.json();
                        }}
                    />
                )}

                {currentView === 'admin-dashboard' && (
                    <AdminDashboard
                        API_BASE={API_BASE}
                        fetchWithAuth={fetchWithAuth}
                        novels={novels}
                        users={users}
                        events={events}
                        genres={genres}
                        newGenreName={newGenreName}
                        setNewGenreName={setNewGenreName}
                        tagMergeFrom={tagMergeFrom}
                        setTagMergeFrom={setTagMergeFrom}
                        tagMergeTo={tagMergeTo}
                        setTagMergeTo={setTagMergeTo}
                        adminEventTitle={adminEventTitle}
                        setAdminEventTitle={setAdminEventTitle}
                        adminEventDesc={adminEventDesc}
                        setAdminEventDesc={setAdminEventDesc}
                        adminEventContent={adminEventContent}
                        setAdminEventContent={setAdminEventContent}
                        updateFeaturedBannerSubmit={updateFeaturedBannerSubmit}
                        createSystemEventSubmit={createSystemEventSubmit}
                        clearActiveEvent={clearActiveEvent}
                        toggleAdminUserRole={toggleAdminUserRole}
                        deleteGenre={deleteGenre}
                        handleAddGenre={handleAddGenre}
                        modMergeTagsSubmit={modMergeTagsSubmit}
                        setCurrentView={setCurrentView}
                        activeBannerId={activeBannerId}
                        reports={reports as any}
                        modApproveRejectChapter={modApproveRejectChapter}
                        handleCommentReportAction={handleCommentReportAction}
                        handleRejectAuthorRequest={handleRejectAuthorRequest}
                        currentUser={currentUser}
                        openNovelDetail={openNovelDetail}
                        computeAverageStars={computeAverageStars}
                        publishSystemEvent={publishSystemEvent}
                        deleteSystemEvent={deleteSystemEvent}
                        setActiveEventId={setActiveEventId}
                        loading={dashboardLoading || novelsLoading || eventsLoading}
                        error={[dashboardError, novelsError, eventsError].filter(Boolean).join(' ')}
                        onRefresh={() => { void Promise.all([fetchDashboardData(), fetchNovels(true), fetchEvents(true)]); }}
                    />
                )}

                {currentView === 'manage-rules' && currentUser && currentUser.roles.includes('admin') && (
                    <ManageRules
                        API_BASE={API_BASE}
                        fetchWithAuth={fetchWithAuth}
                        showToast={showToast}
                        setCurrentView={setCurrentView}
                        triggerConfirm={triggerConfirm}
                    />
                )}

                {currentView === 'rules' && (
                    <ViewRules
                        API_BASE={API_BASE}
                        setCurrentView={setCurrentView}
                    />
                )}

                {currentView === 'about' && (
                    <About
                        setCurrentView={setCurrentView}
                        openNovelDetail={openNovelDetail}
                    />
                )}

                {currentView === 'elections' && <Elections currentUser={currentUser} API_BASE={API_BASE} fetchWithAuth={fetchWithAuth} onLogin={() => setLoginModalOpen(true)} />}

                {currentView === 'event-detail' && (
                    eventsLoading ? <PageLoading /> : eventsError ? <PageError message={eventsError} onRetry={() => void fetchEvents(true)} /> : <EventDetail
                        events={events}
                        activeEventId={activeEventId}
                        setCurrentView={setCurrentView}
                        currentUser={currentUser}
                    />
                )}

                {currentView === 'forum' && (
                    <Forum
                        currentUser={currentUser}
                        API_BASE={API_BASE}
                        setCurrentView={setCurrentView}
                        showToast={showToast}
                        fetchWithAuth={fetchWithAuth}
                        initialPostId={activeForumPostId}
                        setInitialPostId={setActiveForumPostId}
                        refreshSession={refreshSession}
                        triggerConfirm={triggerConfirm}
                        viewPublicProfile={viewPublicProfile}
                    />
                )}

                {currentView === 'explore' && (
                    <Explore
                        novels={novels}
                        currentUser={currentUser}
                        exploreType={exploreType}
                        setExploreType={setExploreType}
                        exploreGenre={exploreGenre}
                        setExploreGenre={setExploreGenre}
                        exploreSort={exploreSort}
                        setExploreSort={setExploreSort}
                        setCurrentView={setCurrentView}
                        toggleBookmark={toggleBookmark}
                        openNovelDetail={openNovelDetail}
                        computeAverageStars={computeAverageStars}
                        genres={genres}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        startReading={startReading}
                    />
                )}
                
                {currentView === 'profile' && (
                    <UserProfile
                        currentUser={currentUser}
                        viewingUsername={profileViewingUsername}
                        setViewingUsername={setProfileViewingUsername}
                        novels={novels}
                        forumPosts={forumPosts}
                        socialFriends={socialFriends}
                        receivedRequests={receivedRequests}
                        sentRequests={sentRequests}
                        fetchSocialData={fetchSocialData}
                        handleSendRequest={handleSendRequest}
                        handleAcceptRequest={handleAcceptRequest}
                        handleDeclineRequest={handleDeclineRequest}
                        openNovelDetail={openNovelDetail}
                        setActiveForumPostId={setActiveForumPostId}
                        profileActiveTab={profileActiveTab}
                        setProfileActiveTab={setProfileActiveTab}
                        profileDisplayname={profileDisplayname}
                        setProfileDisplayname={setProfileDisplayname}
                        profileAvatarSeed={profileAvatarSeed}
                        setProfileAvatarSeed={setProfileAvatarSeed}
                        profileBio={profileBio}
                        setProfileBio={setProfileBio}
                        profileRoles={profileRoles}
                        setProfileRoles={setProfileRoles as any}
                        regenerateProfileAvatar={regenerateProfileAvatar}
                        saveBasicProfile={saveBasicProfile}
                        handleRoleCheckboxChange={handleRoleCheckboxChange}
                        saveUserRoles={saveUserRoles}
                        setCurrentView={setCurrentView}
                        handleRequestAuthorRole={handleRequestAuthorRole}
                        handleAvatarUpload={handleAvatarUpload}
                        theme={theme}
                        handleThemeChange={handleThemeChange}
                        fetchWithAuth={fetchWithAuth}
                        API_BASE={API_BASE}
                        triggerConfirm={triggerConfirm}
                    />
                )}
                </>}
                </Suspense>
                </ErrorBoundary>
            </main>

            {/* Footer Widget */}
            {currentView !== 'reader' && (
                <Footer
                    currentUser={currentUser}
                    setCurrentView={setCurrentView}
                    setActiveNovelId={setActiveNovelId}
                />
            )}

            {/* ================= MODALS & OVERLAYS ================= */}
            {confirmModalOpen && (
                <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') setConfirmModalOpen(false); }}>
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icons.AlertCircle size={18} /> Xác nhận hành động
                            </h3>
                            <button className="close-btn" onClick={() => setConfirmModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ paddingTop: '16px' }}>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '20px', lineHeight: 1.5 }}>
                                {confirmModalMessage}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button 
                                    className="outline-btn" 
                                    onClick={() => setConfirmModalOpen(false)}
                                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                                >
                                    Hủy bỏ
                                </button>
                                <button 
                                    className="primary-btn" 
                                    onClick={() => {
                                        if (confirmModalOnConfirm) confirmModalOnConfirm();
                                        setConfirmModalOpen(false);
                                    }}
                                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                                >
                                    Đồng ý
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {imageModalOpen && (
                <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') setImageModalOpen(false); }}>
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 600 }}>
                                <Icons.Image size={18} /> Chèn ảnh minh họa
                            </h3>
                            <button className="close-btn" onClick={() => setImageModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px' }}>
                            {imageUploading ? (
                                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                                    <div className="loading-spinner" style={{ margin: '0 auto 12px auto', border: '3px solid var(--border-color)', borderTop: '3px solid var(--text-main)', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite' }}></div>
                                    <style>{`
                                        @keyframes spin {
                                            0% { transform: rotate(0deg); }
                                            100% { transform: rotate(360deg); }
                                        }
                                    `}</style>
                                    <p style={{ fontSize: '0.85rem' }}>Đang tải hình ảnh lên máy chủ...</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Option 1: File Upload */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                            Cách 1: Tải ảnh lên từ thiết bị
                                        </label>
                                        <label 
                                            className="outline-btn" 
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                gap: '8px', 
                                                cursor: 'pointer', 
                                                padding: '12px', 
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                textAlign: 'center',
                                                background: 'var(--bg-base)',
                                                color: 'var(--text-main)',
                                                border: '1px dashed var(--border-color)',
                                                boxShadow: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Icons.Image size={16} /> Chọn hình ảnh từ máy tính
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleImageModalUpload} 
                                                style={{ display: 'none' }} 
                                            />
                                        </label>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', gap: '10px' }}>
                                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                                        <span>HOẶC</span>
                                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                                    </div>

                                    {/* Option 2: Image URL */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                            Cách 2: Sử dụng đường dẫn (URL) ảnh
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Nhập link ảnh (ví dụ: https://example.com/image.png)" 
                                            value={imageUrlInput}
                                            onChange={(e) => setImageUrlInput(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '10px', 
                                                borderRadius: '6px', 
                                                border: '1px solid var(--border-color)', 
                                                background: 'var(--bg-base)',
                                                color: 'var(--text-main)',
                                                fontSize: '0.85rem',
                                                boxSizing: 'border-box'
                                            }} 
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                        <button 
                                            className="outline-btn" 
                                            onClick={() => setImageModalOpen(false)}
                                            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                                        >
                                            Hủy bỏ
                                        </button>
                                        <button 
                                            className="primary-btn" 
                                            onClick={() => confirmInsertImage(imageUrlInput.trim())}
                                            disabled={!imageUrlInput.trim()}
                                            style={{ 
                                                padding: '8px 16px', 
                                                fontSize: '0.82rem',
                                                opacity: imageUrlInput.trim() ? 1 : 0.6,
                                                cursor: imageUrlInput.trim() ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            Chèn ảnh
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {newNovelModalOpen && (
                <NewNovelModal
                    newNovelModalOpen={newNovelModalOpen}
                    setNewNovelModalOpen={setNewNovelModalOpen}
                    newNovelTitle={newNovelTitle}
                    setNewNovelTitle={setNewNovelTitle}
                    newNovelGenres={newNovelGenres}
                    setNewNovelGenres={setNewNovelGenres}
                    newNovelStatus={newNovelStatus}
                    setNewNovelStatus={setNewNovelStatus as any}
                    newNovelCover={newNovelCover}
                    setNewNovelCover={setNewNovelCover}
                    newNovelSummary={newNovelSummary}
                    setNewNovelSummary={setNewNovelSummary}
                    newNovelType={newNovelType}
                    setNewNovelType={setNewNovelType as any}
                    genres={genres}
                    createNewNovelSubmit={createNewNovelSubmit}
                    handleCoverUpload={handleCoverUpload as any}
                />
            )}

            {editNovelModalOpen && (
                <EditNovelModal
                    editNovelModalOpen={editNovelModalOpen}
                    setEditNovelModalOpen={setEditNovelModalOpen}
                    editNovelTitle={editNovelTitle}
                    setEditNovelTitle={setEditNovelTitle}
                    editNovelGenres={editNovelGenres}
                    setEditNovelGenres={setEditNovelGenres}
                    editNovelStatus={editNovelStatus}
                    setEditNovelStatus={setEditNovelStatus as any}
                    editNovelCover={editNovelCover}
                    setEditNovelCover={setEditNovelCover}
                    editNovelSummary={editNovelSummary}
                    setEditNovelSummary={setEditNovelSummary}
                    editNovelType={editNovelType}
                    setEditNovelType={setEditNovelType as any}
                    genres={genres}
                    submitEditNovel={submitEditNovel}
                    handleEditCoverUpload={handleEditCoverUpload as any}
                />
            )}

            {showPublicProfileModal && (
                <div className="modal-overlay active" onClick={() => setShowPublicProfileModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '420px', padding: '24px', borderRadius: '12px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h3 style={{margin: 0, fontSize: '1.2rem', fontWeight: 650}}>Hồ Sơ Thành Viên</h3>
                            <button className="chat-header-btn" style={{color: 'var(--text-muted)'}} onClick={() => setShowPublicProfileModal(false)}>✕</button>
                        </div>
                        {loadingPublicProfile && <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}>Đang tải hồ sơ...</div>}
                        {!loadingPublicProfile && publicProfileData && (
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center'}}>
                                <div style={{width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border-color)', background: 'var(--bg-base)'}}>
                                    <img 
                                        src={publicProfileData.avatarSeed && (publicProfileData.avatarSeed.startsWith('http') || publicProfileData.avatarSeed.startsWith('/uploads') || publicProfileData.avatarSeed.startsWith('data:')) 
                                            ? publicProfileData.avatarSeed 
                                            : `https://api.dicebear.com/7.x/adventurer/svg?seed=${publicProfileData.avatarSeed || 'Default'}`} 
                                        alt="Avatar" 
                                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                    />
                                </div>
                                <div>
                                    <h4 style={{fontSize: '1.15rem', margin: '0 0 4px 0', fontWeight: 700, color: 'var(--text-main)'}}>{publicProfileData.displayname}</h4>
                                    <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>@{publicProfileData.username}</span>
                                </div>
                                
                                {/* Badge Roles */}
                                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center'}}>
                                    {publicProfileData.roles && publicProfileData.roles.map(role => {
                                        let label = 'Độc giả';
                                        if (role === 'admin') label = 'Quản trị viên';
                                        else if (role === 'moderator') label = 'Kiểm duyệt';
                                        else if (role === 'author') label = 'Tác giả';
                                        
                                        return (
                                            <span key={role} style={{
                                                fontSize: '0.72rem',
                                                padding: '3px 10px',
                                                borderRadius: '12px',
                                                color: 'var(--text-main)',
                                                background: 'var(--bg-base)',
                                                border: '1px solid var(--border-color)',
                                                fontWeight: 600
                                            }}>
                                                {label}
                                            </span>
                                        );
                                    })}
                                </div>

                                <div style={{width: '100%', height: '1px', background: 'var(--border-color)', margin: '8px 0'}}></div>

                                <div style={{width: '100%', textAlign: 'left'}}>
                                    <div style={{fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px'}}>Giới thiệu thành viên:</div>
                                    <p style={{fontSize: '0.85rem', color: 'var(--text-content)', margin: 0, background: 'var(--bg-base)', padding: '10px', borderRadius: '6px', minHeight: '60px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap'}}>
                                        {publicProfileData.bio || 'Thành viên này chưa cập nhật phần giới thiệu...'}
                                    </p>
                                </div>

                                <div style={{width: '100%', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)'}}>
                                    Ngày gia nhập: {formatDate(publicProfileData.dateJoined || publicProfileData.date_joined)}
                                </div>

                                {/* Social interaction buttons */}
                                {currentUser && currentUser.username !== publicProfileData.username && (() => {
                                    const isFriend = socialFriends.some(f => f.id === publicProfileData.id);
                                    const isReceivedPending = receivedRequests.some(r => r.id === publicProfileData.id);
                                    const isSentPending = sentRequests.some(s => s.id === publicProfileData.id);

                                    return (
                                        <div style={{display: 'flex', gap: '10px', width: '100%', marginTop: '10px'}}>
                                            <button 
                                                className="outline-btn small" 
                                                style={{flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}} 
                                                onClick={() => {
                                                    setShowPublicProfileModal(false);
                                                    setProfileViewingUsername(publicProfileData.username);
                                                    setCurrentView('profile');
                                                }}
                                            >
                                                <Icons.User size={14} />
                                                <span>Xem hồ sơ</span>
                                            </button>
                                            
                                            {isFriend ? (
                                                <button 
                                                    className="outline-btn small" 
                                                    style={{flex: 1, borderColor: 'rgba(255, 59, 48, 0.25)', color: '#ff3b30', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}} 
                                                    onClick={() => handleDeclineRequest(publicProfileData.id)}
                                                >
                                                    <Icons.Trash size={14} />
                                                    <span>Hủy kết bạn</span>
                                                </button>
                                            ) : isReceivedPending ? (
                                                <button 
                                                    className="primary-btn small" 
                                                    style={{flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}} 
                                                    onClick={() => handleAcceptRequest(publicProfileData.id)}
                                                >
                                                    <Icons.CheckCircle size={14} />
                                                    <span>Đồng ý</span>
                                                </button>
                                            ) : isSentPending ? (
                                                <button 
                                                    className="outline-btn small" 
                                                    style={{flex: 1, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}} 
                                                    onClick={() => handleDeclineRequest(publicProfileData.id)}
                                                >
                                                    <Icons.Clock size={14} />
                                                    <span>Hủy lời mời</span>
                                                </button>
                                            ) : (
                                                <button 
                                                    className="primary-btn small" 
                                                    style={{flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}} 
                                                    onClick={() => handleSendRequest(publicProfileData.id)}
                                                >
                                                    <Icons.Plus size={14} />
                                                    <span>Kết bạn</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {currentUser && currentView !== 'forum' && (
                <ChatWidget 
                    currentUser={currentUser} 
                    fetchWithAuth={fetchWithAuth} 
                    API_BASE={API_BASE} 
                />
            )}

            {/* Floating Back to Top Button (Monochrome Arrow) */}
            {showBackToTop && (
                <button
                    className="back-to-top-btn"
                    onClick={scrollToTop}
                    title="Cuộn lên đầu trang"
                    aria-label="Cuộn lên đầu trang"
                    style={{
                        bottom: (currentUser && currentView !== 'forum') ? '86px' : '24px'
                    }}
                >
                    <Icons.ArrowUp size={18} />
                </button>
            )}
        </>
    );
}
