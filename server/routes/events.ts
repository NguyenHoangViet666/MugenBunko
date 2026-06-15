import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// Get global events
router.get('/', async (req: Request, res: Response) => {
    try {
        const list = await db.query<any[]>("SELECT id, title, description, status, content, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM events ORDER BY created_at DESC");
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải sự kiện." });
    }
});

// Create global event (Admin only)
router.post('/', async (req: Request, res: Response) => {
    const { title, description, content, status } = req.body;
    if (!title) return res.status(400).json({ error: "Tiêu đề sự kiện bắt buộc!" });

    try {
        const eventStatus = status || 'draft';
        const eventContent = content || '';
        await db.query("INSERT INTO events (title, description, status, content) VALUES (?, ?, ?, ?)", [title.trim(), description, eventStatus, eventContent]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi tạo sự kiện." });
    }
});

// Update event details or status (Admin only)
router.put('/:id', async (req: Request, res: Response) => {
    const { title, description, status, content } = req.body;
    if (!title) return res.status(400).json({ error: "Tiêu đề sự kiện bắt buộc!" });

    try {
        await db.query(
            "UPDATE events SET title = ?, description = ?, status = ?, content = ? WHERE id = ?",
            [title.trim(), description, status || 'draft', content || '', req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi cập nhật sự kiện." });
    }
});

// Delete global event
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await db.query("DELETE FROM events WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi xóa sự kiện." });
    }
});

export default router;
