export type UserRole = 'reader' | 'author' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type AuthorRequestStatus = 'pending' | 'approved' | 'rejected' | 'null' | null;

export interface Notification {
    id: number;
    text: string;
    read: boolean | number;
    date: string;
}

export interface User {
    id: number;
    username: string;
    displayname: string;
    coins: number;
    level: number;
    xp: number;
    bio: string | null;
    avatarSeed: string | null;
    status: UserStatus;
    author_request: AuthorRequestStatus;
    date_joined?: string;
    dateJoined?: string;
    roles: UserRole[];
    bookmarks: number[];
    notifications: Notification[];
    followedAuthors?: string[];
}

export interface Novel {
    id: number;
    title: string;
    author_id: number;
    author?: string;
    author_name?: string;
    author_username?: string;
    authorId?: string;
    bookmarksCount?: number;
    cover: string;
    summary: string | null;
    genre: string;
    status: 'active' | 'suspended' | 'ongoing' | 'completed' | 'paused' | 'draft' | 'published';
    type: 'series' | 'oneshot';
    reads: number;
    rating: number | string;
    bookmarks_count: number;
    created_at?: string;
    tags?: string[];
    chapters?: Chapter[];
    authorAvatarSeed?: string;
    authorBio?: string;
}

export interface Chapter {
    id: number;
    novel_id: number;
    volume_name: string;
    volume?: string;
    title: string;
    content?: string;
    status: 'draft' | 'published' | 'scheduled' | 'pending';
    scheduled_release: string | null;
    created_at: string;
    date?: string;
    word_count?: number;
}

export interface Comment {
    id: number;
    novel_id: number;
    user_id: number;
    username: string;
    displayname: string;
    parent_id: number | null;
    text: string;
    created_at: string;
    replies?: Comment[];
    date?: string;
    avatarSeed?: string;
}

export interface Review {
    id: number;
    novel_id: number;
    user_id: number;
    username: string;
    displayname: string;
    stars: number;
    text: string;
    created_at: string;
    date?: string;
    avatarSeed?: string;
}

export interface SystemEvent {
    id: number;
    title: string;
    description: string | null;
    content: string | null;
    status: 'draft' | 'published' | 'active';
    created_at: string;
}

export interface Report {
    id: number;
    reporter_id: number;
    reporter_username?: string;
    comment_id: number;
    comment_text: string;
    novel_title: string;
    reason: string;
    created_at: string;
}

export interface ForumPost {
    id: number;
    title: string;
    content: string;
    author_id: number;
    author_username?: string;
    author_displayname?: string;
    author_avatar_seed?: string;
    category: string;
    restrict_comments: boolean | number;
    restrictComments?: boolean | number;
    image_url: string | null;
    created_at: string;
    likes_count?: number;
    liked_by_user?: boolean | number;
    is_liked?: boolean | number;
    comments_count?: number;
    comments?: ForumComment[];
}

export interface ForumComment {
    id: number;
    post_id: number;
    user_id: number;
    username?: string;
    displayname?: string;
    author_username?: string;
    author_displayname?: string;
    author_avatar_seed?: string;
    parent_id: number | null;
    text: string;
    created_at: string;
    replies?: ForumComment[];
}

export interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    message_text: string;
    is_read: boolean | number;
    created_at: string;
}

export interface Rule {
    id: number;
    title: string;
    content: string;
    order_index: number;
    created_at?: string;
    updated_at?: string;
}

export interface LevelInfo {
    level: number;
    tierName: string;
    currentXpInTier: number;
    nextTierXpNeeded: number;
    progressPercentage: number;
    className: string;
}
