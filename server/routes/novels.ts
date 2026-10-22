import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticateToken, optionalAuthentication, AuthenticatedRequest } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';
import { positiveId } from '../utils/novelAccess.js';

import { pagination } from '../utils/pagination.js';
const router = Router();

router.get('/', optionalAuthentication, async (req: AuthenticatedRequest, res: Response) => {
        const paging = pagination(req, 100);
        if (!paging) return res.status(400).json({ error: 'Phân trang không hợp lệ.' });
        const userId = req.user?.id || 0;
        const staff = req.user?.roles.some(role => ['admin', 'moderator'].includes(role)) || false;
        try {
            const novels = await db.query<any[]>(                `SELECT n.*, u.username AS authorId, u.displayname AS author, u.avatar_seed AS authorAvatarSeed, u.bio AS authorBio,
                (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.status = 'published') AS chapters_count,
                (SELECT COUNT(*) FROM reviews r WHERE r.novel_id = n.id) AS reviews_count
                FROM novels n JOIN users u ON n.author_id = u.id
                WHERE (n.author_id = ? OR ? = 1 OR (n.status <> 'suspended' AND EXISTS(SELECT 1 FROM chapters c WHERE c.novel_id = n.id AND c.status = 'published')))
                ORDER BY n.reads DESC, n.id DESC LIMIT ? OFFSET ?`,
                [userId, staff, paging.limit + 1, paging.offset]);
            const hasMore = novels.length > paging.limit;
            novels.splice(paging.limit);
            res.set('Cache-Control', 'private, no-store');
            res.set('X-Next-Page', hasMore ? String(paging.page + 1) : '');
            if (!novels.length) return res.json([]);
            const ids = novels.map(n => n.id);
            const placeholders = ids.map(() => '?').join(',');
            const [tags, chapters] = await Promise.all([
                db.query<any[]>(`SELECT novel_id, tag FROM novel_tags WHERE novel_id IN (${placeholders})`, ids),
                db.query<any[]>(`SELECT c.id, c.novel_id, c.volume_name, c.title, c.status, c.word_count,
                    DATE_FORMAT(c.created_at, '%d/%m/%Y %H:%i') AS date, c.scheduled_release
                    FROM chapters c JOIN novels n ON n.id = c.novel_id WHERE c.novel_id IN (${placeholders})
                    AND (c.status = 'published' OR n.author_id = ? OR ? = 1) ORDER BY c.sort_order, c.id`, [...ids, userId, staff]),
            ]);
            const tagMap = new Map<number, string[]>(); const chapterMap = new Map<number, any[]>();
            for (const tag of tags) { const list = tagMap.get(tag.novel_id) || []; list.push(tag.tag); tagMap.set(tag.novel_id, list); }
            for (const chapter of chapters) { const list = chapterMap.get(chapter.novel_id) || []; list.push(chapter); chapterMap.set(chapter.novel_id, list); }
            res.json(novels.map(n => ({ ...n, tags: tagMap.get(n.id) || [], chapters: chapterMap.get(n.id) || [],
                reads: Number(n.reads), bookmarksCount: Number(n.bookmarks_count), reviewsCount: Number(n.reviews_count) })));
        } catch { res.status(503).json({ error: 'Không thể tải danh mục truyện.' }); }
    });

