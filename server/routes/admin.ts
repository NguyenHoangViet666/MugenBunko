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

function rulePayload(body: any) {
    if (typeof body?.title !== 'string' || typeof body?.content !== 'string' ||
        !body.title.trim() || body.title.trim().length > 255 || !body.content.trim() ||
        Buffer.byteLength(body.content.trim(), 'utf8') > 60000 ||
        !Number.isInteger(body.orderIndex) || body.orderIndex < 0 || body.orderIndex > 1000000) return null;
    return { title: body.title.trim(), content: body.content.trim(), order_index: body.orderIndex };
}
function validRuleBase(base: any) {
    return base && typeof base.title === 'string' && typeof base.content === 'string' && Number.isInteger(base.order_index);
}
function matchesRuleBase(rule: any, base: any) {
    return rule.title === base.title && rule.content === base.content && rule.order_index === base.order_index;
}
const ruleColumns = 'id, title, content, order_index, updated_at';

// Publishing is explicit in the UI; only these mutations change the public document.
router.post('/rules', async (req: Request, res: Response) => {
    const payload = rulePayload(req.body);
    if (!payload) return res.status(400).json({ error: 'Tiêu đề, nội dung hoặc thứ tự hiển thị không hợp lệ.' });
    try {
        const rule = await db.transaction(async connection => {
            const [result] = await connection.execute<any>('INSERT INTO `rules` (title, content, order_index) VALUES (?, ?, ?)', [payload.title, payload.content, payload.order_index]);
            const [rows] = await connection.execute<any[]>(`SELECT ${ruleColumns} FROM \`rules\` WHERE id = ?`, [result.insertId]);
            return rows[0];
        });
        res.status(201).json({ success: true, ruleId: rule.id, rule });
    } catch (err) {
        console.error("Create rule error:", err);
        res.status(500).json({ error: "Lỗi thêm quy định mới." });
    }
});

// Admin updates an existing rule
router.put('/rules/:id', async (req: Request, res: Response) => {
    const payload = rulePayload(req.body);
    const base = req.body?.baseRule;
    if (!/^[1-9]\d{0,14}$/.test(String(req.params.id)) || !payload || !validRuleBase(base)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ hoặc thiếu bản gốc để đối chiếu. Vui lòng tải lại điều khoản.' });
    try {
        const result = await db.transaction(async connection => {
            const [rows] = await connection.execute<any[]>(`SELECT ${ruleColumns} FROM \`rules\` WHERE id = ? FOR UPDATE`, [req.params.id]);
            if (!rows.length) return { status: 404, data: { error: 'Điều khoản đã bị xóa. Nội dung đang soạn vẫn được giữ lại.' } };
            if (!matchesRuleBase(rows[0], base)) return { status: 409, data: { error: 'Điều khoản đã được cập nhật ở nơi khác. Bản đang soạn được giữ lại; hãy đối chiếu với bản mới trước khi công bố.', rule: rows[0] } };
            await connection.execute('UPDATE `rules` SET title = ?, content = ?, order_index = ? WHERE id = ?', [payload.title, payload.content, payload.order_index, req.params.id]);
            const [updated] = await connection.execute<any[]>(`SELECT ${ruleColumns} FROM \`rules\` WHERE id = ?`, [req.params.id]);
            return { status: 200, data: { success: true, rule: updated[0] } };
        });
        res.status(result.status).json(result.data);
    } catch (err) {
        console.error("Update rule error:", err);
        res.status(500).json({ error: "Lỗi cập nhật quy định." });
    }
});

// Admin deletes a rule
router.delete('/rules/:id', async (req: Request, res: Response) => {
    const base = req.body?.baseRule;
    if (!/^[1-9]\d{0,14}$/.test(String(req.params.id)) || !validRuleBase(base)) return res.status(400).json({ error: 'Thiếu bản gốc để đối chiếu. Vui lòng tải lại điều khoản trước khi xóa.' });
    try {
        const result = await db.transaction(async connection => {
            const [rows] = await connection.execute<any[]>(`SELECT ${ruleColumns} FROM \`rules\` WHERE id = ? FOR UPDATE`, [req.params.id]);
            if (!rows.length) return { status: 404, data: { error: 'Điều khoản không còn tồn tại.' } };
            if (!matchesRuleBase(rows[0], base)) return { status: 409, data: { error: 'Điều khoản đã được cập nhật ở nơi khác. Vui lòng đối chiếu bản mới trước khi xóa.', rule: rows[0] } };
            await connection.execute('DELETE FROM `rules` WHERE id = ?', [req.params.id]);
            return { status: 200, data: { success: true } };
        });
        res.status(result.status).json(result.data);
    } catch (err) {
        console.error("Delete rule error:", err);
        res.status(500).json({ error: "Lỗi xóa quy định." });
    }
});

// Admin adds a new genre
router.post('/genres', async (req: Request, res: Response) => {
    const { name } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 100) {
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
