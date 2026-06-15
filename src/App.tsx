import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import NewNovelModal from './components/NewNovelModal';
import EditNovelModal from './components/EditNovelModal';
import ScheduleModal from './components/ScheduleModal';
import ChatWidget from './components/ChatWidget';

import Home from './pages/Home';
import Library from './pages/Library';
import NovelDetail from './pages/NovelDetail';
import ChapterReader from './pages/ChapterReader';
import AuthorStudio from './pages/AuthorStudio';
import ModDashboard from './pages/ModDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserProfile from './pages/UserProfile';
import Forum from './pages/Forum';
import Explore from './pages/Explore';
import EventDetail from './pages/EventDetail';
import ManageRules from './pages/ManageRules';
import ViewRules from './pages/ViewRules';

import { User, Novel, Comment, Review, SystemEvent, Report, ForumPost, Message, UserRole } from './types';
import { compressImage } from './utils/imageCompressor';
import { formatDate } from './utils/dateFormatter';

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
    (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'http://localhost:5000/api'
        : `${window.location.origin}/api`);


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
    sessionStorage.removeItem(key);
};

interface InitialRoute {
    view: string;
    novelId: number | null;
    chapterIndex: number | null;
    triggerLogin: boolean;
    profileViewingUsername: string | null;
}

// Helper to parse hash on initial load to prevent state races
const getInitialRoute = (): InitialRoute => {
    if (typeof window === 'undefined') return { view: 'home', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    const hash = window.location.hash;
    
    // Private routes protection (requires check user from localStorage)
    const privateRoutes = ['#/library', '#/studio', '#/mod-dashboard', '#/admin-dashboard', '#/profile'];
    const isPrivate = privateRoutes.includes(hash);
    
    let sessionUser: User | null = null;
    try {
        const raw = localStorage.getItem('mugen_session');
        if (raw) {
            sessionUser = JSON.parse(raw);
        }
    } catch (e) {}

    if (isPrivate && !sessionUser) {
        return { view: 'home', novelId: null, chapterIndex: null, triggerLogin: true, profileViewingUsername: null };
    }

    if (sessionUser) {
        const rolesData = sessionUser.roles || [];
        if (hash === '#/mod-dashboard' && !rolesData.includes('moderator') && !rolesData.includes('admin')) {
            return { view: 'home', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
        }
        if (hash === '#/admin-dashboard' && !rolesData.includes('admin')) {
            return { view: 'home', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
        }
    }

    if (hash === '#/library') return { view: 'library', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/forum') return { view: 'forum', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/explore') return { view: 'explore', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/studio') return { view: 'studio', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/mod-dashboard') return { view: 'mod-dashboard', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/admin-dashboard') return { view: 'admin-dashboard', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };
    if (hash === '#/profile') return { view: 'profile', novelId: null, chapterIndex: null, triggerLogin: false, profileViewingUsername: null };

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
            const res = await window.fetch(url, { ...options, headers });
            if (res.status === 403) {
                try {
                    const clone = res.clone();
                    const data = await clone.json();
                    if (data && data.error) {
                        alert(data.error);
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
    const [novels, setNovels] = useState<Novel[]>([]);
    const [exploreType, setExploreType] = useState<string>('all');
    const [exploreGenre, setExploreGenre] = useState<string>('Tất cả');
    const [exploreSort, setExploreSort] = useState<string>('reads');
    const [comments, setComments] = useState<Record<number, Comment[]>>({});
    const [reviews, setReviews] = useState<Record<number, Review[]>>({});
    const [reports, setReports] = useState<Report[]>([]);
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
    const [latestComments, setLatestComments] = useState<any[]>([]);
    const [latestReviews, setLatestReviews] = useState<any[]>([]);
    const [activeForumPostId, setActiveForumPostId] = useState<number | null>(null);
    const [activeBannerId, setActiveBannerId] = useState<number | null>(null);
    const [activeEventId, setActiveEventId] = useState<number | null>(null);
    const [adminEventContent, setAdminEventContent] = useState<string>("");

    // ----------------------------------------------------
    // User Session & System state
    // ----------------------------------------------------
    const [currentUser, setCurrentUser] = useState<User | null>(cachedSession);
    const [currentView, setCurrentView] = useState<string>(initialRoute.view);
    const [activeNovelId, setActiveNovelId] = useState<number | null>(initialRoute.novelId);
    const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(initialRoute.chapterIndex);
    
    // Author studio selections
    const [activeStudioNovelId, setActiveStudioNovelId] = useState<number | null>(null);
    const [activeStudioChapterIndex, setActiveStudioChapterIndex] = useState<number | null>(null);
    const [autosaveText, setAutosaveText] = useState<string>("Chưa lưu thay đổi");
    const [autosaveColor, setAutosaveColor] = useState<string>("red");

    // UI overlays & Widgets states
    const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
    const [registerModalOpen, setRegisterModalOpen] = useState<boolean>(false);
    const [newNovelModalOpen, setNewNovelModalOpen] = useState<boolean>(false);
    const [editNovelModalOpen, setEditNovelModalOpen] = useState<boolean>(false);
    const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);
    
    // Toast state
    const [toastShow, setToastShow] = useState<boolean>(false);
    const [toastMsg, setToastMsg] = useState<string>("");

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
    const volNameRef = useRef<HTMLInputElement>(null);
    const chapterTitleRef = useRef<HTMLInputElement>(null);
    const contentAreaRef = useRef<HTMLDivElement>(null);

    // Form inputs (Controlled/Uncontrolled states)
    const [regUsername, setRegUsername] = useState<string>("");
    const [regDisplayname, setRegDisplayname] = useState<string>("");
    const [regPassword, setRegPassword] = useState<string>("");
    const [regRole, setRegRole] = useState<UserRole>("reader");

    const [loginUsername, setLoginUsername] = useState<string>("");
    const [loginPassword, setLoginPassword] = useState<string>("");

    const [profileDisplayname, setProfileDisplayname] = useState<string>(cachedSession?.displayname || "");
    const [profileAvatarSeed, setProfileAvatarSeed] = useState<string>(cachedSession?.avatar_seed || "");
    const [profileBio, setProfileBio] = useState<string>(cachedSession?.bio || "");
    const [profileRoles, setProfileRoles] = useState<UserRole[]>(cachedSession?.roles || ['reader']);

    const [newGenreName, setNewGenreName] = useState<string>("");
    const [tagMergeFrom, setTagMergeFrom] = useState<string>("");
    const [tagMergeTo, setTagMergeTo] = useState<string>("");

    const [adminEventTitle, setAdminEventTitle] = useState<string>("");
    const [adminEventDesc, setAdminEventDesc] = useState<string>("");
    const [scheduleDatetime, setScheduleDatetime] = useState<string>("");

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
            setLoginModalOpen(true);
            window.location.hash = '#/';
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
        } else if (currentView === 'explore' || currentView === 'library' || currentView === 'studio' || currentView === 'detail' || currentView === 'admin-dashboard' || currentView === 'mod-dashboard') {
            fetchNovels();
        } else if (currentView === 'forum') {
            fetchForumPosts();
        } else if (currentView === 'profile') {
            fetchNovels();
            fetchForumPosts();
        }
    }, [currentView]);

    // ----------------------------------------------------
    // BIDIRECTIONAL HASH ROUTER
    // ----------------------------------------------------
    // Parse URL Hash to update React States with authentication & RBAC guards
    const parseHashAndSetStates = () => {
        const hash = window.location.hash;
        
        // Clear public profile view when navigating elsewhere
        setProfileViewingUsername(null);
        
        // Private routes protection
        const privateRoutes = ['#/library', '#/studio', '#/mod-dashboard', '#/admin-dashboard', '#/profile'];
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
            setCurrentView('home');
            setActiveNovelId(null);
            setActiveChapterIndex(null);
            setLoginModalOpen(true);
            window.location.hash = '#/';
            return;
        }

        if (sessionUser) {
            const rolesData = sessionUser.roles || [];
            if (hash === '#/mod-dashboard' && !rolesData.includes('moderator') && !rolesData.includes('admin')) {
                setCurrentView('home');
                window.location.hash = '#/';
                return;
            }
            if (hash === '#/admin-dashboard' && !rolesData.includes('admin')) {
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

        if (hash === '#/forum') {
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

        if (hash === '#/profile') {
            setCurrentView('profile');
            setProfileViewingUsername(null);
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

        if (currentView === 'library') {
            expectedHash = '#/library';
        } else if (currentView === 'studio') {
            expectedHash = '#/studio';
        } else if (currentView === 'mod-dashboard') {
            expectedHash = '#/mod-dashboard';
        } else if (currentView === 'admin-dashboard') {
            expectedHash = '#/admin-dashboard';
        } else if (currentView === 'profile') {
            if (profileViewingUsername && (!currentUser || profileViewingUsername !== currentUser.username)) {
                expectedHash = `#/profile/${encodeURIComponent(profileViewingUsername)}`;
            } else {
                expectedHash = '#/profile';
            }
        } else if (currentView === 'forum') {
            expectedHash = '#/forum';
        } else if (currentView === 'explore') {
            expectedHash = '#/explore';
        } else if (currentView === 'detail' && activeNovelId !== null) {
            expectedHash = `#/novel/${activeNovelId}`;
        } else if (currentView === 'reader' && activeNovelId !== null && activeChapterIndex !== null) {
            expectedHash = `#/novel/${activeNovelId}/reader/${activeChapterIndex}`;
        }

        if (window.location.hash !== expectedHash) {
            window.location.hash = expectedHash;
        }
    }, [currentView, activeNovelId, activeChapterIndex, profileViewingUsername, currentUser]);

    // ----------------------------------------------------
    // FETCH HELPER METHOD INTEGRATIONS WITH REST API
    // ----------------------------------------------------
    const fetchNovels = async (forceRefresh = false): Promise<Novel[]> => {
        if (!forceRefresh) {
            const cached = getCachedData(CACHE_KEYS.novels, 120000);
            if (cached) {
                setNovels(cached);
                return cached;
            }
        }
        try {
            const res = await fetchWithAuth(`${API_BASE}/novels`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setNovels(list);
            setCachedData(CACHE_KEYS.novels, list);
            return list;
        } catch (err) {
            console.error("Error fetching novels:", err);
            setNovels([]);
            return [];
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
            const cached = getCachedData(CACHE_KEYS.events, 120000);
            if (cached) {
                setEvents(cached);
                return;
            }
        }
        try {
            const res = await fetchWithAuth(`${API_BASE}/events`);
            const data = await res.json();
            const mapped: SystemEvent[] = (Array.isArray(data) ? data : []).map((ev: any) => ({
                id: ev.id,
                title: ev.title,
                description: ev.description || null,
                content: ev.content || null,
                status: 'active',
                created_at: ev.created_at || new Date().toISOString()
            }));
            setEvents(mapped);
            setCachedData(CACHE_KEYS.events, mapped);
        } catch (err) {
            console.error("Error fetching events:", err);
            setEvents([]);
        }
    };

    const fetchForumPosts = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cached = getCachedData(CACHE_KEYS.forumPosts, 45000);
            if (cached) {
                setForumPosts(cached);
                return;
            }
        }
        try {
            const res = await fetchWithAuth(`${API_BASE}/forum/posts`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setForumPosts(list);
            setCachedData(CACHE_KEYS.forumPosts, list);
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
        try {
            const res = await fetchWithAuth(`${API_BASE}/mod/dashboard`);
            const data = await res.json();
            setPendingChapters(data.pendingChapters || []);
            setReports(data.reportedComments || []);
            setUsers(data.usersList || []);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
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
    const handleLoginSubmit = async () => {
        if (!loginUsername || !loginPassword) {
            alert("Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername, password: loginPassword })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Sai tên đăng nhập hoặc mật khẩu!");
                return;
            }

            setCurrentUser(data.user);
            localStorage.setItem(DB_KEYS.session, JSON.stringify(data.user));
            localStorage.setItem('mugen_token', data.token);
            
            setProfileDisplayname(data.user.displayname || "");
            setProfileAvatarSeed(data.user.avatar_seed || "");
            setProfileBio(data.user.bio || "");
            setProfileRoles(data.user.roles || ['reader']);

            setLoginUsername("");
            setLoginPassword("");
            setLoginModalOpen(false);
            setCurrentView('home');
            showToast(`Đăng nhập thành công! Chào mừng trở lại, ${data.user.displayname}.`);
        } catch (err) {
            alert("Lỗi kết nối máy chủ API!");
        }
    };

    const handleRegisterSubmit = async () => {
        const nameClean = regUsername.trim().toLowerCase();
        if (!nameClean || !regDisplayname.trim() || !regPassword) {
            alert("Vui lòng nhập đầy đủ thông tin đăng ký!");
            return;
        }
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passwordRegex.test(regPassword)) {
            alert("Mật khẩu không hợp lệ! Yêu cầu tối thiểu 8 ký tự, bao gồm nhất 1 chữ cái viết hoa, 1 chữ số và 1 ký tự đặc biệt!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: nameClean, displayname: regDisplayname, password: regPassword, role: regRole })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Đăng ký không thành công!");
                return;
            }

            setCurrentUser(data.user);
            localStorage.setItem(DB_KEYS.session, JSON.stringify(data.user));
            localStorage.setItem('mugen_token', data.token);

            setRegUsername("");
            setRegDisplayname("");
            setRegPassword("");
            setRegRole("reader");
            setRegisterModalOpen(false);
            setCurrentView('home');
            showToast("Đăng ký thành công! Chào mừng bạn đến với MugenBunko.");
            fetchNovels(true);
        } catch (err) {
            alert("Lỗi kết nối máy chủ API!");
        }
    };

    const logoutUser = () => {
        setCurrentUser(null);
        localStorage.removeItem(DB_KEYS.session);
        localStorage.removeItem('mugen_token');
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

        setActiveNovelId(novelId);
        setActiveChapterIndex(chapterIndex);

        if (currentUser) {
            const progressKey = `mugen_readprogress_${currentUser.username}_${novelId}`;
            let progress = { chapterIndex: 0, readChaptersList: [] as number[] };
            try {
                const rawProgress = localStorage.getItem(progressKey);
                if (rawProgress) progress = JSON.parse(rawProgress);
            } catch (e) {}
            
            progress.chapterIndex = chapterIndex;
            if (!progress.readChaptersList.includes(chapterIndex)) {
                progress.readChaptersList.push(chapterIndex);
                
                // Give EXP on backend
                await fetchWithAuth(`${API_BASE}/auth/add-xp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id, xp: 50 })
                });
                refreshSession(currentUser.id);
            }
            localStorage.setItem(progressKey, JSON.stringify(progress));
        }

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
        if (!report) return;
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
                fetchDashboardData();
            }
        } catch (err) {
            console.error("Report action error:", err);
        }
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
                setActiveStudioChapterIndex(null);
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

    const createNewChapter = async (volumeName?: string | React.MouseEvent) => {
        if (activeStudioNovelId === null) return;
        const novel = novels.find(n => n.id === activeStudioNovelId);
        if (!novel) return;

        const count = novel.chapters ? novel.chapters.length : 0;
        const title = `Chương ${count + 1}: Tiêu đề chương mới`;
        const content = `Nhập nội dung chương mới tại đây...`;
        const vol = (volumeName && typeof volumeName === 'string') ? volumeName : "Tập 01";

        try {
            const res = await fetchWithAuth(`${API_BASE}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    novelId: activeStudioNovelId,
                    volumeName: vol,
                    title,
                    content,
                    status: 'draft'
                })
            });
            const data = await res.json();
            if (res.ok) {
                const refreshedNovels = await fetchNovels(true);
                const updatedNovel = refreshedNovels.find(n => n.id === activeStudioNovelId);
                const updatedChapters = updatedNovel ? (updatedNovel.chapters || []) : [];
                const idx = updatedChapters.findIndex(c => c.id === data.chapterId);
                setActiveStudioChapterIndex(idx > -1 ? idx : updatedChapters.length - 1);
                showToast("Đã tạo chương mới thành công! ");
            }
        } catch (err) {
            console.error("Create chapter error:", err);
        }
    };

    const saveDraft = async () => {
        if (activeStudioNovelId === null || activeStudioChapterIndex === null) return;
        const vol = volNameRef.current?.value.trim() || "";
        const title = chapterTitleRef.current?.value.trim() || "";
        const content = contentAreaRef.current?.innerHTML || "";

        if (!title) {
            alert("Vui lòng điền tiêu đề chương!");
            return;
        }

        const novel = novels.find(n => n.id === activeStudioNovelId);
        if (!novel || !novel.chapters) return;
        const ch = novel.chapters[activeStudioChapterIndex];

        try {
            const res = await fetchWithAuth(`${API_BASE}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: ch.id,
                    novelId: activeStudioNovelId,
                    volumeName: vol,
                    title,
                    content,
                    status: 'draft'
                })
            });
            if (res.ok) {
                fetchNovels(true);
                setAutosaveText("Đã lưu bản nháp");
                setAutosaveColor("green");
                showToast("Đã lưu bản nháp chương truyện thành công!");
            }
        } catch (err) {
            console.error("Save draft error:", err);
        }
    };

    const autoSaveDraftSilently = async () => {
        if (activeStudioNovelId === null || activeStudioChapterIndex === null) return;
        const vol = volNameRef.current?.value.trim() || "";
        const title = chapterTitleRef.current?.value.trim() || "";
        const content = contentAreaRef.current?.innerHTML || "";

        if (!title) return;

        const novel = novels.find(n => n.id === activeStudioNovelId);
        if (!novel || !novel.chapters) return;
        const ch = novel.chapters[activeStudioChapterIndex];
        if (ch.status === 'published' || ch.status === 'pending') return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: ch.id,
                    novelId: activeStudioNovelId,
                    volumeName: vol,
                    title,
                    content,
                    status: 'draft'
                })
            });
            if (res.ok) {
                // Update local draft in memory instead of fetching all novels
                setNovels(prev => prev.map(n => {
                    if (n.id === activeStudioNovelId) {
                        return {
                            ...n,
                            chapters: (n.chapters || []).map((chapter, i) => {
                                if (i === activeStudioChapterIndex) {
                                    return { ...chapter, volume_name: vol, title, content };
                                }
                                return chapter;
                            })
                        };
                    }
                    return n;
                }));
                clearCache(CACHE_KEYS.novels);
                const timeStr = new Date().toLocaleTimeString('vi-VN');
                setAutosaveText(`Tự động lưu nháp lúc ${timeStr}`);
                setAutosaveColor("green");
            }
        } catch (err) {
            console.error("Auto-save draft error:", err);
        }
    };

    useEffect(() => {
        let timer: any = null;
        if (currentView === 'studio' && activeStudioNovelId !== null && activeStudioChapterIndex !== null) {
            timer = setInterval(() => {
                autoSaveDraftSilently();
            }, 30000); // 30s
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [currentView, activeStudioNovelId, activeStudioChapterIndex]);

    const publishChapter = async () => {
        if (activeStudioNovelId === null || activeStudioChapterIndex === null) return;
        const vol = volNameRef.current?.value.trim() || "";
        const title = chapterTitleRef.current?.value.trim() || "";
        const content = contentAreaRef.current?.innerHTML || "";

        if (!title || !content) {
            alert("Vui lòng viết đủ tiêu đề và nội dung trước khi xuất bản!");
            return;
        }

        const novel = novels.find(n => n.id === activeStudioNovelId);
        if (!novel || !novel.chapters) return;
        const ch = novel.chapters[activeStudioChapterIndex];

        const isAdmin = currentUser && currentUser.roles.includes('admin');
        const targetStatus = isAdmin ? 'published' : 'pending';

        try {
            const res = await fetchWithAuth(`${API_BASE}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: ch.id,
                    novelId: activeStudioNovelId,
                    volumeName: vol,
                    title,
                    content,
                    status: targetStatus
                })
            });
            if (res.ok) {
                await fetchNovels(true);
                showToast(isAdmin ? "Chương truyện đã được xuất bản trực tiếp! 🚀" : "Chương truyện đã được gửi vào hàng chờ duyệt! ");
            }
        } catch (err) {
            console.error("Publish chapter error:", err);
        }
    };

    const submitScheduleChapter = async () => {
        if (activeStudioNovelId === null || activeStudioChapterIndex === null) return;
        const vol = volNameRef.current?.value.trim() || "";
        const title = chapterTitleRef.current?.value.trim() || "";
        const content = contentAreaRef.current?.innerHTML || "";

        if (!title || !content || !scheduleDatetime) {
            alert("Vui lòng điền tiêu đề, nội dung và chọn thời gian hẹn giờ!");
            return;
        }

        const novel = novels.find(n => n.id === activeStudioNovelId);
        if (!novel || !novel.chapters) return;
        const ch = novel.chapters[activeStudioChapterIndex];
        const isAdmin = currentUser && currentUser.roles.includes('admin');

        try {
            const res = await fetchWithAuth(`${API_BASE}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: ch.id,
                    novelId: activeStudioNovelId,
                    volumeName: vol,
                    title,
                    content,
                    status: 'scheduled',
                    scheduledRelease: scheduleDatetime
                })
            });
            if (res.ok) {
                fetchNovels(true);
                setScheduleModalOpen(false);
                setScheduleDatetime("");
                showToast(isAdmin ? "Đã hẹn giờ xuất bản chương truyện thành công! ⏰" : "Chương truyện hẹn giờ đã được gửi vào hàng chờ duyệt! ⏰");
            }
        } catch (err) {
            console.error("Schedule chapter error:", err);
        }
    };

    const deleteActiveChapter = async () => {
        if (activeStudioNovelId === null || activeStudioChapterIndex === null) return;
        const novel = novels.find(n => n.id === activeStudioNovelId);
        if (!novel || !novel.chapters) return;
        const ch = novel.chapters[activeStudioChapterIndex];
        if (!ch) return;

        if (!confirm("⚠️ Bạn có chắc chắn muốn XÓA VĨNH VIỄN chương này không? Thao tác không thể hoàn tác.")) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/chapters/${ch.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchNovels(true);
                setActiveStudioChapterIndex(null);
                showToast("Đã xóa chương truyện thành công.");
            }
        } catch (err) {
            console.error("Delete chapter error:", err);
        }
    };

    const deleteVolume = async (volumeName: string) => {
        if (activeStudioNovelId === null) return;
        const novel = novels.find(n => n.id === activeStudioNovelId);
        if (!novel) return;

        triggerConfirm(`⚠️ Cảnh báo: Hành động này sẽ xóa vĩnh viễn toàn bộ các chương thuộc tập '${volumeName}'. Bạn có chắc chắn muốn xóa tập này?`, async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/chapters/delete-volume`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        novelId: activeStudioNovelId,
                        volumeName
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(`Đã xóa tập '${volumeName}' cùng toàn bộ chương truyện! 🗑️`);
                    setActiveStudioChapterIndex(null);
                    await fetchNovels(true);
                } else {
                    alert(data.error || "Lỗi xóa tập truyện.");
                }
            } catch (err) {
                console.error("Delete volume error:", err);
                alert("Lỗi kết nối máy chủ API!");
            }
        });
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
                    setActiveStudioChapterIndex(null);
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


    const postAuthorAnnouncement = async () => {
        const txtArea = document.getElementById("studio-announcement-textarea") as HTMLTextAreaElement;
        const text = txtArea?.value.trim();
        if (!text || activeStudioNovelId === null) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ novelId: activeStudioNovelId, text })
            });
            if (res.ok) {
                if (txtArea) txtArea.value = "";
                fetchAnnouncements(true);
                showToast("Đã đăng tin cập nhật lên truyện!");
            }
        } catch (err) {
            console.error("Post announcement error:", err);
        }
    };

    // ----------------------------------------------------
    // MODERATOR ACTIONS
    // ----------------------------------------------------
    const modApproveRejectChapter = async (novelId: number, chapterIndex: number, action: 'approve' | 'reject') => {
        const novel = novels.find(n => n.id === novelId);
        if (!novel || !novel.chapters) return;
        const ch = novel.chapters[chapterIndex];
        if (!ch) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/mod/chapters/${ch.id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                fetchNovels(true);
                fetchDashboardData();
                showToast(action === 'approve' ? "Đã duyệt xuất bản chương truyện thành công!" : "Đã từ chối xuất bản (trả về nháp).");
            }
        } catch (err) {
            console.error("Chapter review action error:", err);
        }
    };

    const modRejectChapter = async (novelId: number, chapterIndex: number) => {
        if (!confirm("Bạn có chắc chắn muốn gỡ chương này không?")) return;
        const novel = novels.find(n => n.id === novelId);
        if (!novel || !novel.chapters) return;
        const ch = novel.chapters[chapterIndex];
        if (!ch) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/mod/chapters/${ch.id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
            });
            if (res.ok) {
                fetchNovels(true);
                fetchDashboardData();
                showToast("Đã gỡ chương truyện và chuyển về bản nháp.");
            }
        } catch (err) {
            console.error("Reject chapter error:", err);
        }
    };

    const toggleUserSuspension = async (username: string, nextStatus: 'active' | 'suspended') => {
        const user = users.find(u => u.username === username);
        if (!user) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/admin/users/${user.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            if (res.ok) {
                fetchDashboardData();
                if (nextStatus === 'suspended' && currentUser && currentUser.username === username) {
                    logoutUser();
                }
                showToast(nextStatus === 'suspended' ? `Đã khóa tài khoản @${username}.` : `Đã mở khóa hoạt động lại cho @${username}.`);
            }
        } catch (err) {
            console.error("Toggle suspension error:", err);
        }
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
                fetchEvents(true);
                showToast("Đã lưu sự kiện bản nháp! Bạn có thể xem trước hoặc phát sự kiện.");
            }
        } catch (err) {
            console.error("Create event error:", err);
        }
    };

    const publishSystemEvent = async (eventId: number) => {
        const ev = events.find(x => x.id === eventId);
        if (!ev) return;
        try {
            // Deactivate other events first
            for (const other of events) {
                if (other.status === 'active') {
                    await fetchWithAuth(`${API_BASE}/events/${other.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            title: other.title, 
                            description: other.description, 
                            content: other.content, 
                            status: 'draft' 
                        })
                    });
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
                fetchEvents(true);
                showToast("Sự kiện hệ thống đã được phát trực tiếp toàn trang! 🌸");
            }
        } catch (err) {
            console.error("Publish event error:", err);
        }
    };

    const deleteSystemEvent = async (eventId: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/events/${eventId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchEvents(true);
                showToast("Đã xóa sự kiện hoàn toàn.");
            }
        } catch (err) {
            console.error("Delete event error:", err);
        }
    };

    const clearActiveEvent = async () => {
        try {
            let cleared = false;
            for (const ev of events) {
                if (ev.status === 'active') {
                    await fetchWithAuth(`${API_BASE}/events/${ev.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            title: ev.title, 
                            description: ev.description, 
                            content: ev.content, 
                            status: 'draft' 
                        })
                    });
                    cleared = true;
                }
            }
            fetchEvents(true);
            if (cleared) {
                showToast("Đã gỡ bỏ sự kiện đang chạy toàn trang.");
            } else {
                showToast("Không có sự kiện nào đang chạy.");
            }
        } catch (err) {
            console.error("Clear events error:", err);
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
                fetchDashboardData();
                if (currentUser && currentUser.username === username) {
                    refreshSession(currentUser.id);
                }
                showToast(`Đã cập nhật vai trò cho @${username}.`);
            }
        } catch (err) {
            console.error("Update roles error:", err);
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
        setFilterGenre(genre);
        setExploreGenre(genre);
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
    const formatDoc = (cmd: string) => {
        document.execCommand(cmd, false, undefined);
        setAutosaveText("Thay đổi chưa được lưu");
        setAutosaveColor("red");
    };

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
        if (!url) return;

        if (contentAreaRef.current) {
            contentAreaRef.current.focus();
            const sel = window.getSelection();
            if (savedSelectionRangeRef.current && sel) {
                sel.removeAllRanges();
                sel.addRange(savedSelectionRangeRef.current);
            }
        }

        document.execCommand("insertHTML", false, `<div style="text-align: center; margin: 24px 0;"><img src="${url}" style="width: 85%; max-width: 750px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" alt="Minh họa" /></div><p><br></p>`);

        setAutosaveText("Thay đổi chưa được lưu");
        setAutosaveColor("red");
        setImageModalOpen(false);
    };

    // ----------------------------------------------------
    // SYSTEM GENRES CONST DATABASE
    // ----------------------------------------------------
    const [genres, setGenres] = useState<string[]>(() => {
        const saved = localStorage.getItem(DB_KEYS.genres);
        return saved ? JSON.parse(saved) : ["Isekai", "Fantasy", "Romance", "Sci-Fi", "Slice of Life"];
    });

    const deleteGenre = (name: string) => {
        setGenres(prev => {
            const next = prev.filter(g => g !== name);
            localStorage.setItem(DB_KEYS.genres, JSON.stringify(next));
            return next;
        });
        showToast(`Đã xóa thể loại '${name}'.`);
    };

    const handleAddGenre = () => {
        const name = newGenreName.trim();
        if (!name) return;
        if (genres.includes(name)) {
            alert("Thể loại này đã tồn tại!");
            return;
        }
        setGenres(prev => {
            const next = [...prev, name];
            localStorage.setItem(DB_KEYS.genres, JSON.stringify(next));
            return next;
        });
        setNewGenreName("");
        showToast(`Đã thêm thể loại '${name}' thành công!`);
    };

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
                    setRegisterModalOpen={setRegisterModalOpen}
                    setLoginModalOpen={setLoginModalOpen}
                    setCategoryDrawerOpen={setCategoryDrawerOpen}
                    theme={theme}
                    handleThemeChange={handleThemeChange}
                />
            )}

            {/* Breadcrumbs bar (Conditionally hidden inside reader mode) */}
            {currentView !== 'reader' && (
                <div className="top-meta-bar">
                    <div className="flex-row-between" style={{ padding: '0 40px' }}>
                        <div className="breadcrumbs">
                            {renderBreadcrumbs()}
                        </div>
                        <div className="role-status">
                            Vai trò: <span className="role-badge" style={{background: currentUser && currentUser.roles.includes('admin') ? '#cc0000' : (currentUser && currentUser.roles.includes('moderator') ? '#1b365d' : 'var(--sakura-pink)')}}>
                                {currentUser ? (currentUser.roles.includes('admin') ? 'Admin' : (currentUser.roles.includes('moderator') ? 'Mod' : (currentUser.roles.includes('author') ? 'Author' : 'Reader'))) : "Khách"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <main className={`app-content-container ${currentView === 'reader' ? '' : 'container'}`}>
                
                {/* ================= PAGES RENDERING ================= */}
                {currentView === 'home' && (
                    <Home
                        novels={novels}
                        currentUser={currentUser}
                        activeNovelId={activeNovelId}
                        setActiveNovelId={setActiveNovelId}
                        currentView={currentView}
                        setCurrentView={setCurrentView}
                        filterGenre={filterGenre}
                        setFilterGenre={setFilterGenre}
                        filterType={filterType}
                        setFilterType={setFilterType}
                        selectedTags={selectedTags}
                        setSelectedTags={setSelectedTags}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterSort={filterSort}
                        setFilterSort={setFilterSort}
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
                    />
                )}

                {currentView === 'library' && (
                    <Library
                        currentUser={currentUser}
                        novels={novels}
                        setCurrentView={setCurrentView}
                        setActiveNovelId={setActiveNovelId}
                        toggleBookmark={toggleBookmark}
                        openNovelDetail={openNovelDetail}
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
                        currentUser={currentUser!}
                        novels={novels}
                        activeStudioNovelId={activeStudioNovelId}
                        setActiveStudioNovelId={setActiveStudioNovelId}
                        activeStudioChapterIndex={activeStudioChapterIndex}
                        setActiveStudioChapterIndex={setActiveStudioChapterIndex}
                        setCurrentView={setCurrentView}
                        setActiveNovelId={setActiveNovelId}
                        setNewNovelModalOpen={setNewNovelModalOpen}
                        setScheduleModalOpen={setScheduleModalOpen}
                        createNewChapter={createNewChapter}
                        saveDraft={saveDraft}
                        publishChapter={publishChapter}
                        deleteActiveChapter={deleteActiveChapter}
                        deleteVolume={deleteVolume}
                        postAuthorAnnouncement={postAuthorAnnouncement}
                        autosaveText={autosaveText}
                        autosaveColor={autosaveColor}
                        setAutosaveText={setAutosaveText}
                        setAutosaveColor={setAutosaveColor}
                        volNameRef={volNameRef}
                        chapterTitleRef={chapterTitleRef}
                        contentAreaRef={contentAreaRef}
                        formatDoc={formatDoc}
                        insertStaticIllustration={insertStaticIllustration}
                        announcements={announcements}
                        handleDeleteNovel={(id) => handleDeleteNovel(id, "Tác giả tự xóa truyện")}
                        openEditNovelModal={openEditNovelModal}
                        triggerConfirm={triggerConfirm}
                        API_BASE={API_BASE}
                        fetchWithAuth={fetchWithAuth}
                    />
                )}

                {currentView === 'mod-dashboard' && (
                    <ModDashboard
                        pendingChapters={pendingChapters}
                        reports={reports as any}
                        users={users}
                        modApproveRejectChapter={modApproveRejectChapter}
                        modRejectChapter={modRejectChapter}
                        handleCommentReportAction={handleCommentReportAction}
                        toggleUserSuspension={toggleUserSuspension}
                        toggleAdminUserRole={toggleAdminUserRole}
                        novels={novels}
                        setCurrentView={setCurrentView}
                        tagMergeFrom={tagMergeFrom}
                        setTagMergeFrom={setTagMergeFrom}
                        tagMergeTo={tagMergeTo}
                        setTagMergeTo={setTagMergeTo}
                        modMergeTagsSubmit={modMergeTagsSubmit}
                        currentUser={currentUser}
                    />
                )}

                {currentView === 'admin-dashboard' && (
                    <AdminDashboard
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

                {currentView === 'event-detail' && (
                    <EventDetail
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
            </main>

            {/* Footer Widget */}
            {currentView !== 'reader' && (
                <Footer
                    currentUser={currentUser}
                    setCurrentView={setCurrentView}
                    setActiveNovelId={setActiveNovelId}
                    setLoginModalOpen={setLoginModalOpen}
                />
            )}

            {/* ================= MODALS & OVERLAYS ================= */}
            {confirmModalOpen && (
                <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') setConfirmModalOpen(false); }}>
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ❓ Xác nhận hành động
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
                                🖼️ Chèn ảnh minh họa
                            </h3>
                            <button className="close-btn" onClick={() => setImageModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px' }}>
                            {imageUploading ? (
                                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                                    <div className="loading-spinner" style={{ margin: '0 auto 12px auto', border: '3px solid var(--border-color)', borderTop: '3px solid var(--sakura-pink)', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite' }}></div>
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
                                            className="primary-btn" 
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
                                                background: 'rgba(224, 82, 117, 0.08)',
                                                color: 'var(--sakura-pink)',
                                                border: '1px dashed var(--sakura-pink)',
                                                boxShadow: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(224, 82, 117, 0.12)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(224, 82, 117, 0.08)';
                                            }}
                                        >
                                            📁 Chọn hình ảnh từ máy tính
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
            {loginModalOpen && (
                <LoginModal
                    loginModalOpen={loginModalOpen}
                    setLoginModalOpen={setLoginModalOpen}
                    setRegisterModalOpen={setRegisterModalOpen}
                    loginUsername={loginUsername}
                    setLoginUsername={setLoginUsername}
                    loginPassword={loginPassword}
                    setLoginPassword={setLoginPassword}
                    handleLoginSubmit={handleLoginSubmit}
                />
            )}

            {registerModalOpen && (
                <RegisterModal
                    registerModalOpen={registerModalOpen}
                    setRegisterModalOpen={setRegisterModalOpen}
                    setLoginModalOpen={setLoginModalOpen}
                    regUsername={regUsername}
                    setRegUsername={setRegUsername}
                    regDisplayname={regDisplayname}
                    setRegDisplayname={setRegDisplayname}
                    regPassword={regPassword}
                    setRegPassword={setRegPassword}
                    regRole={regRole}
                    setRegRole={setRegRole as any}
                    handleRegisterSubmit={handleRegisterSubmit}
                />
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

            {scheduleModalOpen && (
                <ScheduleModal
                    scheduleModalOpen={scheduleModalOpen}
                    setScheduleModalOpen={setScheduleModalOpen}
                    scheduleDatetime={scheduleDatetime}
                    setScheduleDatetime={setScheduleDatetime}
                    submitScheduleChapter={submitScheduleChapter}
                />
            )}

            {showPublicProfileModal && (
                <div className="modal-overlay active" onClick={() => setShowPublicProfileModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '420px', padding: '24px', borderRadius: '12px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h3 style={{margin: 0, fontSize: '1.2rem', fontWeight: 650}}>Hồ Sơ Wibu</h3>
                            <button className="chat-header-btn" style={{color: 'var(--text-muted)'}} onClick={() => setShowPublicProfileModal(false)}>✕</button>
                        </div>
                        {loadingPublicProfile && <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}>Đang tải hồ sơ...</div>}
                        {!loadingPublicProfile && publicProfileData && (
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center'}}>
                                <div style={{width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--sakura-pink)', background: 'var(--bg-base)'}}>
                                    <img 
                                        src={publicProfileData.avatarSeed && (publicProfileData.avatarSeed.startsWith('http') || publicProfileData.avatarSeed.startsWith('/uploads') || publicProfileData.avatarSeed.startsWith('data:')) 
                                            ? publicProfileData.avatarSeed 
                                            : `https://api.dicebear.com/7.x/adventurer/svg?seed=${publicProfileData.avatarSeed || 'Default'}`} 
                                        alt="Avatar" 
                                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                    />
                                </div>
                                <div>
                                    <h4 style={{fontSize: '1.15rem', margin: '0 0 4px 0', fontWeight: 700}}>{publicProfileData.displayname}</h4>
                                    <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>@{publicProfileData.username}</span>
                                </div>
                                
                                {/* Badge Roles */}
                                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center'}}>
                                    {publicProfileData.roles && publicProfileData.roles.map(role => {
                                        let label = 'Độc giả';
                                        let color = 'var(--sakura-pink)';
                                        let bg = 'var(--sakura-pink-light)';
                                        if (role === 'admin') { label = 'Admin'; color = '#cc0000'; bg = 'rgba(204,0,0,0.1)'; }
                                        else if (role === 'moderator') { label = 'Kiểm duyệt'; color = 'var(--indigo-blue)'; bg = '#e0e7ff'; }
                                        else if (role === 'author') { label = 'Tác giả'; color = '#d97706'; bg = 'rgba(217,119,6,0.1)'; }
                                        
                                        return (
                                            <span key={role} style={{fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', color, background: bg, fontWeight: 600}}>
                                                {label}
                                            </span>
                                        );
                                    })}
                                </div>

                                <div style={{width: '100%', height: '1px', background: 'var(--border-color)', margin: '8px 0'}}></div>

                                <div style={{width: '100%', textAlign: 'left'}}>
                                    <div style={{fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px'}}>Giới thiệu wibu:</div>
                                    <p style={{fontSize: '0.85rem', color: 'var(--text-content)', margin: 0, background: 'var(--bg-base)', padding: '10px', borderRadius: '6px', minHeight: '60px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap'}}>
                                        {publicProfileData.bio || 'Wibu này lười quá, chưa viết lời tự giới thiệu nào...'}
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
                                                style={{flex: 1}} 
                                                onClick={() => {
                                                    setShowPublicProfileModal(false);
                                                    setProfileViewingUsername(publicProfileData.username);
                                                    setCurrentView('profile');
                                                }}
                                            >
                                                🔍 Xem trang cá nhân
                                            </button>
                                            
                                            {isFriend ? (
                                                <button 
                                                    className="outline-btn small" 
                                                    style={{flex: 1, borderColor: 'rgba(255, 59, 48, 0.25)', color: '#ff3b30'}} 
                                                    onClick={() => handleDeclineRequest(publicProfileData.id)}
                                                >
                                                    💔 Hủy kết bạn
                                                </button>
                                            ) : isReceivedPending ? (
                                                <button 
                                                    className="primary-btn small" 
                                                    style={{flex: 1}} 
                                                    onClick={() => handleAcceptRequest(publicProfileData.id)}
                                                >
                                                    🤝 Đồng ý
                                                </button>
                                            ) : isSentPending ? (
                                                <button 
                                                    className="outline-btn small" 
                                                    style={{flex: 1, color: 'var(--text-muted)'}} 
                                                    onClick={() => handleDeclineRequest(publicProfileData.id)}
                                                >
                                                    ⏱️ Hủy lời mời
                                                </button>
                                            ) : (
                                                <button 
                                                    className="primary-btn small" 
                                                    style={{flex: 1}} 
                                                    onClick={() => handleSendRequest(publicProfileData.id)}
                                                >
                                                    ➕ Kết bạn
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
        </>
    );
}
