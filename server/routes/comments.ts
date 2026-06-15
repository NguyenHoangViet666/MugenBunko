import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { addXpToUser } from '../utils/level.js';

const router = Router();

// Get latest global comments
router.get('/global/latest', async (req: Request, res: Response) => {
    try {
        const list = await db.query<any[]>(
            `SELECT c.*, u.displayname, u.avatar_seed as avatarSeed, n.title as novelTitle, n.id as novelId
             FROM comments c
             JOIN users u ON c.user_id = u.id
             JOIN novels n ON c.novel_id = n.id
             ORDER BY c.created_at DESC
             LIMIT 3`
        );
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải bình luận mới nhất." });
    }
});

// Get comments
router.get('/:novelId', async (req: Request, res: Response) => {
    try {
        const list = await db.query<any[]>(
            `SELECT c.*, u.username, u.displayname, u.avatar_seed as avatarSeed, DATE_FORMAT(c.created_at, '%d/%m/%Y %H:%i') as date
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.novel_id = ?
             ORDER BY c.created_at ASC`,
            [req.params.novelId]
        );
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải danh sách bình luận." });
    }
});

// Add comment
router.post('/:novelId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { parentId, text, replyToUserId } = req.body;
    const novelId = req.params.novelId;
    const userId = req.user?.id;

    if (!userId || !text.trim()) {
        return res.status(400).json({ error: "Nội dung bình luận không hợp lệ!" });
    }

    try {
        const result = await db.query<any>(
            "INSERT INTO comments (novel_id, user_id, parent_id, text) VALUES (?, ?, ?, ?)",
            [novelId, userId, parentId || null, text.trim()]
        );

        // Send notification(s) if it is a reply
        if (parentId) {
            try {
                const novels = await db.query<any[]>("SELECT title FROM novels WHERE id = ?", [novelId]);
                const novelTitle = novels[0]?.title || "Tác phẩm";

                const users = await db.query<any[]>("SELECT displayname FROM users WHERE id = ?", [userId]);
                const replierName = users[0]?.displayname || "Ai đó";

                // 1. Notify the direct user who is being replied to (if not self-reply)
                if (replyToUserId && Number(replyToUserId) !== Number(userId)) {
                    const notificationText = `[${novelTitle}] - ${replierName} đã phản hồi bình luận của bạn.`;
                    await db.query("INSERT INTO notifications (user_id, text) VALUES (?, ?)", [replyToUserId, notificationText]);
                }

                // 2. Notify the root comment author (if not the sender and not already notified as replyToUserId)
                const parentComments = await db.query<any[]>("SELECT user_id FROM comments WHERE id = ?", [parentId]);
                if (parentComments.length > 0) {
                    const parentAuthorId = parentComments[0].user_id;
                    if (Number(parentAuthorId) !== Number(userId) && Number(parentAuthorId) !== Number(replyToUserId)) {
                        const parentNotificationText = `[${novelTitle}] - ${replierName} đã phản hồi bình luận trong luồng của bạn.`;
                        await db.query("INSERT INTO notifications (user_id, text) VALUES (?, ?)", [parentAuthorId, parentNotificationText]);
                    }
                }
            } catch (notifErr) {
                console.error("Error creating comment reply notification:", notifErr);
            }
        }

        // Award +5 XP for commenting
        try {
            await addXpToUser(userId, 5);
        } catch (xpErr) {
            console.error("Error adding XP for commenting:", xpErr);
        }

        res.json({ success: true, commentId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: "Lỗi gửi bình luận." });
    }
});

// Report comment
router.post('/:id/report', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { reason } = req.body;
    const commentId = req.params.id;
    const reporterId = req.user?.id;

    if (!reporterId || !reason.trim()) {
        return res.status(400).json({ error: "Lý do báo cáo không được trống!" });
    }

    try {
        await db.query(
            "INSERT INTO reports (reporter_id, comment_id, reason) VALUES (?, ?, ?)",
            [reporterId, commentId, reason.trim()]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi gửi báo cáo bình luận." });
    }
});

export default router;
