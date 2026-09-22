export type UserRole = 'reader' | 'author' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended';

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
    roles: UserRole[];
    bookmarks: number[];
}

export interface Chapter {
    id: number;
    novel_id: number;
    volume_name: string;
    volume?: string;
    title: string;
    content?: string;
    status: 'draft' | 'published' | 'scheduled' | 'pending';
    created_at: string;
    word_count?: number;
}

export interface Novel {
    id: number;
    title: string;
    author_id: number;
    author?: string;
    author_name?: string;
    author_username?: string;
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

export interface ReadingProgress {
    novelId: number;
    novelTitle: string;
    novelCover: string;
    authorName?: string;
    lastChapterIndex: number;
    lastChapterTitle: string;
    totalChapters: number;
    progressPercentage: number;
    updatedAt: string;
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
}

export interface ForumPost {
    id: number;
    title: string;
    content: string;
    author_id: number;
    author_username?: string;
    author_displayname?: string;
    category: string;
    created_at: string;
    likes_count?: number;
    comments_count?: number;
}
