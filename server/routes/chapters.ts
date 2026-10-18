import { Router, Response } from 'express';
import db from '../db.js';
import { authenticateToken, optionalAuthentication, AuthenticatedRequest } from '../middleware/auth.js';
import { cleanHtml } from '../utils/html.js';
import { snapshotChapter } from '../utils/chapterVersions.js';

const router = Router();

// Get specific chapter content (Public route)
router.get('/:id', optionalAuthentication, async (req: AuthenticatedRequest, res) => {
    const chapterId = req.params.id;
    try {
        const chapters = await db.query<any[]>(
            `SELECT c.id, c.novel_id, c.volume_name, c.title, c.content, c.status, c.scheduled_release, c.word_count FROM chapters c
             JOIN novels n ON n.id = c.novel_id WHERE c.id = ? AND
             ((c.status = 'published' AND n.status <> 'suspended') OR n.author_id = ? OR ? = 1)`,
            [chapterId, req.user?.id || 0, req.user?.roles.some(role => ['admin', 'moderator'].includes(role)) || false]
        );
        if (chapters.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy chương truyện." });
        }
        res.set('Cache-Control', 'private, no-cache');
        res.json({ ...chapters[0], content: cleanHtml(chapters[0].content) });
    } catch (err) {
        console.error("Fetch chapter content error:", err);
        res.status(500).json({ error: "Lỗi tải nội dung chương truyện." });
    }
});

// Apply auth middleware to all chapter operations
router.use(authenticateToken);

// Version history is only available to the owner or an administrator.
router.get('/:id/versions', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const chapters = await db.query<any[]>(`SELECT c.id FROM chapters c JOIN novels n ON n.id = c.novel_id
            WHERE c.id = ? AND (n.author_id = ? OR ? = 1)`, [req.params.id, req.user!.id, req.user!.roles.includes('admin')]);
        if (!chapters.length) return res.status(404).json({ error: 'Không tìm thấy chương bạn được quản lý.' });
        const versions = await db.query<any[]>(`SELECT v.id, v.title, v.volume_name AS volumeName, v.word_count AS wordCount,
            v.source, v.created_at AS createdAt, u.displayname AS editorName FROM chapter_versions v
            LEFT JOIN users u ON u.id = v.editor_id WHERE v.chapter_id = ? ORDER BY v.id DESC LIMIT 50`, [req.params.id]);
        res.json(versions);
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể tải lịch sử bản thảo.' }); }
});

