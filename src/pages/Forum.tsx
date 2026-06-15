import React, { useState, useEffect } from 'react';
import { calculateUserLevel } from '../utils/levelHelper';
import { User, ForumPost, ForumComment, Message } from '../types';
import { compressImage } from '../utils/imageCompressor';

const CATEGORIES = [
    { id: 'all', name: 'Tất cả chủ đề', emoji: '🌟' },
    { id: 'general', name: 'Thảo luận chung', emoji: '💬' },
    { id: 'announcement', name: 'Thông báo', emoji: '📢' },
    { id: 'review', name: 'Review', emoji: '📝' },
    { id: 'spoil', name: 'Spoil', emoji: '🤫' },
    { id: 'qa', name: 'Hỏi đáp', emoji: '❓' },
    { id: 'misc', name: 'Linh tinh', emoji: '🎭' }
];

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
    const isAdmin = currentUser && currentUser.roles && currentUser.roles.includes('admin');
    const isStaff = currentUser && currentUser.roles && (currentUser.roles.includes('admin') || currentUser.roles.includes('moderator'));
    const [activeCategory, setActiveCategory] = useState('all');
    
    // Subviews: 'list' | 'detail' | 'create'
    const [subView, setSubView] = useState<'list' | 'detail' | 'create'>('list');
    const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
    const [loading, setLoading] = useState(false);

    // Lightbox for viewing and zooming images
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxZoom, setLightboxZoom] = useState(1);
    const [lightboxRotation, setLightboxRotation] = useState(0);

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
 
    // Form inputs for creating post (Standard Page View)
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('general');
    const [newContent, setNewContent] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
 
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
    const [quickImageUrl, setQuickImageUrl] = useState('');
    const [quickImageFile, setQuickImageFile] = useState<File | null>(null);

    const [expandedPostComments, setExpandedPostComments] = useState<{ [postId: number]: boolean }>({});
    const [quickCommentTexts, setQuickCommentTexts] = useState<{ [postId: number]: string }>({});

    // Facebook-style right side chat states
    const [forumFriends, setForumFriends] = useState<SocialUser[]>([]);
    const [activeChatFriend, setActiveChatFriend] = useState<SocialUser | null>(null);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [chatInputText, setChatInputText] = useState('');
 
    useEffect(() => {
        fetchPosts();
        if (initialPostId) {
            fetchPostDetail(initialPostId);
        }
    }, [initialPostId]);

    // Load friends list for Facebook-style sidebar contacts
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

    // Polling messages for popup chat
    useEffect(() => {
        if (!activeChatFriend) return;

        const fetchChatMessages = async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/social/messages/chat/${activeChatFriend.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setChatMessages(data);
                }
            } catch (err) {
                console.error("Error loading chat messages:", err);
            }
        };

        fetchChatMessages();
        const interval = setInterval(fetchChatMessages, 5000);

        return () => clearInterval(interval);
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
                alert(data.error || "Không thể tải chi tiết bài viết.");
            }
        } catch (err) {
            console.error("Error loading post details:", err);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to upload an image from file input
    const uploadImageFile = async (file: File, type: string): Promise<string> => {
        try {
            // Compress forum images to max 1200px and 80% quality
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
            alert("Bạn cần đăng nhập để đăng bài viết!");
            return;
        }
        if (!newTitle.trim() || !newContent.trim()) {
            alert("Vui lòng nhập đầy đủ tiêu đề và nội dung!");
            return;
        }

        try {
            let imageUrl: string | null = newImageUrl.trim() || null;
            if (newImageFile) {
                if (showToast) showToast("Đang tải ảnh bài đăng lên...");
                imageUrl = await uploadImageFile(newImageFile, 'post');
            }

            const res = await fetchWithAuth(`${API_BASE}/forum/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    content: newContent,
                    category: newCategory,
                    imageUrl
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (showToast) showToast("Đã đăng bài viết thành công!");
                setNewTitle('');
                setNewContent('');
                setNewCategory('general');
                setNewImageUrl('');
                setNewImageFile(null);
                await fetchPosts();
                setSubView('list');
                if (refreshSession && currentUser) {
                    refreshSession(currentUser.id);
                }
            } else {
                alert(data.error || "Lỗi đăng bài viết.");
            }
        } catch (err) {
            console.error("Error creating post:", err);
            alert((err as string) || "Lỗi khi đăng bài viết.");
        }
    };

    // Quick creation at the top of the social feed
    const handleQuickCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Bạn cần đăng nhập để đăng bài viết!");
            return;
        }
        if (!quickTitle.trim() || !quickContent.trim()) {
            alert("Vui lòng nhập đầy đủ tiêu đề và nội dung!");
            return;
        }

        try {
            let imageUrl: string | null = quickImageUrl.trim() || null;
            if (quickImageFile) {
                if (showToast) showToast("Đang tải ảnh bài đăng lên...");
                imageUrl = await uploadImageFile(quickImageFile, 'post');
            }

            const res = await fetchWithAuth(`${API_BASE}/forum/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: quickTitle,
                    content: quickContent,
                    category: quickCategory,
                    imageUrl
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (showToast) showToast("Đã đăng bài viết thành công!");
                setQuickTitle('');
                setQuickContent('');
                setQuickCategory('general');
                setQuickImageUrl('');
                setQuickImageFile(null);
                setIsQuickCreateExpanded(false);
                await fetchPosts();
                if (refreshSession && currentUser) {
                    refreshSession(currentUser.id);
                }
            } else {
                alert(data.error || "Lỗi đăng bài viết.");
            }
        } catch (err) {
            console.error("Error creating quick post:", err);
            alert((err as string) || "Lỗi khi đăng bài viết.");
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Bạn cần đăng nhập để bình luận!");
            return;
        }
        if (!selectedPost) return;
        if (!commentText.trim()) return;

        try {
            const res = await fetchWithAuth(`${API_BASE}/forum/posts/${selectedPost.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: commentText,
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

    // Quick Comment under Card
    const handleQuickCommentSubmit = async (postId: number, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!currentUser) {
            alert("Bạn cần đăng nhập để bình luận!");
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
                    // Cập nhật local state posts trực tiếp
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
                    // Clear text input and states
                    setQuickCommentTexts(prev => ({ ...prev, [postId]: "" }));
                    setReplyToUserId(null);
                    setQuickReplyToCommentIds(prev => ({ ...prev, [postId]: null }));
                }
            }
        } catch (err) {
            console.error("Error adding quick comment:", err);
        }
    };

    // Submit reply to a comment in Detail View
    const handleSubmitReply = async (parentCommentId: number) => {
        if (!currentUser) {
            alert("Bạn cần đăng nhập để bình luận!");
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

    // Toggle heart reaction (like)
    const handleLikePost = async (postId: number, e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!currentUser) {
            alert("Bạn cần đăng nhập để thả tim bài viết!");
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
                            is_liked: data.liked ? 1 : 0,
                            likes_count: data.liked ? ((post.likes_count || 0) + 1) : Math.max(0, (post.likes_count || 0) - 1)
                        };
                    }
                    return post;
                }));
            }
        } catch (err) {
            console.error("Error toggle like:", err);
        }
    };

    const handleDeletePost = async (postId: number, e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!currentUser) return;
        triggerConfirm("Bạn có chắc chắn muốn xóa bài viết này vĩnh viễn?", async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/forum/posts/${postId}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    if (showToast) showToast("Đã xóa bài viết.");
                    if (subView === 'detail') {
                        setSubView('list');
                        setSelectedPost(null);
                        if (setInitialPostId) setInitialPostId(null);
                    }
                    await fetchPosts();
                } else {
                    alert(data.error || "Lỗi khi xóa bài viết.");
                }
            } catch (err) {
                console.error("Error deleting post:", err);
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

    // Chat popup action
    const handleStartChat = (friend: SocialUser) => {
        setActiveChatFriend(friend);
        setChatMessages([]);
        setChatInputText('');
        // Cuộn chat sau 150ms
        setTimeout(() => {
            const chatBoxBody = document.getElementById("fb-chat-body-container");
            if (chatBoxBody) chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
        }, 150);
    };

    const handleSendChatMessage = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!chatInputText.trim() || !activeChatFriend || !currentUser) return;

        const text = chatInputText.trim();
        setChatInputText('');

        try {
            const res = await fetchWithAuth(`${API_BASE}/social/messages/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: activeChatFriend.id,
                    messageText: text
                })
            });

            if (res.ok) {
                const data = await res.json();
                setChatMessages(prev => [...prev, data.message]);
                
                // Cuộn xuống
                setTimeout(() => {
                    const chatBoxBody = document.getElementById("fb-chat-body-container");
                    if (chatBoxBody) chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
                }, 100);
            }
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    // Filter posts
    const displayedPosts = posts.filter(post => {
        if (activeCategory === 'all') return true;
        
        // Map category ID to Vietnamese database categories
        const catMap: { [key: string]: string } = {
            general: 'thảo luận chung',
            announcement: 'thông báo',
            review: 'review',
            spoil: 'spoil',
            qa: 'hỏi đáp',
            misc: 'linh tinh'
        };
        return post.category === catMap[activeCategory];
    });

    const formatCategoryName = (cat: string) => {
        const found = CATEGORIES.find(c => {
            const catMap: { [key: string]: string } = {
                general: 'thảo luận chung',
                announcement: 'thông báo',
                review: 'review',
                spoil: 'spoil',
                qa: 'hỏi đáp',
                misc: 'linh tinh'
            };
            return catMap[c.id] === cat;
        });
        return found ? found.name : cat;
    };

    return (
        <div className="page-view active">
            <style>{`
                .social-feed-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    box-shadow: var(--shadow-sm);
                    padding: 20px;
                    transition: var(--transition-smooth);
                    position: relative;
                }
                .social-feed-card:hover {
                    box-shadow: var(--shadow-md);
                    border-color: rgba(224, 82, 117, 0.25);
                }
                .post-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                }
                .post-author-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .post-author-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 1.5px solid var(--border-color);
                }
                .post-author-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .post-author-meta {
                    display: flex;
                    flex-direction: column;
                }
                .post-author-name {
                    font-size: 0.92rem;
                    font-weight: 650;
                    color: var(--text-main);
                }
                .post-time-meta {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .quick-create-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: 16px;
                    margin-bottom: 20px;
                    box-shadow: var(--shadow-sm);
                }
                .quick-create-input-collapsed {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                }
                .quick-create-placeholder {
                    flex: 1;
                    background: var(--bg-base);
                    border: 1px solid var(--border-color);
                    border-radius: 24px;
                    padding: 10px 16px;
                    color: var(--text-muted);
                    font-size: 0.88rem;
                    transition: var(--transition-smooth);
                }
                .quick-create-placeholder:hover {
                    background: var(--border-color);
                }
                .quick-create-expanded-form {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    animation: slideDownQuickForm 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                @keyframes slideDownQuickForm {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .interaction-actions-bar {
                    display: flex;
                    align-items: center;
                    border-top: 1px solid var(--border-color);
                    border-bottom: 1px solid var(--border-color);
                    padding: 8px 0;
                    margin-top: 16px;
                    gap: 20px;
                }
                .interaction-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: transparent;
                    border: none;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    padding: 6px 12px;
                    border-radius: var(--border-radius-sm);
                    transition: var(--transition-smooth);
                }
                .interaction-btn:hover {
                    background: var(--bg-base);
                }
                .interaction-btn.liked {
                    color: var(--sakura-pink);
                }
                .interaction-btn.liked svg {
                    fill: var(--sakura-pink);
                }
                .interaction-btn svg {
                    width: 18px;
                    height: 18px;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 2px;
                }
                .quick-comments-section {
                    background: var(--bg-base);
                    border-radius: var(--border-radius-md);
                    padding: 12px;
                    margin-top: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    animation: slideUpQuickComments 0.2s ease;
                }
                @keyframes slideUpQuickComments {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .quick-comment-item {
                    display: flex;
                    gap: 8px;
                }
                .quick-comment-avatar {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                }
                .quick-comment-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .quick-comment-bubble {
                    flex: 1;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 6px 12px;
                    font-size: 0.8rem;
                }
                .quick-comment-name {
                    font-weight: 700;
                    color: var(--text-main);
                    margin-bottom: 2px;
                    font-size: 0.78rem;
                }
                .quick-comment-text {
                    color: var(--text-content);
                    line-height: 1.4;
                }
                .quick-comment-input-form {
                    display: flex;
                    gap: 8px;
                    margin-top: 6px;
                }
                .quick-comment-input {
                    flex: 1;
                    border-radius: 20px;
                    border: 1px solid var(--border-color);
                    padding: 8px 14px;
                    font-size: 0.82rem;
                    outline: none;
                    background: var(--bg-card);
                    color: var(--text-main);
                }
                .quick-comment-input:focus {
                    border-color: var(--sakura-pink);
                }
                .quick-comment-submit-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--sakura-pink);
                    border: none;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: var(--transition-smooth);
                }
                .quick-comment-submit-btn:hover {
                    background: var(--sakura-pink-hover);
                }
                .quick-comment-submit-btn svg {
                    width: 14px;
                    height: 14px;
                    fill: currentColor;
                }
                .right-sidebar-contacts {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 8px;
                }
                .contact-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: var(--border-radius-sm);
                    transition: var(--transition-smooth);
                }
                .contact-item:hover {
                    background: var(--bg-card-hover);
                }
                .contact-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                    background: #eee;
                }
                .contact-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .contact-name {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                /* Facebook-style Chat Popup */
                .fb-chat-popup {
                    position: fixed;
                    bottom: 0;
                    right: 80px;
                    width: 320px;
                    height: 420px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 12px 12px 0 0;
                    z-index: 1100;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUpChat 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                @keyframes slideUpChat {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .fb-chat-header {
                    height: 46px;
                    background: linear-gradient(135deg, var(--sakura-pink) 0%, #d83f68 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 12px;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .fb-chat-avatar {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 1.5px solid rgba(255, 255, 255, 0.8);
                    background: #eee;
                }
                .fb-chat-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .fb-chat-name {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: white;
                    max-width: 180px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .fb-chat-close-btn {
                    background: transparent;
                    border: none;
                    color: rgba(255, 255, 255, 0.85);
                    font-size: 1.1rem;
                    cursor: pointer;
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                }
                .fb-chat-close-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: white;
                }
                .fb-chat-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    background: var(--bg-base);
                }
                .fb-chat-body::-webkit-scrollbar {
                    width: 6px;
                }
                .fb-chat-body::-webkit-scrollbar-track {
                    background: transparent;
                }
                .fb-chat-body::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.15);
                    border-radius: 3px;
                }
                .fb-chat-body::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.3);
                }
                .fb-chat-msg {
                    padding: 8px 12px;
                    font-size: 0.82rem;
                    max-width: 75%;
                    word-break: break-word;
                    line-height: 1.4;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .fb-chat-msg.sent {
                    align-self: flex-end;
                    background: var(--sakura-pink);
                    color: white;
                    border-radius: 14px 14px 2px 14px;
                }
                .fb-chat-msg.received {
                    align-self: flex-start;
                    background: var(--bg-card);
                    color: var(--text-main);
                    border: 1px solid var(--border-color);
                    border-radius: 14px 14px 14px 2px;
                }
                .fb-chat-input-area {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 12px;
                    background: var(--bg-card);
                    border-top: 1px solid var(--border-color);
                }
                .fb-chat-input {
                    flex: 1;
                    padding: 8px 14px;
                    border-radius: 20px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-base);
                    color: var(--text-main);
                    font-size: 0.82rem;
                    outline: none;
                    transition: all 0.2s ease;
                }
                .fb-chat-input:focus {
                    border-color: var(--sakura-pink);
                    box-shadow: 0 0 0 2px var(--sakura-pink-light);
                }
                .fb-chat-send-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: transparent;
                    border: none;
                    color: var(--sakura-pink);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .fb-chat-send-btn:hover {
                    background: var(--sakura-pink-light);
                    color: var(--sakura-pink-hover);
                }
                .fb-chat-send-btn svg {
                    width: 16px;
                    height: 16px;
                    fill: currentColor;
                }
            `}</style>

            <div className="studio-header">
                <div>
                    <h2>Bảng Tin Diễn Đàn</h2>
                    <p className="subtitle">Mạng xã hội giao lưu, chia sẻ bài viết, đánh giá truyện và kết nối wibu.</p>
                </div>
                <button className="outline-btn small" onClick={() => setCurrentView('home')}>← Về Trang Chủ</button>
            </div>

            {subView === 'list' && (
                <div className="studio-layout" style={{ display: 'grid', gridTemplateColumns: currentUser ? '2.5fr 6.5fr 3fr' : '3fr 9fr', gap: '24px' }}>
                    {/* Left Sidebar - Categories */}
                    <div className="sidebar-column">
                        <div className="sidebar-card">
                            <h3 className="card-title">Chủ đề thảo luận</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`outline-btn w-100`}
                                        style={{
                                            textAlign: 'left',
                                            justifyContent: 'flex-start',
                                            background: activeCategory === cat.id ? 'var(--sakura-pink-light)' : 'transparent',
                                            color: activeCategory === cat.id ? 'var(--sakura-pink)' : 'var(--text-main)',
                                            borderColor: activeCategory === cat.id ? 'var(--sakura-pink)' : 'var(--border-color)',
                                            fontSize: '0.85rem',
                                            padding: '8px 12px',
                                            fontWeight: activeCategory === cat.id ? '600' : 'normal'
                                        }}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Middle Panel - Social Feed List */}
                    <div className="main-column">
                        {/* 1. Quick create post box */}
                        {currentUser && (
                            <div className="quick-create-card">
                                {!isQuickCreateExpanded ? (
                                    <div className="quick-create-input-collapsed" onClick={() => setIsQuickCreateExpanded(true)}>
                                        <div className={`avatar-frame level-${calculateUserLevel(currentUser.xp).className}`} style={{ width: '40px', height: '40px' }}>
                                            <img 
                                                src={currentUser.avatarSeed && (currentUser.avatarSeed.startsWith('http') || currentUser.avatarSeed.startsWith('/uploads') || currentUser.avatarSeed.startsWith('data:')) 
                                                    ? currentUser.avatarSeed 
                                                    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.avatarSeed || 'Default'}`} 
                                                alt="Avatar" 
                                                className="avatar-img"
                                            />
                                        </div>
                                        <div className="quick-create-placeholder">
                                            Bạn đang nghĩ gì thế, {currentUser.displayname}?
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleQuickCreatePost} className="quick-create-expanded-form">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tạo bài viết mới</h4>
                                            <button 
                                                type="button" 
                                                className="chat-header-btn" 
                                                style={{ color: 'var(--text-muted)' }} 
                                                onClick={() => {
                                                    setIsQuickCreateExpanded(false);
                                                    setQuickTitle('');
                                                    setQuickContent('');
                                                    setQuickImageUrl('');
                                                    setQuickImageFile(null);
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
                                            style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                                        />
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <select 
                                                value={quickCategory} 
                                                onChange={(e) => setQuickCategory(e.target.value)}
                                                style={{ flex: '0.4', padding: '8px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none' }}
                                            >
                                                <option value="general">Thảo luận chung</option>
                                                <option value="announcement">Thông báo</option>
                                                <option value="review">Review tác phẩm</option>
                                                <option value="spoil">Spoil nội dung</option>
                                                <option value="qa">Hỏi đáp</option>
                                                <option value="misc">Linh tinh</option>
                                            </select>
                                            <span style={{ flex: '0.6' }}></span>
                                        </div>
                                        <textarea 
                                            placeholder="Hãy viết nội dung thảo luận chia sẻ..." 
                                            value={quickContent} 
                                            onChange={(e) => setQuickContent(e.target.value)} 
                                            required
                                            style={{ width: '100%', minHeight: '100px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical' }}
                                        />

                                        {/* Image attachments selection */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thêm hình ảnh bài đăng (Tùy chọn)</label>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <label className="outline-btn small" style={{ cursor: 'pointer', margin: 0, padding: '6px 12px', fontSize: '0.78rem', gap: '4px' }}>
                                                    📁 Chọn ảnh từ máy
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setQuickImageFile(file);
                                                                setQuickImageUrl(URL.createObjectURL(file)); // use temp local URL for preview
                                                            }
                                                        }}
                                                    />
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Hoặc dán URL ảnh trực tuyến..." 
                                                    value={quickImageFile ? "" : quickImageUrl} 
                                                    disabled={!!quickImageFile}
                                                    onChange={(e) => setQuickImageUrl(e.target.value)}
                                                    style={{ flex: 1, padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none' }}
                                                />
                                            </div>
                                            {/* Preview attached image */}
                                            {quickImageUrl && (
                                                <div style={{ position: 'relative', width: 'fit-content', marginTop: '8px', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                                    <img 
                                                        src={quickImageUrl} 
                                                        alt="Preview" 
                                                        style={{ maxWidth: '150px', maxHeight: '100px', display: 'block', objectFit: 'cover' }} 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            setQuickImageUrl('');
                                                            setQuickImageFile(null);
                                                        }}
                                                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}
                                                        title="Xóa ảnh"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                            <button 
                                                type="button" 
                                                className="outline-btn small" 
                                                onClick={() => {
                                                    setIsQuickCreateExpanded(false);
                                                    setQuickTitle('');
                                                    setQuickContent('');
                                                    setQuickImageUrl('');
                                                    setQuickImageFile(null);
                                                }}
                                            >
                                                Hủy
                                            </button>
                                            <button type="submit" className="primary-btn small">Đăng bài</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        <div className="content-box" style={{ padding: '24px' }}>
                            <h3 className="section-title" style={{ marginBottom: '20px' }}>
                                {CATEGORIES.find(c => c.id === activeCategory)?.name || 'Bài viết'}
                            </h3>

                            {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Đang tải bài viết...</div>}

                            {!loading && displayedPosts.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📭</span>
                                    Chưa có bài viết nào trong chủ đề này.
                                </div>
                            )}

                            {!loading && displayedPosts.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {displayedPosts.map(post => {
                                        const isAuthorOrAdmin = currentUser && (post.author_id === currentUser.id || currentUser.roles.includes('admin'));
                                        const isCommentsOpen = !!expandedPostComments[post.id];
                                        const quickCommentVal = quickCommentTexts[post.id] || "";

                                        return (
                                            <div key={post.id} className="social-feed-card">
                                                {/* Post Header */}
                                                <div className="post-header">
                                                    <div className="post-author-info">
                                                        <div className="post-author-avatar">
                                                            <img 
                                                                src={post.author_avatar_seed && (post.author_avatar_seed.startsWith('http') || post.author_avatar_seed.startsWith('/uploads') || post.author_avatar_seed.startsWith('data:')) 
                                                                    ? post.author_avatar_seed 
                                                                    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.author_avatar_seed || 'Default'}`} 
                                                                alt={post.author_username} 
                                                            />
                                                        </div>
                                                        <div className="post-author-meta">
                                                            <span className="post-author-name">{post.author_displayname}</span>
                                                            <span className="post-time-meta">
                                                                <span>@{post.author_username}</span>
                                                                <span>•</span>
                                                                <span>{new Date(post.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className="tag-badge" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-color)', fontSize: '0.7rem', fontWeight: 600 }}>
                                                            {formatCategoryName(post.category)}
                                                        </span>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={(e) => handleToggleRestrictComments(post.id, post.restrictComments || post.restrict_comments, e)}
                                                                style={{ background: 'none', border: 'none', color: (post.restrictComments || post.restrict_comments) ? 'var(--sakura-pink)' : 'var(--text-muted)', cursor: 'pointer', padding: '4px', fontSize: '0.85rem' }}
                                                                title={(post.restrictComments || post.restrict_comments) ? "Mở khóa bình luận thành viên" : "Chỉ cho phép BQL bình luận"}
                                                            >
                                                                {(post.restrictComments || post.restrict_comments) ? "🔒" : "🔓"}
                                                            </button>
                                                        )}
                                                        {isAuthorOrAdmin && (
                                                            <button
                                                                onClick={(e) => handleDeletePost(post.id, e)}
                                                                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '4px', fontSize: '0.85rem' }}
                                                                title="Xóa bài viết"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Post Content */}
                                                <div style={{ cursor: 'pointer' }} onClick={() => fetchPostDetail(post.id)}>
                                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1.08rem', color: 'var(--text-main)', fontWeight: 650, lineHeight: '1.3' }}>
                                                        {post.title}
                                                    </h4>
                                                    <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: 'var(--text-content)', whiteSpace: 'pre-line', lineHeight: '1.55' }}>
                                                        {post.content}
                                                    </p>
                                                    {post.image_url && (
                                                        <div style={{ marginTop: '12px', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'center' }}>
                                                            <img 
                                                                src={post.image_url} 
                                                                alt="Post attachment" 
                                                                style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', display: 'block', cursor: 'zoom-in' }} 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setLightboxImage(post.image_url);
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Interaction Actions Bar */}
                                                <div className="interaction-actions-bar">
                                                    {/* Like Button */}
                                                    <button 
                                                        className={`interaction-btn ${post.is_liked ? 'liked' : ''}`}
                                                        onClick={(e) => handleLikePost(post.id, e)}
                                                        title="Thích bài viết"
                                                    >
                                                        <svg viewBox="0 0 24 24">
                                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                                        </svg>
                                                        <span>{post.likes_count || 0} Thích</span>
                                                    </button>

                                                    {/* Comments Button */}
                                                    <button 
                                                        className="interaction-btn"
                                                        onClick={(e) => toggleCommentsExpand(post.id, e)}
                                                        title="Bình luận nhanh"
                                                    >
                                                        <svg viewBox="0 0 24 24" style={{ fill: isCommentsOpen ? 'var(--text-muted)' : 'none' }}>
                                                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                                        </svg>
                                                        <span>{post.comments_count || 0} Bình luận</span>
                                                    </button>
                                                </div>

                                                {/* Quick Comments Overlay Box */}
                                                {isCommentsOpen && (
                                                    <div className="quick-comments-section">
                                                        {/* Render comments list */}
                                                        {post.comments && post.comments.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                                                {post.comments.map(c => (
                                                                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                                                                        {/* Root Comment Row */}
                                                                        <div className="comment-item-node" style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }} onClick={() => c.author_username && viewPublicProfile?.(c.author_username)}>
                                                                                    <img 
                                                                                        src={c.author_avatar_seed && (c.author_avatar_seed.startsWith('http') || c.author_avatar_seed.startsWith('/uploads') || c.author_avatar_seed.startsWith('data:')) 
                                                                                            ? c.author_avatar_seed 
                                                                                            : `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.author_avatar_seed || 'Default'}`} 
                                                                                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                                                                                        alt={c.author_username} 
                                                                                    />
                                                                                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                                                                                        {c.author_displayname} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{c.author_username}</span>
                                                                                    </strong>
                                                                                </div>
                                                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                                                    {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                                </span>
                                                                            </div>
                                                                            <p style={{ fontSize: '0.8rem', marginTop: '4px', lineHeight: 1.4, color: 'var(--text-content)' }}>{c.text}</p>
                                                                            {currentUser && (
                                                                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.68rem', marginTop: '2px' }}>
                                                                                    <button 
                                                                                        type="button" 
                                                                                        style={{ background: 'none', border: 'none', color: 'var(--sakura-pink)', cursor: 'pointer', padding: 0 }}
                                                                                        onClick={() => {
                                                                                            setReplyToUserId(c.user_id);
                                                                                            setQuickReplyToCommentIds(prev => ({ ...prev, [post.id]: c.id }));
                                                                                            if (c.author_username === currentUser.username) {
                                                                                                setQuickCommentTexts(prev => ({ ...prev, [post.id]: "" }));
                                                                                            } else {
                                                                                                setQuickCommentTexts(prev => ({ ...prev, [post.id]: `@${c.author_displayname} ` }));
                                                                                            }
                                                                                            setTimeout(() => {
                                                                                                const el = document.getElementById(`quick-comment-input-${post.id}`);
                                                                                                if (el) el.focus();
                                                                                            }, 50);
                                                                                        }}
                                                                                    >
                                                                                        Phản hồi
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Quick Comment Replies */}
                                                                        {c.replies && c.replies.map(reply => (
                                                                            <div key={reply.id} style={{ marginLeft: '32px', background: 'rgba(0,0,0,0.02)', padding: '6px 10px', borderLeft: '2px solid var(--sakura-pink)', borderRadius: '4px' }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }} onClick={() => reply.author_username && viewPublicProfile?.(reply.author_username)}>
                                                                                        <img 
                                                                                            src={reply.author_avatar_seed && (reply.author_avatar_seed.startsWith('http') || reply.author_avatar_seed.startsWith('/uploads') || reply.author_avatar_seed.startsWith('data:')) 
                                                                                                ? reply.author_avatar_seed 
                                                                                                : `https://api.dicebear.com/7.x/adventurer/svg?seed=${reply.author_avatar_seed || 'Default'}`} 
                                                                                            style={{ width: '18px', height: '18px', borderRadius: '50%' }}
                                                                                            alt={reply.author_username} 
                                                                                        />
                                                                                        <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)' }}>
                                                                                            {reply.author_displayname} <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{reply.author_username}</span>
                                                                                        </strong>
                                                                                    </div>
                                                                                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                                                                        {reply.created_at ? new Date(reply.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                                    </span>
                                                                                </div>
                                                                                <p style={{ fontSize: '0.76rem', marginTop: '2px', lineHeight: 1.35, color: 'var(--text-content)', marginLeft: '24px' }}>{reply.text}</p>
                                                                                {currentUser && (
                                                                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.66rem', marginTop: '2px', marginLeft: '24px' }}>
                                                                                        <button 
                                                                                            type="button" 
                                                                                            style={{ background: 'none', border: 'none', color: 'var(--sakura-pink)', cursor: 'pointer', padding: 0 }}
                                                                                            onClick={() => {
                                                                                                setReplyToUserId(reply.user_id);
                                                                                                setQuickReplyToCommentIds(prev => ({ ...prev, [post.id]: c.id }));
                                                                                                if (reply.author_username === currentUser.username) {
                                                                                                    setQuickCommentTexts(prev => ({ ...prev, [post.id]: "" }));
                                                                                                } else {
                                                                                                    setQuickCommentTexts(prev => ({ ...prev, [post.id]: `@${reply.author_displayname} ` }));
                                                                                                }
                                                                                                setTimeout(() => {
                                                                                                    const el = document.getElementById(`quick-comment-input-${post.id}`);
                                                                                                    if (el) el.focus();
                                                                                                }, 50);
                                                                                            }}
                                                                                        >
                                                                                            Phản hồi
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                                                                Chưa có bình luận nào. Hãy bình luận ngay!
                                                            </div>
                                                        )}

                                                        {/* Quick comment form */}
                                                        {currentUser && (!post.restrictComments || isStaff) ? (
                                                            <form onSubmit={(e) => handleQuickCommentSubmit(post.id, e)} className="quick-comment-input-form">
                                                                <input 
                                                                    id={`quick-comment-input-${post.id}`}
                                                                    type="text" 
                                                                    className="quick-comment-input" 
                                                                    placeholder={quickReplyToCommentIds[post.id] ? "Nhập phản hồi nhanh..." : "Viết bình luận nhanh..."} 
                                                                    value={quickCommentVal}
                                                                    onChange={(e) => setQuickCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                                />
                                                                <button type="submit" className="quick-comment-submit-btn" title="Gửi bình luận">
                                                                    <svg viewBox="0 0 24 24">
                                                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                                                    </svg>
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
                    </div>

                    {/* Right Sidebar - Contacts (Only for logged in users) */}
                    {currentUser && (
                        <div className="sidebar-column">
                            <div className="sidebar-card">
                                <h3 className="card-title">🌸 Danh sách liên lạc</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Click vào bạn bè để mở ô chat nhanh.</p>
                                <div className="right-sidebar-contacts">
                                    {forumFriends.map(friend => (
                                        <div 
                                            key={friend.id} 
                                            className="contact-item" 
                                            onClick={() => handleStartChat(friend)}
                                        >
                                            <div className="contact-avatar">
                                                <img 
                                                    src={friend.avatarSeed && (friend.avatarSeed.startsWith('http') || friend.avatarSeed.startsWith('/uploads') || friend.avatarSeed.startsWith('data:')) 
                                                        ? friend.avatarSeed 
                                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.avatarSeed || 'Default'}`} 
                                                    alt="Avatar" 
                                                />
                                            </div>
                                            <div className="contact-name">{friend.displayname}</div>
                                        </div>
                                    ))}
                                    {forumFriends.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '10px 0', textAlign: 'center' }}>Chưa có bạn bè nào. Hãy gửi kết bạn ở trang cá nhân của thành viên nhé!</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {subView === 'create' && (
                <div className="content-box" style={{ padding: '24px' }}>
                    <h3 className="section-title">Đăng bài viết mới lên Diễn đàn</h3>
                    <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        <div className="input-field">
                            <label>Tiêu đề bài đăng</label>
                            <input 
                                type="text" 
                                placeholder="Nhập tiêu đề ấn tượng..." 
                                value={newTitle} 
                                onChange={(e) => setNewTitle(e.target.value)} 
                                required
                            />
                        </div>

                        <div className="input-field">
                            <label>Chủ đề lựa chọn</label>
                            <select 
                                value={newCategory} 
                                onChange={(e) => setNewCategory(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            >
                                <option value="general">Thảo luận chung</option>
                                <option value="announcement">Thông báo hệ thống</option>
                                <option value="review">Review sách / truyện</option>
                                <option value="spoil">Spoil thảo luận tình tiết</option>
                                <option value="qa">Hỏi đáp thắc mắc</option>
                                <option value="misc">Linh tinh khác</option>
                            </select>
                        </div>

                        <div className="input-field">
                            <label>Nội dung chi tiết</label>
                            <textarea 
                                placeholder="Nhập nội dung chia sẻ..." 
                                value={newContent} 
                                onChange={(e) => setNewContent(e.target.value)} 
                                required
                                style={{ width: '100%', minHeight: '160px', padding: '10px', border: '1.5px solid var(--border-color)', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                        </div>

                        {/* Image attachment file upload */}
                        <div className="input-field" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Thêm hình ảnh bài đăng (Tùy chọn)</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                                <label className="outline-btn small" style={{ cursor: 'pointer', margin: 0, padding: '8px 16px' }}>
                                    📁 Chọn file ảnh từ máy
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setNewImageFile(file);
                                                setNewImageUrl(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Hoặc dán URL liên kết ảnh..." 
                                    value={newImageFile ? "" : newImageUrl} 
                                    disabled={!!newImageFile}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                            </div>
                            {newImageUrl && (
                                <div style={{ position: 'relative', width: 'fit-content', marginTop: '12px', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <img 
                                        src={newImageUrl} 
                                        alt="Preview Attachment" 
                                        style={{ maxWidth: '200px', maxHeight: '150px', display: 'block', objectFit: 'cover' }} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setNewImageUrl('');
                                            setNewImageFile(null);
                                        }}
                                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}
                                        title="Xóa ảnh đính kèm"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-row-end" style={{ gap: '12px', marginTop: '16px' }}>
                            <button 
                                type="button" 
                                className="outline-btn" 
                                onClick={() => {
                                    setSubView('list');
                                    setNewTitle('');
                                    setNewContent('');
                                    setNewImageUrl('');
                                    setNewImageFile(null);
                                }}
                            >
                                Hủy
                            </button>
                            <button type="submit" className="primary-btn">Đăng bài viết</button>
                        </div>
                    </form>
                </div>
            )}

            {subView === 'detail' && selectedPost && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Back navigation */}
                    <div>
                        <button className="text-link-btn" onClick={() => { setSubView('list'); if (setInitialPostId) setInitialPostId(null); }}>
                            ← Quay lại danh sách bài viết
                        </button>
                    </div>

                    {/* Main post box */}
                    <div className="content-box" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <span className="tag-badge" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-color)' }}>
                                {formatCategoryName(selectedPost.category)}
                            </span>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {isAdmin && (
                                    <button
                                        onClick={(e) => handleToggleRestrictComments(selectedPost.id, selectedPost.restrictComments || selectedPost.restrict_comments, e)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: (selectedPost.restrictComments || selectedPost.restrict_comments) ? 'var(--sakura-pink)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                        title={(selectedPost.restrictComments || selectedPost.restrict_comments) ? "Mở khóa bình luận thành viên" : "Chỉ cho phép BQL bình luận"}
                                    >
                                        {(selectedPost.restrictComments || selectedPost.restrict_comments) ? "🔒 Chỉ BQL" : "🔓 Tự do"}
                                    </button>
                                )}
                                {currentUser && (selectedPost.author_id === currentUser.id || currentUser.roles.includes('admin')) && (
                                    <button
                                        onClick={(e) => handleDeletePost(selectedPost.id, e)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#dc3545',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                        title="Xóa bài viết"
                                    >
                                        🗑️ Xóa bài
                                    </button>
                                )}
                            </div>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px' }}>
                            {selectedPost.title}
                        </h2>
                        
                        {/* Author info bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div className="post-author-avatar">
                                <img 
                                    src={selectedPost.author_avatar_seed && (selectedPost.author_avatar_seed.startsWith('http') || selectedPost.author_avatar_seed.startsWith('/uploads') || selectedPost.author_avatar_seed.startsWith('data:')) 
                                        ? selectedPost.author_avatar_seed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedPost.author_avatar_seed || 'Default'}`} 
                                    alt={selectedPost.author_username} 
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{selectedPost.author_displayname}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{selectedPost.author_username} • {new Date(selectedPost.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ 
                            fontSize: '0.95rem', 
                            color: 'var(--text-main)', 
                            lineHeight: 1.7, 
                            whiteSpace: 'pre-line',
                            minHeight: '120px'
                        }}>
                            {selectedPost.content}
                        </div>

                        {selectedPost.image_url && (
                            <div style={{ marginTop: '16px', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'center' }}>
                                <img 
                                    src={selectedPost.image_url} 
                                    alt="Post attachment" 
                                    style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', display: 'block', cursor: 'zoom-in' }} 
                                    onClick={() => setLightboxImage(selectedPost.image_url)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Replies section */}
                    <div className="content-box" style={{ padding: '24px' }}>
                        <h3 className="section-title" style={{ marginBottom: '16px' }}>Phản hồi ({selectedPost.comments?.length || 0})</h3>
                        
                        {/* Comments list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            {selectedPost.comments?.map(comment => (
                                <div key={comment.id} style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div className="flex-row-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }} onClick={() => comment.author_username && viewPublicProfile?.(comment.author_username)}>
                                            <img 
                                                src={comment.author_avatar_seed && (comment.author_avatar_seed.startsWith('http') || comment.author_avatar_seed.startsWith('/uploads') || comment.author_avatar_seed.startsWith('data:')) 
                                                    ? comment.author_avatar_seed 
                                                    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.author_avatar_seed || 'Default'}`} 
                                                style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                                                alt={comment.author_username} 
                                            />
                                            <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                                                {comment.author_displayname} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{comment.author_username}</span>
                                            </strong>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            {new Date(comment.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.5, color: 'var(--text-content)' }}>{comment.text}</p>
                                    {currentUser && (
                                        <div style={{ marginTop: '6px', display: 'flex', gap: '12px' }}>
                                            <button 
                                                type="button" 
                                                style={{ background: 'none', border: 'none', color: 'var(--sakura-pink)', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
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
                                        <div className="reply-form-placeholder" style={{ marginTop: '8px', marginLeft: '40px' }}>
                                            <textarea 
                                                id={`reply-textarea-${comment.id}`}
                                                placeholder="Nhập phản hồi..." 
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                style={{ width: '100%', minHeight: '60px', fontSize: '0.8rem', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                                <button type="button" className="outline-btn small" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => { setReplyToCommentId(null); setReplyToUserId(null); }}>Hủy</button>
                                                <button type="button" className="primary-btn small" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => handleSubmitReply(comment.id)}>Gửi phản hồi</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Child Comments List */}
                                    {comment.replies && comment.replies.map(reply => (
                                        <div key={reply.id} className="comment-reply-node" style={{ marginLeft: '40px', marginTop: '12px', background: 'rgba(0,0,0,0.02)', padding: '8px 12px', borderLeft: '2px solid var(--sakura-pink)', borderRadius: '4px' }}>
                                            <div className="flex-row-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }} onClick={() => reply.author_username && viewPublicProfile?.(reply.author_username)}>
                                                    <img 
                                                        src={reply.author_avatar_seed && (reply.author_avatar_seed.startsWith('http') || reply.author_avatar_seed.startsWith('/uploads') || reply.author_avatar_seed.startsWith('data:')) 
                                                            ? reply.author_avatar_seed 
                                                            : `https://api.dicebear.com/7.x/adventurer/svg?seed=${reply.author_avatar_seed || 'Default'}`} 
                                                        style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                                                        alt={reply.author_username} 
                                                    />
                                                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                                                        {reply.author_displayname} <span style={{ fontSize: '0.7' + 'rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>@{reply.author_username}</span>
                                                    </strong>
                                                </div>
                                                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                                    {new Date(reply.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.82rem', marginTop: '4px', lineHeight: 1.4, color: 'var(--text-content)', marginLeft: '26px' }}>{reply.text}</p>
                                            {currentUser && (
                                                <div style={{ marginTop: '4px', display: 'flex', gap: '12px', marginLeft: '26px' }}>
                                                    <button 
                                                        type="button" 
                                                        style={{ background: 'none', border: 'none', color: 'var(--sakura-pink)', cursor: 'pointer', padding: 0, fontSize: '0.72rem' }}
                                                        onClick={() => {
                                                            setReplyToCommentId(comment.id);
                                                            setReplyToUserId(reply.user_id);
                                                            if (reply.author_username === currentUser.username) {
                                                                setReplyText("");
                                                            } else {
                                                                setReplyText(`@${reply.author_displayname} `);
                                                            }
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
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {(!selectedPost.comments || selectedPost.comments.length === 0) && (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    Chưa có phản hồi nào. Hãy là người đầu tiên trả lời bài viết này!
                                </div>
                            )}
                        </div>

                        {/* Comment input form */}
                        {currentUser ? (
                            (!selectedPost.restrictComments || isStaff) ? (
                                <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="input-field">
                                        <label style={{ fontSize: '0.85rem' }}>Viết phản hồi</label>
                                        <textarea
                                            id="detailed-comment-textarea"
                                            placeholder="Nhập nội dung câu trả lời hoặc thảo luận..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            required
                                            style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1.5px solid var(--border-color)', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <button type="submit" className="primary-btn small" style={{ alignSelf: 'flex-end' }}>Gửi phản hồi</button>
                                </form>
                            ) : (
                                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    🔒 Chỉ Quản trị viên và Điều phối viên mới được phép bình luận trong bài viết này.
                                </div>
                            )
                        ) : (
                            <div style={{ background: 'var(--bg-base)', padding: '12px', borderRadius: '4px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Vui lòng đăng nhập để gửi câu trả lời thảo luận.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Popup chat kiểu Facebook ở dưới cùng màn hình (chỉ hiển thị khi đang trong subView list) */}
            {subView === 'list' && activeChatFriend && (
                <div className="fb-chat-popup">
                    <div className="fb-chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="fb-chat-avatar">
                                <img 
                                    src={activeChatFriend.avatarSeed && (activeChatFriend.avatarSeed.startsWith('http') || activeChatFriend.avatarSeed.startsWith('/uploads') || activeChatFriend.avatarSeed.startsWith('data:')) 
                                        ? activeChatFriend.avatarSeed 
                                        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeChatFriend.avatarSeed || 'Default'}`} 
                                    alt={activeChatFriend.displayname} 
                                />
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
                                Bắt đầu trò chuyện wibu wibu với {activeChatFriend.displayname}...
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
                            <svg viewBox="0 0 24 24">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Lightbox for viewing and zooming images */}
            {lightboxImage && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.92)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    backdropFilter: 'blur(8px)'
                }} onClick={() => { setLightboxImage(null); setLightboxZoom(1); setLightboxRotation(0); }}>
                    {/* Image Container */}
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

                    {/* Toolbar Controls */}
                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.6)',
                        padding: '12px 24px',
                        borderRadius: '30px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        zIndex: 100000
                    }} onClick={(e) => e.stopPropagation()}>
                        <button 
                            className="interaction-btn" 
                            style={{ color: '#fff', fontSize: '1.2rem', padding: '4px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', border: 'none', cursor: 'pointer' }}
                            onClick={() => setLightboxZoom(prev => Math.max(0.5, prev - 0.25))}
                            title="Thu nhỏ"
                        >
                            ➖
                        </button>
                        <span style={{ color: '#fff', fontSize: '0.9rem', minWidth: '60px', textAlign: 'center', fontWeight: 600 }}>
                            {Math.round(lightboxZoom * 100)}%
                        </span>
                        <button 
                            className="interaction-btn" 
                            style={{ color: '#fff', fontSize: '1.2rem', padding: '4px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', border: 'none', cursor: 'pointer' }}
                            onClick={() => setLightboxZoom(prev => Math.min(5, prev + 0.25))}
                            title="Phóng to"
                        >
                            ➕
                        </button>
                        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
                        <button 
                            className="interaction-btn" 
                            style={{ color: '#fff', fontSize: '1.2rem', padding: '4px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', border: 'none', cursor: 'pointer' }}
                            onClick={() => setLightboxRotation(prev => (prev + 90) % 360)}
                            title="Xoay ảnh 90°"
                        >
                            🔄
                        </button>
                        <button 
                            className="interaction-btn" 
                            style={{ fontSize: '0.85rem', padding: '6px 14px', background: 'var(--sakura-pink)', color: '#fff', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => { setLightboxZoom(1); setLightboxRotation(0); }}
                            title="Đặt lại zoom & xoay"
                        >
                            Đặt lại
                        </button>
                    </div>

                    {/* Close Button */}
                    <button 
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '30px',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s',
                            zIndex: 100000
                        }} 
                        onClick={() => { setLightboxImage(null); setLightboxZoom(1); setLightboxRotation(0); }}
                        title="Đóng (Esc)"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
