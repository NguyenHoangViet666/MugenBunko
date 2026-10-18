import { fetchArrayPages } from '../utils/pagedFetch';
import React, { useState, useEffect } from 'react';
import { calculateUserLevel } from '../utils/levelHelper';
import { User, ForumPost, ForumComment, Message } from '../types';
import { compressImage } from '../utils/imageCompressor';
import RichTextEditor, { parseFormattedContent, extractAndCleanImages, ForumImageGrid } from '../components/RichTextEditor';
import { io } from 'socket.io-client';

// ================= MONOCHROME & SOCIAL SVG ICONS =================
const Icons = {
    All: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
        </svg>
    ),
    General: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    ),
    Announcement: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
    ),
    Review: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    ),
    Spoil: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    ),
    Eye: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    ),
    QA: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
    ),
    Misc: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
    ),
    Bookmark: ({ filled, size = 16 }: { filled?: boolean; size?: number } = {}) => (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
    ),
    Heart: ({ filled, size = 17 }: { filled?: boolean; size?: number } = {}) => (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    ),
    Comment: () => (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
    ),
    MessageSquare: ({ size = 16 }: { size?: number } = {}) => (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    ),
    Share: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
    ),
    Image: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
    ),
    Pen: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
    ),
    Send: () => (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
    ),
    Trash: () => (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    ),
    Lock: ({ size = 14 }: { size?: number } = {}) => (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    ),
    Unlock: ({ size = 14 }: { size?: number } = {}) => (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
        </svg>
    ),
    Trending: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
    ),
    Trophy: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
        </svg>
    ),
    Sparkles: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
        </svg>
    ),
    Users: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    ),
    Shield: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
    ),
    Hash: () => (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9"></line>
            <line x1="4" y1="15" x2="20" y2="15"></line>
            <line x1="10" y1="3" x2="8" y2="21"></line>
            <line x1="16" y1="3" x2="14" y2="21"></line>
        </svg>
    ),
    Search: ({ size = 15 }: { size?: number }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
    )
};

const CATEGORIES = [
    { id: 'all', name: 'Bảng tin tổng hợp', shortName: 'Tất cả', icon: Icons.All, color: '#ec4899' },
    { id: 'general', name: 'Thảo luận chung', shortName: 'Thảo luận', icon: Icons.General, color: '#3b82f6' },
    { id: 'review', name: 'Review & Đánh giá', shortName: 'Review', icon: Icons.Review, color: '#f59e0b' },
    { id: 'spoil', name: 'Spoil & Giả thuyết', shortName: 'Spoil', icon: Icons.Spoil, color: '#ef4444' },
    { id: 'qa', name: 'Hỏi đáp & Tìm truyện', shortName: 'Hỏi đáp', icon: Icons.QA, color: '#10b981' },
    { id: 'misc', name: 'Góc Wibu & Fanart', shortName: 'Góc Wibu', icon: Icons.Misc, color: '#8b5cf6' },
    { id: 'announcement', name: 'Thông báo BQT', shortName: 'Thông báo', icon: Icons.Announcement, color: '#f43f5e' },
];

const TRENDING_TAGS = [
    { tag: '#Isekai', desc: 'Chuyển sinh & Dị giới' },
    { tag: '#ReviewTruyen', desc: 'Đánh giá chuyên sâu' },
    { tag: '#SpoilMoi', desc: 'Thảo luận cốt truyện' },
    { tag: '#Romance', desc: 'Ngọt sủng & Thanh xuân' },
    { tag: '#SciFi', desc: 'Mecha & Viễn tưởng' },
    { tag: '#SliceOfLife', desc: 'Chữa lành & Đời thường' },
    { tag: '#HoiDap', desc: 'Tìm truyện & Tư vấn' },
    { tag: '#GocWibu', desc: 'Bàn học & Sưu tầm LN' },
];

// Helper to reliably normalize categories (supporting both English and Vietnamese)
export const normalizeForumCategory = (cat: string | undefined | null): string => {
    if (!cat) return 'general';
    const lower = cat.toLowerCase().trim();
    if (lower === 'general' || lower === 'thảo luận chung' || lower === 'thảo luận') return 'general';
    if (lower === 'announcement' || lower === 'thông báo' || lower === 'thông báo hệ thống') return 'announcement';
    if (lower === 'review' || lower === 'review truyện' || lower === 'review tác phẩm' || lower === 'đánh giá') return 'review';
    if (lower === 'spoil' || lower === 'spoil tình tiết' || lower === 'spoil nội dung') return 'spoil';
    if (lower === 'qa' || lower === 'q&a' || lower === 'hỏi đáp' || lower === 'hỏi đáp thắc mắc') return 'qa';
    if (lower === 'misc' || lower === 'linh tinh' || lower === 'linh tinh khác') return 'misc';
    return lower;
};

