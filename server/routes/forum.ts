import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { addXpToUser } from '../utils/level.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mugenbunko-super-secret-key-12345';

// Get all forum posts (Public route with optional token)
router.get('/posts', async (req: Request, res: Response) => {
    let userId: number | null = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.id;
        } catch (err) {
            // Bỏ qua lỗi token hết hạn hoặc không hợp lệ
        }
    }

    try {
        const posts = await db.query<any[]>(
            `SELECT p.*, u.username as author_username, u.displayname as author_displayname, u.avatar_seed as author_avatar_seed,
                    (SELECT COUNT(*) FROM forum_comments c WHERE c.post_id = p.id) as comments_count,
                    (SELECT COUNT(*) FROM forum_post_likes l WHERE l.post_id = p.id) as likes_count,
                    IF(? IS NULL, 0, EXISTS(SELECT 1 FROM forum_post_likes l WHERE l.post_id = p.id AND l.user_id = ?)) as is_liked
             FROM forum_posts p
             JOIN users u ON p.author_id = u.id
             ORDER BY p.created_at DESC`,
            [userId, userId]
        );

        // Tải kèm toàn bộ bình luận cho các bài viết diễn đàn
        const allComments = await db.query<any[]>(
            `SELECT c.*, u.username as author_username, u.displayname as author_displayname, u.avatar_seed as author_avatar_seed
             FROM forum_comments c
             JOIN users u ON c.user_id = u.id
             ORDER BY c.created_at ASC`
        );

        posts.forEach(post => {
            const postComments = allComments.filter(comment => comment.post_id === post.id);
            // Structure nested 2-level comments
            const roots = postComments.filter(c => c.parent_id === null);
            const replies = postComments.filter(c => c.parent_id !== null);
            roots.forEach(r => {
                r.replies = replies.filter(rep => rep.parent_id === r.id);
            });
            post.comments = roots;
            post.restrictComments = post.restrict_comments === 1;
        });

        res.json(posts);
    } catch (err) {
        console.error("Get forum posts error:", err);
        res.status(500).json({ error: "Lỗi tải bài viết diễn đàn." });
    }
});

// Create a new forum post
router.post('/posts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { title, content, category, imageUrl } = req.body;
    const userId = req.user?.id;

    if (!title || !content || !userId || !category) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ tiêu đề, nội dung và chủ đề!" });
    }

    try {
        const result = await db.query<any>(
            "INSERT INTO forum_posts (title, content, author_id, category, image_url) VALUES (?, ?, ?, ?, ?)",
            [title.trim(), content.trim(), userId, category, imageUrl || null]
        );
        const postId = result.insertId;

        // Award +15 XP for forum posting
        try {
            await addXpToUser(userId, 15);
        } catch (xpErr) {
            console.error("Error adding XP for forum posting:", xpErr);
        }

        res.json({ success: true, postId });
    } catch (err) {
        console.error("Create forum post error:", err);
        res.status(500).json({ error: "Lỗi đăng bài viết." });
    }
});

// Toggle like a forum post
router.post('/posts/:id/like', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Chưa đăng nhập!" });
    }

    try {
        const existing = await db.query<any[]>(
            "SELECT 1 FROM forum_post_likes WHERE post_id = ? AND user_id = ?",
            [postId, userId]
        );

        if (existing.length > 0) {
            await db.query("DELETE FROM forum_post_likes WHERE post_id = ? AND user_id = ?", [postId, userId]);
            res.json({ success: true, liked: false });
        } else {
            await db.query("INSERT INTO forum_post_likes (post_id, user_id) VALUES (?, ?)", [postId, userId]);
            res.json({ success: true, liked: true });
        }
    } catch (err) {
        console.error("Toggle post like error:", err);
        res.status(500).json({ error: "Lỗi tương tác lượt thích." });
    }
});

// Get single forum post with comments (Public route)
router.get('/posts/:id', async (req: Request, res: Response) => {
    const postId = req.params.id;
    
    let userId: number | null = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.id;
        } catch (err) {}
    }

    try {
        const posts = await db.query<any[]>(
            `SELECT p.*, u.username as author_username, u.displayname as author_displayname, u.avatar_seed as author_avatar_seed,
                    (SELECT COUNT(*) FROM forum_post_likes l WHERE l.post_id = p.id) as likes_count,
                    IF(? IS NULL, 0, EXISTS(SELECT 1 FROM forum_post_likes l WHERE l.post_id = p.id AND l.user_id = ?)) as is_liked
             FROM forum_posts p
             JOIN users u ON p.author_id = u.id
             WHERE p.id = ?`,
            [userId, userId, postId]
        );
        if (posts.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy bài viết!" });
        }
        const post = posts[0];
        post.restrictComments = post.restrict_comments === 1;

        const comments = await db.query<any[]>(
            `SELECT c.*, u.username as author_username, u.displayname as author_displayname, u.avatar_seed as author_avatar_seed
             FROM forum_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.post_id = ?
             ORDER BY c.created_at ASC`,
            [postId]
        );

        const roots = comments.filter(c => c.parent_id === null);
        const replies = comments.filter(c => c.parent_id !== null);
        roots.forEach(r => {
            r.replies = replies.filter(rep => rep.parent_id === r.id);
        });
        post.comments = roots;
        res.json(post);
    } catch (err) {
        console.error("Get single post error:", err);
        res.status(500).json({ error: "Lỗi tải chi tiết bài viết." });
    }
});

