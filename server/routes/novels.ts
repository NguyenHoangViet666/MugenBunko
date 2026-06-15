import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get all novels (Public route)
router.get('/', async (req: Request, res: Response) => {
    try {
        const novelsList = await db.query<any[]>(
            `SELECT n.*, u.username as authorId, u.displayname as author, u.avatar_seed as authorAvatarSeed, u.bio as authorBio,
                     (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.status = 'published') as chapters_count,
                     (SELECT COUNT(*) FROM reviews r WHERE r.novel_id = n.id) as reviews_count
             FROM novels n
             JOIN users u ON n.author_id = u.id
             ORDER BY n.reads DESC`
        );

        if (novelsList.length > 0) {
            // Fetch and group tags
            const allTags = await db.query<any[]>("SELECT novel_id, tag FROM novel_tags");
            const tagsMap: Record<number, string[]> = {};
            for (const t of allTags) {
                if (!tagsMap[t.novel_id]) tagsMap[t.novel_id] = [];
                tagsMap[t.novel_id].push(t.tag);
            }

            // Fetch and group chapters (excluding 'content' field to minimize payload size)
            const allChapters = await db.query<any[]>(
                `SELECT id, novel_id, volume_name, title, status, word_count, DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') as date, scheduled_release 
                 FROM chapters`
            );
            const chaptersMap: Record<number, any[]> = {};
            for (const c of allChapters) {
                if (!chaptersMap[c.novel_id]) chaptersMap[c.novel_id] = [];
                chaptersMap[c.novel_id].push(c);
            }

            // Map grouped tags and chapters back to each novel
            for (const n of novelsList) {
                n.tags = tagsMap[n.id] || [];
                n.chapters = chaptersMap[n.id] || [];
                
                n.reads = parseInt(n.reads);
                n.bookmarksCount = parseInt(n.bookmarks_count);
                n.reviewsCount = parseInt(n.reviews_count);
            }
        }

        res.json(novelsList);
    } catch (err) {
        console.error("Get novels error:", err);
        res.status(500).json({ error: "Lỗi tải danh mục truyện." });
    }
});

// Add Novel
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { title, cover, summary, genre, tags, type, status } = req.body;
    if (!title || !genre) {
        return res.status(400).json({ error: "Vui lòng nhập tên tác phẩm và thể loại!" });
    }

    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Tài khoản không hợp lệ!" });
        }

        const result = await db.query<any>(
            "INSERT INTO novels (title, author_id, cover, summary, genre, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [title.trim(), userId, cover, summary, genre, type || 'series', status || 'active']
        );
        const novelId = result.insertId;

        // Insert tags
        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (t.trim()) {
                    await db.query("INSERT INTO novel_tags (novel_id, tag) VALUES (?, ?)", [novelId, t.trim()]);
                }
            }
        }

        res.json({ success: true, novelId });
    } catch (err) {
        console.error("Create novel error:", err);
        res.status(500).json({ error: "Lỗi khởi tạo tác phẩm." });
    }
});

// Edit Novel Details (Secure check for author ownership or Admin)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const novelId = req.params.id;
    const { title, cover, summary, genre, tags, type, status } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Tài khoản không hợp lệ!" });
    }
    if (!title || !genre) {
        return res.status(400).json({ error: "Vui lòng nhập tên tác phẩm và thể loại!" });
    }

    try {
        // Verify ownership
        const novelsList = await db.query<any[]>("SELECT author_id FROM novels WHERE id = ?", [novelId]);
        if (novelsList.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tác phẩm này." });
        }
        const novel = novelsList[0];
        const isAdmin = req.user?.roles.includes('admin');
        const isOwner = novel.author_id === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa tác phẩm này!" });
        }

        // Update novel
        await db.query(
            "UPDATE novels SET title = ?, cover = ?, summary = ?, genre = ?, type = ?, status = ? WHERE id = ?",
            [title.trim(), cover, summary, genre, type || 'series', status || 'active', novelId]
        );

        // Re-sync tags: Delete old and insert new
        await db.query("DELETE FROM novel_tags WHERE novel_id = ?", [novelId]);
        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (t.trim()) {
                    await db.query("INSERT INTO novel_tags (novel_id, tag) VALUES (?, ?)", [novelId, t.trim()]);
                }
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Edit novel error:", err);
        res.status(500).json({ error: "Lỗi chỉnh sửa tác phẩm." });
    }
});

