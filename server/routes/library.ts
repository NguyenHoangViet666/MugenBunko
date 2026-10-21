import { Router, Response } from 'express';
import { randomBytes } from 'crypto';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { publicNovelSql } from '../utils/novelAccess.js';

const router = Router();
const collectionSelect = `SELECT c.id, c.name, c.description, c.cover_novel_id AS coverNovelId,
    c.is_public AS isPublic, c.share_id AS shareId, u.displayname AS ownerName,
    CASE WHEN ${publicNovelSql} THEN n.cover ELSE NULL END AS cover FROM library_collections c JOIN users u ON u.id = c.user_id
    LEFT JOIN novels n ON n.id = c.cover_novel_id`;

router.get('/public/:shareId', async (req, res) => {
    try {
        const collections = await db.query<any[]>(`${collectionSelect} WHERE c.share_id = ? AND c.is_public = 1`, [req.params.shareId]);
        if (!collections.length) return res.status(404).json({ error: 'Bộ sưu tập này riêng tư hoặc không còn tồn tại.' });
        const novels = await db.query<any[]>(`SELECT n.id, n.title, n.cover, n.genre, n.type, n.status,
            n.summary, u.displayname AS author_name FROM collection_novels cn
            JOIN novels n ON n.id = cn.novel_id JOIN users u ON u.id = n.author_id
            WHERE cn.collection_id = ? AND n.status <> 'suspended'
            AND EXISTS (SELECT 1 FROM chapters ch WHERE ch.novel_id = n.id AND ch.status = 'published')
            ORDER BY n.title`, [collections[0].id]);
        res.json({ ...collections[0], novels });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể tải bộ sưu tập.' }); }
});

router.use(authenticateToken);
router.get('/collections', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const collections = await db.query<any[]>(`${collectionSelect} WHERE c.user_id = ? ORDER BY c.id DESC`, [req.user!.id]);
        const members = await db.query<any[]>(`SELECT cn.collection_id, cn.novel_id FROM collection_novels cn
            JOIN library_collections c ON c.id = cn.collection_id WHERE c.user_id = ?`, [req.user!.id]);
        res.json(collections.map(c => ({ ...c, isPublic: Boolean(c.isPublic), novelIds: members.filter(m => m.collection_id === c.id).map(m => m.novel_id) })));
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể tải các kệ sách.' }); }
});

const validCollection = (body: any) => typeof body.name === 'string' && body.name.trim().length > 0 &&
    body.name.trim().length <= 80 && typeof body.description === 'string' && body.description.length <= 280 &&
    typeof body.isPublic === 'boolean' && (body.coverNovelId === null || Number.isInteger(body.coverNovelId));

router.post('/collections', async (req: AuthenticatedRequest, res: Response) => {
    if (!validCollection(req.body)) return res.status(400).json({ error: 'Tên kệ tối đa 80 ký tự, mô tả tối đa 280 ký tự.' });
    const { name, description, isPublic, coverNovelId } = req.body;
    try {
        if (coverNovelId !== null) {
            const cover = await db.query<any[]>(`SELECT n.id FROM novels n WHERE n.id = ? AND ${publicNovelSql}`, [coverNovelId]);
            if (!cover.length) return res.status(400).json({ error: 'Bìa tác phẩm không hợp lệ.' });
        }
        const result = await db.query<any>(`INSERT INTO library_collections (user_id, name, description, is_public, cover_novel_id, share_id)
            VALUES (?, ?, ?, ?, ?, ?)`, [req.user!.id, name.trim(), description.trim(), isPublic, coverNovelId, randomBytes(16).toString('hex')]);
        res.status(201).json({ id: result.insertId });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể tạo kệ sách.' }); }
});

router.put('/collections/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (!validCollection(req.body)) return res.status(400).json({ error: 'Thông tin kệ sách không hợp lệ.' });
    const { name, description, isPublic, coverNovelId } = req.body;
    try {
        if (coverNovelId !== null) {
            const cover = await db.query<any[]>(`SELECT n.id FROM novels n WHERE n.id = ? AND ${publicNovelSql}`, [coverNovelId]);
            if (!cover.length) return res.status(400).json({ error: 'Bìa tác phẩm không hợp lệ.' });
        }
        const result = await db.query<any>(`UPDATE library_collections SET name = ?, description = ?, is_public = ?, cover_novel_id = ? WHERE id = ? AND user_id = ?`,
            [name.trim(), description.trim(), isPublic, coverNovelId, req.params.id, req.user!.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Không tìm thấy kệ sách của bạn.' });
        res.json({ success: true });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể cập nhật kệ sách.' }); }
});

router.delete('/collections/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await db.query<any>('DELETE FROM library_collections WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Không tìm thấy kệ sách của bạn.' });
        res.json({ success: true });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể xóa kệ sách.' }); }
});

router.put('/collections/:id/novels/:novelId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const owned = await db.query<any[]>('SELECT id FROM library_collections WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
        if (!owned.length) return res.status(404).json({ error: 'Không tìm thấy kệ sách của bạn.' });
        const novels = await db.query<any[]>(`SELECT n.id FROM novels n WHERE n.id = ? AND n.status <> 'suspended'
            AND EXISTS (SELECT 1 FROM chapters c WHERE c.novel_id = n.id AND c.status = 'published')`, [req.params.novelId]);
        if (!novels.length) return res.status(404).json({ error: 'Tác phẩm hiện không thể thêm vào kệ.' });
        await db.query('INSERT IGNORE INTO collection_novels (collection_id, novel_id) VALUES (?, ?)', [req.params.id, req.params.novelId]);
        res.json({ success: true });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể thêm tác phẩm vào kệ.' }); }
});

router.delete('/collections/:id/novels/:novelId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const owned = await db.query<any[]>('SELECT id FROM library_collections WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
        if (!owned.length) return res.status(404).json({ error: 'Không tìm thấy kệ sách của bạn.' });
        await db.query('DELETE FROM collection_novels WHERE collection_id = ? AND novel_id = ?', [req.params.id, req.params.novelId]);
        res.json({ success: true });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể bỏ tác phẩm khỏi kệ.' }); }
});
export default router;