// Add comment to forum post
router.post('/posts/:id/comments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const postId = req.params.id;
    const { text, replyToUserId, parentId } = req.body;
    const userId = req.user?.id;

    if (!userId || !text) {
        return res.status(400).json({ error: "Thiếu thông tin người dùng hoặc bình luận!" });
    }

    try {
        // Check if post is restricted and get author/title for notifications
        const posts = await db.query<any[]>("SELECT restrict_comments, author_id, title FROM forum_posts WHERE id = ?", [postId]);
        if (posts.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy bài viết!" });
        }
        const post = posts[0];
        if (post.restrict_comments === 1) {
            const roles = req.user?.roles || [];
            const isStaff = roles.includes('admin') || roles.includes('moderator');
            if (!isStaff) {
                return res.status(403).json({ error: "Chỉ Quản trị viên và Điều phối viên mới được phép bình luận trong bài viết này!" });
            }
        }

        const result = await db.query<any>(
            "INSERT INTO forum_comments (post_id, user_id, parent_id, text) VALUES (?, ?, ?, ?)",
            [postId, userId, parentId || null, text.trim()]
        );
        
        const commentId = result.insertId;
        const newComments = await db.query<any[]>(
            `SELECT c.*, u.username as author_username, u.displayname as author_displayname, u.avatar_seed as author_avatar_seed
             FROM forum_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = ?`,
            [commentId]
        );

        // Send notification to the post author or the specific comment author being replied to
        try {
            const replierName = newComments[0]?.author_displayname || "Ai đó";
            const postAuthorId = post.author_id;
            const postTitle = post.title || "Bài viết";

            // 1. Notify the specific comment author being replied to (if not self-reply)
            if (replyToUserId && Number(replyToUserId) !== Number(userId)) {
                const notificationText = `[Diễn đàn] - ${replierName} đã phản hồi bình luận của bạn trong bài viết: "${postTitle}"`;
                await db.query(
                    "INSERT INTO notifications (user_id, text) VALUES (?, ?)",
                    [replyToUserId, notificationText]
                );
            }

            // 2. Notify the post author (if not the sender and not already notified as replyToUserId)
            if (Number(postAuthorId) !== Number(userId) && Number(postAuthorId) !== Number(replyToUserId)) {
                const notificationText = `[Diễn đàn] - ${replierName} đã phản hồi bài viết của bạn: "${postTitle}"`;
                await db.query(
                    "INSERT INTO notifications (user_id, text) VALUES (?, ?)",
                    [postAuthorId, notificationText]
                );
            }
        } catch (notifErr) {
            console.error("Error creating forum comment notification:", notifErr);
        }

        res.json({ success: true, comment: newComments[0] });
    } catch (err) {
        console.error("Add forum comment error:", err);
        res.status(500).json({ error: "Lỗi đăng bình luận." });
    }
});

// Delete a forum post
router.delete('/posts/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const postId = req.params.id;
    const requesterId = req.user?.id;

    if (!requesterId) {
        return res.status(400).json({ error: "Thiếu thông tin người yêu cầu xóa!" });
    }

    try {
        const posts = await db.query<any[]>("SELECT author_id FROM forum_posts WHERE id = ?", [postId]);
        if (posts.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy bài viết!" });
        }
        const post = posts[0];

        const isAdmin = req.user?.roles.includes('admin');
        const isOwner = post.author_id === requesterId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Bạn không có quyền xóa bài viết này!" });
        }

        await db.query("DELETE FROM forum_posts WHERE id = ?", [postId]);
        res.json({ success: true });
    } catch (err) {
        console.error("Delete forum post error:", err);
        res.status(500).json({ error: "Lỗi xóa bài viết." });
    }
});

// Toggle restrict comments (Admin only)
router.put('/posts/:id/restrict-comments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const postId = req.params.id;
    const { restrict } = req.body;
    const isAdmin = req.user?.roles.includes('admin');

    if (!isAdmin) {
        return res.status(403).json({ error: "Chỉ Quản trị viên tối cao mới có quyền thay đổi thiết lập này!" });
    }

    try {
        await db.query("UPDATE forum_posts SET restrict_comments = ? WHERE id = ?", [restrict ? 1 : 0, postId]);
        res.json({ success: true, restrictComments: !!restrict });
    } catch (err) {
        console.error("Restrict comments toggle error:", err);
        res.status(500).json({ error: "Lỗi thiết lập giới hạn bình luận." });
    }
});

export default router;
