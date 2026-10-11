import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticateToken, optionalAuthentication, AuthenticatedRequest } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';
import { cleanHtml } from '../utils/html.js';

const router = Router();

// Get global events
router.get('/', optionalAuthentication, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const list = await db.query<any[]>("SELECT id, title, description, status, content, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM events WHERE (status IN ('published', 'active') OR ? = 1) ORDER BY created_at DESC LIMIT 100", [req.user?.roles.includes('admin') || false]);
        res.json(list.map(event => ({ ...event, content: cleanHtml(event.content || '') })));
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải sự kiện." });
    }
});

router.use(authenticateToken, checkRole('admin'));

// Create global event (Admin only)
router.post('/', async (req: Request, res: Response) => {
    const { title, description, content, status } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.length > 255 || typeof description !== 'string' || description.length > 5000 || (content !== undefined && (typeof content !== 'string' || content.length > 200000)) || (status && !['draft', 'published', 'active', 'archived'].includes(status))) return res.status(400).json({ error: 'Thông tin sự kiện không hợp lệ.' });

    try {
        const eventStatus = status || 'draft';
        const eventContent = cleanHtml(content || '');
        await db.query("INSERT INTO events (title, description, status, content) VALUES (?, ?, ?, ?)", [title.trim(), description, eventStatus, eventContent]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi tạo sự kiện." });
    }
});

// Update event details or status (Admin only)
router.put('/:id', async (req: Request, res: Response) => {
    const { title, description, status, content } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.length > 255 || typeof description !== 'string' || description.length > 5000 || (content !== undefined && (typeof content !== 'string' || content.length > 200000)) || (status && !['draft', 'published', 'active', 'archived'].includes(status))) return res.status(400).json({ error: 'Thông tin sự kiện không hợp lệ.' });

    try {
        await db.query(
            "UPDATE events SET title = ?, description = ?, status = ?, content = ? WHERE id = ?",
            [title.trim(), description, status || 'draft', cleanHtml(content || ''), req.params.id]
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
