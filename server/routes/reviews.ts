import { Router, Response } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { addXpToUser } from '../utils/level.js';

const router = Router();

// Get latest global reviews
router.get('/global/latest', async (req: any, res: Response) => {
    try {
        const list = await db.query<any[]>(
            `SELECT r.*, u.displayname as username, u.avatar_seed as avatarSeed, n.title as novelTitle, n.id as novelId
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             JOIN novels n ON r.novel_id = n.id
             ORDER BY r.created_at DESC
             LIMIT 3`
        );
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải đánh giá mới nhất." });
    }
});

// Get reviews
router.get('/:novelId', async (req: any, res: Response) => {
    try {
        const reviews = await db.query<any[]>(
            `SELECT r.*, u.displayname as username, u.avatar_seed as avatarSeed, DATE_FORMAT(r.created_at, '%d/%m/%Y') as date
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.novel_id = ?
             ORDER BY r.created_at DESC`,
            [req.params.novelId]
        );
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải nhận xét đánh giá." });
    }
});

// Post review
router.post('/:novelId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { stars, text } = req.body;
    const novelId = req.params.novelId;

    if (!userId || !stars || !text) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin đánh giá!" });
    }

    try {
        // Check if user already reviewed this novel to prevent XP farming on updates
        const existing = await db.query<any[]>(
            "SELECT 1 FROM reviews WHERE novel_id = ? AND user_id = ?",
            [novelId, userId]
        );
        const isNewReview = existing.length === 0;

        // Insert review
        await db.query(
            "INSERT INTO reviews (novel_id, user_id, stars, text) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE stars = ?, text = ?",
            [novelId, userId, stars, text.trim(), stars, text.trim()]
        );

        // Award +50 XP only if it is a new review
        if (isNewReview) {
            try {
                await addXpToUser(userId, 50);
            } catch (xpErr) {
                console.error("Error adding XP for review:", xpErr);
            }
        }

        // Recalculate average rating for this novel
        const avgData = await db.query<any[]>("SELECT AVG(stars) as avgStars FROM reviews WHERE novel_id = ?", [novelId]);
        const avgStars = parseFloat(avgData[0].avgStars || 5.0).toFixed(1);
        await db.query("UPDATE novels SET rating = ? WHERE id = ?", [avgStars, novelId]);

        res.json({ success: true, rating: avgStars });
    } catch (err) {
        console.error("Create review error:", err);
        res.status(500).json({ error: "Lỗi lưu nhận xét đánh giá." });
    }
});

export default router;