// Add Novel
router.post('/', authenticateToken, checkRole('author'), async (req: AuthenticatedRequest, res: Response) => {
    const { title, cover, summary, genre, tags, type, status } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.length > 255 || typeof genre !== 'string' || !genre.trim() || genre.length > 500 ||
        (cover !== undefined && (typeof cover !== 'string' || cover.length > 255 || !/^(https?:\/\/|\/?assets\/|\/uploads\/)/.test(cover))) ||
        (summary !== undefined && (typeof summary !== 'string' || summary.length > 20000)) ||
        (tags !== undefined && (!Array.isArray(tags) || tags.length > 20 || tags.some(tag => typeof tag !== 'string' || tag.length > 50))) ||
        (type && !['series', 'oneshot'].includes(type)) || (status && !['active', 'ongoing', 'completed', 'paused', 'suspended'].includes(status))) {
        return res.status(400).json({ error: "Vui lòng nhập tên tác phẩm và thể loại!" });
    }

    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Tài khoản không hợp lệ!" });
        }

        if (status === 'suspended' && !req.user!.roles.includes('admin')) return res.status(403).json({ error: 'Không có quyền khóa truyện.' });
        const novelId = await db.transaction(async connection => {
            const [result] = await connection.execute<any>(
                "INSERT INTO novels (title, author_id, cover, summary, genre, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [title.trim(), userId, cover || 'assets/default_novel_cover.png', summary || '', genre.trim(), type || 'series', status || 'active']);
            for (const tag of new Set<string>((tags || []).map((t: string) => t.trim()).filter(Boolean))) {
                await connection.execute('INSERT INTO novel_tags (novel_id, tag) VALUES (?, ?)', [result.insertId, tag]);
            }
            return result.insertId;
        });

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
    if (typeof title !== 'string' || !title.trim() || title.length > 255 || typeof genre !== 'string' || !genre.trim() || genre.length > 500 ||
        (cover !== undefined && (typeof cover !== 'string' || cover.length > 255 || !/^(https?:\/\/|\/?assets\/|\/uploads\/)/.test(cover))) ||
        (summary !== undefined && (typeof summary !== 'string' || summary.length > 20000)) ||
        (tags !== undefined && (!Array.isArray(tags) || tags.length > 20 || tags.some(tag => typeof tag !== 'string' || tag.length > 50))) ||
        (type && !['series', 'oneshot'].includes(type)) || (status && !['active', 'ongoing', 'completed', 'paused', 'suspended'].includes(status))) {
        return res.status(400).json({ error: "Vui lòng nhập tên tác phẩm và thể loại!" });
    }

    try {
        // Verify ownership
        const novelsList = await db.query<any[]>("SELECT author_id, status FROM novels WHERE id = ?", [novelId]);
        if (novelsList.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tác phẩm này." });
        }
        const novel = novelsList[0];
        const isAdmin = req.user?.roles.includes('admin');
        const isOwner = novel.author_id === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa tác phẩm này!" });
        }

        if (!isAdmin && (novel.status === 'suspended' || status === 'suspended')) return res.status(403).json({ error: 'Trạng thái khóa chỉ do quản trị viên quản lý.' });
        // Update novel
        const updated = await db.transaction(async connection => {
        const [result] = await connection.execute<any>(
            "UPDATE novels SET title = ?, cover = ?, summary = ?, genre = ?, type = ?, status = ? WHERE id = ? AND (? = 1 OR status <> 'suspended')",
            [title.trim(), cover || 'assets/default_novel_cover.png', summary || '', genre, type || 'series', status || 'active', novelId, Boolean(isAdmin)]
        );

        if (!result.affectedRows) return false;
        // Re-sync tags: Delete old and insert new
        await connection.execute("DELETE FROM novel_tags WHERE novel_id = ?", [novelId]);
        if (Array.isArray(tags)) {
            for (const t of new Set<string>(tags)) {
                if (t.trim()) {
                    await connection.execute("INSERT IGNORE INTO novel_tags (novel_id, tag) VALUES (?, ?)", [novelId, t.trim()]);
                }
            }
        }

        return true;
        });
        if (!updated) return res.status(403).json({ error: 'Truyện đã bị khóa.' });
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
    if (!positiveId(novelId) || (reason != null && (typeof reason !== 'string' || reason.length > 5000))) {
        return res.status(400).json({ error: 'Thông tin gỡ tác phẩm không hợp lệ.' });
    }
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
router.get('/deleted/:id', optionalAuthentication, async (req: AuthenticatedRequest, res: Response) => {
    const novelId = req.params.id;
    if (!positiveId(novelId)) return res.status(400).json({ error: 'Tác phẩm không hợp lệ.' });
    res.set('Cache-Control', 'private, no-store');
    try {
        const results = await db.query<any[]>(
            "SELECT id, title, reason, DATE_FORMAT(deleted_at, '%d/%m/%Y %H:%i') as deletedAt FROM deleted_novels WHERE id = ?",
            [novelId]
        );
        if (results.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy thông tin truyện đã xóa." });
        }
        const staff = req.user?.roles.some(role => role === 'admin' || role === 'moderator');
        // Legacy tombstones do not record whether the deleted work was ever public.
        res.json(staff ? results[0] : { id: results[0].id, title: 'Tác phẩm đã gỡ bỏ',
            reason: 'Tác phẩm không còn được cung cấp trên MugenBunko.', deletedAt: results[0].deletedAt });
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
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    try {
        const visible = await db.query<any[]>(`SELECT id FROM novels n WHERE id = ? AND status <> 'suspended'
            AND EXISTS(SELECT 1 FROM chapters c WHERE c.novel_id = n.id AND c.status = 'published')`, [novelId]);
        if (!visible.length) return res.status(404).json({ error: 'Không tìm thấy truyện đã xuất bản.' });
        // Create the row in autocommit so duplicate-insert shared locks are released
        // before taking the exclusive cooldown lock inside the transaction.
        await db.query(`INSERT IGNORE INTO read_cooldowns (ip_address, novel_id, last_read_at)
            VALUES (?, ?, '2000-01-01 00:00:00')`, [ipAddress, novelId]);
        const outcome = await db.transaction(async connection => {
            const [rows] = await connection.execute<any[]>(`SELECT TIMESTAMPDIFF(SECOND, last_read_at, NOW()) AS elapsed
                FROM read_cooldowns WHERE ip_address = ? AND novel_id = ? FOR UPDATE`, [ipAddress, novelId]);
            if (Number(rows[0].elapsed) < 600) return { success: true, cooldown: true };
            await connection.execute('UPDATE read_cooldowns SET last_read_at = NOW() WHERE ip_address = ? AND novel_id = ?', [ipAddress, novelId]);
            await connection.execute('UPDATE novels SET `reads` = `reads` + 1 WHERE id = ?', [novelId]);
            return { success: true, cooldown: false };
        });
        return res.json(outcome);
    } catch (err) {
        console.error("Increment reads count error:", err);
        res.status(500).json({ error: "Lỗi cập nhật lượt đọc." });
    }
});

export default router;