// Delete Novel (Secure check for owner Author or Admin with notification reason)
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const novelId = req.params.id;
    const { reason } = req.body;
    const requesterId = req.user?.id;

    if (!requesterId) {
        return res.status(400).json({ error: "Thiếu thông tin người yêu cầu xóa!" });
    }

    try {
        // 1. Fetch novel to check author ownership and details
        const novelsList = await db.query<any[]>("SELECT title, author_id FROM novels WHERE id = ?", [novelId]);
        if (novelsList.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tác phẩm này." });
        }
        const novel = novelsList[0];

        const isAdmin = req.user?.roles.includes('admin');
        const isOwner = novel.author_id === requesterId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Bạn không có quyền xóa tác phẩm này!" });
        }

        // Save metadata to deleted_novels first
        const deleteReason = reason ? reason.trim() : (isAdmin && !isOwner ? "Không tuân thủ nguyên tắc cộng đồng." : "Tác giả tự gỡ bỏ tác phẩm.");
        await db.query(
            "INSERT INTO deleted_novels (id, title, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title = ?, reason = ?",
            [novelId, novel.title, deleteReason, novel.title, deleteReason]
        );

        // 2. Delete novel from database
        await db.query("DELETE FROM novels WHERE id = ?", [novelId]);

        // 3. Send notification if deleted by Admin with a reason
        if (isAdmin && !isOwner) {
            await db.query(
                "INSERT INTO notifications (user_id, text) VALUES (?, ?)",
                [novel.author_id, `⚠️ Tác phẩm '${novel.title}' của bạn đã bị Quản trị viên gỡ bỏ khỏi MugenBunko. Lý do: ${deleteReason}`]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Delete novel backend error:", err);
        res.status(500).json({ error: "Lỗi xóa tác phẩm từ máy chủ." });
    }
});

// Get details of a deleted novel
router.get('/deleted/:id', async (req: Request, res: Response) => {
    const novelId = req.params.id;
    try {
        const results = await db.query<any[]>(
            "SELECT id, title, reason, DATE_FORMAT(deleted_at, '%d/%m/%Y %H:%i') as deletedAt FROM deleted_novels WHERE id = ?",
            [novelId]
        );
        if (results.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy thông tin truyện đã xóa." });
        }
        res.json(results[0]);
    } catch (err) {
        console.error("Get deleted novel error:", err);
        res.status(500).json({ error: "Lỗi tải thông tin truyện đã xóa." });
    }
});

// Toggle Bookmark
router.post('/:id/bookmark', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const novelId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Tài khoản không hợp lệ!" });
    }

    try {
        const existing = await db.query<any[]>("SELECT 1 FROM bookmarks WHERE user_id = ? AND novel_id = ?", [userId, novelId]);
        
        if (existing.length > 0) {
            // Unbookmark
            await db.query("DELETE FROM bookmarks WHERE user_id = ? AND novel_id = ?", [userId, novelId]);
            await db.query("UPDATE novels SET bookmarks_count = GREATEST(0, bookmarks_count - 1) WHERE id = ?", [novelId]);
        } else {
            // Bookmark
            await db.query("INSERT INTO bookmarks (user_id, novel_id) VALUES (?, ?)", [userId, novelId]);
            await db.query("UPDATE novels SET bookmarks_count = bookmarks_count + 1 WHERE id = ?", [novelId]);
        }

        // Fetch updated user
        const users = await db.query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
        const user = users[0];
        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
        user.roles = rolesData.map(r => r.role);
        const bookmarksData = await db.query<any[]>("SELECT novel_id FROM bookmarks WHERE user_id = ?", [userId]);
        user.bookmarks = bookmarksData.map(b => b.novel_id);
        const notifs = await db.query<any[]>("SELECT id, text, is_read as `read`, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [userId]);
        user.notifications = notifs;
        delete user.password;

        res.json({ user });
    } catch (err) {
        console.error("Toggle bookmark error:", err);
        res.status(500).json({ error: "Lỗi đồng bộ tủ sách." });
    }
});

// Increment read count (with 10 minutes IP Cooldown to prevent view boosting)
router.post('/:id/read-increment', async (req: Request, res: Response) => {
    const novelId = req.params.id;
    // Get client IP address safely
    const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();

    try {
        // Check if there is an active cooldown for this IP and novel in the last 10 minutes
        const cooldowns = await db.query<any[]>(
            `SELECT last_read_at, TIMESTAMPDIFF(MINUTE, last_read_at, NOW()) AS diff_minutes 
             FROM read_cooldowns 
             WHERE ip_address = ? AND novel_id = ?`,
            [ipAddress, novelId]
        );

        if (cooldowns.length > 0 && cooldowns[0].diff_minutes < 10) {
            // Under cooldown, return success: true but do NOT increment reads
            return res.json({ success: true, cooldown: true });
        }

        // Not under cooldown: update or insert cooldown record
        await db.query(
            `INSERT INTO read_cooldowns (ip_address, novel_id, last_read_at) 
             VALUES (?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE last_read_at = NOW()`,
            [ipAddress, novelId]
        );

        // Increment the novel's reads counter
        await db.query("UPDATE novels SET `reads` = `reads` + 1 WHERE id = ?", [novelId]);
        res.json({ success: true, cooldown: false });
    } catch (err) {
        console.error("Increment reads count error:", err);
        res.status(500).json({ error: "Lỗi cập nhật lượt đọc." });
    }
});

export default router;
