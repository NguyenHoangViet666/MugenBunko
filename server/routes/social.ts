import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 1. Lấy danh sách bạn bè và lời mời kết bạn
router.get('/friends', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập!" });

    try {
        // Lấy danh sách bạn bè (đã accepted)
        const friendsList = await db.query<any[]>(
            `SELECT u.id, u.username, u.displayname, u.avatar_seed as avatarSeed, u.bio, u.level
             FROM users u
             WHERE u.id IN (
                 SELECT IF(user_id_1 = ?, user_id_2, user_id_1)
                 FROM friends
                 WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'
             )`,
            [userId, userId, userId]
        );

        // Lấy danh sách lời mời kết bạn đang chờ nhận (received pending)
        const receivedRequests = await db.query<any[]>(
            `SELECT u.id, u.username, u.displayname, u.avatar_seed as avatarSeed, u.level, DATE_FORMAT(f.created_at, '%d/%m/%Y %H:%i') as date
             FROM friends f
             JOIN users u ON f.user_id_1 = u.id
             WHERE f.user_id_2 = ? AND f.status = 'pending'`,
            [userId]
        );

        // Lấy danh sách lời mời kết bạn đã gửi đang chờ (sent pending)
        const sentRequests = await db.query<any[]>(
            `SELECT u.id, u.username, u.displayname, u.avatar_seed as avatarSeed, u.level, DATE_FORMAT(f.created_at, '%d/%m/%Y %H:%i') as date
             FROM friends f
             JOIN users u ON f.user_id_2 = u.id
             WHERE f.user_id_1 = ? AND f.status = 'pending'`,
            [userId]
        );

        res.json({
            friends: friendsList,
            received: receivedRequests,
            sent: sentRequests
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi tải danh sách mạng xã hội." });
    }
});

// 1.5. Lấy danh sách bạn bè đã chấp nhận của một người dùng qua username (Công khai)
router.get('/friends/user/:username', async (req: Request, res: Response) => {
    try {
        const username = req.params.username;
        const users = await db.query<any[]>("SELECT id FROM users WHERE username = ?", [username]);
        if (users.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy người dùng." });
        }
        const targetUserId = users[0].id;

        const friendsList = await db.query<any[]>(
            `SELECT u.id, u.username, u.displayname, u.avatar_seed as avatarSeed, u.bio, u.level
             FROM users u
             WHERE u.id IN (
                 SELECT IF(user_id_1 = ?, user_id_2, user_id_1)
                 FROM friends
                 WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'
             )`,
            [targetUserId, targetUserId, targetUserId]
        );

        res.json({ friends: friendsList });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi tải danh sách bạn bè." });
    }
});

// 2. Tìm kiếm người dùng khác hệ thống và xem trạng thái kết bạn
router.get('/users/search', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { q } = req.query;

    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập!" });
    if (!q || typeof q !== 'string' || !q.trim()) {
        return res.json([]);
    }

    try {
        const queryTerm = `%${q.trim()}%`;
        const users = await db.query<any[]>(
            `SELECT 
                 u.id, u.username, u.displayname, u.avatar_seed as avatarSeed, u.bio, u.level,
                 f.status, f.user_id_1 as senderId
             FROM users u
             LEFT JOIN friends f ON (f.user_id_1 = ? AND f.user_id_2 = u.id) OR (f.user_id_2 = ? AND f.user_id_1 = u.id)
             WHERE u.id != ? AND (u.username LIKE ? OR u.displayname LIKE ?)
             LIMIT 20`,
            [userId, userId, userId, queryTerm, queryTerm]
        );
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi tìm kiếm người dùng." });
    }
});

