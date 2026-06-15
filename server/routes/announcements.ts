import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// Get Announcements
router.get('/', async (req: Request, res: Response) => {
    try {
        const list = await db.query<any[]>(
            `SELECT a.*, n.title as novelTitle, DATE_FORMAT(a.created_at, '%d/%m/%Y') as date 
             FROM announcements a
             JOIN novels n ON a.novel_id = n.id
             ORDER BY a.created_at DESC`
        );
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải thông báo." });
    }
});

// Post Announcement
router.post('/', async (req: Request, res: Response) => {
    const { novelId, text } = req.body;
    if (!novelId || !text.trim()) return res.status(400).json({ error: "Nội dung thông báo không hợp lệ!" });

    try {
        await db.query("INSERT INTO announcements (novel_id, text) VALUES (?, ?)", [novelId, text.trim()]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi gửi thông báo." });
    }
});

export default router;
