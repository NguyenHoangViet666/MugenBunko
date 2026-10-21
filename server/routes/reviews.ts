import { Router, Response } from 'express';
import db from '../db.js';
import { authenticateToken, optionalAuthentication, AuthenticatedRequest } from '../middleware/auth.js';
import { addXpToUser } from '../utils/level.js';
import { accessibleNovel, positiveId, publicNovelSql, validText } from '../utils/novelAccess.js';
import { contentLimit } from '../middleware/contentLimit.js';

const router = Router();

router.get('/global/latest', async (_req, res: Response) => {
    try {
        res.json(await db.query<any[]>(`SELECT r.*, u.displayname as username, u.avatar_seed as avatarSeed,
            n.title as novelTitle, n.id as novelId FROM reviews r JOIN users u ON r.user_id = u.id
            JOIN novels n ON r.novel_id = n.id WHERE ${publicNovelSql} ORDER BY r.created_at DESC, r.id DESC LIMIT 3`));
    } catch { res.status(503).json({ error: 'Không thể tải đánh giá mới nhất.' }); }
});

router.get('/:novelId', optionalAuthentication, async (req: AuthenticatedRequest, res) => {
    const novelId = positiveId(req.params.novelId);
    if (!novelId) return res.status(400).json({ error: 'Tác phẩm không hợp lệ.' });
    res.set('Cache-Control', 'private, no-store');
    try {
        if (!await accessibleNovel(novelId, req.user)) return res.status(404).json({ error: 'Không tìm thấy tác phẩm.' });
        res.json(await db.query<any[]>(`SELECT r.*, u.displayname as username, u.avatar_seed as avatarSeed,
            DATE_FORMAT(r.created_at, '%d/%m/%Y') as date FROM reviews r JOIN users u ON r.user_id = u.id
            WHERE r.novel_id = ? ORDER BY r.created_at DESC, r.id DESC`, [novelId]));
    } catch { res.status(503).json({ error: 'Không thể tải đánh giá.' }); }
});

router.post('/:novelId', authenticateToken, contentLimit, async (req: AuthenticatedRequest, res: Response) => {
    const novelId = positiveId(req.params.novelId);
    const { stars, text } = req.body;
    if (!novelId || !Number.isInteger(stars) || stars < 1 || stars > 5 || !validText(text, 10000)) {
        return res.status(400).json({ error: 'Đánh giá cần 1–5 sao và nội dung tối đa 10.000 ký tự.' });
    }
    try {
        const result = await db.transaction(async connection => {
            // Serialize rewards per user and rating updates per novel.
            await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.user!.id]);
            const [novels] = await connection.execute<any[]>(`SELECT n.id, n.type FROM novels n
                WHERE n.id = ? AND ${publicNovelSql} FOR UPDATE`, [novelId]);
            if (!novels.length) return { status: 404, error: 'Tác phẩm hiện không thể đánh giá.' };
            const [completed] = await connection.execute<any[]>(`SELECT COUNT(*) AS count FROM chapter_reads r
                JOIN chapters c ON c.id = r.chapter_id WHERE r.user_id = ? AND c.novel_id = ? AND c.status = 'published'`,
                [req.user!.id, novelId]);
            const required = novels[0].type === 'oneshot' ? 1 : 3;
            if (Number(completed[0].count) < required) return { status: 403, error: `Bạn cần đọc xong ít nhất ${required} chương để đánh giá.` };
            const [existing] = await connection.execute<any[]>('SELECT id FROM reviews WHERE novel_id = ? AND user_id = ?', [novelId, req.user!.id]);
            await connection.execute(`INSERT INTO reviews (novel_id, user_id, stars, text) VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE stars = VALUES(stars), text = VALUES(text)`, [novelId, req.user!.id, stars, text.trim()]);
            if (!existing.length) {
                const query: typeof db.query = async (sql, params) => (await connection.execute(sql, params))[0] as any;
                await addXpToUser(req.user!.id, 50, query);
            }
            const [average] = await connection.execute<any[]>('SELECT AVG(stars) AS average FROM reviews WHERE novel_id = ?', [novelId]);
            const rating = Number(average[0].average).toFixed(1);
            await connection.execute('UPDATE novels SET rating = ? WHERE id = ?', [rating, novelId]);
            return { status: 200, rating };
        });
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json({ success: true, rating: result.rating });
    } catch { res.status(503).json({ error: 'Không thể lưu đánh giá lúc này.' }); }
});

export default router;
