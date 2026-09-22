import React from 'react';
import { Novel, User, ForumPost, SystemEvent } from '../types';
import { calculateUserLevel } from '../utils/levelHelper';

// ================= MONOCHROME PROFESSIONAL SVG ICONS =================
const Icons = {
    Tag: () => (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
    ),
    History: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    Sparkles: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path>
        </svg>
    ),
    Flame: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path>
        </svg>
    ),
    Book: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
    ),
    Star: ({ filled }: { filled?: boolean }) => (
        <svg viewBox="0 0 24 24" width="13" height="13" fill={filled !== false ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    ),
    Eye: () => (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    ),
    User: () => (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    ),
    Trophy: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path>
            <path d="M18 4H6v7a6 6 0 0 0 12 0V4z"></path>
        </svg>
    ),
    Crown: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
        </svg>
    ),
    Comment: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
    ),
    Bookmark: ({ filled }: { filled?: boolean }) => (
        <svg viewBox="0 0 24 24" width="12" height="12" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
    ),
    ArrowRight: () => (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    ),
    Close: () => (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    ),
    Clock: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    ChevronLeft: () => (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
    ),
    ChevronRight: () => (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
    ),
    TrendingUp: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
    ),
    Feather: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
            <line x1="16" y1="8" x2="2" y2="22"></line>
            <line x1="17.5" y1="15" x2="9" y2="15"></line>
        </svg>
    ),
    Quote: () => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
        </svg>
    ),
    Zap: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
    ),
    CheckCircle: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    ),
    Compass: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
    ),
    MessageSquare: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    ),
    Layers: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
    ),
    Activity: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
    ),
    PenTool: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            <path d="M2 2l7.586 7.586"></path>
            <circle cx="11" cy="11" r="2"></circle>
        </svg>
    ),
    Shield: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
    ),
    BarChart: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10"></line>
            <line x1="18" y1="20" x2="18" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="16"></line>
        </svg>
    ),
    Grid: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
    ),
    FolderPlus: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
        </svg>
    ),
    Heart: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    ),
    Sword: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 17.5L3 6V3h3l11.5 11.5"></path>
            <path d="M13 19l6-6"></path>
            <path d="M16 16l4 4"></path>
            <path d="M19 21l2-2"></path>
        </svg>
    ),
    RefreshCw: () => (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
    ),
    Coffee: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
        </svg>
    )
};

interface ReadingHistoryItem {
    novelId: number;
    novelTitle: string;
    novelCover: string;
    chapterIndex: number;
    chapterTitle: string;
}

