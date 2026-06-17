import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// Admin processes cashout withdrawal (Disabled - MugenBunko is now non-profit)
router.post('/cashouts/:id/action', async (req: Request, res: Response) => {
    return res.status(403).json({ error: "Chức năng duyệt rút tiền đã bị tắt do nền tảng đã chuyển đổi thành phi lợi nhuận!" });
});

// Admin flags novel status (ban/suspend novel)
router.post('/novels/:id/status', async (req: Request, res: Response) => {
    const { status } = req.body; // 'active' or 'suspended'
    try {
        await db.query("UPDATE novels SET status = ? WHERE id = ?", [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khóa tác phẩm." });
    }
});

// Admin flags user status (suspend/activate account)
router.post('/users/:id/status', async (req: Request, res: Response) => {
    const { status } = req.body; // 'active' or 'suspended'
    try {
        await db.query("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
        if (status === 'active') {
            await db.query(
                "INSERT INTO notifications (user_id, text) VALUES (?, '🔓 Tài khoản của bạn đã được mở khóa hoạt động trở lại. Chúc bạn có những giây phút đọc truyện và thảo luận vui vẻ tại MugenBunko!')",
                [req.params.id]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Change user status error:", err);
        res.status(500).json({ error: "Lỗi thay đổi trạng thái tài khoản." });
    }
});

// Admin merges tags
router.post('/tags/merge', async (req: Request, res: Response) => {
    const { fromTag, toTag } = req.body;
    if (!fromTag || !toTag) {
        return res.status(400).json({ error: "Thiếu thông tin tag cần gộp!" });
    }
    try {
        // Update tags, IGNORE duplicates that would violate primary key
        await db.query("UPDATE IGNORE novel_tags SET tag = ? WHERE tag = ?", [toTag.trim(), fromTag.trim()]);
        // Delete any leftover fromTag entries that couldn't be updated due to duplicates
        await db.query("DELETE FROM novel_tags WHERE tag = ?", [fromTag.trim()]);
        res.json({ success: true });
    } catch (err) {
        console.error("Merge tags error:", err);
        res.status(500).json({ error: "Lỗi gộp thẻ tag." });
    }
});

// Admin adds a new rule
router.post('/rules', async (req: Request, res: Response) => {
    const { title, content, orderIndex } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ tiêu đề và nội dung quy định!" });
    }
    try {
        const result = await db.query<any>(
            "INSERT INTO \`rules\` (title, content, order_index) VALUES (?, ?, ?)",
            [title.trim(), content.trim(), Number(orderIndex) || 0]
        );
        res.json({ success: true, ruleId: result.insertId });
    } catch (err) {
        console.error("Create rule error:", err);
        res.status(500).json({ error: "Lỗi thêm quy định mới." });
    }
});

// Admin updates an existing rule
router.put('/rules/:id', async (req: Request, res: Response) => {
    const { title, content, orderIndex } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ tiêu đề và nội dung quy định!" });
    }
    try {
        await db.query(
            "UPDATE \`rules\` SET title = ?, content = ?, order_index = ? WHERE id = ?",
            [title.trim(), content.trim(), Number(orderIndex) || 0, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Update rule error:", err);
        res.status(500).json({ error: "Lỗi cập nhật quy định." });
    }
});

// Admin deletes a rule
router.delete('/rules/:id', async (req: Request, res: Response) => {
    try {
        await db.query("DELETE FROM \`rules\` WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Delete rule error:", err);
        res.status(500).json({ error: "Lỗi xóa quy định." });
    }
});

// Admin adds a new genre
router.post('/genres', async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Vui lòng nhập tên thể loại!" });
    }
    try {
        await db.query("INSERT INTO \`genres\` (name) VALUES (?)", [name.trim()]);
        res.json({ success: true });
    } catch (err: any) {
        console.error("Create genre error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Thể loại này đã tồn tại!" });
        }
        res.status(500).json({ error: "Lỗi thêm thể loại mới." });
    }
});

// Admin deletes a genre
router.delete('/genres/:name', async (req: Request, res: Response) => {
    const { name } = req.params;
    try {
        await db.query("DELETE FROM \`genres\` WHERE name = ?", [name]);
        res.json({ success: true });
    } catch (err) {
        console.error("Delete genre error:", err);
        res.status(500).json({ error: "Lỗi xóa thể loại." });
    }
});

export default router;