// 3. Gửi lời mời kết bạn (hoặc tự động kết bạn nếu người kia đã gửi trước)
router.post('/friends/request', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập!" });
    if (!friendId || userId === parseInt(friendId)) {
        return res.status(400).json({ error: "ID người dùng không hợp lệ!" });
    }

    try {
        // Kiểm tra quan hệ hiện tại
        const existing = await db.query<any[]>(
            `SELECT * FROM friends 
             WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)`,
            [userId, friendId, friendId, userId]
        );

        if (existing.length > 0) {
            const rel = existing[0];
            if (rel.status === 'accepted') {
                return res.status(400).json({ error: "Hai người đã là bạn bè của nhau!" });
            }
            if (rel.status === 'pending') {
                if (rel.user_id_1 === userId) {
                    return res.status(400).json({ error: "Bạn đã gửi lời mời kết bạn trước đó rồi, vui lòng chờ phản hồi." });
                } else {
                    // Người kia đã gửi lời mời trước đó, bây giờ ta gửi lại thì đồng ý luôn
                    await db.query(
                        `UPDATE friends SET status = 'accepted' 
                         WHERE user_id_1 = ? AND user_id_2 = ?`,
                        [friendId, userId]
                    );
                    
                    // Gửi thông báo cho đối phương
                    await db.query(
                        `INSERT INTO notifications (user_id, text) VALUES (?, ?)`,
                        [friendId, `@${req.user?.username} đã chấp nhận lời mời kết bạn của bạn.`]
                    );

                    return res.json({ success: true, status: 'accepted', message: "Hai người đã trở thành bạn bè!" });
                }
            }
        }

        // Tạo bản ghi mới ở trạng thái pending (user_id_1 gửi cho user_id_2)
        await db.query(
            `INSERT INTO friends (user_id_1, user_id_2, status) VALUES (?, ?, 'pending')`,
            [userId, friendId]
        );

        // Gửi thông báo cho đối phương
        await db.query(
            `INSERT INTO notifications (user_id, text) VALUES (?, ?)`,
            [friendId, `@${req.user?.username} đã gửi cho bạn một lời mời kết bạn.`]
        );

        res.json({ success: true, status: 'pending', message: "Đã gửi lời mời kết bạn!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi gửi lời mời kết bạn." });
    }
});

// 4. Chấp nhận lời mời kết bạn
router.post('/friends/accept', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập!" });

    try {
        const result = await db.query<any>(
            `UPDATE friends SET status = 'accepted'
             WHERE user_id_1 = ? AND user_id_2 = ? AND status = 'pending'`,
            [friendId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Không tìm thấy lời mời kết bạn phù hợp!" });
        }

        // Gửi thông báo cho đối phương
        await db.query(
            `INSERT INTO notifications (user_id, text) VALUES (?, ?)`,
            [friendId, `@${req.user?.username} đã đồng ý lời mời kết bạn của bạn.`]
        );

        res.json({ success: true, message: "Đã chấp nhận lời mời kết bạn!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi đồng ý kết bạn." });
    }
});

// 5. Từ chối hoặc hủy kết bạn
router.post('/friends/decline', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập!" });

    try {
        await db.query(
            `DELETE FROM friends 
             WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)`,
            [userId, friendId, friendId, userId]
        );
        res.json({ success: true, message: "Đã hủy kết bạn hoặc từ chối yêu cầu." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi thực hiện thao tác." });
    }
});

// 6. Lấy số tin nhắn chưa đọc tổng cộng
router.get('/messages/unread-count', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập!" });

    try {
        const results = await db.query<any[]>(
            `SELECT COUNT(*) as unreadCount FROM messages WHERE receiver_id = ? AND is_read = FALSE`,
            [userId]
        );
        res.json({ unreadCount: results[0]?.unreadCount || 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi lấy số tin nhắn chưa đọc." });
    }
});

// 7. Lấy lịch sử tin nhắn với một người bạn
router.get('/messages/chat/:friendId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const friendId = req.params.friendId;

    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập!" });

    try {
        // Lấy 100 tin nhắn gần nhất giữa 2 người
        const messages = await db.query<any[]>(
            `SELECT m.*, DATE_FORMAT(m.created_at, '%d/%m/%Y %H:%i') as date
             FROM messages m
             WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
             ORDER BY m.created_at ASC
             LIMIT 100`,
            [userId, friendId, friendId, userId]
        );

        // Đánh dấu đã đọc các tin nhắn do friendId gửi tới mình
        await db.query(
            `UPDATE messages SET is_read = TRUE 
             WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
            [friendId, userId]
        );

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi tải tin nhắn." });
    }
});

// 8. Gửi tin nhắn mới
router.post('/messages/send', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { receiverId, messageText } = req.body;

    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập!" });
    if (!receiverId || !messageText || !messageText.trim()) {
        return res.status(400).json({ error: "Nội dung tin nhắn không hợp lệ!" });
    }

    try {
        // Kiểm tra xem có phải là bạn bè hay không
        const isFriend = await db.query<any[]>(
            `SELECT 1 FROM friends 
             WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)) AND status = 'accepted'`,
            [userId, receiverId, receiverId, userId]
        );

        if (isFriend.length === 0) {
            return res.status(403).json({ error: "Bạn chỉ có thể gửi tin nhắn cho bạn bè!" });
        }

        const result = await db.query<any>(
            `INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)`,
            [userId, receiverId, messageText.trim()]
        );

        res.json({
            success: true,
            message: {
                id: result.insertId,
                sender_id: userId,
                receiver_id: receiverId,
                message_text: messageText.trim(),
                is_read: false,
                date: "Vừa xong"
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi gửi tin nhắn." });
    }
});

export default router;