interface HomeProps {
    novels: Novel[];
    currentUser: User | null;
    activeNovelId: number | null;
    setActiveNovelId: (id: number | null) => void;
    currentView: string;
    setCurrentView: (view: string) => void;
    filterGenre: string;
    setFilterGenre: (genre: string) => void;
    filterType: string;
    setFilterType: (type: string) => void;
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    filterSort: string;
    setFilterSort: (sort: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeBannerId: number | null;
    setActiveBannerId: (id: number | null) => void;
    genres: string[];
    setLoginModalOpen: (open: boolean) => void;
    startReading: (novelId: number, chapterIndex: number) => void;
    toggleBookmark: (id: number) => void;
    computeAverageStars: (id: number) => string;
    announcements: any[];
    openNovelDetail: (id: number) => void;
    filterDrawerOpen: boolean;
    setFilterDrawerOpen: (open: boolean) => void;
    handleGenreClick: (genre: string) => void;
    handleTagClick: (tag: string) => void;
    forumPosts: ForumPost[];
    setActiveForumPostId: (id: number | null) => void;
    latestComments: any[];
    latestReviews: any[];
    events: SystemEvent[];
    setActiveEventId: (id: number | null) => void;
    wibuRanking: any[];
}

export default function Home({
    novels,
    currentUser,
    setActiveNovelId,
    setCurrentView,
    filterGenre,
    setFilterGenre,
    filterType,
    setFilterType,
    selectedTags,
    setSelectedTags,
    filterStatus,
    setFilterStatus,
    filterSort,
    setFilterSort,
    searchQuery,
    setSearchQuery,
    activeBannerId,
    genres,
    setLoginModalOpen,
    startReading,
    toggleBookmark,
    computeAverageStars,
    announcements,
    openNovelDetail,
    filterDrawerOpen,
    setFilterDrawerOpen,
    handleGenreClick,
    handleTagClick,
    forumPosts,
    setActiveForumPostId,
    latestComments,
    latestReviews,
    events,
    setActiveEventId,
    wibuRanking
}: HomeProps) {
    const [readingHistory, setReadingHistory] = React.useState<ReadingHistoryItem[]>([]);
    
    const activeEvents = React.useMemo(() => {
        return events ? events.filter(ev => ev.status === 'active') : [];
    }, [events]);
    const [currentEventIdx, setCurrentEventIdx] = React.useState(0);

    React.useEffect(() => {
        setCurrentEventIdx(0);
    }, [activeEvents.length]);

    React.useEffect(() => {
        if (activeEvents.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentEventIdx(prev => (prev + 1) % activeEvents.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [activeEvents]);

    const heroNovels = React.useMemo(() => {
        const publishedNovels = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
        if (publishedNovels.length === 0) return [];

        let list: Novel[] = [];
        if (activeBannerId) {
            const pinned = publishedNovels.find(n => n.id === activeBannerId);
            if (pinned) list.push(pinned);
        }

        const topByReads = [...publishedNovels]
            .filter(n => !list.some(x => x.id === n.id))
            .sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0));

        list = [...list, ...topByReads].slice(0, 5);
        return list;
    }, [novels, activeBannerId]);

    const [heroIdx, setHeroIdx] = React.useState(0);
    const [isHeroHovered, setIsHeroHovered] = React.useState(false);

    React.useEffect(() => {
        if (heroNovels.length <= 1 || isHeroHovered) return;
        const timer = setInterval(() => {
            setHeroIdx(prev => (prev + 1) % heroNovels.length);
        }, 7000);
        return () => clearInterval(timer);
    }, [heroNovels.length, isHeroHovered]);

    React.useEffect(() => {
        const historyKey = currentUser ? `mugen_reading_history_${currentUser.username}` : 'mugen_reading_history_guest';
        try {
            const raw = localStorage.getItem(historyKey);
            const history = raw ? JSON.parse(raw) : [];
            setReadingHistory(history);
        } catch (err) {
            console.error("Load reading history error:", err);
        }
    }, [currentUser]);

    const deleteHistoryItem = (e: React.MouseEvent, novelId: number) => {
        e.stopPropagation();
        const historyKey = currentUser ? `mugen_reading_history_${currentUser.username}` : 'mugen_reading_history_guest';
        try {
            const updatedHistory = readingHistory.filter(item => item.novelId !== novelId);
            setReadingHistory(updatedHistory);
            localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        } catch (err) {
            console.error("Delete reading history error:", err);
        }
    };

    const oneshotNovels = React.useMemo(() => {
        const published = novels.filter(n => n.type === 'oneshot' && (n.chapters || []).some(ch => ch.status === 'published'));
        return [...published].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 5);
    }, [novels]);

    const recommendedNovels = React.useMemo(() => {
        const published = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
        if (published.length === 0) return [];

        const interestedGenres = new Set<string>();
        const interestedTags = new Set<string>();
        const interactedNovelIds = new Set<number>();

        if (currentUser && currentUser.bookmarks) {
            currentUser.bookmarks.forEach(id => {
                interactedNovelIds.add(id);
                const n = novels.find(x => x.id === id);
                if (n) {
                    if (n.genre) interestedGenres.add(n.genre);
                    n.tags?.forEach(t => interestedTags.add(t));
                }
            });
        }

        readingHistory.forEach(item => {
            interactedNovelIds.add(item.novelId);
            const n = novels.find(x => x.id === item.novelId);
            if (n) {
                if (n.genre) interestedGenres.add(n.genre);
                n.tags?.forEach(t => interestedTags.add(t));
            }
        });

        if (interestedGenres.size === 0 && interestedTags.size === 0) {
            return [...published]
                .sort((a, b) => {
                    const starsA = parseFloat(computeAverageStars(a.id)) || 0;
                    const starsB = parseFloat(computeAverageStars(b.id)) || 0;
                    if (starsB !== starsA) return starsB - starsA;
                    return (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0);
                })
                .slice(0, 5);
        }

        const scored = published
            .filter(n => !interactedNovelIds.has(n.id))
            .map(n => {
                let score = 0;
                if (n.genre && interestedGenres.has(n.genre)) {
                    score += 3;
                }
                n.tags?.forEach(t => {
                    if (interestedTags.has(t)) score += 1;
                });
                const stars = parseFloat(computeAverageStars(n.id)) || 0;
                score += stars * 0.5;

                return { novel: n, score };
            });

        const sorted = scored.sort((a, b) => b.score - a.score).map(x => x.novel);

        if (sorted.length < 5) {
            const remainder = published.filter(n => !interactedNovelIds.has(n.id) && !sorted.some(x => x.id === n.id));
            const filled = [...sorted, ...remainder.sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0))];
            return filled.slice(0, 5);
        }

        return sorted.slice(0, 5);
    }, [novels, currentUser, readingHistory, computeAverageStars]);

    // Tab state for Interactive Discovery Hub and Sidebar Rankings
    const [activeDiscoveryTab, setActiveDiscoveryTab] = React.useState<'trending' | 'newest' | 'top-rated' | 'oneshot' | 'completed'>('trending');
    const [activeRankingTab, setActiveRankingTab] = React.useState<'reads' | 'stars' | 'bookmarks'>('reads');

    const trendingNovels = React.useMemo(() => {
        const publishedNovels = novels.filter(novel => (novel.chapters || []).some(ch => ch.status === 'published'));
        return [...publishedNovels].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 8);
    }, [novels]);

    const newestNovels = React.useMemo(() => {
        const publishedNovels = novels.filter(novel => (novel.chapters || []).some(ch => ch.status === 'published'));
        return [...publishedNovels].sort((a, b) => b.id - a.id).slice(0, 8);
    }, [novels]);

    const topRatedNovels = React.useMemo(() => {
        const publishedNovels = novels.filter(novel => (novel.chapters || []).some(ch => ch.status === 'published'));
        return [...publishedNovels].sort((a, b) => {
            const starsA = parseFloat(computeAverageStars(a.id)) || 0;
            const starsB = parseFloat(computeAverageStars(b.id)) || 0;
            if (starsB !== starsA) return starsB - starsA;
            return (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0);
        }).slice(0, 8);
    }, [novels, computeAverageStars]);

    const completedNovels = React.useMemo(() => {
        const publishedNovels = novels.filter(novel => novel.status === 'completed' && (novel.chapters || []).some(ch => ch.status === 'published'));
        return [...publishedNovels].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 8);
    }, [novels]);

    // Live Chapter Feed: newly published chapters across novels
    const latestChapters = React.useMemo(() => {
        const items: Array<{
            novel: Novel;
            chapter: any;
            chapterIndex: number;
            timeAgo: string;
        }> = [];

        novels.forEach(novel => {
            const pubChs = (novel.chapters || []).map((ch, idx) => ({ ch, idx })).filter(x => x.ch.status === 'published');
            if (pubChs.length > 0) {
                const last = pubChs[pubChs.length - 1];
                items.push({
                    novel,
                    chapter: last.ch,
                    chapterIndex: last.idx,
                    timeAgo: last.ch.date || (last.ch.created_at ? last.ch.created_at.split('T')[0] : 'Gần đây')
                });
            }
        });

        items.sort((a, b) => (b.chapter.id || 0) - (a.chapter.id || 0));
        return items.slice(0, 6);
    }, [novels]);

    // Spotlight Novel for Literary Bento
    const spotlightNovel = React.useMemo(() => {
        const published = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published') && n.summary && n.summary.length > 40);
        if (published.length === 0) return novels[0] || null;
        return published.length > 1 ? published[1] : published[0];
    }, [novels]);

    // Active author spotlight
    const authorSpotlight = React.useMemo(() => {
        if (!wibuRanking || wibuRanking.length === 0) return null;
        const author = wibuRanking.find(u => (u.roles || []).includes('author')) || wibuRanking[0];
        return author;
    }, [wibuRanking]);

    // Hot forum topics
    const hotForumPosts = React.useMemo(() => {
        if (!forumPosts || forumPosts.length === 0) return [];
        return [...forumPosts]
            .sort((a, b) => ((b.comments_count || 0) + (b.likes_count || 0)) - ((a.comments_count || 0) + (a.likes_count || 0)))
            .slice(0, 3);
    }, [forumPosts]);

    // Dynamic Daily Refreshed Themed Collections
    const [themeRotationOffset, setThemeRotationOffset] = React.useState(0);

    const todayDateString = React.useMemo(() => {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    }, []);

    const dailyThemedCollections = React.useMemo(() => {
        const d = new Date();
        const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const baseSeed = (dayOfYear + themeRotationOffset) % 8;

        const allThemes = [
            {
                id: 'isekai-fantasy',
                title: 'Dị Giới Khởi Nguyên',
                badge: 'Isekai • Fantasy',
                desc: 'Hành trình chuyển sinh, khai phá thế giới ma pháp kỳ bí và xây dựng huyền thoại từ con số 0.',
                iconName: 'Sword' as const,
                filterGenre: 'Isekai',
                filterType: 'all',
                filterStatus: 'all',
                matcher: (n: Novel) => n.genre === 'Isekai' || n.genre === 'Fantasy' || (n.tags && n.tags.some(t => ['isekai', 'fantasy', 'dị giới', 'chuyển sinh'].includes(t.toLowerCase())))
            },
            {
                id: 'romance-sliceoflife',
                title: 'Thanh Xuân & Ngọt Ngào',
                badge: 'Romance • Đời Thường',
                desc: 'Những rung động tinh khôi dưới mái trường và mẩu chuyện thường nhật ấm áp xoa dịu tâm hồn.',
                iconName: 'Heart' as const,
                filterGenre: 'Romance',
                filterType: 'all',
                filterStatus: 'all',
                matcher: (n: Novel) => n.genre === 'Romance' || n.genre === 'Slice of Life' || (n.tags && n.tags.some(t => ['romance', 'slice of life', 'học đường', 'hài hước'].includes(t.toLowerCase())))
            },
            {
                id: 'completed-masterpieces',
                title: 'Đại Kết Cục Hoàn Hảo',
                badge: 'Đã Hoàn Thành',
                desc: 'Thưởng thức trọn vẹn từ mở đầu đến kết thúc hoàn mỹ, không lo drop hay mòn mỏi chờ chương.',
                iconName: 'Crown' as const,
                filterGenre: 'Tất cả',
                filterType: 'all',
                filterStatus: 'completed',
                matcher: (n: Novel) => n.status === 'completed'
            },
            {
                id: 'oneshot-spotlight',
                title: 'Siêu Phẩm Oneshot',
                badge: 'Truyện Ngắn',
                desc: 'Những áng văn tinh túy, giàu cảm xúc cô đọng trọn vẹn trong một chương duy nhất.',
                iconName: 'Zap' as const,
                filterGenre: 'Tất cả',
                filterType: 'oneshot',
                filterStatus: 'all',
                matcher: (n: Novel) => n.type === 'oneshot' || (n.chapters || []).filter(c => c.status === 'published').length === 1
            },
            {
                id: 'adventure-action',
                title: 'Hành Trình Vô Tận',
                badge: 'Phiêu Lưu • Hành Động',
                desc: 'Vượt qua hiểm nguy, thám hiểm di tích cổ đại và đối đầu những quái thú huyền thoại.',
                iconName: 'Compass' as const,
                filterGenre: 'Phiêu lưu',
                filterType: 'all',
                filterStatus: 'all',
                matcher: (n: Novel) => n.genre === 'Phiêu lưu' || n.genre === 'Sci-Fi' || (n.tags && n.tags.some(t => ['phiêu lưu', 'action', 'hành động', 'sci-fi', 'thám hiểm'].includes(t.toLowerCase())))
            },
            {
                id: 'mystery-investigation',
                title: 'Mê Cung Trí Tuệ',
                badge: 'Trinh Thám • Bí Ẩn',
                desc: 'Những vụ án hóc búa, suy luận sắc bén và những nút thắt cốt truyện không thể đoán trước.',
                iconName: 'Shield' as const,
                filterGenre: 'Trinh thám',
                filterType: 'all',
                filterStatus: 'all',
                matcher: (n: Novel) => n.genre === 'Trinh thám' || (n.tags && n.tags.some(t => ['trinh thám', 'mystery', 'bí ẩn', 'drama', 'suy luận'].includes(t.toLowerCase())))
            },
            {
                id: 'healing-gourmet',
                title: 'Trạm Dừng Chữa Lành',
                badge: 'Ẩm Thực • Thư Giãn',
                desc: 'Hương vị ẩm thực mê hoặc và những câu chuyện nhẹ nhàng giúp xua tan mọi âu lo mệt mỏi.',
                iconName: 'Coffee' as const,
                filterGenre: 'Cooking',
                filterType: 'all',
                filterStatus: 'all',
                matcher: (n: Novel) => n.genre === 'Cooking' || n.genre === 'Slice of Life' || (n.tags && n.tags.some(t => ['cooking', 'ẩm thực', 'đời thường', 'hài hước', 'chữa lành'].includes(t.toLowerCase())))
            },
            {
                id: 'hot-sensations',
                title: 'Tâm Điểm Thịnh Hành',
                badge: 'Xu Hướng Độc Giả',
                desc: 'Các bộ truyện được cộng đồng đón đọc và bàn luận sôi nổi nhất những ngày qua.',
                iconName: 'Flame' as const,
                filterGenre: 'Tất cả',
                filterType: 'all',
                filterStatus: 'all',
                matcher: (n: Novel) => (parseInt(String(n.reads)) || 0) > 0
            }
        ];

        // Rotate themes deterministically for today
        const orderedThemes = [];
        for (let i = 0; i < allThemes.length; i++) {
            orderedThemes.push(allThemes[(baseSeed + i) % allThemes.length]);
        }

        // Attach matching novels to each theme
        const themesWithNovels = orderedThemes.map(theme => {
            const matched = novels.filter(theme.matcher);
            // Rotate preview covers deterministically by today's date
            const rotatedNovels = [...matched].sort((a, b) => {
                const seedA = (a.id * 17 + dayOfYear) % 100;
                const seedB = (b.id * 17 + dayOfYear) % 100;
                return seedB - seedA;
            });
            return {
                ...theme,
                novels: rotatedNovels,
                count: matched.length
            };
        });

        const validThemes = themesWithNovels.filter(t => t.count > 0);
        if (validThemes.length >= 4) {
            return validThemes.slice(0, 4);
        }

        return themesWithNovels.slice(0, 4);
    }, [novels, themeRotationOffset]);

    const renderThemeIcon = (name: string) => {
        switch (name) {
            case 'Sword': return <Icons.Sword />;
            case 'Heart': return <Icons.Heart />;
            case 'Crown': return <Icons.Crown />;
            case 'Zap': return <Icons.Zap />;
            case 'Compass': return <Icons.Compass />;
            case 'Shield': return <Icons.Shield />;
            case 'Coffee': return <Icons.Coffee />;
            case 'Flame': return <Icons.Flame />;
            default: return <Icons.Book />;
        }
    };

    // Rising Gems (Tân binh triển vọng)
    const risingGems = React.useMemo(() => {
        const published = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
        return [...published]
            .filter(n => n.id !== spotlightNovel?.id)
            .sort((a, b) => {
                const starsA = parseFloat(computeAverageStars(a.id)) || 0;
                const starsB = parseFloat(computeAverageStars(b.id)) || 0;
                if (starsB !== starsA) return starsB - starsA;
                return (b.id || 0) - (a.id || 0);
            })
            .slice(0, 4);
    }, [novels, spotlightNovel, computeAverageStars]);

    // Genre & Tag Discovery Counts
    const genreDiscoveryCounts = React.useMemo(() => {
        const standardList = ['Isekai', 'Fantasy', 'Romance', 'Slice of Life', 'Sci-Fi', 'Hài hước', 'Học đường', 'Trinh thám', 'Phiêu lưu', 'Cooking', 'Mecha', 'Drama'];
        const allList = Array.from(new Set([...standardList, ...(genres || [])]));
        return allList.map(g => {
            const count = novels.filter(n => n.genre === g || (n.tags && n.tags.some(t => t.toLowerCase() === g.toLowerCase()))).length;
            return { name: g, count };
        }).filter(item => item.count > 0).slice(0, 12);
    }, [genres, novels]);

    // Multi-criteria sidebar rankings
    const sidebarRankings = React.useMemo(() => {
        const published = novels.filter(n => (n.chapters || []).some(ch => ch.status === 'published'));
        if (activeRankingTab === 'stars') {
            return [...published].sort((a, b) => {
                const sA = parseFloat(computeAverageStars(a.id)) || 0;
                const sB = parseFloat(computeAverageStars(b.id)) || 0;
                if (sB !== sA) return sB - sA;
                return (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0);
            }).slice(0, 5);
        }
        if (activeRankingTab === 'bookmarks') {
            return [...published].sort((a, b) => (b.bookmarksCount || b.bookmarks_count || 0) - (a.bookmarksCount || a.bookmarks_count || 0)).slice(0, 5);
        }
        // default: reads
        return [...published].sort((a, b) => (parseInt(String(b.reads)) || 0) - (parseInt(String(a.reads)) || 0)).slice(0, 5);
    }, [novels, activeRankingTab, computeAverageStars]);

    // Platform Pulse stats
    const platformStats = React.useMemo(() => {
        const totalNovels = novels.length;
        let totalChapters = 0;
        let totalReads = 0;
        novels.forEach(n => {
            totalChapters += (n.chapters || []).filter(c => c.status === 'published').length;
            totalReads += parseInt(String(n.reads)) || 0;
        });
        return { totalNovels, totalChapters, totalReads };
    }, [novels]);

    // Render helper for Novel Card 2.0
    const renderNovelCard = (novel: Novel) => {
        const isSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(novel.id);
        const stars = computeAverageStars(novel.id);

        return (
            <div key={novel.id} className="novel-card-v2" onClick={() => openNovelDetail(novel.id)}>
                <div className="novel-cover-wrapper-v2">
                    <img src={novel.cover} alt={novel.title} className="novel-cover-img-v2" loading="lazy" />
                    <div className="novel-badges-overlay">
                        <span className="novel-badge-status">
                            {novel.status === 'completed' ? 'Hoàn thành' : novel.status === 'paused' ? 'Tạm ngưng' : novel.status === 'suspended' ? 'Đã khóa' : 'Đang ra'}
                        </span>
                        <span className="novel-badge-format">
                            {novel.type === 'oneshot' ? 'Oneshot' : 'Series'}
                        </span>
                    </div>
                </div>

                <div className="novel-info-block-v2">
                    <h4 className="novel-card-title-v2" title={novel.title}>
                        {novel.title}
                    </h4>
                    
                    <div className="novel-card-author-v2">
                        <Icons.User />
                        <span>{novel.author || novel.author_name || "Ẩn danh"}</span>
                    </div>

                    <div className="novel-card-tags-v2">
                        {(novel.tags || []).slice(0, 3).map(t => (
                            <span
                                key={t}
                                className="novel-tag-pill-v2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleTagClick(t);
                                }}
                                title={`Lọc theo thẻ #${t}`}
                                style={{ cursor: 'pointer' }}
                            >
                                #{t}
                            </span>
                        ))}
                    </div>

                    <div className="novel-card-meta-v2">
                        <div className="novel-card-stats-group">
                            <span className="novel-card-rating-v2">
                                <Icons.Star /> {stars === 'N/A' ? 'N/A' : stars}
                            </span>
                            <span className="novel-card-reads-v2">
                                <Icons.Eye /> {Number(novel.reads).toLocaleString()}
                            </span>
                        </div>

                        {currentUser && (
                            <button
                                className={`novel-bookmark-btn-v2 ${isSaved ? 'saved' : ''}`}
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(novel.id); }}
                                title={isSaved ? 'Xóa khỏi tủ sách' : 'Lưu vào tủ sách'}
                            >
                                <Icons.Bookmark filled={Boolean(isSaved)} />
                                <span>{isSaved ? 'Đã Lưu' : 'Lưu Tủ'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-view active">
            
            {/* 1. FEATURED HERO BANNER 2.0 (CINEMATIC & AUTHENTIC REAL BOOK) */}
            {heroNovels.length > 0 && (() => {
                const currentHero = heroNovels[heroIdx] || heroNovels[0];
                const isHeroSaved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(currentHero.id);
                const heroStars = computeAverageStars(currentHero.id);
                const firstChapter = (currentHero.chapters || []).find(ch => ch.status === 'published');
                const firstChapterIdx = firstChapter ? (currentHero.chapters || []).indexOf(firstChapter) : 0;

                return (
                    <div 
                        className="featured-banner"
                        onMouseEnter={() => setIsHeroHovered(true)}
                        onMouseLeave={() => setIsHeroHovered(false)}
                    >
                        <div className="featured-bg-cover" style={{ backgroundImage: `url(${currentHero.cover})` }}></div>
                        <div className="featured-overlay-ambient"></div>
                        <div className="featured-kanji-watermark">無限文庫 • 今週の推薦</div>

                        <div className="featured-banner-content" key={currentHero.id}>
                            <div className="featured-info">
                                <div className="featured-badges-row">
                                    <span className="hero-editorial-badge">
                                        <Icons.Sparkles /> Đề Cử #{heroIdx + 1}
                                    </span>
                                    <span className="hero-pill-tag">
                                        {currentHero.type === 'oneshot' ? 'Oneshot' : 'Series'}
                                    </span>
                                    {currentHero.genre && (
                                        <span className="hero-pill-tag">{currentHero.genre}</span>
                                    )}
                                    <span className="hero-pill-tag" style={{ color: currentHero.status === 'completed' ? '#2ecc71' : 'var(--sakura-pink)' }}>
                                        {currentHero.status === 'completed' ? 'Hoàn' : 'Đang ra'}
                                    </span>
                                </div>

                                <h1 onClick={() => openNovelDetail(currentHero.id)} title={currentHero.title}>
                                    {currentHero.title}
                                </h1>

                                <p className="featured-desc">
                                    {currentHero.summary || "Một tác phẩm hấp dẫn đang được cộng đồng độc giả MugenBunko quan tâm theo dõi."}
                                </p>

                                <div className="featured-meta">
                                    <span className="featured-meta-item">
                                        <Icons.User /> {currentHero.author || currentHero.author_name || "Ẩn danh"}
                                    </span>
                                    <span className="meta-sep">•</span>
                                    <span className="featured-meta-item">
                                        <Icons.Star /> {heroStars === 'N/A' ? 'N/A' : `${heroStars} ★`}
                                    </span>
                                    <span className="meta-sep">•</span>
                                    <span className="featured-meta-item">
                                        <Icons.Eye /> {Number(currentHero.reads).toLocaleString()}
                                    </span>
                                </div>

                                <div className="featured-actions-row">
                                    <button 
                                        className="hero-primary-cta-btn" 
                                        onClick={() => {
                                            if (firstChapter) {
                                                startReading(currentHero.id, firstChapterIdx);
                                            } else {
                                                openNovelDetail(currentHero.id);
                                            }
                                        }}
                                    >
                                        <Icons.Book /> Đọc ngay
                                    </button>

                                    <button 
                                        className="hero-secondary-cta-btn" 
                                        onClick={() => openNovelDetail(currentHero.id)}
                                    >
                                        <Icons.ArrowRight /> Chi tiết tác phẩm
                                    </button>

                                    {currentUser && (
                                        <button 
                                            className={`hero-bookmark-cta-btn ${isHeroSaved ? 'saved' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(currentHero.id); }}
                                            title={isHeroSaved ? "Đã lưu vào tủ sách" : "Lưu vào tủ sách"}
                                        >
                                            <Icons.Bookmark filled={Boolean(isHeroSaved)} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Book Showcase (Realistic Physical Light Novel) */}
                            <div className="featured-cover-showcase" onClick={() => openNovelDetail(currentHero.id)}>
                                <div className="hero-book-ambient-glow"></div>
                                <div className="hero-book-wrapper">
                                    <div className="hero-book-cover">
                                        <div className="hero-book-spine"></div>
                                        <img src={currentHero.cover} alt={currentHero.title} />
                                        <span className="hero-book-rank-ribbon">
                                            <Icons.Flame /> #{heroIdx + 1} Hot
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Multi-slide carousel controls */}
                        {heroNovels.length > 1 && (
                            <div className="hero-carousel-controls">
                                <button 
                                    className="hero-arrow-btn" 
                                    onClick={() => setHeroIdx(prev => (prev - 1 + heroNovels.length) % heroNovels.length)}
                                    title="Tác phẩm trước"
                                >
                                    <Icons.ChevronLeft />
                                </button>
                                <div className="hero-carousel-dots">
                                    {heroNovels.map((n, idx) => (
                                        <button 
                                            key={n.id}
                                            className={`hero-dot-btn ${idx === heroIdx ? 'active' : ''}`}
                                            onClick={() => setHeroIdx(idx)}
                                            title={n.title}
                                        />
                                    ))}
                                </div>
                                <button 
                                    className="hero-arrow-btn" 
                                    onClick={() => setHeroIdx(prev => (prev + 1) % heroNovels.length)}
                                    title="Tác phẩm tiếp theo"
                                >
                                    <Icons.ChevronRight />
                                </button>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* 2. QUICK DISCOVERY & TRENDING BAR (MONOCHROME REFINED) */}
            <div className="home-discovery-bar">
                <div className="discovery-genres-row">
                    <button
                        className={`discovery-genre-pill ${filterGenre === '' ? 'active' : ''}`}
                        onClick={() => handleGenreClick('')}
                    >
                        <Icons.Compass /> Tất cả
                    </button>
                    {genres.slice(0, 10).map(genre => (
                        <button
                            key={genre}
                            className={`discovery-genre-pill ${filterGenre === genre ? 'active' : ''}`}
                            onClick={() => handleGenreClick(genre)}
                        >
                            {genre}
                        </button>
                    ))}
                </div>

                <div className="discovery-tags-row">
                    <div className="discovery-tags-list">
                        <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <Icons.Tag /> Xu hướng:
                        </span>
                        {['Isekai', 'Chuyển sinh', 'Romance', 'Hài hước', 'Slice of Life', 'Học đường', 'Trinh thám'].map(tag => (
                            <button
                                key={tag}
                                className="discovery-tag-item"
                                onClick={() => handleTagClick(tag)}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>

                    <div
                        className="discovery-all-link"
                        onClick={() => setCurrentView('explore')}
                    >
                        <span>Khám phá toàn bộ thư viện</span>
                        <Icons.ArrowRight />
                    </div>
                </div>
            </div>

            {/* 3. MAIN DISCOVERY 2-COLUMN LAYOUT */}
            <div className="discovery-layout">
                
                {/* LEFT MAIN COLUMN */}
                <div className="main-column" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* BENTO READING HUB ("Tiếp Tục Đọc Dở & Góc Thống Kê") */}
                    <div className={`reading-hub-bento-grid ${readingHistory.length > 0 ? 'has-split' : ''}`}>
                        {readingHistory.length > 0 ? (
                            <div className="reading-history-card-bento">
                                <div className="reading-history-header-v2">
                                    <Icons.History />
                                    <span>Tiếp Tục Đọc Dở</span>
                                </div>
                                <div className="reading-history-grid-v2">
                                    {readingHistory.slice(0, 4).map((item, idx) => {
                                        const n = novels.find(x => x.id === item.novelId);
                                        const pubChs = n?.chapters?.filter(ch => ch.status === 'published') || [];
                                        const total = pubChs.length || 1;
                                        let readCount = item.chapterIndex + 1;
                                        if (currentUser) {
                                            try {
                                                const key = `mugen_readprogress_${currentUser.username}_${item.novelId}`;
                                                const raw = localStorage.getItem(key);
                                                const saved = raw ? JSON.parse(raw) : null;
                                                if (saved && saved.readChaptersList) readCount = saved.readChaptersList.length;
                                            } catch(e) {}
                                        }
                                        const pct = Math.min(100, Math.round((readCount / total) * 100));

                                        return (
                                            <div
                                                key={idx}
                                                className="reading-history-item-v2"
                                                onClick={() => startReading(item.novelId, item.chapterIndex)}
                                            >
                                                <img
                                                    src={item.novelCover}
                                                    alt={item.novelTitle}
                                                    className="reading-history-cover-v2"
                                                />
                                                <div className="reading-history-info-v2">
                                                    <h4 className="reading-history-title-v2" title={item.novelTitle}>
                                                        {item.novelTitle}
                                                    </h4>
                                                    <span className="reading-history-chapter-v2" title={item.chapterTitle}>
                                                        {item.chapterTitle}
                                                    </span>
                                                    <div style={{ width: '100%', height: '3px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--text-main)', transition: 'width 0.3s ease' }} title={`Đã đọc ${pct}%`}></div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => deleteHistoryItem(e, item.novelId)}
                                                    title="Xóa khỏi lịch sử đọc"
                                                    className="reading-history-del-btn"
                                                >
                                                    <Icons.Close />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="reading-history-card-bento" style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'inline-flex', padding: '10px', background: 'var(--bg-base)', borderRadius: '50%', marginBottom: '10px', color: 'var(--text-main)' }}>
                                    <Icons.Book />
                                </div>
                                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Bắt đầu hành trình đọc sách</h4>
                                <p style={{ fontSize: '0.8rem', margin: '0 0 14px 0' }}>Khám phá các tác phẩm đa dạng thể loại và lưu lại hành trình theo dõi câu chuyện của bạn.</p>
                                <button
                                    className="reading-glance-cta-btn"
                                    onClick={() => setCurrentView('explore')}
                                    style={{ margin: '0 auto' }}
                                >
                                    <Icons.Compass /> Khám phá thư viện ngay
                                </button>
                            </div>
                        )}

                        {/* Reading Glance Mini Widget */}
                        {readingHistory.length > 0 && (
                            <div className="reading-glance-card">
                                <div className="reading-glance-watermark">読書</div>
                                <div>
                                    <div className="reading-glance-header">
                                        <Icons.Bookmark filled={true} />
                                        <span>Góc Đọc Của Bạn</span>
                                    </div>
                                    <div className="reading-glance-stats">
                                        <div className="reading-glance-stat-item">
                                            <span className="reading-glance-stat-num">{currentUser?.bookmarks?.length || 0}</span>
                                            <span className="reading-glance-stat-label">Truyện trong tủ</span>
                                        </div>
                                        <div className="reading-glance-stat-item">
                                            <span className="reading-glance-stat-num">{readingHistory.length}</span>
                                            <span className="reading-glance-stat-label">Bộ đang theo dõi</span>
                                        </div>
                                    </div>
                                </div>
                                {currentUser ? (
                                    <button
                                        className="reading-glance-cta-btn"
                                        onClick={() => setCurrentView('library')}
                                    >
                                        <Icons.Book /> Vào Tủ Sách Cá Nhân
                                    </button>
                                ) : (
                                    <button
                                        className="reading-glance-cta-btn"
                                        onClick={() => setLoginModalOpen(true)}
                                    >
                                        <Icons.User /> Đăng Nhập Đồng Bộ Tủ Sách
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ACTIVE SYSTEM EVENT BANNER */}
                    {activeEvents.length > 0 && (() => {
                        const activeEv = activeEvents[currentEventIdx] || activeEvents[0];
                        if (!activeEv) return null;
                        return (
                            <div
                                className="home-event-banner-v2"
                                onClick={() => {
                                    setActiveEventId(activeEv.id);
                                    setCurrentView('event-detail');
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                        <Icons.Sparkles />
                                    </div>
                                    <div key={activeEv.id} style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Sự kiện {activeEvents.length > 1 && `(${currentEventIdx + 1}/${activeEvents.length})`}
                                            </span>
                                        </div>
                                        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-main)' }}>
                                            {activeEv.title}
                                        </h4>
                                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                                            {activeEv.description || activeEv.content || ""}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                                    {activeEvents.length > 1 && (
                                        <div className="home-event-dots" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '5px' }}>
                                            {activeEvents.map((_, dotIdx) => (
                                                <span
                                                    key={dotIdx}
                                                    onClick={() => setCurrentEventIdx(dotIdx)}
                                                    className={`home-event-dot ${currentEventIdx === dotIdx ? 'active' : ''}`}
                                                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentEventIdx === dotIdx ? 'var(--text-main)' : 'var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        Chi tiết <Icons.ArrowRight />
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* SECTION: PERSONALIZED RECOMMENDATIONS (IF AVAILABLE) */}
                    {recommendedNovels.length > 0 && (
                        <div>
                            <div className="home-section-header">
                                <h2 className="home-section-title">
                                    <span className="section-icon-mono"><Icons.Sparkles /></span>
                                    <span>Dành Riêng Cho Bạn</span>
                                </h2>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                    Dựa trên sở thích đọc của bạn
                                </span>
                            </div>
                            <div className="novel-grid">
                                {recommendedNovels.slice(0, 5).map(renderNovelCard)}
                            </div>
                        </div>
                    )}

                    {/* SECTION: INTERACTIVE DISCOVERY HUB (TABBED SHOWCASE) */}
                    <div>
                        <div className="discovery-tabs-header">
                            <div className="discovery-tabs-nav">
                                <button
                                    className={`discovery-tab-btn ${activeDiscoveryTab === 'trending' ? 'active' : ''}`}
                                    onClick={() => setActiveDiscoveryTab('trending')}
                                >
                                    <Icons.Flame /> Thịnh Hành
                                </button>
                                <button
                                    className={`discovery-tab-btn ${activeDiscoveryTab === 'newest' ? 'active' : ''}`}
                                    onClick={() => setActiveDiscoveryTab('newest')}
                                >
                                    <Icons.Clock /> Mới Nhất
                                </button>
                                <button
                                    className={`discovery-tab-btn ${activeDiscoveryTab === 'top-rated' ? 'active' : ''}`}
                                    onClick={() => setActiveDiscoveryTab('top-rated')}
                                >
                                    <Icons.Star /> Đánh Giá Cao
                                </button>
                                <button
                                    className={`discovery-tab-btn ${activeDiscoveryTab === 'oneshot' ? 'active' : ''}`}
                                    onClick={() => setActiveDiscoveryTab('oneshot')}
                                >
                                    <Icons.Book /> Truyện Ngắn
                                </button>
                                <button
                                    className={`discovery-tab-btn ${activeDiscoveryTab === 'completed' ? 'active' : ''}`}
                                    onClick={() => setActiveDiscoveryTab('completed')}
                                >
                                    <Icons.CheckCircle /> Hoàn Thành
                                </button>
                            </div>

                            <button
                                className="outline-btn small"
                                onClick={() => {
                                    if (activeDiscoveryTab === 'oneshot') setFilterType('oneshot');
                                    else if (activeDiscoveryTab === 'completed') setFilterStatus('completed');
                                    else if (activeDiscoveryTab === 'top-rated') setFilterSort('rating');
                                    else if (activeDiscoveryTab === 'newest') setFilterSort('newest');
                                    setCurrentView('explore');
                                }}
                                style={{ borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                                <span>Xem tất cả</span>
                                <Icons.ArrowRight />
                            </button>
                        </div>

                        <div className="novel-grid">
                            {(() => {
                                let list: Novel[] = [];
                                if (activeDiscoveryTab === 'trending') list = trendingNovels;
                                else if (activeDiscoveryTab === 'newest') list = newestNovels;
                                else if (activeDiscoveryTab === 'top-rated') list = topRatedNovels;
                                else if (activeDiscoveryTab === 'oneshot') list = oneshotNovels;
                                else if (activeDiscoveryTab === 'completed') list = completedNovels;

                                if (list.length === 0) {
                                    return (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center', gridColumn: '1 / -1' }}>
                                            Chưa có tác phẩm trong danh mục này.
                                        </div>
                                    );
                                }
                                return list.slice(0, 5).map(renderNovelCard);
                            })()}
                        </div>
                    </div>

                    {/* SECTION: LIVE CHAPTER FEED ("Chương Mới Cập Nhật") */}
                    {latestChapters.length > 0 && (
                        <div className="live-chapters-card">
                            <div className="live-chapters-header">
                                <h3 className="live-chapters-title">
                                    <Icons.Zap />
                                    <span>Chương Mới Cập Nhật</span>
                                </h3>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    Cập nhật liên tục từ các tác giả
                                </span>
                            </div>

                            <div className="live-chapters-grid">
                                {latestChapters.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="live-chapter-item"
                                        onClick={() => startReading(item.novel.id, item.chapterIndex)}
                                        title={`Đọc ${item.chapter.title}`}
                                    >
                                        <img
                                            src={item.novel.cover}
                                            alt={item.novel.title}
                                            className="live-chapter-cover"
                                        />
                                        <div className="live-chapter-info">
                                            <div className="live-chapter-novel-title">{item.novel.title}</div>
                                            <div className="live-chapter-name">{item.chapter.title || `Chương ${item.chapterIndex + 1}`}</div>
                                            <div className="live-chapter-meta">
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <Icons.User /> {item.novel.author || item.novel.author_name || "Ẩn danh"}
                                                </span>
                                                <span>{item.timeAgo}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION: LITERARY SPOTLIGHT & AUTHOR CARD */}
                    <div className="literary-spotlight-bento">
                        {/* Literary Quote / Story Excerpt */}
                        <div className="literary-quote-card">
                            <div className="literary-quote-watermark">言葉</div>
                            <div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                    <Icons.Quote /> Trích đoạn truyền cảm hứng
                                </div>
                                <p className="literary-quote-content">
                                    {spotlightNovel?.summary
                                        ? `"${spotlightNovel.summary.slice(0, 140)}..."`
                                        : `"Một tác phẩm hay không kết thúc khi trang sách khép lại, mà bắt đầu sống dậy trong trí tưởng tượng của mỗi người đọc."`}
                                </p>
                            </div>
                            <div className="literary-quote-author">
                                <Icons.Book />
                                <span>{spotlightNovel ? spotlightNovel.title : 'MugenBunko Tuyển Tập'}</span>
                                <span>•</span>
                                <span>{spotlightNovel?.author || spotlightNovel?.author_name || 'Tác giả Mugen'}</span>
                            </div>
                        </div>

                        {/* Author Spotlight */}
                        <div className="author-spotlight-card">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                    <Icons.Feather /> Tác giả tiêu điểm
                                </div>
                                <div className="author-spotlight-header">
                                    {authorSpotlight && (
                                        <img
                                            src={authorSpotlight.avatarSeed && (authorSpotlight.avatarSeed.startsWith('http') || authorSpotlight.avatarSeed.startsWith('/uploads') || authorSpotlight.avatarSeed.startsWith('data:'))
                                                ? authorSpotlight.avatarSeed
                                                : `https://api.dicebear.com/7.x/adventurer/svg?seed=${authorSpotlight.avatarSeed || 'Default'}`}
                                            alt={authorSpotlight.username}
                                            className="author-spotlight-avatar"
                                        />
                                    )}
                                    <div className="author-spotlight-info">
                                        <span className="author-spotlight-name">@{authorSpotlight?.username || 'mugen_author'}</span>
                                        <span className="author-spotlight-badge">
                                            <Icons.Crown /> {calculateUserLevel(authorSpotlight?.xp || 0).tierName}
                                        </span>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                                    {authorSpotlight?.bio || 'Tác giả tích cực sáng tác trên MugenBunko với nhiều tác phẩm được cộng đồng yêu mến.'}
                                </p>
                            </div>
                            <button
                                className="reading-glance-cta-btn"
                                onClick={() => {
                                    if (authorSpotlight) {
                                        window.location.hash = `#/profile/${encodeURIComponent(authorSpotlight.username)}`;
                                    }
                                }}
                            >
                                <Icons.User /> Ghé Thăm Tác Giả
                            </button>
                        </div>
                    </div>

                    {/* SECTION: THEMED BENTO COLLECTIONS (DAILY REFRESHED) */}
                    <div className="themed-collections-section">
                        <div className="themed-collections-header">
                            <h3 className="themed-collections-title">
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <Icons.FolderPlus />
                                    <span>Tuyển Tập Chủ Đề</span>
                                </span>
                                <span className="daily-refreshed-badge">
                                    <Icons.Clock /> Cập nhật ngày {todayDateString}
                                </span>
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    className="outline-btn small"
                                    onClick={() => setThemeRotationOffset(prev => (prev + 4) % 8)}
                                    title="Đổi nhóm chủ đề tuyển chọn khác"
                                    style={{ borderRadius: '20px', padding: '3px 12px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Icons.RefreshCw />
                                    <span>Đổi gợi ý</span>
                                </button>
                                <button
                                    className="outline-btn small"
                                    onClick={() => {
                                        setFilterGenre('Tất cả');
                                        setFilterType('all');
                                        setFilterStatus('all');
                                        const novelSection = document.querySelector('.interactive-discovery-hub');
                                        if (novelSection) novelSection.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    style={{ borderRadius: '20px', padding: '3px 12px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <span>Tất cả</span>
                                    <Icons.ArrowRight />
                                </button>
                            </div>
                        </div>

                        <div className="themed-collections-grid">
                            {dailyThemedCollections.map(collection => (
                                <div
                                    key={collection.id}
                                    className="themed-collection-card"
                                    onClick={() => {
                                        if (collection.filterGenre) setFilterGenre(collection.filterGenre);
                                        if (collection.filterType) setFilterType(collection.filterType);
                                        if (collection.filterStatus) setFilterStatus(collection.filterStatus);
                                        const novelSection = document.querySelector('.interactive-discovery-hub');
                                        if (novelSection) novelSection.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                >
                                    <div>
                                        <div className="themed-collection-tag-row">
                                            <span className="themed-collection-badge">{collection.badge}</span>
                                            <span className="themed-collection-count">
                                                <Icons.Book /> {collection.count} tác phẩm
                                            </span>
                                        </div>
                                        <h4 className="themed-collection-name">
                                            <span className="themed-title-icon">{renderThemeIcon(collection.iconName)}</span>
                                            <span>{collection.title}</span>
                                        </h4>
                                        <p className="themed-collection-desc">
                                            {collection.desc}
                                        </p>
                                    </div>
                                    <div className="themed-collection-footer">
                                        <div className="collection-cover-stack">
                                            {collection.novels.slice(0, 3).map((n, i) => (
                                                <img
                                                    key={n.id || i}
                                                    src={n.cover || 'assets/default_novel_cover.png'}
                                                    alt={n.title}
                                                    className="collection-cover-thumb"
                                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                />
                                            ))}
                                            {collection.count === 0 && (
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Đang cập nhật thêm</span>
                                            )}
                                        </div>
                                        <span className="themed-collection-action">
                                            <span>Khám phá</span> <Icons.ArrowRight />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION: RISING GEMS SHOWCASE */}
                    {risingGems.length > 0 && (
                        <div className="rising-gems-section">
                            <div className="rising-gems-header">
                                <h3 className="rising-gems-title">
                                    <Icons.Sparkles />
                                    <span>Tân Binh Triển Vọng</span>
                                </h3>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tác phẩm tiềm năng được cộng đồng đánh giá cao</span>
                            </div>

                            <div className="rising-gems-grid">
                                {risingGems.map(novel => {
                                    const stars = computeAverageStars(novel.id);
                                    return (
                                        <div
                                            key={novel.id}
                                            className="rising-gem-card"
                                            onClick={() => openNovelDetail(novel.id)}
                                        >
                                            <img
                                                src={novel.cover || 'assets/default_novel_cover.png'}
                                                alt={novel.title}
                                                className="rising-gem-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).src = 'assets/default_novel_cover.png'; }}
                                            />
                                            <div className="rising-gem-body">
                                                <div>
                                                    <h4 className="rising-gem-title">{novel.title}</h4>
                                                    <div className="rising-gem-author">
                                                        <Icons.User />
                                                        <span>{novel.author || novel.author_name || 'Tác giả'}</span>
                                                    </div>
                                                    <p className="rising-gem-snippet">
                                                        {novel.summary || 'Tác phẩm mới đầy tiềm năng đang nhận được sự ủng hộ tích cực từ cộng đồng độc giả Mugen.'}
                                                    </p>
                                                </div>
                                                <div className="rising-gem-meta-row">
                                                    <span className="rising-gem-tag">{novel.genre || 'Light Novel'}</span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600, color: 'var(--text-main)' }}>
                                                        <Icons.Star filled /> {stars} ★
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SECTION: COMMUNITY FORUM HIGHLIGHTS */}
                    <div className="forum-highlights-card">
                        <div className="forum-highlights-header">
                            <h3 className="forum-highlights-title">
                                <Icons.MessageSquare />
                                <span>Thảo Luận Sôi Nổi</span>
                            </h3>
                            <button
                                className="outline-btn small"
                                onClick={() => setCurrentView('forum')}
                                style={{ borderRadius: '20px', padding: '3px 12px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                                <span>Vào diễn đàn</span>
                                <Icons.ArrowRight />
                            </button>
                        </div>

                        <div>
                            {hotForumPosts.length > 0 ? (
                                hotForumPosts.map(post => (
                                    <div
                                        key={post.id}
                                        className="forum-thread-item"
                                        onClick={() => {
                                            setActiveForumPostId(post.id);
                                            setCurrentView('forum');
                                        }}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div className="forum-thread-title">{post.title}</div>
                                            <div className="forum-thread-meta">
                                                <span>@{post.author_username || 'anonym'}</span>
                                                <span>•</span>
                                                <span style={{ background: 'var(--bg-card)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                    {post.category || 'Chung'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="forum-thread-count">
                                            <Icons.Comment />
                                            <span>{post.comments_count || 0}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div
                                        className="forum-thread-item"
                                        onClick={() => setCurrentView('forum')}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div className="forum-thread-title">Góc thảo luận: Thể loại Isekai & Xây dựng thế giới bạn yêu thích nhất?</div>
                                            <div className="forum-thread-meta">
                                                <span>@mugen_admin</span>
                                                <span>•</span>
                                                <span style={{ background: 'var(--bg-card)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                    Thảo luận chung
                                                </span>
                                            </div>
                                        </div>
                                        <div className="forum-thread-count">
                                            <Icons.Comment />
                                            <span>Tham gia</span>
                                        </div>
                                    </div>
                                    <div
                                        className="forum-thread-item"
                                        onClick={() => setCurrentView('forum')}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div className="forum-thread-title">Góc chia sẻ kinh nghiệm sáng tác: Cách tạo nhịp truyện lôi cuốn cho chương đầu</div>
                                            <div className="forum-thread-meta">
                                                <span>@alice_writer</span>
                                                <span>•</span>
                                                <span style={{ background: 'var(--bg-card)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                    Góc sáng tác
                                                </span>
                                            </div>
                                        </div>
                                        <div className="forum-thread-count">
                                            <Icons.Comment />
                                            <span>Tham gia</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION: GENRE & TAG DISCOVERY MATRIX */}
                    {genreDiscoveryCounts.length > 0 && (
                        <div className="genre-matrix-section">
                            <div className="genre-matrix-header">
                                <h3 className="genre-matrix-title">
                                    <Icons.Grid />
                                    <span>Bản Đồ Thể Loại & Xu Hướng</span>
                                </h3>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Khám phá tác phẩm theo gu đọc của bạn</span>
                            </div>
                            <div className="genre-matrix-chips">
                                {genreDiscoveryCounts.map(item => (
                                    <button
                                        key={item.name}
                                        className="genre-matrix-chip"
                                        onClick={() => {
                                            handleGenreClick(item.name);
                                            const novelSection = document.querySelector('.interactive-discovery-hub');
                                            if (novelSection) novelSection.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        <span>#{item.name}</span>
                                        <span className="chip-count">{item.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION: AUTHOR STUDIO CALLOUT BANNER */}
                    <div className="author-callout-banner">
                        <div className="author-callout-watermark">筆</div>
                        <div className="author-callout-top">
                            <div>
                                <h3 className="author-callout-headline">
                                    Bạn có một câu chuyện muốn kể? Hãy cùng sáng tác với MugenBunko!
                                </h3>
                                <p className="author-callout-subtext">
                                    Nền tảng xuất bản Light Novel phi lợi nhuận hàng đầu Việt Nam. Mang ngòi bút và thế giới tưởng tượng của bạn đến với hàng chục ngàn độc giả chân chính.
                                </p>
                            </div>
                            <button
                                className="primary-btn"
                                onClick={() => {
                                    if (currentUser) {
                                        if (currentUser.roles?.includes('author') || currentUser.roles?.includes('admin') || currentUser.roles?.includes('moderator')) {
                                            setCurrentView('studio');
                                        } else {
                                            setCurrentView('profile');
                                        }
                                    } else {
                                        setLoginModalOpen(true);
                                    }
                                }}
                                style={{ borderRadius: '20px', padding: '9px 20px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                            >
                                <Icons.PenTool />
                                <span>
                                    {currentUser
                                        ? (currentUser.roles?.includes('author') || currentUser.roles?.includes('admin') || currentUser.roles?.includes('moderator')
                                            ? 'Mở Studio Tác Giả'
                                            : 'Đăng Ký Làm Tác Giả')
                                        : 'Bắt Đầu Sáng Tác Ngay'}
                                </span>
                            </button>
                        </div>

                        <div className="author-callout-features">
                            <div className="author-callout-feature-item">
                                <div className="author-callout-feature-icon">
                                    <Icons.Feather />
                                </div>
                                <div className="author-callout-feature-text">
                                    <strong>Soạn Thảo Chuẩn Mực</strong>
                                    <span>Trình soạn thảo tiện lợi, tự động lưu và hẹn giờ đăng chương.</span>
                                </div>
                            </div>

                            <div className="author-callout-feature-item">
                                <div className="author-callout-feature-icon">
                                    <Icons.Shield />
                                </div>
                                <div className="author-callout-feature-text">
                                    <strong>Tôn Trọng Tác Quyền</strong>
                                    <span>Bản quyền 100% thuộc về bạn, môi trường sáng tác phi thương mại.</span>
                                </div>
                            </div>

                            <div className="author-callout-feature-item">
                                <div className="author-callout-feature-icon">
                                    <Icons.BarChart />
                                </div>
                                <div className="author-callout-feature-text">
                                    <strong>Thống Kê Trực Quan</strong>
                                    <span>Theo dõi lượt đọc, tương tác nhận xét và tăng trưởng người theo dõi.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR BENTO COLUMN */}
                <aside className="sidebar-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* BENTO 1: MULTI-CRITERIA BẢNG XẾP HẠNG */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Trophy /></span>
                            <span>Bảng Xếp Hạng</span>
                        </h3>

                        {/* Ranking Criterion Tabs */}
                        <div className="ranking-tabs-row">
                            <button
                                className={`ranking-tab-btn ${activeRankingTab === 'reads' ? 'active' : ''}`}
                                onClick={() => setActiveRankingTab('reads')}
                            >
                                Lượt đọc
                            </button>
                            <button
                                className={`ranking-tab-btn ${activeRankingTab === 'stars' ? 'active' : ''}`}
                                onClick={() => setActiveRankingTab('stars')}
                            >
                                Đánh giá
                            </button>
                            <button
                                className={`ranking-tab-btn ${activeRankingTab === 'bookmarks' ? 'active' : ''}`}
                                onClick={() => setActiveRankingTab('bookmarks')}
                            >
                                Lưu tủ
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {sidebarRankings.length === 0 ? (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có tác phẩm nào.</div>
                            ) : (
                                sidebarRankings.map((novel, index) => {
                                    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                                    const scoreText = activeRankingTab === 'stars'
                                        ? `${computeAverageStars(novel.id)} ★`
                                        : activeRankingTab === 'bookmarks'
                                        ? `${Number(novel.bookmarksCount || novel.bookmarks_count || 0).toLocaleString()} lưu`
                                        : `${Number(novel.reads).toLocaleString()} lượt đọc`;

                                    return (
                                        <div key={novel.id} className="ranking-item-v2" onClick={() => openNovelDetail(novel.id)}>
                                            <span className={`ranking-badge-v2 ${rankClass}`}>
                                                {index + 1}
                                            </span>
                                            <div className="ranking-info-v2">
                                                <div className="ranking-title-v2">{novel.title}</div>
                                                <div className="ranking-score-v2">
                                                    {activeRankingTab === 'stars' ? <Icons.Star /> : activeRankingTab === 'bookmarks' ? <Icons.Bookmark /> : <Icons.Eye />}
                                                    <span>{scoreText}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* BENTO 2: CAO THỦ WIBU TUẦN */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Crown /></span>
                            <span>Cao Thủ Wibu Tuần</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(() => {
                                if (!wibuRanking || wibuRanking.length === 0) {
                                    return <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có cao thủ nào.</div>;
                                }
                                
                                return wibuRanking.slice(0, 5).map((user, index) => {
                                    const lvlInfo = calculateUserLevel(user.xp || 0);
                                    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                                    const avatarSrc = user.avatarSeed && (user.avatarSeed.startsWith('http') || user.avatarSeed.startsWith('/uploads') || user.avatarSeed.startsWith('data:')) 
                                        ? user.avatarSeed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.avatarSeed || 'Default'}`;

                                    return (
                                        <div 
                                            key={user.id} 
                                            className="ranking-item-v2"
                                            onClick={() => {
                                                window.location.hash = `#/profile/${encodeURIComponent(user.username)}`;
                                            }}
                                        >
                                            <span className={`ranking-badge-v2 ${rankClass}`}>
                                                {index + 1}
                                            </span>
                                            <img 
                                                src={avatarSrc} 
                                                alt={user.username} 
                                                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover' }} 
                                            />
                                            <div className="ranking-info-v2">
                                                <div className="ranking-title-v2">@{user.username}</div>
                                                <div className="ranking-score-v2">
                                                    <span>{lvlInfo.tierName}</span>
                                                    <span>•</span>
                                                    <span>{Number(user.xp).toLocaleString()} XP</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* BENTO 3: NHỊP SỐNG NỀN TẢNG (PLATFORM PULSE) */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Activity /></span>
                            <span>Nhịp Sống MugenBunko</span>
                        </h3>
                        <div className="platform-pulse-grid">
                            <div className="platform-pulse-box">
                                <Icons.Book />
                                <span className="platform-pulse-num">{platformStats.totalNovels}</span>
                                <span className="platform-pulse-label">Tác phẩm</span>
                            </div>
                            <div className="platform-pulse-box">
                                <Icons.Zap />
                                <span className="platform-pulse-num">{platformStats.totalChapters}</span>
                                <span className="platform-pulse-label">Chương sách</span>
                            </div>
                            <div className="platform-pulse-box">
                                <Icons.Eye />
                                <span className="platform-pulse-num">{Number(platformStats.totalReads).toLocaleString()}</span>
                                <span className="platform-pulse-label">Lượt đọc</span>
                            </div>
                        </div>
                    </div>

                    {/* BENTO 4: BÌNH LUẬN MỚI NHẤT */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Comment /></span>
                            <span>Bình Luận Mới Nhất</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {latestComments && latestComments.length > 0 ? (
                                latestComments.slice(0, 3).map((comment: any) => {
                                    const avatarSrc = comment.avatarSeed && (comment.avatarSeed.startsWith('http') || comment.avatarSeed.startsWith('/uploads') || comment.avatarSeed.startsWith('data:')) 
                                        ? comment.avatarSeed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.avatarSeed || 'Default'}`;

                                    return (
                                        <div
                                            key={comment.id}
                                            onClick={() => openNovelDetail(comment.novelId)}
                                            style={{
                                                display: 'flex',
                                                gap: '10px',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                border: '1px dashed var(--border-color)',
                                                background: 'var(--bg-base)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <img
                                                src={avatarSrc}
                                                alt={comment.displayname}
                                                style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{comment.displayname}</strong>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{comment.date ? comment.date.split(' ')[0] : ''}</span>
                                                </div>
                                                <p style={{
                                                    fontSize: '0.73rem',
                                                    color: 'var(--text-muted)',
                                                    margin: '3px 0',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: '1.35'
                                                }}>
                                                    "{comment.text}"
                                                </p>
                                                <div style={{ fontSize: '0.66rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <Icons.Book /> {comment.novelTitle}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có bình luận nào.</div>
                            )}
                        </div>
                    </div>

                    {/* BENTO 5: ĐÁNH GIÁ MỚI NHẤT */}
                    <div className="sidebar-bento-card">
                        <h3 className="sidebar-bento-title">
                            <span className="title-icon-mono"><Icons.Star /></span>
                            <span>Đánh Giá Mới Nhất</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {latestReviews && latestReviews.length > 0 ? (
                                latestReviews.slice(0, 3).map((review: any) => {
                                    const avatarSrc = review.avatarSeed && (review.avatarSeed.startsWith('http') || review.avatarSeed.startsWith('/uploads') || review.avatarSeed.startsWith('data:')) 
                                        ? review.avatarSeed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${review.avatarSeed || 'Default'}`;

                                    return (
                                        <div
                                            key={review.id}
                                            onClick={() => openNovelDetail(review.novelId)}
                                            style={{
                                                display: 'flex',
                                                gap: '10px',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                border: '1px dashed var(--border-color)',
                                                background: 'var(--bg-base)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <img
                                                src={avatarSrc}
                                                alt={review.username}
                                                style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{review.username}</strong>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <Icons.Star /> {review.stars ? parseFloat(review.stars).toFixed(1) : '5.0'}
                                                    </span>
                                                </div>
                                                <p style={{
                                                    fontSize: '0.73rem',
                                                    color: 'var(--text-muted)',
                                                    margin: '3px 0',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: '1.35'
                                                }}>
                                                    "{review.text}"
                                                </p>
                                                <div style={{ fontSize: '0.66rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <Icons.Book /> {review.novelTitle}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có đánh giá nào.</div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