// Format relative social timestamp
const formatRelativeTime = (dateStr?: string): string => {
    if (!dateStr) return 'Vừa xong';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Extract #hashtags from post text
const extractHashtags = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(/#[a-zA-Z0-9_À-ỹ]+/g);
    if (!matches) return [];
    return Array.from(new Set(matches)).slice(0, 5);
};

const getAvatarUrl = (seed?: string | null): string => {
    if (!seed) return 'https://api.dicebear.com/7.x/adventurer/svg?seed=Default';
    if (seed.startsWith('http') || seed.startsWith('/uploads') || seed.startsWith('data:')) {
        return seed;
    }
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
};

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

interface ForumProps {
    currentUser: User | null;
    API_BASE: string;
    setCurrentView: (view: string) => void;
    showToast?: (msg: string) => void;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    initialPostId: number | null;
    setInitialPostId?: (id: number | null) => void;
    refreshSession?: (userId: number) => void;
    triggerConfirm: (msg: string, callback: () => void) => void;
    viewPublicProfile?: (username: string) => void;
}

export default function Forum({ 
    currentUser, 
    API_BASE, 
    setCurrentView, 
    showToast, 
    fetchWithAuth, 
    initialPostId, 
    setInitialPostId, 
    refreshSession, 
    triggerConfirm,
    viewPublicProfile
}: ForumProps) {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    
    const showAlert = (msg: string) => {
        if (showToast) {
            showToast(msg);
        } else {
            alert(msg);
        }
    };
    const isAdmin = currentUser && currentUser.roles && currentUser.roles.includes('admin');
    const isStaff = currentUser && currentUser.roles && (currentUser.roles.includes('admin') || currentUser.roles.includes('moderator'));
    const [activeCategory, setActiveCategory] = useState('all');
    
    // Saved / Bookmarked posts in localStorage for social experience
    const [savedPostIds, setSavedPostIds] = useState<number[]>(() => {
        try {
            const raw = localStorage.getItem('mugen_saved_forum_posts');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const toggleSavePost = (postId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedPostIds(prev => {
            const exists = prev.includes(postId);
            const next = exists ? prev.filter(id => id !== postId) : [...prev, postId];
            try {
                localStorage.setItem('mugen_saved_forum_posts', JSON.stringify(next));
            } catch {}
            showAlert(exists ? 'Đã bỏ lưu bài viết khỏi bộ sưu tập.' : '🔖 Đã lưu bài viết vào bộ sưu tập cá nhân!');
            return next;
        });
    };

    // Revealed spoiler post IDs & Expanded long post IDs
    const [revealedSpoilers, setRevealedSpoilers] = useState<Record<number, boolean>>({});
    const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});

    // Socket.io states
    const [socket, setSocket] = useState<any>(null);
    const [onlineUsers, setOnlineUsers] = useState<Record<number, boolean>>({});
    
    // Subviews: 'list' | 'detail' | 'create'
    const [subView, setSubView] = useState<'list' | 'detail' | 'create'>('list');
    const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);

    // Lightbox for viewing and zooming images
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxZoom, setLightboxZoom] = useState(1);
    const [lightboxRotation, setLightboxRotation] = useState(0);

    // Form inputs for creating post (Standard Page View)
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('general');
    const [newContent, setNewContent] = useState('');
    const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
 
    // Form inputs for commenting (Detail View)
    const [commentText, setCommentText] = useState('');
    const [replyToUserId, setReplyToUserId] = useState<number | null>(null);
    const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [quickReplyToCommentIds, setQuickReplyToCommentIds] = useState<{ [postId: number]: number | null }>({});

    // Social Feed states
    const [isQuickCreateExpanded, setIsQuickCreateExpanded] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');
    const [quickContent, setQuickContent] = useState('');
    const [quickCategory, setQuickCategory] = useState('general');
    const [quickImageUrls, setQuickImageUrls] = useState<string[]>([]);
    const [quickImageFiles, setQuickImageFiles] = useState<File[]>([]);
    const [forumSearch, setForumSearch] = useState<string>('');
    const [forumSort, setForumSort] = useState<'newest' | 'hot' | 'pinned' | 'media'>('newest');

    const removeNewImage = (index: number) => {
        setNewImageUrls(prev => prev.filter((_, i) => i !== index));
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeQuickImage = (index: number) => {
        setQuickImageUrls(prev => prev.filter((_, i) => i !== index));
        setQuickImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const [expandedPostComments, setExpandedPostComments] = useState<{ [postId: number]: boolean }>({});
    const [loadedPostComments, setLoadedPostComments] = useState<Record<number, boolean>>({});
    const [loadingPostComments, setLoadingPostComments] = useState<Record<number, boolean>>({});
    const [quickCommentTexts, setQuickCommentTexts] = useState<{ [postId: number]: string }>({});

    // Contacts / Friends chat states
    const [forumFriends, setForumFriends] = useState<SocialUser[]>([]);
    const [activeChatFriend, setActiveChatFriend] = useState<SocialUser | null>(null);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [chatInputText, setChatInputText] = useState('');

    // Socket.io Connection & Listeners Effect
    useEffect(() => {
        if (!currentUser) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const token = localStorage.getItem('mugen_token');
        if (!token) return;

        const socketUrl = API_BASE.replace('/api', '');
        const newSocket = io(socketUrl, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            setSocket(newSocket);
            if (forumFriends.length > 0) {
                const friendIds = forumFriends.map(f => f.id);
                newSocket.emit('check_online_status', friendIds, (statuses: Record<number, boolean>) => {
                    setOnlineUsers(statuses);
                });
            }
        });

        newSocket.on('receive_message', (message: Message) => {
            setActiveChatFriend(currentFriend => {
                if (currentFriend && (currentFriend.id === message.sender_id || currentFriend.id === message.receiver_id)) {
                    setChatMessages(prev => {
                        if (prev.some(m => m.id === message.id)) return prev;
                        return [...prev, message];
                    });
                    setTimeout(() => {
                        const chatBoxBody = document.getElementById("fb-chat-body-container");
                        if (chatBoxBody) chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
                    }, 100);
                }
                return currentFriend;
            });
        });

        newSocket.on('friend_status_change', (data: { userId: number, status: 'online' | 'offline' }) => {
            setOnlineUsers(prev => ({
                ...prev,
                [data.userId]: data.status === 'online'
            }));
        });

        return () => {
            newSocket.disconnect();
        };
    }, [currentUser]);

    useEffect(() => {
        if (socket && forumFriends.length > 0) {
            const friendIds = forumFriends.map(f => f.id);
            socket.emit('check_online_status', friendIds, (statuses: Record<number, boolean>) => {
                setOnlineUsers(statuses);
            });
        }
    }, [forumFriends, socket]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!lightboxImage) return;
            if (e.key === 'Escape') {
                setLightboxImage(null);
                setLightboxZoom(1);
                setLightboxRotation(0);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxImage]);
 
    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        if (initialPostId) {
            fetchPostDetail(initialPostId);
        } else {
            setSubView('list');
            setSelectedPost(null);
        }
    }, [initialPostId]);

    const fetchForumFriends = async () => {
        if (!currentUser) return;
        try {
            const res = await fetchWithAuth(`${API_BASE}/social/friends`);
            if (res.ok) {
                const data = await res.json();
                setForumFriends(data.friends || []);
            }
        } catch (err) {
            console.error("Error loading forum friends:", err);
        }
    };

    useEffect(() => {
        fetchForumFriends();
    }, [currentUser]);

    useEffect(() => {
        if (!activeChatFriend) return;

        const fetchChatMessages = async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/social/messages/chat/${activeChatFriend.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setChatMessages(data);
                    setTimeout(() => {
                        const chatBoxBody = document.getElementById("fb-chat-body-container");
                        if (chatBoxBody) chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
                    }, 150);
                }
            } catch (err) {
                console.error("Error loading chat messages:", err);
            }
        };

        fetchChatMessages();
    }, [activeChatFriend]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const data = await fetchArrayPages<ForumPost>(fetchWithAuth, `${API_BASE}/forum/posts?comments=none`);
            if (Array.isArray(data)) {
                setPosts(data);
                setLoadedPostComments({});
                setExpandedPostComments({});
            }
        } catch (err) {
            console.error("Error loading forum posts:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPostDetail = async (id: number) => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE}/forum/posts/${id}`);
            const data = await res.json();
            if (res.ok) {
                setSelectedPost(data);
                setSubView('detail');
            } else {
                showAlert(data.error || "Không thể tải chi tiết bài viết.");
            }
        } catch (err) {
            console.error("Error loading post details:", err);
        } finally {
            setLoading(false);
        }
    };

    const uploadImageFile = async (file: File, type: string): Promise<string> => {
        try {
            const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
            const res = await fetchWithAuth(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: compressedBase64, type })
            });
            const data = await res.json();
            if (res.ok && data.url) {
                return data.url;
            } else {
                throw data.error || "Lỗi tải ảnh lên.";
            }
        } catch (err: any) {
            throw err.message || err || "Lỗi kết nối máy chủ khi tải ảnh.";
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            showAlert("Bạn cần đăng nhập để đăng bài viết!");
            return;
        }
        if (!newTitle.trim() || !newContent.trim()) {
            showAlert("Vui lòng nhập đầy đủ tiêu đề và nội dung!");
            return;
        }

        setIsSubmittingPost(true);
        try {
            let imageUrl: string | null = null;
            let finalContent = newContent;

            if (newImageFiles.length > 0) {
                if (showToast) showToast(`Đang tải ${newImageFiles.length} ảnh bài đăng lên...`);
                const uploadPromises = newImageFiles.map(file => uploadImageFile(file, 'post'));
                const urls = await Promise.all(uploadPromises);
                
                imageUrl = urls[0];
                if (urls.length > 1) {
                    const extraImageTags = urls.slice(1).map(url => `[img]${url}[/img]`).join('\n');
                    finalContent = `${finalContent}\n\n${extraImageTags}`;
                }
            }

            const res = await fetchWithAuth(`${API_BASE}/forum/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    content: finalContent.trim(),
                    category: newCategory || 'general',
                    imageUrl: imageUrl || null
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (showToast) showToast("Đã đăng bài viết thành công!");
                setNewTitle('');
                setNewContent('');
                setNewCategory('general');
                setNewImageUrls([]);
                setNewImageFiles([]);
                await fetchPosts();
                setSubView('list');
                if (refreshSession && currentUser) {
                    refreshSession(currentUser.id);
                }
            } else {
                showAlert(data.error || "Lỗi đăng bài viết.");
            }
        } catch (err) {
            console.error("Error creating post:", err);
            showAlert((err as string) || "Lỗi khi đăng bài viết.");
        } finally {
            setIsSubmittingPost(false);
        }
    };

    const handleQuickCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            showAlert("Bạn cần đăng nhập để đăng bài viết!");
            return;
        }
        if (!quickTitle.trim() || !quickContent.trim()) {
            showAlert("Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết!");
            return;
        }

        setIsSubmittingPost(true);
        try {
            let imageUrl: string | null = null;
            let finalContent = quickContent;

            if (quickImageFiles.length > 0) {
                if (showToast) showToast(`Đang tải ${quickImageFiles.length} ảnh bài đăng lên...`);
                const uploadPromises = quickImageFiles.map(file => uploadImageFile(file, 'post'));
                const urls = await Promise.all(uploadPromises);
                
                imageUrl = urls[0];
                if (urls.length > 1) {
                    const extraImageTags = urls.slice(1).map(url => `[img]${url}[/img]`).join('\n');
                    finalContent = `${finalContent}\n\n${extraImageTags}`;
                }
            }

            const res = await fetchWithAuth(`${API_BASE}/forum/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: quickTitle.trim(),
                    content: finalContent.trim(),
                    category: quickCategory || 'general',
                    imageUrl: imageUrl || null
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (showToast) showToast("Đã đăng bài viết thành công!");
                setQuickTitle('');
                setQuickContent('');
                setQuickCategory('general');
                setQuickImageUrls([]);
                setQuickImageFiles([]);
                setIsQuickCreateExpanded(false);
                await fetchPosts();
                if (refreshSession && currentUser) {
                    refreshSession(currentUser.id);
                }
            } else {
                showAlert(data.error || "Lỗi đăng bài viết.");
            }
        } catch (err) {
            console.error("Error creating quick post:", err);
            showAlert((err as string) || "Lỗi khi đăng bài viết.");
        } finally {
            setIsSubmittingPost(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            showAlert("Bạn cần đăng nhập để bình luận!");
            return;
        }
        if (!selectedPost) return;
        if (!commentText.trim()) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/forum/posts/${selectedPost.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: commentText.trim(),
                    replyToUserId
                })
            });
            if (res.ok) {
                setCommentText('');
                setReplyToUserId(null);
                await fetchPostDetail(selectedPost.id);
            }
        } catch (err) {
            console.error("Error adding comment:", err);
        }
    };

    const handleQuickCommentSubmit = async (postId: number, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!currentUser) {
            showAlert("Bạn cần đăng nhập để bình luận!");
            return;
        }

        const text = quickCommentTexts[postId];
        if (!text || !text.trim()) return;

        const parentId = quickReplyToCommentIds[postId] || null;

        try {
            const res = await fetchWithAuth(`${API_BASE}/forum/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text.trim(), 
                    replyToUserId,
                    parentId
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.comment) {
                    setPosts(prevPosts => prevPosts.map(post => {
                        if (post.id === postId) {
                            let updatedComments: ForumComment[];
                            if (parentId) {
                                updatedComments = (post.comments || []).map(c => {
                                    if (c.id === parentId) {
                                        return {
                                            ...c,
                                            replies: [...(c.replies || []), data.comment]
                                        };
                                    }
                                    return c;
                                });
                            } else {
                                updatedComments = [...(post.comments || []), { ...data.comment, replies: [] }];
                            }
                            return {
                                ...post,
                                comments_count: (post.comments_count || 0) + 1,
                                comments: updatedComments
                            };
                        }
                        return post;
                    }));
                    setQuickCommentTexts(prev => ({ ...prev, [postId]: "" }));
                    setReplyToUserId(null);
                    setQuickReplyToCommentIds(prev => ({ ...prev, [postId]: null }));
                }
            }
        } catch (err) {
            console.error("Error adding quick comment:", err);
        }
    };

    const handleSubmitReply = async (parentCommentId: number) => {
        if (!currentUser) {
            showAlert("Bạn cần đăng nhập để bình luận!");
            return;
        }
        if (!selectedPost) return;
        if (!replyText.trim()) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/forum/posts/${selectedPost.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: replyText.trim(),
                    replyToUserId,
                    parentId: parentCommentId
                })
            });
            if (res.ok) {
                setReplyText('');
                setReplyToUserId(null);
                setReplyToCommentId(null);
                await fetchPostDetail(selectedPost.id);
            }
        } catch (err) {
            console.error("Error adding comment reply:", err);
        }
    };

    const handleToggleRestrictComments = async (postId: number, currentRestricted: boolean | number | undefined, e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            const restrict = !currentRestricted;
            const res = await fetchWithAuth(`${API_BASE}/forum/posts/${postId}/restrict-comments`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restrict })
            });
            const data = await res.json();
            if (res.ok) {
                setPosts(prevPosts => prevPosts.map(post => {
                    if (post.id === postId) {
                        return { ...post, restrictComments: restrict };
                    }
                    return post;
                }));
                if (selectedPost && selectedPost.id === postId) {
                    setSelectedPost(prev => prev ? ({ ...prev, restrictComments: restrict }) : null);
                }
                if (showToast) showToast(restrict ? "Đã giới hạn bình luận, chỉ cho phép Admin/Mod!" : "Đã mở khóa bình luận tự do cho thành viên!");
            } else {
                if (showToast) showToast(data.error || "Lỗi thiết lập giới hạn bình luận.");
            }
        } catch (err) {
            console.error("Error toggling restrict comments:", err);
            if (showToast) showToast("Lỗi kết nối máy chủ.");
        }
    };

    const handleLikePost = async (postId: number, e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!currentUser) {
            showAlert("Bạn cần đăng nhập để tương tác bài viết!");
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_BASE}/forum/posts/${postId}/like`, {
                method: 'POST'
            });

            if (res.ok) {
                const data = await res.json();
                setPosts(prevPosts => prevPosts.map(post => {
                    if (post.id === postId) {
                        return {
                            ...post,
                            is_liked: data.isLiked ?? data.liked,
                            likes_count: data.likesCount
                        };
                    }
                    return post;
                }));
                if (selectedPost && selectedPost.id === postId) {
                    setSelectedPost(prev => prev ? ({
                        ...prev,
                        is_liked: data.isLiked ?? data.liked,
                        likes_count: data.likesCount
                    }) : null);
                }
            }
        } catch (err) {
            console.error("Error liking post:", err);
        }
    };

    const handleDeletePost = (postId: number, e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        triggerConfirm("Bạn có chắc chắn muốn xóa bài viết này không?", async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/forum/posts/${postId}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    if (selectedPost && selectedPost.id === postId) {
                        setSelectedPost(null);
                        setSubView('list');
                    }
                    if (showToast) showToast("Đã xóa bài viết thành công.");
                } else {
                    const data = await res.json();
                    showAlert(data.error || "Lỗi xóa bài viết.");
                }
            } catch (err) {
                console.error("Error deleting post:", err);
                showAlert("Lỗi kết nối máy chủ.");
            }
        });
    };

    const toggleCommentsExpand = async (postId: number, e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const opening = !expandedPostComments[postId];
        setExpandedPostComments(prev => ({
            ...prev,
            [postId]: opening
        }));
        if (!opening || loadedPostComments[postId] || loadingPostComments[postId]) return;
        setLoadingPostComments(prev => ({ ...prev, [postId]: true }));
        try {
            const response = await fetchWithAuth(`${API_BASE}/forum/posts/${postId}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Không thể tải bình luận.');
            setPosts(prev => prev.map(post => post.id === postId ? { ...post, comments: data.comments, comments_count: data.comments_count ?? post.comments_count } : post));
            setLoadedPostComments(prev => ({ ...prev, [postId]: true }));
        } catch (error) {
            showAlert(error instanceof Error ? error.message : 'Không thể tải bình luận.');
            setExpandedPostComments(prev => ({ ...prev, [postId]: false }));
        } finally {
            setLoadingPostComments(prev => ({ ...prev, [postId]: false }));
        }
    };

    const handleStartChat = (friend: SocialUser) => {
        setActiveChatFriend(friend);
    };

    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeChatFriend || !chatInputText.trim()) return;

        const text = chatInputText.trim();
        setChatInputText('');

        if (socket && socket.connected) {
            socket.emit('send_message', {
                receiverId: activeChatFriend.id,
                message: text
            }, (response: any) => {
                if (response && response.success && response.message) {
                    setChatMessages(prev => [...prev, response.message]);
                    setTimeout(() => {
                        const chatBoxBody = document.getElementById("fb-chat-body-container");
                        if (chatBoxBody) chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
                    }, 100);
                }
            });
        } else {
            try {
                const res = await fetchWithAuth(`${API_BASE}/social/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        receiver_id: activeChatFriend.id,
                        message: text
                    })
                });
                const data = await res.json();
                if (res.ok && data.message) {
                    setChatMessages(prev => [...prev, data.message]);
                    setTimeout(() => {
                        const chatBoxBody = document.getElementById("fb-chat-body-container");
                        if (chatBoxBody) chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
                    }, 100);
                }
            } catch (err) {
                console.error("Error sending message via HTTP:", err);
            }
        }
    };

    // Filter & Sort posts using normalized categories, saved tab, search query, and sort order
    const displayedPosts = React.useMemo(() => {
        let result = posts.filter(post => {
            if (activeCategory === 'saved') {
                if (!savedPostIds.includes(post.id)) return false;
            } else if (activeCategory !== 'all' && normalizeForumCategory(post.category) !== activeCategory) {
                return false;
            }
            if (forumSort === 'media') {
                const hasImg = !!post.image_url || (post.content && post.content.includes('[img]'));
                if (!hasImg) return false;
            }
            if (forumSearch.trim()) {
                const q = forumSearch.toLowerCase().trim();
                const titleMatch = (post.title || '').toLowerCase().includes(q);
                const contentMatch = (post.content || '').toLowerCase().includes(q);
                const authorMatch = (post.author_displayname || post.author_name || post.author_username || '').toLowerCase().includes(q);
                if (!titleMatch && !contentMatch && !authorMatch) return false;
            }
            return true;
        });

        if (forumSort === 'pinned') {
            result.sort((a, b) => {
                const aAnn = normalizeForumCategory(a.category) === 'announcement' ? 1 : 0;
                const bAnn = normalizeForumCategory(b.category) === 'announcement' ? 1 : 0;
                if (bAnn !== aAnn) return bAnn - aAnn;
                return ((b.likes_count || 0) + (b.comments_count || 0)) - ((a.likes_count || 0) + (a.comments_count || 0));
            });
        } else if (forumSort === 'hot') {
            result.sort((a, b) => {
                const aScore = (a.likes_count || 0) * 2 + (a.comments_count || 0) * 3;
                const bScore = (b.likes_count || 0) * 2 + (b.comments_count || 0) * 3;
                return bScore - aScore;
            });
        } else {
            result.sort((a, b) => b.id - a.id);
        }

        return result;
    }, [posts, activeCategory, savedPostIds, forumSearch, forumSort]);

    const formatCategoryName = (cat: string) => {
        const norm = normalizeForumCategory(cat);
        const found = CATEGORIES.find(c => c.id === norm);
        return found ? found.shortName : (cat || 'Thảo luận');
    };

    // Spotlight Stories Strip (Top 6 engaging / visual posts)
    const spotlightStories = React.useMemo(() => {
        return [...posts]
            .sort((a, b) => {
                const aHasImg = a.image_url ? 8 : 0;
                const bHasImg = b.image_url ? 8 : 0;
                const aScore = (a.likes_count || 0) + (a.comments_count || 0) * 2 + aHasImg;
                const bScore = (b.likes_count || 0) + (b.comments_count || 0) * 2 + bHasImg;
                return bScore - aScore;
            })
            .slice(0, 6);
    }, [posts]);

    // Hot trending posts for Right Sidebar
    const hotTrendingPosts = React.useMemo(() => {
        return [...posts]
            .sort((a, b) => ((b.likes_count || 0) * 2 + (b.comments_count || 0) * 3) - ((a.likes_count || 0) * 2 + (a.comments_count || 0) * 3))
            .slice(0, 5);
    }, [posts]);

    // Top Active Community Creators Leaderboard for Right Sidebar
    const topCreators = React.useMemo(() => {
        const map = new Map<string, {
            username: string;
            displayname: string;
            avatarSeed: string;
            xp: number;
            postsCount: number;
            likesReceived: number;
        }>();

        posts.forEach(p => {
            const uname = p.author_username || `user_${p.author_id}`;
            const existing = map.get(uname);
            if (existing) {
                existing.postsCount += 1;
                existing.likesReceived += (p.likes_count || 0);
            } else {
                map.set(uname, {
                    username: uname,
                    displayname: p.author_displayname || p.author_name || uname,
                    avatarSeed: p.author_avatar_seed || uname,
                    xp: p.author_xp || 1200,
                    postsCount: 1,
                    likesReceived: p.likes_count || 0
                });
            }
        });

        return Array.from(map.values())
            .sort((a, b) => (b.likesReceived + b.postsCount * 5) - (a.likesReceived + a.postsCount * 5))
            .slice(0, 5);
    }, [posts]);

    // Count posts per category accurately
    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = { all: posts.length, saved: savedPostIds.length };
        CATEGORIES.forEach(c => {
            if (c.id !== 'all') {
                counts[c.id] = posts.filter(p => normalizeForumCategory(p.category) === c.id).length;
            }
        });
        return counts;
    }, [posts, savedPostIds]);

    // Current user stats in forum
    const myForumStats = React.useMemo(() => {
        if (!currentUser) return { myPosts: 0, myLikes: 0 };
        const mine = posts.filter(p => p.author_id === currentUser.id || p.author_username === currentUser.username);
        const myLikes = mine.reduce((sum, p) => sum + (p.likes_count || 0), 0);
        return { myPosts: mine.length, myLikes };
    }, [posts, currentUser]);

    const totalCommentsCount = React.useMemo(() => posts.reduce((acc, p) => acc + (p.comments_count || 0), 0), [posts]);
    const totalLikesCount = React.useMemo(() => posts.reduce((acc, p) => acc + (p.likes_count || 0), 0), [posts]);

    return (
        <div className="page-view active forum-page-wrap social-hub-v3">
            
            {/* 1. COMPACT SOCIAL NETWORK COMMUNITY HEADER */}
            <div className="forum-hero-banner social-banner-v3">
                <div className="forum-hero-info">
                    <div className="social-hub-live-pill">
                        <span className="social-live-dot" />
                        <span>MẠNG XÃ HỘI LIGHT NOVEL • MUGENVERSE</span>
                    </div>
                    <h1 className="forum-hero-title">Quảng Trường Cộng Đồng MugenBunko</h1>
                    <p className="forum-hero-subtitle">
                        Không gian kết nối độc giả & tác giả — Review chuyên sâu, giải mã Spoiler, khoe tủ sách và thảo luận 24/7.
                    </p>
                    <div className="forum-hero-metrics">
                        <span className="forum-metric-item">
                            <Icons.Review /> <strong>{posts.length}</strong> bài đăng
                        </span>
                        <span className="forum-metric-item">
                            <Icons.Comment /> <strong>{totalCommentsCount}</strong> bình luận
                        </span>
                        <span className="forum-metric-item">
                            <Icons.Heart filled={true} size={14} /> <strong>{totalLikesCount}</strong> tương tác
                        </span>
                    </div>
                </div>
                <div className="forum-hero-cta">
                    {subView === 'list' ? (
                        <button 
                            className="primary-btn social-cta-post-btn" 
                            onClick={() => {
                                if (!currentUser) {
                                    showAlert("Vui lòng đăng nhập để đăng bài viết!");
                                    return;
                                }
                                setSubView('create');
                            }}
                        >
                            <Icons.Pen /> Đăng bài mới
                        </button>
                    ) : (
                        <button 
                            className="outline-btn" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                            onClick={() => { if (setInitialPostId) setInitialPostId(null); else setSubView('list'); }}
                        >
                            ← Về bảng tin cộng đồng
                        </button>
                    )}
                </div>
            </div>

            {/* 2. SUBVIEW LIST: TRUE 3-COLUMN SOCIAL NETWORK LAYOUT */}
            {subView === 'list' && (
                <div className="forum-layout-container social-grid-3col">
                    
                    {/* ================= LEFT SIDEBAR (STICKY): PROFILE, CHANNELS, HASHTAGS ================= */}
                    <aside className="sidebar-column social-sidebar-left">
                        
                        {/* User Mini Profile Card OR Community Welcome Card */}
                        {currentUser ? (() => {
                            const lvInfo = calculateUserLevel(currentUser.xp || 0);
                            return (
                                <div className="forum-sidebar-card social-profile-mini-card">
                                    <div className="social-profile-cover" />
                                    <div className="social-profile-body">
                                        <div 
                                            className="social-profile-avatar-wrap"
                                            onClick={() => viewPublicProfile?.(currentUser.username)}
                                        >
                                            <img src={getAvatarUrl(currentUser.avatarSeed)} alt={currentUser.displayname} />
                                            <span className="social-profile-online-badge" title="Đang hoạt động" />
                                        </div>
                                        <div className="social-profile-names">
                                            <h4 onClick={() => viewPublicProfile?.(currentUser.username)}>
                                                {currentUser.displayname}
                                            </h4>
                                            <span>@{currentUser.username}</span>
                                        </div>
                                        <div className="social-profile-level-row">
                                            <span className={`level-badge ${lvInfo.className}`}>
                                                Lv.{lvInfo.level} • {lvInfo.tierName}
                                            </span>
                                        </div>
                                        <div className="social-profile-xp-bar" title={`XP: ${currentUser.xp || 0}`}>
                                            <div className="social-profile-xp-fill" style={{ width: `${lvInfo.progressPercentage}%` }} />
                                        </div>
                                        <div className="social-profile-stats-grid">
                                            <div className="social-stat-box">
                                                <strong>{myForumStats.myPosts}</strong>
                                                <span>Bài đăng</span>
                                            </div>
                                            <div className="social-stat-box">
                                                <strong>{myForumStats.myLikes}</strong>
                                                <span>Lượt thích</span>
                                            </div>
                                            <div className="social-stat-box">
                                                <strong>{savedPostIds.length}</strong>
                                                <span>Đã lưu</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="forum-sidebar-card social-guest-card">
                                <div className="social-guest-badge">
                                    <Icons.Sparkles /> MUGENBUNKO SOCIAL
                                </div>
                                <h4>Tham gia Hội Độc Giả Light Novel!</h4>
                                <p>Đăng bài thảo luận, thả tim, lưu bài viết hay và kết bạn cùng hàng ngàn Wibu khác.</p>
                                <div className="social-profile-stats-grid" style={{ marginTop: '12px' }}>
                                    <div className="social-stat-box">
                                        <strong>{posts.length}</strong>
                                        <span>Bài viết</span>
                                    </div>
                                    <div className="social-stat-box">
                                        <strong>{totalCommentsCount}</strong>
                                        <span>Thảo luận</span>
                                    </div>
                                    <div className="social-stat-box">
                                        <strong>{topCreators.length}+</strong>
                                        <span>Creator</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Channels / Categories Navigation */}
                        <div className="forum-sidebar-card">
                            <h3 className="forum-sidebar-title">
                                <Icons.All /> Kênh Thảo Luận
                            </h3>
                            <div className="forum-category-nav">
                                {CATEGORIES.map(cat => {
                                    const IconComponent = cat.icon;
                                    const count = categoryCounts[cat.id] || 0;
                                    const isActive = activeCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`forum-category-btn-mono ${isActive ? 'active' : ''}`}
                                        >
                                            <div className="forum-cat-left">
                                                <span 
                                                    className="forum-cat-icon" 
                                                    style={{ color: isActive ? '#fff' : cat.color }}
                                                >
                                                    <IconComponent />
                                                </span>
                                                <span>{cat.name}</span>
                                            </div>
                                            <span className="forum-cat-count-badge">{count}</span>
                                        </button>
                                    );
                                })}

                                {/* Saved Posts Channel */}
                                <button
                                    onClick={() => setActiveCategory('saved')}
                                    className={`forum-category-btn-mono ${activeCategory === 'saved' ? 'active' : ''}`}
                                >
                                    <div className="forum-cat-left">
                                        <span className="forum-cat-icon" style={{ color: activeCategory === 'saved' ? '#fff' : '#ec4899' }}>
                                            <Icons.Bookmark filled={activeCategory === 'saved'} />
                                        </span>
                                        <span>Bài viết đã lưu</span>
                                    </div>
                                    <span className="forum-cat-count-badge">{savedPostIds.length}</span>
                                </button>
                            </div>
                        </div>

                        {/* Interactive Trending Hashtags */}
                        <div className="forum-sidebar-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 className="forum-sidebar-title" style={{ margin: 0, padding: 0, border: 'none' }}>
                                    <Icons.Hash /> Chủ Đề Thịnh Hành
                                </h3>
                                {forumSearch.startsWith('#') && (
                                    <button 
                                        type="button"
                                        onClick={() => setForumSearch('')}
                                        style={{ background: 'none', border: 'none', color: 'var(--sakura-pink)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Bỏ lọc
                                    </button>
                                )}
                            </div>
                            <div className="social-hashtag-list">
                                {TRENDING_TAGS.map(item => {
                                    const isSelected = forumSearch.toLowerCase() === item.tag.toLowerCase();
                                    return (
                                        <button
                                            key={item.tag}
                                            type="button"
                                            className={`social-hashtag-row ${isSelected ? 'active' : ''}`}
                                            onClick={() => {
                                                setActiveCategory('all');
                                                setForumSearch(prev => prev.toLowerCase() === item.tag.toLowerCase() ? '' : item.tag);
                                            }}
                                        >
                                            <div className="social-hashtag-main">
                                                <span className="social-hashtag-name">{item.tag}</span>
                                                <span className="social-hashtag-desc">{item.desc}</span>
                                            </div>
                                            <span className="social-hashtag-arrow">→</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    {/* ================= CENTER COLUMN: STORIES, COMPOSER, SOCIAL FEED ================= */}
                    <div className="main-column social-feed-center">
                        
                        {/* 2A. COMMUNITY STORIES / SPOTLIGHT CAROUSEL */}
                        {spotlightStories.length > 0 && (
                            <div className="social-stories-strip-card">
                                <div className="social-stories-header">
                                    <span className="social-stories-title">
                                        <Icons.Sparkles /> Tiêu Điểm Cộng Đồng Hôm Nay
                                    </span>
                                    <span className="social-stories-sub">Lướt xem các thảo luận nổi bật nhất</span>
                                </div>
                                <div className="social-stories-scroll">
                                    {spotlightStories.map((story) => {
                                        const normCat = normalizeForumCategory(story.category);
                                        const bgImg = story.image_url || getAvatarUrl(story.author_avatar_seed);
                                        return (
                                            <div 
                                                key={story.id} 
                                                className="social-story-item"
                                                onClick={() => { if (setInitialPostId) setInitialPostId(story.id); else fetchPostDetail(story.id); }}
                                            >
                                                <div 
                                                    className="social-story-bg" 
                                                    style={{ backgroundImage: `url(${bgImg})` }}
                                                />
                                                <div className="social-story-overlay" />
                                                <div className="social-story-top">
                                                    <div className="social-story-avatar-ring">
                                                        <img src={getAvatarUrl(story.author_avatar_seed)} alt={story.author_displayname} />
                                                    </div>
                                                    <span className={`social-story-cat-pill cat-${normCat}`}>
                                                        {formatCategoryName(story.category)}
                                                    </span>
                                                </div>
                                                <div className="social-story-bottom">
                                                    <div className="social-story-post-title">{story.title}</div>
                                                    <div className="social-story-author-meta">
                                                        <span>{story.author_displayname}</span>
                                                        <span>❤️ {story.likes_count || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2B. SOCIAL COMPOSER BOX (Visible for both logged-in users & guests) */}
                        <div className="forum-quick-create-box social-composer-card">
                            {!isQuickCreateExpanded ? (
                                <>
                                    <div 
                                        className="forum-qc-collapsed" 
                                        onClick={() => {
                                            if (!currentUser) {
                                                showAlert("Bạn cần đăng nhập để đăng bài lên bảng tin!");
                                                return;
                                            }
                                            setIsQuickCreateExpanded(true);
                                        }}
                                    >
                                        <div className="forum-qc-avatar">
                                            <img 
                                                src={getAvatarUrl(currentUser?.avatarSeed || 'GuestReader')} 
                                                alt="Avatar" 
                                            />
                                        </div>
                                        <div className="forum-qc-fake-input">
                                            {currentUser 
                                                ? `Bạn đang đọc bộ Light Novel nào thế, ${currentUser.displayname}? Chia sẻ ngay...`
                                                : 'Bạn đang nghĩ gì về bộ truyện mới đọc? Đăng nhập để chia sẻ cùng cộng đồng...'}
                                        </div>
                                    </div>
                                    <div className="forum-qc-quick-actions social-composer-quick-chips">
                                        <button 
                                            type="button" 
                                            className="forum-qc-action-btn chip-review"
                                            onClick={() => {
                                                if (!currentUser) return showAlert("Vui lòng đăng nhập để viết bài Review!");
                                                setQuickCategory('review');
                                                setIsQuickCreateExpanded(true);
                                            }}
                                        >
                                            <Icons.Review /> Viết Review
                                        </button>
                                        <button 
                                            type="button" 
                                            className="forum-qc-action-btn chip-spoil"
                                            onClick={() => {
                                                if (!currentUser) return showAlert("Vui lòng đăng nhập để đăng bài Spoil!");
                                                setQuickCategory('spoil');
                                                setIsQuickCreateExpanded(true);
                                            }}
                                        >
                                            <Icons.Spoil /> Bàn Spoil
                                        </button>
                                        <button 
                                            type="button" 
                                            className="forum-qc-action-btn chip-qa"
                                            onClick={() => {
                                                if (!currentUser) return showAlert("Vui lòng đăng nhập để đặt câu hỏi!");
                                                setQuickCategory('qa');
                                                setIsQuickCreateExpanded(true);
                                            }}
                                        >
                                            <Icons.QA /> Hỏi đáp / Tìm truyện
                                        </button>
                                        <button 
                                            type="button" 
                                            className="forum-qc-action-btn chip-media"
                                            onClick={() => {
                                                if (!currentUser) return showAlert("Vui lòng đăng nhập để đăng ảnh!");
                                                setQuickCategory('misc');
                                                setIsQuickCreateExpanded(true);
                                            }}
                                        >
                                            <Icons.Image /> Khoe góc Wibu
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleQuickCreatePost} className="quick-create-expanded-form">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Icons.Pen /> Tạo bài đăng trên Bảng Tin
                                        </h4>
                                        <button 
                                            type="button" 
                                            className="icon-btn" 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                            onClick={() => {
                                                setIsQuickCreateExpanded(false);
                                                setQuickTitle('');
                                                setQuickContent('');
                                                setQuickImageUrls([]);
                                                setQuickImageFiles([]);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <input 
                                        type="text" 
                                        placeholder="Tiêu đề bài viết ấn tượng (VD: [Review] Tập 9 quá đỉnh...)" 
                                        value={quickTitle} 
                                        onChange={(e) => setQuickTitle(e.target.value)} 
                                        required
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                                    />

                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chuyên mục:</label>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setQuickCategory(cat.id)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '999px',
                                                        fontSize: '0.74rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        border: '1px solid',
                                                        borderColor: quickCategory === cat.id ? cat.color : 'var(--border-color)',
                                                        background: quickCategory === cat.id ? cat.color : 'var(--bg-base)',
                                                        color: quickCategory === cat.id ? '#fff' : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {cat.shortName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <RichTextEditor 
                                        placeholder="Chia sẻ cảm nhận, đánh giá, giả thuyết hoặc đính kèm hashtag #Isekai #ReviewTruyen..." 
                                        value={quickContent} 
                                        onChange={setQuickContent} 
                                        minHeight="120px"
                                    />

                                    {/* Image attachments selection */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label className="outline-btn small" style={{ cursor: 'pointer', margin: 0, padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <Icons.Image /> Đính kèm ảnh minh họa
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    multiple
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        if (files.length > 0) {
                                                            setQuickImageFiles(prev => [...prev, ...files]);
                                                            setQuickImageUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                                                        }
                                                    }}
                                                />
                                            </label>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {quickImageFiles.length > 0 ? `${quickImageFiles.length} ảnh đã chọn` : 'Tối đa 5 ảnh'}
                                            </span>
                                        </div>

                                        {quickImageUrls.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                                {quickImageUrls.map((url, idx) => (
                                                    <div key={idx} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                                        <img 
                                                            src={url} 
                                                            alt={`Preview ${idx}`} 
                                                            style={{ width: '90px', height: '68px', display: 'block', objectFit: 'cover' }} 
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeQuickImage(idx)}
                                                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}
                                                            title="Xóa ảnh"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                        <button 
                                            type="button" 
                                            className="outline-btn small" 
                                            onClick={() => {
                                                setIsQuickCreateExpanded(false);
                                                setQuickTitle('');
                                                setQuickContent('');
                                                setQuickImageUrls([]);
                                                setQuickImageFiles([]);
                                            }}
                                        >
                                            Hủy
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="primary-btn small" 
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            disabled={isSubmittingPost}
                                        >
                                            <Icons.Send /> {isSubmittingPost ? 'Đang đăng...' : 'Đăng lên Bảng Tin'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* 2C. SOCIAL FEED FILTER TABS & SEARCH BAR */}
                        <div className="social-feed-toolbar">
                            <div className="social-feed-tabs">
                                {[
                                    { id: 'newest', label: '✨ Mới nhất' },
                                    { id: 'hot', label: '🔥 Đang Sôi Nổi' },
                                    { id: 'pinned', label: '📢 Đáng Chú Ý' },
                                    { id: 'media', label: '🖼️ Có Hình Ảnh' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        className={`social-feed-tab-btn ${forumSort === tab.id ? 'active' : ''}`}
                                        onClick={() => setForumSort(tab.id as any)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="social-feed-search-box">
                                <Icons.Search size={13} />
                                <input
                                    type="text"
                                    placeholder="Tìm bài viết, #hashtag, tác giả..."
                                    value={forumSearch}
                                    onChange={(e) => setForumSearch(e.target.value)}
                                />
                                {forumSearch && (
                                    <button
                                        type="button"
                                        className="social-search-clear-btn"
                                        onClick={() => setForumSearch('')}
                                        title="Xóa tìm kiếm"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Active Channel / Hashtag Banner */}
                        {(activeCategory !== 'all' || forumSearch.trim() !== '') && (
                            <div className="social-active-filter-bar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Đang hiển thị:</span>
                                    {activeCategory !== 'all' && (
                                        <span className="social-filter-chip">
                                            Chuyên mục: <strong>{activeCategory === 'saved' ? '🔖 Bài viết đã lưu' : formatCategoryName(activeCategory)}</strong>
                                            <button type="button" onClick={() => setActiveCategory('all')}>✕</button>
                                        </span>
                                    )}
                                    {forumSearch.trim() !== '' && (
                                        <span className="social-filter-chip">
                                            Từ khóa: <strong>{forumSearch}</strong>
                                            <button type="button" onClick={() => setForumSearch('')}>✕</button>
                                        </span>
                                    )}
                                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                        ({displayedPosts.length} kết quả)
                                    </span>
                                </div>
                                <button 
                                    type="button" 
                                    className="social-reset-filter-btn"
                                    onClick={() => { setActiveCategory('all'); setForumSearch(''); setForumSort('newest'); }}
                                >
                                    Đặt lại
                                </button>
                            </div>
                        )}

                        {/* 2D. SOCIAL POST STREAM */}
                        {loading && (
                            <div className="social-loading-card">
                                Đang tải luồng thảo luận cộng đồng...
                            </div>
                        )}

                        {!loading && displayedPosts.length === 0 && (
                            <div className="social-empty-feed-card">
                                <div style={{ marginBottom: '8px', opacity: 0.6 }}><Icons.All /></div>
                                <h4>Không tìm thấy bài thảo luận nào phù hợp</h4>
                                <p>Thử đổi chuyên mục khác hoặc là người đầu tiên khởi xướng chủ đề này nhé!</p>
                                {(activeCategory !== 'all' || forumSearch) && (
                                    <button 
                                        type="button" 
                                        className="outline-btn small" 
                                        style={{ marginTop: '12px' }}
                                        onClick={() => { setActiveCategory('all'); setForumSearch(''); setForumSort('newest'); }}
                                    >
                                        Xem tất cả bài đăng
                                    </button>
                                )}
                            </div>
                        )}

                        {!loading && displayedPosts.length > 0 && (
                            <div className="social-posts-stream">
                                {displayedPosts.map(post => {
                                    const isAuthorOrAdmin = currentUser && (post.author_id === currentUser.id || currentUser.roles.includes('admin'));
                                    const isCommentsOpen = !!expandedPostComments[post.id];
                                    const quickCommentVal = quickCommentTexts[post.id] || "";
                                    const { cleanContent, images: extractedImages } = extractAndCleanImages(post.content);
                                    const allImages = [post.image_url, ...extractedImages].filter(Boolean) as string[];
                                    const normCat = normalizeForumCategory(post.category);
                                    const isSpoilerPost = normCat === 'spoil';
                                    const isSpoilerRevealed = !!revealedSpoilers[post.id];
                                    const isLongPost = cleanContent.length > 360;
                                    const isExpanded = !!expandedPosts[post.id];
                                    const displayBodyText = (isLongPost && !isExpanded)
                                        ? cleanContent.slice(0, 360).trim() + '...'
                                        : cleanContent;
                                    const postHashtags = extractHashtags(cleanContent);
                                    const isSaved = savedPostIds.includes(post.id);
                                    const authorLv = calculateUserLevel(post.author_xp || (post.author_level ? post.author_level * 600 : 800));

                                    return (
                                        <article key={post.id} className={`forum-post-card-v2 social-post-card cat-border-${normCat}`}>
                                            
                                            {/* Post Header: Author Avatar, Name, Level Badge, Relative Time, Category Flair */}
                                            <div className="forum-post-header-v2">
                                                <div className="forum-author-block">
                                                    <div 
                                                        className={`forum-author-avatar-wrap level-ring-${authorLv.level}`}
                                                        onClick={() => post.author_username && viewPublicProfile?.(post.author_username)}
                                                    >
                                                        <img src={getAvatarUrl(post.author_avatar_seed)} alt={post.author_username} />
                                                    </div>
                                                    <div className="forum-author-details">
                                                        <div className="forum-author-name-row">
                                                            <span 
                                                                className="forum-author-name"
                                                                onClick={() => post.author_username && viewPublicProfile?.(post.author_username)}
                                                            >
                                                                {post.author_displayname || post.author_name || post.author_username}
                                                            </span>
                                                            <span className={`level-badge ${authorLv.className} social-post-lv-badge`}>
                                                                Lv.{authorLv.level} {authorLv.tierName}
                                                            </span>
                                                        </div>
                                                        <div className="forum-post-time">
                                                            <span className="forum-author-handle">@{post.author_username}</span>
                                                            <span>•</span>
                                                            <span title={new Date(post.created_at).toLocaleString('vi-VN')}>
                                                                {formatRelativeTime(post.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="forum-post-badges-right">
                                                    <span 
                                                        className={`forum-cat-badge-pill social-cat-flair flair-${normCat}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveCategory(normCat);
                                                        }}
                                                        title={`Lọc chuyên mục ${formatCategoryName(post.category)}`}
                                                    >
                                                        {formatCategoryName(post.category)}
                                                    </span>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => handleToggleRestrictComments(post.id, post.restrictComments || post.restrict_comments, e)}
                                                            style={{ background: 'none', border: 'none', color: (post.restrictComments || post.restrict_comments) ? 'var(--sakura-pink)' : 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                            title={(post.restrictComments || post.restrict_comments) ? "Mở khóa bình luận thành viên" : "Chỉ cho phép BQL bình luận"}
                                                        >
                                                            {(post.restrictComments || post.restrict_comments) ? <Icons.Lock /> : <Icons.Unlock />}
                                                        </button>
                                                    )}
                                                    {isAuthorOrAdmin && (
                                                        <button
                                                            onClick={(e) => handleDeletePost(post.id, e)}
                                                            style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '4px' }}
                                                            title="Xóa bài viết"
                                                        >
                                                            <Icons.Trash />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Post Title & Body Content */}
                                            <div>
                                                <h3 
                                                    className="forum-post-title-v2 social-post-title"
                                                    onClick={() => { if (setInitialPostId) setInitialPostId(post.id); else fetchPostDetail(post.id); }}
                                                >
                                                    {post.title}
                                                </h3>

                                                {/* Spoiler Guard OR Normal Content */}
                                                {isSpoilerPost && !isSpoilerRevealed ? (
                                                    <div 
                                                        className="social-spoiler-shield"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRevealedSpoilers(prev => ({ ...prev, [post.id]: true }));
                                                        }}
                                                    >
                                                        <div className="social-spoiler-blurred-preview">
                                                            {cleanContent.slice(0, 220)}
                                                        </div>
                                                        <div className="social-spoiler-overlay-cta">
                                                            <span className="social-spoiler-badge">
                                                                <Icons.Spoil /> CẢNH BÁO SPOILER CỐT TRUYỆN
                                                            </span>
                                                            <p>Bài viết có chứa tình tiết tiết lộ trước nội dung Light Novel.</p>
                                                            <button type="button" className="social-spoiler-reveal-btn">
                                                                <Icons.Eye /> Nhấn để hiển thị nội dung
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div 
                                                            className="forum-post-body-text social-post-body"
                                                            onClick={() => { if (setInitialPostId) setInitialPostId(post.id); else fetchPostDetail(post.id); }}
                                                        >
                                                            {parseFormattedContent(displayBodyText)}
                                                        </div>

                                                        {isLongPost && (
                                                            <button
                                                                type="button"
                                                                className="social-readmore-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                                                                }}
                                                            >
                                                                {isExpanded ? 'Thu gọn nội dung ↑' : 'Xem thêm toàn bộ bài viết ↓'}
                                                            </button>
                                                        )}

                                                        {/* Extracted Clickable Hashtags */}
                                                        {postHashtags.length > 0 && (
                                                            <div className="social-post-hashtags">
                                                                {postHashtags.map(tag => (
                                                                    <span
                                                                        key={tag}
                                                                        className="social-post-tag-chip"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveCategory('all');
                                                                            setForumSearch(tag);
                                                                        }}
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {allImages.length > 0 && (
                                                            <div className="social-post-media-wrap" onClick={(e) => e.stopPropagation()}>
                                                                <ForumImageGrid images={allImages} onImageClick={(url) => setLightboxImage(url)} />
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Social Action Bar: Like, Comment, Save, Share */}
                                            <div className="forum-interaction-bar-v2 social-action-bar">
                                                <div className="forum-actions-left">
                                                    <button 
                                                        className={`forum-action-btn-mono social-btn-like ${post.is_liked ? 'liked' : ''}`}
                                                        onClick={(e) => handleLikePost(post.id, e)}
                                                        title="Thả tim bài viết"
                                                    >
                                                        <Icons.Heart filled={!!post.is_liked} />
                                                        <span>{post.likes_count || 0} Thích</span>
                                                    </button>
                                                    <button 
                                                        className={`forum-action-btn-mono social-btn-comment ${isCommentsOpen ? 'active' : ''}`}
                                                        onClick={(e) => toggleCommentsExpand(post.id, e)}
                                                        title="Mở bình luận nhanh"
                                                    >
                                                        <Icons.Comment />
                                                        <span>{post.comments_count || 0} Bình luận</span>
                                                    </button>
                                                </div>

                                                <div className="social-actions-right">
                                                    <button 
                                                        className={`forum-action-btn-mono social-btn-save ${isSaved ? 'saved' : ''}`}
                                                        onClick={(e) => toggleSavePost(post.id, e)}
                                                        title={isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
                                                    >
                                                        <Icons.Bookmark filled={isSaved} />
                                                        <span>{isSaved ? 'Đã lưu' : 'Lưu'}</span>
                                                    </button>
                                                    <button 
                                                        className="forum-action-btn-mono social-btn-share"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (navigator.clipboard) {
                                                                navigator.clipboard.writeText(`${window.location.origin}/#/forum?post=${post.id}`);
                                                                showAlert("🔗 Đã sao chép liên kết bài viết!");
                                                            }
                                                        }}
                                                        title="Chia sẻ liên kết"
                                                    >
                                                        <Icons.Share />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Quick Comments Drawer */}
                                            {isCommentsOpen && (
                                                <div className="quick-comments-section social-comments-drawer">
                                                    {loadingPostComments[post.id] ? (
                                                        <p role="status" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '10px 0' }}>
                                                            Đang tải chuỗi bình luận...
                                                        </p>
                                                    ) : post.comments && post.comments.length > 0 ? (
                                                        <div className="social-comments-list">
                                                            {post.comments.map(c => (
                                                                <div key={c.id} className="social-comment-item">
                                                                    <img 
                                                                        src={getAvatarUrl(c.author_avatar_seed)} 
                                                                        className="social-comment-avatar"
                                                                        alt={c.author_username}
                                                                        onClick={() => c.author_username && viewPublicProfile?.(c.author_username)}
                                                                    />
                                                                    <div className="social-comment-content-col">
                                                                        <div className="social-comment-bubble">
                                                                            <div className="social-comment-head">
                                                                                <strong onClick={() => c.author_username && viewPublicProfile?.(c.author_username)}>
                                                                                    {c.author_displayname || c.displayname || c.author_username}
                                                                                </strong>
                                                                                <span className="social-comment-handle">@{c.author_username || c.username}</span>
                                                                                <span className="social-comment-time">{formatRelativeTime(c.created_at)}</span>
                                                                            </div>
                                                                            <div className="social-comment-text">
                                                                                {parseFormattedContent(c.text)}
                                                                            </div>
                                                                        </div>

                                                                        {/* Replies */}
                                                                        {c.replies && c.replies.map(reply => (
                                                                            <div key={reply.id} className="social-comment-reply">
                                                                                <img 
                                                                                    src={getAvatarUrl(reply.author_avatar_seed)} 
                                                                                    className="social-comment-avatar small"
                                                                                    alt={reply.author_username}
                                                                                />
                                                                                <div className="social-comment-bubble reply-bubble">
                                                                                    <div className="social-comment-head">
                                                                                        <strong>{reply.author_displayname || reply.displayname || reply.author_username}</strong>
                                                                                        <span className="social-comment-time">{formatRelativeTime(reply.created_at)}</span>
                                                                                    </div>
                                                                                    <div className="social-comment-text">
                                                                                        {parseFormattedContent(reply.text)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                                                            Chưa có bình luận nào. Hãy mở đầu cuộc trò chuyện!
                                                        </div>
                                                    )}

                                                    {/* Quick comment input */}
                                                    {currentUser && (!post.restrictComments || isStaff) ? (
                                                        <form onSubmit={(e) => handleQuickCommentSubmit(post.id, e)} className="quick-comment-input-form" style={{ marginTop: '10px' }}>
                                                            <img 
                                                                src={getAvatarUrl(currentUser.avatarSeed)} 
                                                                alt="Me" 
                                                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} 
                                                            />
                                                            <input 
                                                                id={`quick-comment-input-${post.id}`}
                                                                type="text" 
                                                                className="quick-comment-input" 
                                                                placeholder="Viết bình luận phản hồi..." 
                                                                value={quickCommentVal}
                                                                onChange={(e) => setQuickCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                            />
                                                            <button type="submit" className="quick-comment-submit-btn" title="Gửi">
                                                                <Icons.Send />
                                                            </button>
                                                        </form>
                                                    ) : currentUser ? (
                                                        <div style={{ padding: '6px', color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                            <Icons.Lock size={12} /> Bình luận tạm khóa cho thành viên.
                                                        </div>
                                                    ) : (
                                                        <div style={{ padding: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                                                            Đăng nhập để tham gia bình luận bài viết này.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ================= RIGHT SIDEBAR (STICKY): TOP CREATORS, HOT THREADS, FRIENDS ================= */}
                    <aside className="sidebar-column social-sidebar-right">
                        
                        {/* Top Active Creators Leaderboard */}
                        <div className="forum-sidebar-card">
                            <h3 className="forum-sidebar-title">
                                <Icons.Trophy /> Bảng Phong Thần Creator
                            </h3>
                            <div className="social-creators-list">
                                {topCreators.map((creator, idx) => {
                                    const lv = calculateUserLevel(creator.xp);
                                    return (
                                        <div 
                                            key={creator.username} 
                                            className="social-creator-row"
                                            onClick={() => {
                                                if (viewPublicProfile) viewPublicProfile(creator.username);
                                                else setForumSearch(creator.displayname);
                                            }}
                                        >
                                            <span className={`social-creator-rank rank-${idx + 1}`}>
                                                {idx + 1}
                                            </span>
                                            <img 
                                                src={getAvatarUrl(creator.avatarSeed)} 
                                                alt={creator.displayname} 
                                                className="social-creator-avatar"
                                            />
                                            <div className="social-creator-info">
                                                <div className="social-creator-name-line">
                                                    <strong>{creator.displayname}</strong>
                                                    <span className={`level-badge ${lv.className}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                                                        Lv.{lv.level}
                                                    </span>
                                                </div>
                                                <div className="social-creator-stats">
                                                    <span>{creator.postsCount} bài</span>
                                                    <span>•</span>
                                                    <span>❤️ {creator.likesReceived}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Hot Threads Widget */}
                        <div className="forum-sidebar-card">
                            <h3 className="forum-sidebar-title">
                                <Icons.Trending /> Tâm Điểm Thảo Luận
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {hotTrendingPosts.map((hp, idx) => {
                                    const normCat = normalizeForumCategory(hp.category);
                                    return (
                                        <div 
                                            key={hp.id} 
                                            className="forum-hot-thread-item"
                                            onClick={() => { if (setInitialPostId) setInitialPostId(hp.id); else fetchPostDetail(hp.id); }}
                                        >
                                            <span className={`forum-hot-num top-${idx + 1}`}>#{idx + 1}</span>
                                            <div className="forum-hot-info">
                                                <div className="forum-hot-title" title={hp.title}>{hp.title}</div>
                                                <div className="forum-hot-meta">
                                                    <span className={`social-mini-cat-dot cat-${normCat}`}>{formatCategoryName(hp.category)}</span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                        <Icons.Heart size={11} filled={true} /> {hp.likes_count || 0}
                                                    </span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                        <Icons.MessageSquare size={11} /> {hp.comments_count || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Live Contacts (if logged in) OR Community Rules */}
                        {currentUser && (
                            <div className="forum-sidebar-card">
                                <h3 className="forum-sidebar-title">
                                    <Icons.Users /> Bạn Bè Trực Tuyến
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {forumFriends.map(friend => (
                                        <div 
                                            key={friend.id} 
                                            className="forum-contact-row" 
                                            onClick={() => handleStartChat(friend)}
                                        >
                                            <div className="forum-contact-avatar-wrap">
                                                <img src={getAvatarUrl(friend.avatarSeed)} alt={friend.displayname} />
                                                {onlineUsers[friend.id] && (
                                                    <span className="forum-online-dot-pulse" title="Trực tuyến" />
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {friend.displayname}
                                                </div>
                                                <div style={{ fontSize: '0.68rem', color: onlineUsers[friend.id] ? '#2ecc71' : 'var(--text-muted)' }}>
                                                    {onlineUsers[friend.id] ? 'Đang hoạt động' : 'Ngoại tuyến'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {forumFriends.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '10px 0', textAlign: 'center' }}>
                                            Kết bạn với các thành viên trên diễn đàn để trò chuyện trực tiếp!
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Community Guidelines */}
                        <div className="forum-sidebar-card">
                            <h3 className="forum-sidebar-title">
                                <Icons.Shield /> Văn Hóa MugenBunko
                            </h3>
                            <ul className="forum-guidelines-list">
                                <li className="forum-guideline-item">
                                    <span className="forum-guideline-dot">1.</span>
                                    <span>Tôn trọng đa dạng gu đọc truyện, tranh luận văn minh.</span>
                                </li>
                                <li className="forum-guideline-item">
                                    <span className="forum-guideline-dot">2.</span>
                                    <span>Luôn chọn chuyên mục <strong>Spoil</strong> khi tiết lộ tình tiết quan trọng.</span>
                                </li>
                                <li className="forum-guideline-item">
                                    <span className="forum-guideline-dot">3.</span>
                                    <span>Ghi rõ nguồn khi chia sẻ tranh minh họa / Fanart.</span>
                                </li>
                            </ul>
                        </div>
                    </aside>
                </div>
            )}

            {/* 3. SUBVIEW CREATE: FULL-PAGE CREATE POST VIEW */}
            {subView === 'create' && (
                <div style={{ maxWidth: '880px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <button 
                            className="outline-btn small" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => { if (setInitialPostId) setInitialPostId(null); else setSubView('list'); }}
                        >
                            ← Quay lại bảng tin cộng đồng
                        </button>
                    </div>

                    <div className="forum-post-card-v2" style={{ padding: '32px' }}>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 20px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icons.Pen /> Đăng Bài Viết Mới Lên Quảng Trường
                        </h2>

                        <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                                    Tiêu đề bài viết <span style={{ color: 'var(--sakura-pink)' }}>*</span>
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Nhập tiêu đề bài viết rõ ràng, hấp dẫn..." 
                                    value={newTitle} 
                                    onChange={(e) => setNewTitle(e.target.value)} 
                                    required
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                                    Chuyên mục bài đăng <span style={{ color: 'var(--sakura-pink)' }}>*</span>
                                </label>
                                <select 
                                    value={newCategory} 
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                                >
                                    <option value="general">Thảo luận chung</option>
                                    <option value="review">Review & Đánh giá tác phẩm</option>
                                    <option value="spoil">Spoil & Giả thuyết tình tiết</option>
                                    <option value="qa">Hỏi đáp & Tìm truyện</option>
                                    <option value="misc">Góc Wibu & Fanart</option>
                                    <option value="announcement">Thông báo hệ thống</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                                    Nội dung chi tiết <span style={{ color: 'var(--sakura-pink)' }}>*</span>
                                </label>
                                <RichTextEditor 
                                    placeholder="Soạn nội dung thảo luận, review, chia sẻ cảm nhận (có thể thêm hashtag như #Isekai #ReviewTruyen)..." 
                                    value={newContent} 
                                    onChange={setNewContent} 
                                    minHeight="180px"
                                />
                            </div>

                            {/* Image attachment file upload */}
                            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                                    Thêm hình ảnh bài đăng (Tùy chọn)
                                </label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <label className="outline-btn small" style={{ cursor: 'pointer', margin: 0, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <Icons.Image /> Chọn file ảnh từ máy
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                if (files.length > 0) {
                                                    setNewImageFiles(prev => [...prev, ...files]);
                                                    setNewImageUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                                                }
                                            }}
                                        />
                                    </label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {newImageFiles.length > 0 ? `Đã chọn ${newImageFiles.length} ảnh` : 'Hỗ trợ định dạng JPG, PNG, WEBP'}
                                    </span>
                                </div>
                                {newImageUrls.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                                        {newImageUrls.map((url, idx) => (
                                            <div key={idx} style={{ position: 'relative', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                                <img 
                                                    src={url} 
                                                    alt={`Preview Attachment ${idx}`} 
                                                    style={{ width: '120px', height: '90px', display: 'block', objectFit: 'cover' }} 
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeNewImage(idx)}
                                                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}
                                                    title="Xóa ảnh này"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                                <button 
                                    type="button" 
                                    className="outline-btn" 
                                    onClick={() => {
                                        setSubView('list');
                                        if (setInitialPostId) setInitialPostId(null);
                                        setNewTitle('');
                                        setNewContent('');
                                        setNewImageUrls([]);
                                        setNewImageFiles([]);
                                    }}
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit" 
                                    className="primary-btn" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    disabled={isSubmittingPost}
                                >
                                    <Icons.Send /> {isSubmittingPost ? 'Đang đăng...' : 'Đăng bài viết'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. SUBVIEW DETAIL: FULL POST VIEW */}
            {subView === 'detail' && selectedPost && (() => {
                const { cleanContent: detailCleanContent, images: detailExtractedImages } = extractAndCleanImages(selectedPost.content);
                const detailAllImages = [selectedPost.image_url, ...detailExtractedImages].filter(Boolean) as string[];
                const normCat = normalizeForumCategory(selectedPost.category);
                const authorLv = calculateUserLevel(selectedPost.author_xp || 1000);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto' }}>
                        
                        {/* Back button */}
                        <div>
                            <button 
                                className="outline-btn small" 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => { setSubView('list'); if (setInitialPostId) setInitialPostId(null); }}
                            >
                                ← Quay lại bảng tin cộng đồng
                            </button>
                        </div>

                        {/* Main Article Container */}
                        <div className={`forum-post-card-v2 social-post-card cat-border-${normCat}`} style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span className={`forum-cat-badge-pill social-cat-flair flair-${normCat}`}>
                                    {formatCategoryName(selectedPost.category)}
                                </span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => handleToggleRestrictComments(selectedPost.id, selectedPost.restrictComments || selectedPost.restrict_comments, e)}
                                            className="outline-btn small"
                                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                        >
                                            {(selectedPost.restrictComments || selectedPost.restrict_comments) ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Icons.Lock size={12} /> Chỉ BQL
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Icons.Unlock size={12} /> Tự do
                                                </span>
                                            )}
                                        </button>
                                    )}
                                    {currentUser && (selectedPost.author_id === currentUser.id || currentUser.roles.includes('admin')) && (
                                        <button
                                            onClick={(e) => handleDeletePost(selectedPost.id, e)}
                                            className="outline-btn small"
                                            style={{ color: '#e74c3c', borderColor: '#e74c3c', fontSize: '0.75rem', padding: '4px 10px' }}
                                        >
                                            <Icons.Trash /> Xóa bài
                                        </button>
                                    )}
                                </div>
                            </div>

                            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', lineHeight: 1.35 }}>
                                {selectedPost.title}
                            </h1>

                            {/* Author Info Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
                                <div 
                                    className="forum-author-avatar-wrap"
                                    onClick={() => selectedPost.author_username && viewPublicProfile?.(selectedPost.author_username)}
                                >
                                    <img src={getAvatarUrl(selectedPost.author_avatar_seed)} alt={selectedPost.author_username} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }} onClick={() => selectedPost.author_username && viewPublicProfile?.(selectedPost.author_username)}>
                                            {selectedPost.author_displayname}
                                        </span>
                                        <span className={`level-badge ${authorLv.className} social-post-lv-badge`}>
                                            Lv.{authorLv.level} {authorLv.tierName}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        @{selectedPost.author_username} • {formatRelativeTime(selectedPost.created_at)}
                                    </div>
                                </div>
                            </div>

                            {/* Content text */}
                            <div style={{ fontSize: '0.96rem', lineHeight: 1.8, color: 'var(--text-content)', minHeight: '100px' }}>
                                {parseFormattedContent(detailCleanContent)}
                            </div>

                            {detailAllImages.length > 0 && (
                                <div style={{ marginTop: '20px' }}>
                                    <ForumImageGrid images={detailAllImages} onImageClick={(url) => setLightboxImage(url)} />
                                </div>
                            )}

                            {/* Interaction Bar */}
                            <div className="forum-interaction-bar-v2 social-action-bar" style={{ marginTop: '24px' }}>
                                <div className="forum-actions-left">
                                    <button 
                                        className={`forum-action-btn-mono social-btn-like ${selectedPost.is_liked ? 'liked' : ''}`}
                                        onClick={(e) => handleLikePost(selectedPost.id, e)}
                                    >
                                        <Icons.Heart filled={!!selectedPost.is_liked} />
                                        <span>{selectedPost.likes_count || 0} Thích</span>
                                    </button>
                                    <span className="forum-action-btn-mono" style={{ cursor: 'default' }}>
                                        <Icons.Comment /> {selectedPost.comments?.length || 0} Phản hồi
                                    </span>
                                </div>
                                <div className="social-actions-right">
                                    <button 
                                        className={`forum-action-btn-mono social-btn-save ${savedPostIds.includes(selectedPost.id) ? 'saved' : ''}`}
                                        onClick={(e) => toggleSavePost(selectedPost.id, e)}
                                    >
                                        <Icons.Bookmark filled={savedPostIds.includes(selectedPost.id)} />
                                        <span>{savedPostIds.includes(selectedPost.id) ? 'Đã lưu' : 'Lưu bài'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Comments Thread Section */}
                        <div className="forum-post-card-v2" style={{ padding: '28px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 20px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                                Thảo Luận & Phản Hồi ({selectedPost.comments?.length || 0})
                            </h3>

                            {/* Comments list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                {selectedPost.comments?.map(comment => (
                                    <div key={comment.id} style={{ paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }} onClick={() => comment.author_username && viewPublicProfile?.(comment.author_username)}>
                                                <img 
                                                    src={getAvatarUrl(comment.author_avatar_seed)} 
                                                    style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                                                    alt={comment.author_username} 
                                                />
                                                <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>
                                                    {comment.author_displayname} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{comment.author_username}</span>
                                                </strong>
                                            </div>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {formatRelativeTime(comment.created_at)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.88rem', margin: '6px 0 6px 38px', lineHeight: 1.55, color: 'var(--text-content)' }}>
                                            {parseFormattedContent(comment.text)}
                                        </div>
                                        
                                        {currentUser && (
                                            <div style={{ marginLeft: '38px', display: 'flex', gap: '12px' }}>
                                                <button 
                                                    type="button" 
                                                    style={{ background: 'none', border: 'none', color: 'var(--sakura-pink)', cursor: 'pointer', padding: 0, fontSize: '0.75rem', fontWeight: 600 }}
                                                    onClick={() => {
                                                        setReplyToCommentId(comment.id);
                                                        setReplyToUserId(comment.user_id);
                                                        setReplyText("");
                                                        setTimeout(() => {
                                                            const el = document.getElementById(`reply-textarea-${comment.id}`);
                                                            if (el) el.focus();
                                                        }, 50);
                                                    }}
                                                >
                                                    Phản hồi
                                                </button>
                                            </div>
                                        )}

                                        {/* Inline reply form */}
                                        {replyToCommentId === comment.id && (
                                            <div style={{ marginTop: '10px', marginLeft: '38px' }}>
                                                <textarea 
                                                    id={`reply-textarea-${comment.id}`}
                                                    placeholder="Nhập câu trả lời phản hồi..." 
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    style={{ width: '100%', minHeight: '70px', fontSize: '0.82rem', padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-base)', color: 'var(--text-main)' }}
                                                />
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                                    <button type="button" className="outline-btn small" onClick={() => { setReplyToCommentId(null); setReplyToUserId(null); }}>Hủy</button>
                                                    <button type="button" className="primary-btn small" onClick={() => handleSubmitReply(comment.id)}>Gửi phản hồi</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Child Comments List */}
                                        {comment.replies && comment.replies.map(reply => (
                                            <div key={reply.id} style={{ marginLeft: '38px', marginTop: '10px', background: 'var(--bg-base)', padding: '10px 14px', borderLeft: '2px solid var(--sakura-pink)', borderRadius: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                        {reply.author_displayname} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{reply.author_username}</span>
                                                    </strong>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                        {formatRelativeTime(reply.created_at)}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', margin: '2px 0 0 0', lineHeight: 1.45, color: 'var(--text-content)' }}>
                                                    {parseFormattedContent(reply.text)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                {(!selectedPost.comments || selectedPost.comments.length === 0) && (
                                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        Chưa có phản hồi nào. Hãy là người đầu tiên trả lời bài viết này!
                                    </div>
                                )}
                            </div>

                            {/* Comment Form */}
                            {currentUser ? (
                                (!selectedPost.restrictComments || isStaff) ? (
                                    <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <RichTextEditor
                                            id="detailed-comment-textarea"
                                            placeholder="Nhập nội dung thảo luận hoặc chia sẻ góc nhìn..."
                                            value={commentText}
                                            onChange={setCommentText}
                                            required
                                            minHeight="90px"
                                        />
                                        <button type="submit" className="primary-btn small" style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <Icons.Send /> Gửi bình luận
                                        </button>
                                    </form>
                                ) : (
                                    <div style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <Icons.Lock size={14} /> Chỉ Quản trị viên và Điều phối viên mới được phép bình luận trong bài viết này.
                                    </div>
                                )
                            ) : (
                                <div style={{ background: 'var(--bg-base)', padding: '16px', borderRadius: 'var(--border-radius-md)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Vui lòng đăng nhập để gửi phản hồi thảo luận.
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* 5. CHAT POPUP (Messenger-style) */}
            {subView === 'list' && activeChatFriend && (
                <div className="fb-chat-popup">
                    <div className="fb-chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <div className="fb-chat-avatar">
                                    <img 
                                        src={getAvatarUrl(activeChatFriend.avatarSeed)} 
                                        alt={activeChatFriend.displayname} 
                                    />
                                </div>
                                {onlineUsers[activeChatFriend.id] && (
                                    <span style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: '#2ecc71',
                                        border: '1.5px solid white',
                                        borderRadius: '50%'
                                    }} title="Trực tuyến" />
                                )}
                            </div>
                            <span className="fb-chat-name" title={activeChatFriend.displayname}>{activeChatFriend.displayname}</span>
                        </div>
                        <button className="fb-chat-close-btn" onClick={() => setActiveChatFriend(null)} title="Đóng chat">✕</button>
                    </div>
                    <div className="fb-chat-body" id="fb-chat-body-container">
                        {chatMessages.length > 0 ? (
                            chatMessages.map(msg => {
                                const isMe = msg.sender_id === currentUser?.id;
                                return (
                                    <div 
                                        key={msg.id} 
                                        className={`fb-chat-msg ${isMe ? 'sent' : 'received'}`}
                                    >
                                        {msg.message_text}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                                Bắt đầu trò chuyện với {activeChatFriend.displayname}...
                            </div>
                        )}
                    </div>
                    <form className="fb-chat-input-area" onSubmit={handleSendChatMessage}>
                        <input 
                            type="text" 
                            className="fb-chat-input"
                            placeholder="Nhập tin nhắn..."
                            value={chatInputText}
                            onChange={(e) => setChatInputText(e.target.value)}
                        />
                        <button type="submit" className="fb-chat-send-btn" title="Gửi">
                            <Icons.Send />
                        </button>
                    </form>
                </div>
            )}

            {/* 6. LIGHTBOX MODAL */}
            {lightboxImage && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.94)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    backdropFilter: 'blur(8px)'
                }} onClick={() => { setLightboxImage(null); setLightboxZoom(1); setLightboxRotation(0); }}>
                    
                    <div style={{
                        position: 'relative',
                        width: '90%',
                        height: '80%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={lightboxImage} 
                            alt="Lightbox" 
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                                transition: 'transform 0.2s ease-in-out',
                                borderRadius: 'var(--border-radius-md)'
                            }}
                        />
                    </div>

                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.65)',
                        padding: '10px 22px',
                        borderRadius: '30px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        zIndex: 100000
                    }} onClick={(e) => e.stopPropagation()}>
                        <button 
                            style={{ color: '#fff', fontSize: '1rem', padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', border: 'none', cursor: 'pointer' }}
                            onClick={() => setLightboxZoom(prev => Math.max(0.5, prev - 0.25))}
                        >
                            −
                        </button>
                        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, minWidth: '48px', textAlign: 'center' }}>
                            {Math.round(lightboxZoom * 100)}%
                        </span>
                        <button 
                            style={{ color: '#fff', fontSize: '1rem', padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', border: 'none', cursor: 'pointer' }}
                            onClick={() => setLightboxZoom(prev => Math.min(3, prev + 0.25))}
                        >
                            +
                        </button>
                        <button 
                            style={{ color: '#fff', fontSize: '0.82rem', padding: '5px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', border: 'none', cursor: 'pointer' }}
                            onClick={() => setLightboxRotation(prev => (prev + 90) % 360)}
                        >
                            ↻ Xoay
                        </button>
                        <button 
                            style={{ color: '#fff', fontSize: '0.82rem', padding: '5px 12px', background: '#e74c3c', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => { setLightboxImage(null); setLightboxZoom(1); setLightboxRotation(0); }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
