import { Router, Response } from 'express';
import { randomBytes } from 'crypto';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { addXpToUser } from '../utils/level.js';

const router = Router();
router.use(authenticateToken);

async function getProgress(userId: number, novelId?: number) {
    const rows = await db.query<any[]>(`
        SELECT p.novel_id AS novelId, p.chapter_id AS chapterId, p.scroll_ratio AS scrollRatio,
        p.paragraph_index AS paragraphIndex, p.paragraph_offset AS paragraphOffset,
        p.client_updated_at AS updatedAt FROM reading_progress p
        JOIN chapters c ON c.id = p.chapter_id JOIN novels n ON n.id = p.novel_id
        WHERE p.user_id = ? AND c.status = 'published' AND n.status <> 'suspended'
        ${novelId ? 'AND p.novel_id = ?' : ''}`, novelId ? [userId, novelId] : [userId]);
    const completed = await db.query<any[]>(`SELECT c.novel_id AS novelId, r.chapter_id AS chapterId
        FROM chapter_reads r JOIN chapters c ON c.id = r.chapter_id
        WHERE r.user_id = ? AND c.status = 'published' ${novelId ? 'AND c.novel_id = ?' : ''}`, novelId ? [userId, novelId] : [userId]);
    const completedByNovel = new Map<number, number[]>();
    for (const chapter of completed) {
        const ids = completedByNovel.get(chapter.novelId) || [];
        ids.push(chapter.chapterId); completedByNovel.set(chapter.novelId, ids);
    }
    return rows.map(row => ({ ...row, updatedAt: Number(row.updatedAt),
        completedChapterIds: completedByNovel.get(row.novelId) || [] }));
}

router.get('/progress', async (req: AuthenticatedRequest, res: Response) => {
    try { res.json(await getProgress(req.user!.id)); }
    catch (error) { console.error(error); res.status(500).json({ error: 'Không thể đồng bộ tiến độ đọc.' }); }
});

router.put('/progress/:novelId', async (req: AuthenticatedRequest, res: Response) => {
    const novelId = Number(req.params.novelId);
    const { chapterId, scrollRatio, paragraphIndex, paragraphOffset, updatedAt } = req.body;
    if (!Number.isInteger(novelId) || !Number.isInteger(chapterId) ||
        !Number.isFinite(scrollRatio) || scrollRatio < 0 || scrollRatio > 1 ||
        !Number.isInteger(paragraphIndex) || paragraphIndex < 0 ||
        !Number.isFinite(paragraphOffset) || paragraphOffset < 0 || paragraphOffset > 1 ||
        !Number.isSafeInteger(updatedAt) || updatedAt <= 0 || updatedAt > Date.now() + 60000) {
        return res.status(400).json({ error: 'Tiến độ đọc không hợp lệ.' });
    }
    try {
        const chapters = await db.query<any[]>(`SELECT c.id FROM chapters c JOIN novels n ON n.id = c.novel_id
            WHERE c.id = ? AND c.novel_id = ? AND c.status = 'published' AND n.status <> 'suspended'`, [chapterId, novelId]);
        if (!chapters.length) return res.status(404).json({ error: 'Chương này hiện không thể đọc.' });
        // Client timestamps prevent a delayed/offline request from replacing a newer position.
        await db.transaction(async connection => {
            await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.user!.id]);
            const [existing] = await connection.execute<any[]>('SELECT client_updated_at FROM reading_progress WHERE user_id = ? AND novel_id = ?', [req.user!.id, novelId]);
            if (!existing.length || Number(existing[0].client_updated_at) <= updatedAt) {
                await connection.execute(`INSERT INTO reading_progress
                    (user_id, novel_id, chapter_id, scroll_ratio, paragraph_index, paragraph_offset, client_updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE chapter_id = VALUES(chapter_id),
                    scroll_ratio = VALUES(scroll_ratio), paragraph_index = VALUES(paragraph_index),
                    paragraph_offset = VALUES(paragraph_offset), client_updated_at = VALUES(client_updated_at)`,
                    [req.user!.id, novelId, chapterId, scrollRatio, paragraphIndex, paragraphOffset, updatedAt]);
            }
        });
        res.json((await getProgress(req.user!.id, novelId))[0]);
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể lưu tiến độ đọc.' }); }
});

router.post('/sessions', async (req: AuthenticatedRequest, res: Response) => {
    const { chapterId } = req.body;
    if (!Number.isInteger(chapterId)) return res.status(400).json({ error: 'Chương không hợp lệ.' });
    try {
        const chapters = await db.query<any[]>(`SELECT c.id FROM chapters c JOIN novels n ON n.id = c.novel_id
            WHERE c.id = ? AND c.status = 'published' AND n.status <> 'suspended'`, [chapterId]);
        if (!chapters.length) return res.status(404).json({ error: 'Không tìm thấy chương.' });
        const sessionId = randomBytes(16).toString('hex');
        await db.query(`INSERT INTO reading_sessions (user_id, chapter_id, session_id) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE session_id = VALUES(session_id), started_at = CURRENT_TIMESTAMP(3)`, [req.user!.id, chapterId, sessionId]);
        res.json({ sessionId });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể bắt đầu phiên đọc.' }); }
});

router.post('/complete', async (req: AuthenticatedRequest, res: Response) => {
    const { chapterId, sessionId, scrollRatio } = req.body;
    if (!Number.isInteger(chapterId) || typeof sessionId !== 'string' || !Number.isFinite(scrollRatio) || scrollRatio < 0.9 || scrollRatio > 1) {
        return res.status(400).json({ error: 'Hãy đọc đến cuối chương để ghi nhận hoàn thành.' });
    }
    try {
        const result = await db.transaction(async connection => {
            await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.user!.id]);
            const [sessions] = await connection.execute<any[]>(`SELECT s.session_id FROM reading_sessions s
                JOIN chapters c ON c.id = s.chapter_id JOIN novels n ON n.id = c.novel_id
                WHERE s.user_id = ? AND s.chapter_id = ? AND s.session_id = ?
                AND s.started_at <= CURRENT_TIMESTAMP(3) - INTERVAL 15 SECOND
                AND c.status = 'published' AND n.status <> 'suspended'`, [req.user!.id, chapterId, sessionId]);
            if (!sessions.length) return null;
            const [insert] = await connection.execute<any>('INSERT IGNORE INTO chapter_reads (user_id, chapter_id) VALUES (?, ?)', [req.user!.id, chapterId]);
            if (!insert.affectedRows) return { xpAwarded: 0, alertLevelUp: false };
            const query = async <T = any>(sql: string, params?: any[]): Promise<T> => {
                const [rows] = await connection.execute(sql, params); return rows as T;
            };
            const level = await addXpToUser(req.user!.id, 50, query);
            return { xpAwarded: 50, alertLevelUp: level.alertLevelUp };
        });
        if (!result) return res.status(409).json({ error: 'Phiên đọc chưa đủ thời gian hoặc đã được mở ở nơi khác.' });
        res.json(result);
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể ghi nhận chương đã đọc.' }); }
});
export default router;
