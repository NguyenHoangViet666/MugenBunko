import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// Get Mod dashboard queues (Pending chapters, Comment reports, Payout requests, User lists)
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        // 1. Pending chapters
        const pendingChapters = await db.query<any[]>(
            `SELECT c.id, c.title, c.volume_name, c.status, DATE_FORMAT(c.created_at, '%d/%m/%Y %H:%i') as date,
                    n.title as novelTitle, n.id as novelId, u.displayname as authorName
             FROM chapters c
             JOIN novels n ON c.novel_id = n.id
             JOIN users u ON n.author_id = u.id
             WHERE c.status = 'pending'
             ORDER BY c.created_at ASC`
        );

        // 2. Reported comments
        const reportedComments = await db.query<any[]>(
            `SELECT r.id as reportId, r.reason, DATE_FORMAT(r.created_at, '%d/%m/%Y') as date,
                    c.id as commentId, c.text as commentText,
                    u_author.displayname as commentAuthor, u_author.username as commentAuthorUsername,
                    u_reporter.displayname as reporter,
                    c.novel_id as novelId
             FROM reports r
             JOIN comments c ON r.comment_id = c.id
             JOIN users u_author ON c.user_id = u_author.id
             JOIN users u_reporter ON r.reporter_id = u_reporter.id
             ORDER BY r.created_at ASC`
        );

        // 3. User lists (Admin only, but served here)
        const usersList = await db.query<any[]>(
            `SELECT id, username, displayname, coins, level, status, author_request, DATE_FORMAT(date_joined, '%d/%m/%Y') as dateJoined
             FROM users
             ORDER BY id ASC`
        );

        if (usersList.length > 0) {
            const allRoles = await db.query<any[]>("SELECT user_id, role FROM user_roles");
            const rolesMap: Record<number, string[]> = {};
            for (const r of allRoles) {
                if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
                rolesMap[r.user_id].push(r.role);
            }
            for (const u of usersList) {
                u.roles = rolesMap[u.id] || [];
            }
        }

        // 4. Cashout Requests (Disabled - MugenBunko is now non-profit)
        const cashouts: any[] = [];

        res.json({
            pendingChapters,
            reportedComments,
            usersList,
            cashouts
        });
    } catch (err) {
        console.error("Fetch dashboard error:", err);
        res.status(500).json({ error: "Lỗi tải dữ liệu bảng quản trị." });
    }
});

// Mod approves or rejects chapter
router.post('/chapters/:id/action', async (req: Request, res: Response) => {
    const { action } = req.body; // 'approve' or 'reject'
    const chapterId = req.params.id;

    try {
        const chapters = await db.query<any[]>("SELECT novel_id, title, scheduled_release FROM chapters WHERE id = ?", [chapterId]);
        if (chapters.length === 0) return res.status(404).json({ error: "Không tìm thấy chương truyện." });
        const ch = chapters[0];

        const novels = await db.query<any[]>("SELECT title, author_id FROM novels WHERE id = ?", [ch.novel_id]);
        const novel = novels[0];

        if (action === 'approve') {
            const hasFutureSchedule = ch.scheduled_release && new Date(ch.scheduled_release) > new Date();
            const targetStatus = hasFutureSchedule ? 'scheduled' : 'published';

            await db.query("UPDATE chapters SET status = ? WHERE id = ?", [targetStatus, chapterId]);

            let notifText = `✨ Chúc mừng! Chương '${ch.title}' của truyện '${novel.title}' đã được phê duyệt xuất bản thành công.`;
            if (hasFutureSchedule) {
                const dateStr = new Date(ch.scheduled_release).toLocaleString('vi-VN');
                notifText = `✨ Chương '${ch.title}' của truyện '${novel.title}' đã được phê duyệt và hẹn lịch đăng vào lúc ${dateStr}.`;
            }

            await db.query(
                "INSERT INTO notifications (user_id, text) VALUES (?, ?)",
                [novel.author_id, notifText]
            );

            // Auto-promote reader to Author if it is their first approved chapter!
            const authorRoles = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ? AND role = 'author'", [novel.author_id]);
            if (authorRoles.length === 0) {
                await db.query("INSERT INTO user_roles (user_id, role) VALUES (?, 'author')", [novel.author_id]);
                await db.query("UPDATE users SET author_request = 'approved' WHERE id = ?", [novel.author_id]);
                await db.query(
                    "INSERT INTO notifications (user_id, text) VALUES (?, '🎉 Chúc mừng! Tác phẩm của bạn đã được phê duyệt chương đầu tiên. Bạn đã được tự động thăng chức lên Tác giả (Author) chính thức!')",
                    [novel.author_id]
                );
            }
        } else {
            await db.query("UPDATE chapters SET status = 'draft' WHERE id = ?", [chapterId]);
            await db.query(
                "INSERT INTO notifications (user_id, text) VALUES (?, ?)",
                [novel.author_id, `⚠️ Chương '${ch.title}' của truyện '${novel.title}' đã bị từ chối phê duyệt và trả về bản nháp.`]
            );
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi xử lý duyệt chương." });
    }
});

// Action on comment reports (keep or delete)
router.post('/reports/:id/action', async (req: Request, res: Response) => {
    const { action, commentId } = req.body; // 'delete' or 'dismiss'
    const reportId = req.params.id;

    try {
        if (action === 'delete') {
            await db.query("DELETE FROM comments WHERE id = ?", [commentId]);
        } else {
            await db.query("DELETE FROM reports WHERE id = ?", [reportId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi xử lý báo cáo bình luận." });
    }
});

export default router;
