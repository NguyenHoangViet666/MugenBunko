import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticateToken, optionalAuthentication, AuthenticatedRequest } from '../middleware/auth.js';
import { positiveId, validText } from '../utils/novelAccess.js';
import { contentLimit } from '../middleware/contentLimit.js';
import { pagination } from '../utils/pagination.js';
import { addXpToUser } from '../utils/level.js';
import { cachedRead } from '../utils/readCache.js';

const router = Router();
const categorySql = `CASE LOWER(TRIM(p.category))
    WHEN 'thảo luận chung' THEN 'general' WHEN 'thảo luận' THEN 'general'
    WHEN 'thông báo' THEN 'announcement' WHEN 'thông báo hệ thống' THEN 'announcement'
    WHEN 'review truyện' THEN 'review' WHEN 'review tác phẩm' THEN 'review' WHEN 'đánh giá' THEN 'review'
    WHEN 'spoil tình tiết' THEN 'spoil' WHEN 'spoil nội dung' THEN 'spoil'
    WHEN 'q&a' THEN 'qa' WHEN 'hỏi đáp' THEN 'qa' WHEN 'hỏi đáp thắc mắc' THEN 'qa'
    WHEN 'linh tinh' THEN 'misc' WHEN 'linh tinh khác' THEN 'misc' ELSE LOWER(TRIM(p.category)) END`;

router.get('/stats', optionalAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
        const common = await cachedRead('forum:stats', async () => {
            const [categories, totals, creators] = await Promise.all([
                db.query<any[]>(`SELECT ${categorySql} category,COUNT(*) count FROM forum_posts p GROUP BY 1`),
                db.query<any[]>('SELECT (SELECT COUNT(*) FROM forum_comments) totalComments,(SELECT COUNT(*) FROM forum_post_likes) totalLikes'),
                db.query<any[]>(`SELECT u.username,u.displayname,u.avatar_seed avatarSeed,u.xp,COUNT(p.id) postsCount,
                    SUM((SELECT COUNT(*) FROM forum_post_likes l WHERE l.post_id=p.id)) likesReceived
                    FROM forum_posts p JOIN users u ON u.id=p.author_id GROUP BY u.id ORDER BY likesReceived+postsCount*5 DESC,u.id LIMIT 5`),
            ]);
            return { categories: Object.fromEntries(categories.map(row => [row.category, Number(row.count)])), totalPosts: categories.reduce((sum, row) => sum + Number(row.count), 0),
                totalComments: Number(totals[0].totalComments), totalLikes: Number(totals[0].totalLikes), creators };
        }, 30000);
        const mine = req.user ? await db.query<any[]>(`SELECT COUNT(*) myPosts,COALESCE(SUM((SELECT COUNT(*) FROM forum_post_likes l WHERE l.post_id=p.id)),0) myLikes FROM forum_posts p WHERE p.author_id=?`, [req.user.id]) : [{ myPosts: 0, myLikes: 0 }];
        res.set('Cache-Control', 'private, no-store'); res.json({ ...common, mine: { myPosts: Number(mine[0].myPosts), myLikes: Number(mine[0].myLikes) } });
    } catch { res.status(503).json({ error: 'Không thể tải thống kê cộng đồng.' }); }
});