router.get('/:id/versions/:versionId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const versions = await db.query<any[]>(`SELECT v.* FROM chapter_versions v JOIN chapters c ON c.id = v.chapter_id
            JOIN novels n ON n.id = c.novel_id WHERE v.id = ? AND c.id = ? AND (n.author_id = ? OR ? = 1)`,
            [req.params.versionId, req.params.id, req.user!.id, req.user!.roles.includes('admin')]);
        if (!versions.length) return res.status(404).json({ error: 'Không tìm thấy phiên bản.' });
        res.json({ ...versions[0], content: cleanHtml(versions[0].content) });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể xem phiên bản.' }); }
});

router.post('/:id/versions/:versionId/restore', async (req: AuthenticatedRequest, res: Response) => {
    const draft = req.body.currentDraft;
    if (draft && (typeof draft.title !== 'string' || !draft.title.trim() || draft.title.length > 255 ||
        typeof draft.volumeName !== 'string' || !draft.volumeName.trim() || draft.volumeName.length > 100 || typeof draft.content !== 'string')) {
        return res.status(400).json({ error: 'Bản thảo hiện tại không hợp lệ.' });
    }
    try {
        if (draft) draft.content = cleanHtml(draft.content);
        const restored = await db.transaction(async connection => {
            const [chapters] = await connection.execute<any[]>(`SELECT c.* FROM chapters c JOIN novels n ON n.id = c.novel_id
                WHERE c.id = ? AND (n.author_id = ? OR ? = 1) FOR UPDATE`, [req.params.id, req.user!.id, req.user!.roles.includes('admin')]);
            if (!chapters.length) return null;
            const [versions] = await connection.execute<any[]>('SELECT * FROM chapter_versions WHERE id = ? AND chapter_id = ?', [req.params.versionId, req.params.id]);
            if (!versions.length) return null;
            const current = chapters[0];
            const version = { ...versions[0], content: cleanHtml(versions[0].content) };
            await snapshotChapter(connection, current, req.user!.id, 'before-restore');
            if (draft && (draft.content !== current.content || draft.title.trim() !== current.title || draft.volumeName.trim() !== current.volume_name)) {
                const text = draft.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                await snapshotChapter(connection, { id: current.id, title: draft.title.trim(), volume_name: draft.volumeName.trim(),
                    content: draft.content, word_count: text ? text.split(/\s+/).length : 0 }, req.user!.id, 'before-restore');
            }
            await connection.execute(`UPDATE chapters SET volume_name = ?, title = ?, content = ?, word_count = ?,
                status = 'draft', scheduled_release = NULL WHERE id = ?`, [version.volume_name, version.title, version.content, version.word_count, current.id]);
            const chapter = { ...current, volume_name: version.volume_name, title: version.title, content: version.content,
                word_count: version.word_count, status: 'draft', scheduled_release: null };
            await snapshotChapter(connection, chapter, req.user!.id, 'restore');
            return chapter;
        });
        if (!restored) return res.status(404).json({ error: 'Không tìm thấy phiên bản bạn được khôi phục.' });
        res.json(restored);
    } catch (error) { console.error(error); res.status(500).json({ error: 'Không thể khôi phục bản thảo.' }); }
});

// Add or Edit Chapter
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const { id, novelId, volumeName, title, status, scheduledRelease, source } = req.body;
    const content = typeof req.body.content === 'string' ? cleanHtml(req.body.content) : '';
    if (!Number.isInteger(novelId) || typeof volumeName !== 'string' || !volumeName.trim() || volumeName.length > 100 ||
        typeof title !== 'string' || !title.trim() || title.length > 255 || typeof content !== 'string' || !content ||
        !['draft', 'published', 'pending', 'scheduled'].includes(status)) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin chương!" });
    }

    try {
        // Double-check ownership: only the author of the novel or an admin can manage chapters
        const novelsList = await db.query<any[]>("SELECT author_id FROM novels WHERE id = ?", [novelId]);
        if (novelsList.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tác phẩm này." });
        }
        const novel = novelsList[0];
        const userId = req.user?.id;
        const isAdmin = req.user?.roles.includes('admin');
        const isOwner = novel.author_id === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Bạn không có quyền quản lý chương của tác phẩm này!" });
        }

        // Validate status: if non-admin tries to publish or schedule, override status to draft/pending
        let targetStatus = status;
        if (!isAdmin) {
            if (status === 'published') {
                if (id) {
                    const currentChapter = await db.query<any[]>("SELECT status FROM chapters WHERE id = ?", [id]);
                    if (currentChapter.length > 0 && currentChapter[0].status === 'published') {
                        targetStatus = 'published';
                    } else {
                        targetStatus = 'pending';
                    }
                } else {
                    targetStatus = 'pending';
                }
            } else if (status === 'scheduled') {
                targetStatus = 'pending';
            }
        }

        const cleanText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;

        if (id) {
            const saved = await db.transaction(async connection => {
                const [chapters] = await connection.execute<any[]>('SELECT * FROM chapters WHERE id = ? AND novel_id = ? FOR UPDATE', [id, novelId]);
                if (!chapters.length) return false;
                const current = chapters[0];
                const [versions] = await connection.execute<any[]>('SELECT id FROM chapter_versions WHERE chapter_id = ? LIMIT 1', [id]);
                if (!versions.length) await snapshotChapter(connection, current, userId!, 'initial');
                const changed = current.content !== content || current.title !== title.trim() || current.volume_name !== volumeName.trim();
                // Re-evaluate publish permission after locking the current chapter.
                if (!isAdmin && status === 'published') targetStatus = current.status === 'published' ? 'published' : 'pending';
                await connection.execute(
                    'UPDATE chapters SET volume_name = ?, title = ?, content = ?, status = ?, scheduled_release = ?, word_count = ? WHERE id = ?',
                    [volumeName.trim(), title.trim(), content, targetStatus, scheduledRelease || null, wordCount, id]);
                if (changed) await snapshotChapter(connection, { id, volume_name: volumeName.trim(), title: title.trim(), content, word_count: wordCount }, userId!, source === 'autosave' ? 'autosave' : 'save');
                return true;
            });
            if (!saved) return res.status(404).json({ error: 'Chương không thuộc tác phẩm này.' });
            res.json({ success: true, chapterId: id, status: targetStatus });
        } else {
            const chapterId = await db.transaction(async connection => {
                const [result] = await connection.execute<any>(
                    'INSERT INTO chapters (novel_id, volume_name, title, content, status, scheduled_release, word_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [novelId, volumeName.trim(), title.trim(), content, targetStatus, scheduledRelease || null, wordCount]);
                await snapshotChapter(connection, { id: result.insertId, volume_name: volumeName.trim(), title: title.trim(), content, word_count: wordCount }, userId!, 'initial');
                return result.insertId;
            });
            res.json({ success: true, chapterId, status: targetStatus });
        }
    } catch (err) {
        console.error("Save chapter error:", err);
        res.status(500).json({ error: "Lỗi soạn thảo chương." });
    }
});

// Delete all chapters in a specific volume of a novel
router.post('/delete-volume', async (req: AuthenticatedRequest, res: Response) => {
    const { novelId, volumeName } = req.body;
    if (!novelId || !volumeName) {
        return res.status(400).json({ error: "Thiếu thông tin tác phẩm hoặc tập!" });
    }
    try {
        // Ownership check
        const novelsList = await db.query<any[]>("SELECT author_id FROM novels WHERE id = ?", [novelId]);
        if (novelsList.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tác phẩm này." });
        }
        const novel = novelsList[0];
        const userId = req.user?.id;
        const isAdmin = req.user?.roles.includes('admin');
        const isOwner = novel.author_id === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Bạn không có quyền quản lý tác phẩm này!" });
        }

        // Delete all chapters in this volume
        await db.query("DELETE FROM chapters WHERE novel_id = ? AND volume_name = ?", [novelId, volumeName]);
        res.json({ success: true });
    } catch (err) {
        console.error("Delete volume error:", err);
        res.status(500).json({ error: "Lỗi xóa tập truyện." });
    }
});

// Delete chapter
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const chapterId = req.params.id;
    try {
        // Ownership check before delete
        const chapters = await db.query<any[]>("SELECT novel_id FROM chapters WHERE id = ?", [chapterId]);
        if (chapters.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy chương truyện." });
        }
        const ch = chapters[0];
        const novelsList = await db.query<any[]>("SELECT author_id FROM novels WHERE id = ?", [ch.novel_id]);
        const novel = novelsList[0];
        const userId = req.user?.id;
        const isAdmin = req.user?.roles.includes('admin');
        const isOwner = novel && novel.author_id === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Bạn không có quyền xóa chương truyện này!" });
        }

        await db.query("DELETE FROM chapters WHERE id = ?", [chapterId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi xóa chương truyện." });
    }
});

export default router;
