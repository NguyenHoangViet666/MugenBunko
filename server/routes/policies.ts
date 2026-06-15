import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// Get all rules/policies (Public API)
router.get('/', async (req: Request, res: Response) => {
    try {
        const rules = await db.query<any[]>(
            "SELECT id, title, content, order_index FROM \`rules\` ORDER BY order_index ASC, id ASC"
        );
        res.json(rules);
    } catch (err) {
        console.error("Error fetching rules:", err);
        res.status(500).json({ error: "Lỗi tải quy định cộng đồng từ máy chủ." });
    }
});

export default router;
