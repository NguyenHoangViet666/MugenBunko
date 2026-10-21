import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { publicNovelSql } from '../utils/novelAccess.js';

const router = Router();

// Get Announcements
router.get('/', async (req: Request, res: Response) => {
    try {
        const list = await db.query<any[]>(
            `SELECT a.*, n.title as novelTitle, DATE_FORMAT(a.created_at, '%d/%m/%Y') as date 
             FROM announcements a
             JOIN novels n ON a.novel_id = n.id
             WHERE ${publicNovelSql} ORDER BY a.created_at DESC LIMIT 100`
        );
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải thông báo." });
    }
});

// Post Announcement
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { novelId, text } = req.body;
    if (!Number.isSafeInteger(novelId) || typeof text !== 'string' || !text.trim() || text.length > 5000) return res.status(400).json({ error: 'Nội dung thông báo không hợp lệ.' });

    try {
        const novels = await db.query<any[]>('SELECT author_id FROM novels WHERE id = ?', [novelId]);
        if (!novels.length || (novels[0].author_id !== req.user!.id && !req.user!.roles.includes('admin'))) return res.status(403).json({ error: 'Không có quyền đăng thông báo cho truyện này.' });
        await db.query("INSERT INTO announcements (novel_id, text) VALUES (?, ?)", [novelId, text.trim()]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi gửi thông báo." });
    }
});

export default router;
