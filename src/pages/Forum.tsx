import React, { useState, useEffect } from 'react';
import { calculateUserLevel } from '../utils/levelHelper';
import { User, ForumPost, ForumComment, Message } from '../types';
import { compressImage } from '../utils/imageCompressor';
import RichTextEditor, { parseFormattedContent, extractAndCleanImages, ForumImageGrid } from '../components/RichTextEditor';
import { io } from 'socket.io-client';

// ================= MONOCHROME PROFESSIONAL SVG ICONS =================
const Icons = {
    All: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
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
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
    ),
    Spoil: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
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
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
    ),
    Heart: ({ filled }: { filled?: boolean }) => (
        <svg viewBox="0 0 24 24" width="17" height="17" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    ),
    Comment: () => (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
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
    Lock: () => (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    ),
    Unlock: () => (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    )
};

const CATEGORIES = [
    { id: 'all', name: 'Tất cả chủ đề', icon: Icons.All },
    { id: 'general', name: 'Thảo luận chung', icon: Icons.General },
    { id: 'announcement', name: 'Thông báo', icon: Icons.Announcement },
    { id: 'review', name: 'Review truyện', icon: Icons.Review },
    { id: 'spoil', name: 'Spoil tình tiết', icon: Icons.Spoil },
    { id: 'qa', name: 'Hỏi đáp thắc mắc', icon: Icons.QA },
    { id: 'misc', name: 'Linh tinh khác', icon: Icons.Misc }
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

    const removeNewImage = (index: number) => {
        setNewImageUrls(prev => prev.filter((_, i) => i !== index));
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeQuickImage = (index: number) => {
        setQuickImageUrls(prev => prev.filter((_, i) => i !== index));
        setQuickImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const [expandedPostComments, setExpandedPostComments] = useState<{ [postId: number]: boolean }>({});
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
            const res = await fetchWithAuth(`${API_BASE}/forum/posts`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setPosts(data);
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
                            is_liked: data.isLiked,
                            likes_count: data.likesCount
                        };
                    }
                    return post;
                }));
                if (selectedPost && selectedPost.id === postId) {
                    setSelectedPost(prev => prev ? ({
                        ...prev,
                        is_liked: data.isLiked,
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

    const toggleCommentsExpand = (postId: number, e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setExpandedPostComments(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }));
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

    // Filter posts using normalized categories (supports both EN & VI)
    const displayedPosts = posts.filter(post => {
        if (activeCategory === 'all') return true;
        return normalizeForumCategory(post.category) === activeCategory;
    });

    const formatCategoryName = (cat: string) => {
        const norm = normalizeForumCategory(cat);
        const found = CATEGORIES.find(c => c.id === norm);
        return found ? found.name : (cat || 'Thảo luận');
    };

    // Hot trending posts for sidebar
    const hotTrendingPosts = React.useMemo(() => {
        return [...posts]
            .sort((a, b) => ((b.likes_count || 0) + (b.comments_count || 0)) - ((a.likes_count || 0) + (a.comments_count || 0)))
            .slice(0, 5);
    }, [posts]);

    // Count posts per category accurately
    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = { all: posts.length };
        CATEGORIES.forEach(c => {
            if (c.id !== 'all') {
                counts[c.id] = posts.filter(p => normalizeForumCategory(p.category) === c.id).length;
            }
        });
        return counts;
    }, [posts]);

    return (
        <div className="page-view active forum-page-wrap">
            
            {/* 1. FORUM COMMUNITY HERO BANNER */}
            <div className="forum-hero-banner">
                <div className="forum-hero-info">
                    <span className="forum-hero-tag">
                        <Icons.General /> Diễn Đàn & Thảo Luận
                    </span>
                    <h1 className="forum-hero-title">Không Gian Giao Lưu MugenBunko</h1>
                    <p className="forum-hero-subtitle">
                        Nơi giao lưu, thảo luận light novel, chia sẻ review và kết nối cộng đồng văn minh.
                    </p>
                    <div className="forum-hero-metrics">
                        <span className="forum-metric-item">
                            <Icons.Review /> <strong>{posts.length}</strong> bài viết
                        </span>
                        <span className="forum-metric-item">
                            <Icons.Comment /> <strong>{posts.reduce((acc, p) => acc + (p.comments_count || 0), 0)}</strong> thảo luận
                        </span>
                        {currentUser && (
                            <span className="forum-metric-item">
                                <Icons.Users /> <strong>{forumFriends.length}</strong> bạn bè
                            </span>
                        )}
                    </div>
                </div>
                <div className="forum-hero-cta">
                    {subView === 'list' ? (
                        <button 
                            className="primary-btn" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--border-radius-md)' }}
                            onClick={() => {
                                if (!currentUser) {
                                    showAlert("Vui lòng đăng nhập để đăng bài viết!");
                                    return;
                                }
                                setSubView('create');
                            }}
                        >
                            <Icons.Pen /> Tạo bài viết mới
                        </button>
                    ) : (
                        <button 
                            className="outline-btn" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                            onClick={() => { if (setInitialPostId) setInitialPostId(null); else setSubView('list'); }}
                        >
                            ← Về bảng tin diễn đàn
                        </button>
                    )}
                </div>
            </div>

            {/* 2. SUBVIEW LIST: MAIN 3-COLUMN FORUM LAYOUT */}
            {subView === 'list' && (
                <div className={`forum-layout-container ${currentUser ? 'has-user' : 'guest'}`}>
                    
                    {/* LEFT COLUMN: Categories Navigation & Guidelines */}
                    <aside className="sidebar-column">
                        
                        {/* Categories Box */}
                        <div className="forum-sidebar-card">
                            <h3 className="forum-sidebar-title">
                                <Icons.All /> Chủ Đề Thảo Luận
                            </h3>
                            <div className="forum-category-nav">
                                {CATEGORIES.map(cat => {
                                    const IconComponent = cat.icon;
                                    const count = categoryCounts[cat.id] || 0;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`forum-category-btn-mono ${activeCategory === cat.id ? 'active' : ''}`}
                                        >
                                            <div className="forum-cat-left">
                                                <span className="forum-cat-icon"><IconComponent /></span>
                                                <span>{cat.name}</span>
                                            </div>
                                            <span className="forum-cat-count-badge">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Trending Hashtags */}
                        <div className="forum-sidebar-card">
                            <h3 className="forum-sidebar-title">
                                <Icons.Hash /> Từ Khóa Thịnh Hành
                            </h3>
                            <div className="forum-trending-tags-wrap">
                                {['#Isekai', '#ReviewTruyen', '#SpoilMoi', '#TienHiep', '#Romance', '#HoiDap'].map(tag => (
                                    <span 
                                        key={tag} 
                                        className="forum-tag-mono-pill"
                                        onClick={() => {
                                            setActiveCategory('all');
                                            showAlert(`Đang lọc theo tag ${tag}`);
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Community Guidelines */}
                        <div className="forum-sidebar-card">
                            <h3 className="forum-sidebar-title">
                                <Icons.Shield /> Quy Tắc Cộng Đồng
                            </h3>
                            <ul className="forum-guidelines-list">
                                <li className="forum-guideline-item">
                                    <span className="forum-guideline-dot">•</span>
                                    <span>Tôn trọng người khác, không công kích cá nhân.</span>
                                </li>
                                <li className="forum-guideline-item">
                                    <span className="forum-guideline-dot">•</span>
                                    <span>Gắn nhãn [Spoil] khi bàn luận chi tiết cốt truyện.</span>
                                </li>
                                <li className="forum-guideline-item">
                                    <span className="forum-guideline-dot">•</span>
                                    <span>Không quảng cáo spam hoặc nội dung không lành mạnh.</span>
                                </li>
                            </ul>
                        </div>
                    </aside>

                    {/* MIDDLE COLUMN: Social Feed & Quick Post Box */}
                    <div className="main-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Quick Create Box */}
                        {currentUser && (
                            <div className="forum-quick-create-box">
                                {!isQuickCreateExpanded ? (
                                    <>
                                        <div className="forum-qc-collapsed" onClick={() => setIsQuickCreateExpanded(true)}>
                                            <div className="forum-qc-avatar">
                                                <img 
                                                    src={currentUser.avatarSeed && (currentUser.avatarSeed.startsWith('http') || currentUser.avatarSeed.startsWith('/uploads') || currentUser.avatarSeed.startsWith('data:')) 
                                                        ? currentUser.avatarSeed 
                                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.avatarSeed || 'Default'}`} 
                                                    alt="Avatar" 
                                                />
                                            </div>
                                            <div className="forum-qc-fake-input">
                                                Bạn đang nghĩ gì thế, {currentUser.displayname}?
                                            </div>
                                        </div>
                                        <div className="forum-qc-quick-actions">
                                            <button 
                                                type="button" 
                                                className="forum-qc-action-btn"
                                                onClick={() => setIsQuickCreateExpanded(true)}
                                            >
                                                <Icons.Image /> Thêm ảnh
                                            </button>
                                            <button 
                                                type="button" 
                                                className="forum-qc-action-btn"
                                                onClick={() => setSubView('create')}
                                            >
                                                <Icons.Pen /> Mở trang soạn thảo đầy đủ
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <form onSubmit={handleQuickCreatePost} className="quick-create-expanded-form">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Icons.Pen /> Tạo bài viết nhanh
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
                                            placeholder="Tiêu đề bài viết..." 
                                            value={quickTitle} 
                                            onChange={(e) => setQuickTitle(e.target.value)} 
                                            required
                                            style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
                                        />

                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chủ đề:</label>
                                            <select 
                                                value={quickCategory} 
                                                onChange={(e) => setQuickCategory(e.target.value)}
                                                style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none' }}
                                            >
                                                <option value="general">Thảo luận chung</option>
                                                <option value="announcement">Thông báo</option>
                                                <option value="review">Review tác phẩm</option>
                                                <option value="spoil">Spoil nội dung</option>
                                                <option value="qa">Hỏi đáp</option>
                                                <option value="misc">Linh tinh</option>
                                            </select>
                                        </div>

                                        <RichTextEditor 
                                            placeholder="Chia sẻ suy nghĩ, đánh giá hoặc câu hỏi của bạn..." 
                                            value={quickContent} 
                                            onChange={setQuickContent} 
                                            minHeight="120px"
                                        />

                                        {/* Image attachments selection */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="outline-btn small" style={{ cursor: 'pointer', margin: 0, padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <Icons.Image /> Chọn ảnh đính kèm
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

                                            {/* Preview attached images */}
                                            {quickImageUrls.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                                    {quickImageUrls.map((url, idx) => (
                                                        <div key={idx} style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
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
                                                <Icons.Send /> {isSubmittingPost ? 'Đang đăng...' : 'Đăng bài'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* Social Feed Post List */}
                        {loading && (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                Đang tải các bài viết...
                            </div>
                        )}

                        {!loading && displayedPosts.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-card)', borderRadius: 'var(--border-radius-lg)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                                <div style={{ marginBottom: '8px', opacity: 0.5 }}><Icons.All /></div>
                                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-main)', fontSize: '1rem' }}>Chưa có bài viết nào</h4>
                                <p style={{ margin: 0, fontSize: '0.82rem' }}>Hãy là người đầu tiên chia sẻ bài viết trong chủ đề này nhé!</p>
                            </div>
                        )}

                        {!loading && displayedPosts.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {displayedPosts.map(post => {
                                    const isAuthorOrAdmin = currentUser && (post.author_id === currentUser.id || currentUser.roles.includes('admin'));
                                    const isCommentsOpen = !!expandedPostComments[post.id];
                                    const quickCommentVal = quickCommentTexts[post.id] || "";
                                    const { cleanContent, images: extractedImages } = extractAndCleanImages(post.content);
                                    const allImages = [post.image_url, ...extractedImages].filter(Boolean) as string[];

                                    const authorAvatarSrc = post.author_avatar_seed && (post.author_avatar_seed.startsWith('http') || post.author_avatar_seed.startsWith('/uploads') || post.author_avatar_seed.startsWith('data:')) 
                                        ? post.author_avatar_seed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.author_avatar_seed || 'Default'}`;

                                    return (
                                        <div key={post.id} className="forum-post-card-v2">
                                            {/* Post Header */}
                                            <div className="forum-post-header-v2">
                                                <div className="forum-author-block">
                                                    <div 
                                                        className="forum-author-avatar-wrap"
                                                        onClick={() => post.author_username && viewPublicProfile?.(post.author_username)}
                                                    >
                                                        <img src={authorAvatarSrc} alt={post.author_username} />
                                                    </div>
                                                    <div className="forum-author-details">
                                                        <div className="forum-author-name-row">
                                                            <span 
                                                                className="forum-author-name"
                                                                onClick={() => post.author_username && viewPublicProfile?.(post.author_username)}
                                                            >
                                                                {post.author_displayname}
                                                            </span>
                                                            <span className="forum-author-handle">@{post.author_username}</span>
                                                        </div>
                                                        <div className="forum-post-time">
                                                            <span>{new Date(post.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="forum-post-badges-right">
                                                    <span className="forum-cat-badge-pill">
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

                                            {/* Post Content */}
                                            <div style={{ cursor: 'pointer' }} onClick={() => { if (setInitialPostId) setInitialPostId(post.id); else fetchPostDetail(post.id); }}>
                                                <h3 className="forum-post-title-v2">
                                                    {post.title}
                                                </h3>
                                                <div className="forum-post-body-text">
                                                    {parseFormattedContent(cleanContent)}
                                                </div>
                                                {allImages.length > 0 && (
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <ForumImageGrid images={allImages} onImageClick={(url) => setLightboxImage(url)} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Interaction Bar */}
                                            <div className="forum-interaction-bar-v2">
                                                <div className="forum-actions-left">
                                                    <button 
                                                        className={`forum-action-btn-mono ${post.is_liked ? 'liked' : ''}`}
                                                        onClick={(e) => handleLikePost(post.id, e)}
                                                        title="Thích bài viết"
                                                    >
                                                        <Icons.Heart filled={!!post.is_liked} />
                                                        <span>{post.likes_count || 0}</span>
                                                    </button>
                                                    <button 
                                                        className="forum-action-btn-mono"
                                                        onClick={(e) => toggleCommentsExpand(post.id, e)}
                                                        title="Bình luận"
                                                    >
                                                        <Icons.Comment />
                                                        <span>{post.comments_count || 0} bình luận</span>
                                                    </button>
                                                </div>
                                                <button 
                                                    className="forum-action-btn-mono"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (navigator.clipboard) {
                                                            navigator.clipboard.writeText(`${window.location.origin}/#/forum?post=${post.id}`);
                                                            showAlert("Đã sao chép liên kết bài viết!");
                                                        }
                                                    }}
                                                    title="Chia sẻ liên kết"
                                                >
                                                    <Icons.Share />
                                                </button>
                                            </div>

                                            {/* Quick Comments Accordion */}
                                            {isCommentsOpen && (
                                                <div className="quick-comments-section" style={{ marginTop: '14px' }}>
                                                    {post.comments && post.comments.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                                                            {post.comments.map(c => (
                                                                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }} onClick={() => c.author_username && viewPublicProfile?.(c.author_username)}>
                                                                            <img 
                                                                                src={c.author_avatar_seed && (c.author_avatar_seed.startsWith('http') || c.author_avatar_seed.startsWith('/uploads') || c.author_avatar_seed.startsWith('data:')) 
                                                                                    ? c.author_avatar_seed 
                                                                                    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.author_avatar_seed || 'Default'}`} 
                                                                                style={{ width: '22px', height: '22px', borderRadius: '50%' }}
                                                                                alt={c.author_username} 
                                                                            />
                                                                            <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                                                                                {c.author_displayname} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{c.author_username}</span>
                                                                            </strong>
                                                                        </div>
                                                                        <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                                                            {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                        </span>
                                                                    </div>
                                                                    <p style={{ fontSize: '0.8rem', margin: '2px 0 0 28px', lineHeight: 1.45, color: 'var(--text-content)' }}>{parseFormattedContent(c.text)}</p>
                                                                    
                                                                    {/* Quick Comment Replies */}
                                                                    {c.replies && c.replies.map(reply => (
                                                                        <div key={reply.id} style={{ marginLeft: '28px', background: 'var(--bg-base)', padding: '6px 10px', borderLeft: '2px solid var(--sakura-pink)', borderRadius: '4px', marginTop: '4px' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                                                <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)' }}>
                                                                                    {reply.author_displayname} <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{reply.author_username}</span>
                                                                                </strong>
                                                                                <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                                                                                    {reply.created_at ? new Date(reply.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                                </span>
                                                                            </div>
                                                                            <p style={{ fontSize: '0.76rem', margin: '2px 0 0 0', lineHeight: 1.4, color: 'var(--text-content)' }}>{parseFormattedContent(reply.text)}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                                                            Chưa có bình luận nào.
                                                        </div>
                                                    )}

                                                    {/* Quick comment input */}
                                                    {currentUser && (!post.restrictComments || isStaff) ? (
                                                        <form onSubmit={(e) => handleQuickCommentSubmit(post.id, e)} className="quick-comment-input-form" style={{ marginTop: '10px' }}>
                                                            <input 
                                                                id={`quick-comment-input-${post.id}`}
                                                                type="text" 
                                                                className="quick-comment-input" 
                                                                placeholder="Nhập phản hồi nhanh..." 
                                                                value={quickCommentVal}
                                                                onChange={(e) => setQuickCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                            />
                                                            <button type="submit" className="quick-comment-submit-btn" title="Gửi">
                                                                <Icons.Send />
                                                            </button>
                                                        </form>
                                                    ) : currentUser && (
                                                        <div style={{ padding: '6px', color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center' }}>
                                                            🔒 Bình luận tạm khóa cho thành viên.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Online Contacts & Hot Threads */}
                    {currentUser && (
                        <aside className="sidebar-column">
                            
                            {/* Live Contacts */}
                            <div className="forum-sidebar-card">
                                <h3 className="forum-sidebar-title">
                                    <Icons.Users /> Bạn Bè & Liên Lạc
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {forumFriends.map(friend => {
                                        const friendAvatar = friend.avatarSeed && (friend.avatarSeed.startsWith('http') || friend.avatarSeed.startsWith('/uploads') || friend.avatarSeed.startsWith('data:')) 
                                            ? friend.avatarSeed 
                                            : `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.avatarSeed || 'Default'}`;

                                        return (
                                            <div 
                                                key={friend.id} 
                                                className="forum-contact-row" 
                                                onClick={() => handleStartChat(friend)}
                                            >
                                                <div className="forum-contact-avatar-wrap">
                                                    <img src={friendAvatar} alt={friend.displayname} />
                                                    {onlineUsers[friend.id] && (
                                                        <span className="forum-online-dot-pulse" title="Trực tuyến" />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {friend.displayname}
                                                    </div>
                                                    <div style={{ fontSize: '0.68rem', color: onlineUsers[friend.id] ? '#2ecc71' : 'var(--text-muted)' }}>
                                                        {onlineUsers[friend.id] ? 'Online' : 'Offline'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {forumFriends.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                                            Chưa có bạn bè nào trong danh sách.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hot Threads Widget */}
                            <div className="forum-sidebar-card">
                                <h3 className="forum-sidebar-title">
                                    <Icons.Trending /> Thảo Luận Sôi Nổi
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {hotTrendingPosts.map((hp, idx) => (
                                        <div 
                                            key={hp.id} 
                                            className="forum-hot-thread-item"
                                            onClick={() => { if (setInitialPostId) setInitialPostId(hp.id); else fetchPostDetail(hp.id); }}
                                        >
                                            <span className="forum-hot-num">#{idx + 1}</span>
                                            <div className="forum-hot-info">
                                                <div className="forum-hot-title" title={hp.title}>{hp.title}</div>
                                                <div className="forum-hot-meta">
                                                    <span>💖 {hp.likes_count || 0}</span>
                                                    <span>💬 {hp.comments_count || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    )}
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
                            ← Quay lại danh sách bài viết
                        </button>
                    </div>

                    <div className="forum-post-card-v2" style={{ padding: '32px' }}>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 20px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icons.Pen /> Đăng Bài Viết Mới Lên Diễn Đàn
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
                                    Chủ đề bài đăng <span style={{ color: 'var(--sakura-pink)' }}>*</span>
                                </label>
                                <select 
                                    value={newCategory} 
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                                >
                                    <option value="general">Thảo luận chung</option>
                                    <option value="announcement">Thông báo hệ thống</option>
                                    <option value="review">Review tác phẩm / truyện</option>
                                    <option value="spoil">Spoil thảo luận tình tiết</option>
                                    <option value="qa">Hỏi đáp thắc mắc</option>
                                    <option value="misc">Linh tinh khác</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                                    Nội dung chi tiết <span style={{ color: 'var(--sakura-pink)' }}>*</span>
                                </label>
                                <RichTextEditor 
                                    placeholder="Soạn nội dung thảo luận, review, chia sẻ cảm nhận..." 
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

                const authorAvatar = selectedPost.author_avatar_seed && (selectedPost.author_avatar_seed.startsWith('http') || selectedPost.author_avatar_seed.startsWith('/uploads') || selectedPost.author_avatar_seed.startsWith('data:')) 
                    ? selectedPost.author_avatar_seed 
                    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedPost.author_avatar_seed || 'Default'}`;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
                        
                        {/* Back button */}
                        <div>
                            <button 
                                className="outline-btn small" 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => { setSubView('list'); if (setInitialPostId) setInitialPostId(null); }}
                            >
                                ← Quay lại danh sách bài viết
                            </button>
                        </div>

                        {/* Main Article Container */}
                        <div className="forum-post-card-v2" style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span className="forum-cat-badge-pill">
                                    {formatCategoryName(selectedPost.category)}
                                </span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => handleToggleRestrictComments(selectedPost.id, selectedPost.restrictComments || selectedPost.restrict_comments, e)}
                                            className="outline-btn small"
                                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                        >
                                            {(selectedPost.restrictComments || selectedPost.restrict_comments) ? "🔒 Chỉ BQL" : "🔓 Tự do"}
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

                            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', lineHeight: 1.3 }}>
                                {selectedPost.title}
                            </h1>

                            {/* Author Info Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
                                <div className="forum-author-avatar-wrap">
                                    <img src={authorAvatar} alt={selectedPost.author_username} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        {selectedPost.author_displayname}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        @{selectedPost.author_username} • {new Date(selectedPost.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            {/* Content text */}
                            <div style={{ fontSize: '0.96rem', lineHeight: 1.75, color: 'var(--text-content)', minHeight: '120px' }}>
                                {parseFormattedContent(detailCleanContent)}
                            </div>

                            {detailAllImages.length > 0 && (
                                <div style={{ marginTop: '20px' }}>
                                    <ForumImageGrid images={detailAllImages} onImageClick={(url) => setLightboxImage(url)} />
                                </div>
                            )}

                            {/* Interaction Bar */}
                            <div className="forum-interaction-bar-v2" style={{ marginTop: '24px' }}>
                                <div className="forum-actions-left">
                                    <button 
                                        className={`forum-action-btn-mono ${selectedPost.is_liked ? 'liked' : ''}`}
                                        onClick={(e) => handleLikePost(selectedPost.id, e)}
                                    >
                                        <Icons.Heart filled={!!selectedPost.is_liked} />
                                        <span>{selectedPost.likes_count || 0} Thích</span>
                                    </button>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        <Icons.Comment /> {selectedPost.comments?.length || 0} Phản hồi
                                    </span>
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
                                                    src={comment.author_avatar_seed && (comment.author_avatar_seed.startsWith('http') || comment.author_avatar_seed.startsWith('/uploads') || comment.author_avatar_seed.startsWith('data:')) 
                                                        ? comment.author_avatar_seed 
                                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.author_avatar_seed || 'Default'}`} 
                                                    style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                                                    alt={comment.author_username} 
                                                />
                                                <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                                                    {comment.author_displayname} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{comment.author_username}</span>
                                                </strong>
                                            </div>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {new Date(comment.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.88rem', margin: '6px 0 6px 36px', lineHeight: 1.55, color: 'var(--text-content)' }}>{parseFormattedContent(comment.text)}</p>
                                        
                                        {currentUser && (
                                            <div style={{ marginLeft: '36px', display: 'flex', gap: '12px' }}>
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
                                            <div style={{ marginTop: '10px', marginLeft: '36px' }}>
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
                                            <div key={reply.id} style={{ marginLeft: '36px', marginTop: '10px', background: 'var(--bg-base)', padding: '10px 14px', borderLeft: '2px solid var(--sakura-pink)', borderRadius: '4px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                        {reply.author_displayname} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{reply.author_username}</span>
                                                    </strong>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                        {new Date(reply.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.82rem', margin: '2px 0 0 0', lineHeight: 1.45, color: 'var(--text-content)' }}>{parseFormattedContent(reply.text)}</p>
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
                                    <div style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                        🔒 Chỉ Quản trị viên và Điều phối viên mới được phép bình luận trong bài viết này.
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

            {/* 5. CHAT POPUP (Facebook-style) */}
            {subView === 'list' && activeChatFriend && (
                <div className="fb-chat-popup">
                    <div className="fb-chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <div className="fb-chat-avatar">
                                    <img 
                                        src={activeChatFriend.avatarSeed && (activeChatFriend.avatarSeed.startsWith('http') || activeChatFriend.avatarSeed.startsWith('/uploads') || activeChatFriend.avatarSeed.startsWith('data:')) 
                                            ? activeChatFriend.avatarSeed 
                                            : `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeChatFriend.avatarSeed || 'Default'}`} 
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
                            -
                        </button>
                        <span style={{ color: '#fff', fontSize: '0.85rem', minWidth: '50px', textAlign: 'center', fontWeight: 600 }}>
                            {Math.round(lightboxZoom * 100)}%
                        </span>
                        <button 
                            style={{ color: '#fff', fontSize: '1rem', padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', border: 'none', cursor: 'pointer' }}
                            onClick={() => setLightboxZoom(prev => Math.min(5, prev + 0.25))}
                        >
                            +
                        </button>
                        <button 
                            style={{ fontSize: '0.8rem', padding: '6px 14px', background: 'var(--sakura-pink)', color: '#fff', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => { setLightboxZoom(1); setLightboxRotation(0); }}
                        >
                            Đặt lại
                        </button>
                    </div>

                    <button 
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '30px',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100000
                        }} 
                        onClick={() => { setLightboxImage(null); setLightboxZoom(1); setLightboxRotation(0); }}
                        title="Đóng"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
