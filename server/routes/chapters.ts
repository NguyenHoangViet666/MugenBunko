import { Router, Response } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get specific chapter content (Public route)
router.get('/:id', async (req, res) => {
    const chapterId = req.params.id;
    try {
        const chapters = await db.query<any[]>(
            "SELECT id, novel_id, volume_name, title, content, status FROM chapters WHERE id = ?",
            [chapterId]
        );
        if (chapters.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy chương truyện." });
        }
        res.json(chapters[0]);
    } catch (err) {
        console.error("Fetch chapter content error:", err);
        res.status(500).json({ error: "Lỗi tải nội dung chương truyện." });
    }
});

// Apply auth middleware to all chapter operations
router.use(authenticateToken);

// Add or Edit Chapter
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const { id, novelId, volumeName, title, content, status, scheduledRelease } = req.body;
    if (!novelId || !volumeName || !title || !content) {
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
            // Edit
            await db.query(
                "UPDATE chapters SET volume_name = ?, title = ?, content = ?, status = ?, scheduled_release = ?, word_count = ? WHERE id = ?",
                [volumeName.trim(), title.trim(), content, targetStatus, scheduledRelease || null, wordCount, id]
            );
            res.json({ success: true, chapterId: id });
        } else {
            // Create
            const result = await db.query<any>(
                "INSERT INTO chapters (novel_id, volume_name, title, content, status, scheduled_release, word_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [novelId, volumeName.trim(), title.trim(), content, targetStatus, scheduledRelease || null, wordCount]
            );
            res.json({ success: true, chapterId: result.insertId });
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