// Get all forum posts (Public route with optional token)
router.get('/posts', optionalAuthentication, async (req: AuthenticatedRequest, res: Response) => {
    const paging = pagination(req, 50);
    if (!paging) return res.status(400).json({ error: 'Phân trang không hợp lệ.' });
    if (req.query.comments !== undefined && !['all', 'none'].includes(String(req.query.comments))) return res.status(400).json({ error: 'Chế độ bình luận không hợp lệ.' });
    const userId = req.user?.id || null;
    const q = req.query.q === undefined ? '' : req.query.q;
    const category = req.query.category === undefined ? 'all' : req.query.category;
    const sort = req.query.sort === undefined ? 'newest' : req.query.sort;
    const author = req.query.author;
    const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').filter(Boolean).map(Number) : [];
    if (typeof q !== 'string' || q.length > 160 || typeof category !== 'string' || category.length > 60 || typeof sort !== 'string' || !['newest', 'hot', 'pinned', 'media'].includes(sort) ||
        (req.query.ids !== undefined && typeof req.query.ids !== 'string') || ids.length > 500 || ids.some(id => !Number.isSafeInteger(id) || id < 1)) return res.status(400).json({ error: 'Bộ lọc diễn đàn không hợp lệ.' });
    if (author !== undefined && (typeof author !== 'string' || !author.trim() || author.length > 100)) return res.status(400).json({ error: 'Tác giả không hợp lệ.' });
    const filters: string[] = []; const params: unknown[] = [];
    if (author) { filters.push('u.username=?'); params.push(author); }
    if (q.trim()) { const term = '%' + q.trim().replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_') + '%'; filters.push("(p.title LIKE ? ESCAPE '!' OR p.content LIKE ? ESCAPE '!' OR u.displayname LIKE ? ESCAPE '!' OR u.username LIKE ? ESCAPE '!')"); params.push(term, term, term, term); }
    if (category !== 'all') { filters.push(`(${categorySql})=?`); params.push(category); }
    if (sort === 'media') filters.push("(p.image_url IS NOT NULL AND p.image_url<>'' OR p.content LIKE '%[img]%')");
    if (req.query.ids !== undefined) { filters.push(ids.length ? `p.id IN (${ids.map(() => '?').join(',')})` : '1=0'); params.push(...ids); }
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const order = sort === 'hot' ? '(likes_count*2+comments_count*3) DESC,p.id DESC' : sort === 'pinned' ? `CASE WHEN (${categorySql})='announcement' THEN 1 ELSE 0 END DESC,(likes_count+comments_count) DESC,p.id DESC` : 'p.created_at DESC,p.id DESC';
    try {
        const count = await db.query<any[]>(`SELECT COUNT(*) total FROM forum_posts p JOIN users u ON p.author_id=u.id ${where}`, params);
        res.set('X-Total-Count', String(count[0].total));
        const posts = await db.query<any[]>(`SELECT p.*, u.username AS author_username, u.displayname AS author_displayname, u.avatar_seed AS author_avatar_seed,
            u.level AS author_level, u.xp AS author_xp, u.bio AS author_bio,
            (SELECT COUNT(*) FROM forum_comments c WHERE c.post_id = p.id) AS comments_count,
            (SELECT COUNT(*) FROM forum_post_likes l WHERE l.post_id = p.id) AS likes_count,
            EXISTS(SELECT 1 FROM forum_post_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS is_liked
            FROM forum_posts p JOIN users u ON p.author_id = u.id ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
            [userId, ...params, paging.limit + 1, paging.offset]);
        res.set('X-Next-Page', posts.length > paging.limit ? String(paging.page + 1) : '');
        res.set('Cache-Control', 'private, no-store');
        posts.splice(paging.limit);
        if (!posts.length) return res.json([]);
        if (req.query.comments === 'none') return res.json(posts.map(post => ({ ...post, comments: [], restrictComments: post.restrict_comments === 1 })));
        const ids = posts.map(p => p.id);
        const comments = await db.query<any[]>(`SELECT c.*, u.username AS author_username, u.displayname AS author_displayname, u.avatar_seed AS author_avatar_seed
            FROM forum_comments c JOIN users u ON c.user_id = u.id WHERE c.post_id IN (${ids.map(() => '?').join(',')}) ORDER BY c.created_at ASC, c.id ASC`, ids);
        const roots = new Map<number, any[]>(); const replies = new Map<number, any[]>();
        for (const comment of comments) {
            const map = comment.parent_id === null ? roots : replies;
            const key = comment.parent_id === null ? comment.post_id : comment.parent_id;
            const list = map.get(key) || []; list.push(comment); map.set(key, list);
        }
        for (const post of posts) {
            post.comments = (roots.get(post.id) || []).map(c => ({ ...c, replies: replies.get(c.id) || [] }));
            post.restrictComments = post.restrict_comments === 1;
        }
        res.json(posts);
    } catch { res.status(503).json({ error: 'Không thể tải diễn đàn.' }); }
});

// Create a new forum post
router.post('/posts', authenticateToken, contentLimit, async (req: AuthenticatedRequest, res: Response) => {
    const { title, content, category, imageUrl } = req.body;
    const userId = req.user?.id;

    if (!userId || !validText(title, 255) || !validText(content, 50000) || !validText(category, 50) ||
        (imageUrl != null && (typeof imageUrl !== 'string' || imageUrl.length > 2000 || !/^(https?:\/\/|\/uploads\/)/i.test(imageUrl)))) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ tiêu đề, nội dung và chủ đề!" });
    }
    if (['announcement', 'thông báo', 'thông báo hệ thống'].includes(category.trim().toLowerCase()) &&
        !req.user!.roles.some(role => role === 'admin' || role === 'moderator')) {
        return res.status(403).json({ error: 'Chỉ nhân sự điều hành mới được đăng thông báo hệ thống.' });
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

        let liked = false;
        if (existing.length > 0) {
            await db.query("DELETE FROM forum_post_likes WHERE post_id = ? AND user_id = ?", [postId, userId]);
            liked = false;
        } else {
            await db.query("INSERT INTO forum_post_likes (post_id, user_id) VALUES (?, ?)", [postId, userId]);
            liked = true;
        }
        const countRows = await db.query<any[]>("SELECT COUNT(*) AS cnt FROM forum_post_likes WHERE post_id = ?", [postId]);
        const likesCount = Number(countRows[0]?.cnt || 0);
        res.json({ success: true, liked, isLiked: liked, likesCount });
    } catch (err) {
        console.error("Toggle post like error:", err);
        res.status(500).json({ error: "Lỗi tương tác lượt thích." });
    }
});

// Get single forum post with comments (Public route)
router.get('/posts/:id', optionalAuthentication, async (req: AuthenticatedRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user?.id || null;
    try {
        const posts = await db.query<any[]>(
            `SELECT p.*, u.username as author_username, u.displayname as author_displayname, u.avatar_seed as author_avatar_seed,
                    u.level as author_level, u.xp as author_xp, u.bio as author_bio,
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
        const replies = new Map<number, any[]>();
        for (const comment of comments) {
            if (comment.parent_id === null) continue;
            const list = replies.get(comment.parent_id) || [];
            list.push(comment); replies.set(comment.parent_id, list);
        }
        for (const root of roots) root.replies = replies.get(root.id) || [];
        post.comments = roots;
        res.json(post);
    } catch (err) {
        console.error("Get single post error:", err);
        res.status(500).json({ error: "Lỗi tải chi tiết bài viết." });
    }
});

// Add comment to forum post
router.post('/posts/:id/comments', authenticateToken, contentLimit, async (req: AuthenticatedRequest, res: Response) => {
    const postId = req.params.id;
    const { text, replyToUserId, parentId } = req.body;
    const userId = req.user?.id;

    if (!userId || !positiveId(postId) || !validText(text, 5000) ||
        (parentId != null && !positiveId(parentId)) ||
        (replyToUserId != null && (!positiveId(replyToUserId) || !parentId))) {
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

        if (parentId) {
            const parents = await db.query<any[]>('SELECT id FROM forum_comments WHERE id = ? AND post_id = ?', [parentId, postId]);
            if (!parents.length) return res.status(400).json({ error: 'Bình luận cha không thuộc bài viết này.' });
            if (replyToUserId) {
                const recipients = await db.query<any[]>(`SELECT id FROM forum_comments WHERE post_id = ?
                    AND (id = ? OR parent_id = ?) AND user_id = ? LIMIT 1`, [postId, parentId, parentId, replyToUserId]);
                if (!recipients.length) return res.status(400).json({ error: 'Người nhận không thuộc luồng trả lời.' });
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
    if (typeof restrict !== 'boolean' || !positiveId(postId)) return res.status(400).json({ error: 'Thiết lập bình luận không hợp lệ.' });
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
