import db from '../db.js';
import { messageEvents } from './messageEvents.js';
export async function sendMessage(senderId: number, receiverId: unknown, messageText: unknown) {
    if (typeof receiverId !== 'number' || !Number.isSafeInteger(receiverId) || receiverId <= 0 || typeof messageText !== 'string' || !messageText.trim() || messageText.length > 5000) return { error: 'Nội dung tin nhắn không hợp lệ.', status: 400 };
    const result = await db.transaction(async connection => {
        const [users] = await connection.execute<any[]>('SELECT id, status FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE', [senderId, receiverId]);
        if (users.length !== 2 || users.some(user => user.status !== 'active')) return { error: 'Tài khoản không hoạt động.', status: 403 };
        const [friends] = await connection.execute<any[]>(`SELECT 1 FROM friends WHERE
            ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)) AND status = 'accepted'`, [senderId, receiverId, receiverId, senderId]);
        if (!friends.length) return { error: 'Bạn chỉ có thể gửi tin nhắn cho bạn bè.', status: 403 };
        const [recent] = await connection.execute<any[]>('SELECT COUNT(*) AS count FROM messages WHERE sender_id = ? AND created_at > CURRENT_TIMESTAMP - INTERVAL 1 MINUTE', [senderId]);
        if (recent[0].count >= 30) return { error: 'Bạn gửi tin nhắn quá nhanh. Vui lòng chờ một phút.', status: 429 };
        const [insert] = await connection.execute<any>('INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)', [senderId, receiverId, messageText.trim()]);
        return { message: { id: insert.insertId, sender_id: senderId, receiver_id: receiverId, message_text: messageText.trim(), is_read: false, date: 'Vừa xong', created_at: new Date() }, status: 200 };
    });
    if ('message' in result) messageEvents.emit('saved', result.message);
    return result;
}
