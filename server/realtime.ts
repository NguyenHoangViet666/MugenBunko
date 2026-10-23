import { Server } from 'socket.io';
import { resolveUser } from './middleware/auth.js';
import { sendMessage } from './utils/messages.js';
import db from './db.js';
import { cookieToken, sessionEvents } from './utils/sessions.js';

export function registerRealtime(io: Server) {
    const connections = new Map<number, Set<string>>();
    const disconnectRevoked = (hash: string) => {
        for (const socket of io.of('/').sockets.values()) {
            if (socket.data.user.tokenHash === hash) socket.disconnect(true);
        }
    };
    sessionEvents.on('revoked', disconnectRevoked);
    const disconnectUser = (userId: number) => {
        for (const socket of io.of('/').sockets.values()) {
            if (socket.data.user.id === userId) socket.disconnect(true);
        }
    };
    sessionEvents.on('user-revoked', disconnectUser);
    io.httpServer?.once('close', () => { sessionEvents.off('revoked', disconnectRevoked); sessionEvents.off('user-revoked', disconnectUser); });
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || cookieToken(socket.handshake.headers.cookie);
        if (typeof token !== 'string' || token.length > 4096) return next(new Error('Yêu cầu đăng nhập.'));
        try {
            const user = await resolveUser(token);
            if (!user) return next(new Error('Tài khoản không hoạt động.'));
            socket.data.user = user;
            socket.data.token = token;
            next();
        } catch { next(new Error('Không thể xác thực kết nối.')); }
    });
    const broadcast = async (id: number, status: 'online' | 'offline') => {
        try {
            const friends = await db.query<any[]>("SELECT IF(user_id_1 = ?, user_id_2, user_id_1) AS id FROM friends WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'", [id, id, id]);
            for (const friend of friends) io.to('user:' + friend.id).emit('friend_status_change', { userId: id, status });
        } catch { /* Presence is best effort; authorization is checked separately. */ }
    };
    io.on('connection', socket => {
        const user = socket.data.user;
        const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, user.expiresAt - Date.now()));
        expiry.unref();
        const sockets = connections.get(user.id) || new Set<string>();
        const wasOffline = sockets.size === 0;
        sockets.add(socket.id); connections.set(user.id, sockets); socket.join('user:' + user.id);
        if (wasOffline) void broadcast(user.id, 'online');
        let events = 0;
        let windowStart = Date.now();
        socket.use(async (_packet, next) => {
            if (Date.now() - windowStart > 60000) { windowStart = Date.now(); events = 0; }
            if (++events > 60) { socket.disconnect(true); return; }
            try {
                const active = await resolveUser(socket.data.token);
                if (!active) { socket.disconnect(true); return; }
                socket.data.user = active; next();
            } catch { next(new Error('Không thể xác thực thao tác.')); }
        });
        socket.on('error', () => {});
        socket.on('send_message', async (data, callback) => {
            const reply = typeof callback === 'function' ? callback : () => {};
            try {
                const result = await sendMessage(user.id, data?.receiverId, data?.messageText);
                if (!('message' in result)) return reply({ success: false, error: result.error });
                io.to('user:' + result.message!.receiver_id).emit('receive_message', result.message);
                reply({ success: true, message: result.message });
            } catch { reply({ success: false, error: 'Không thể gửi tin nhắn lúc này.' }); }
        });
        socket.on('check_online_status', async (ids, callback) => {
            if (typeof callback !== 'function') return;
            if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => !Number.isSafeInteger(id))) return callback({});
            try {
                const friends = await db.query<any[]>("SELECT IF(user_id_1 = ?, user_id_2, user_id_1) AS id FROM friends WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'", [user.id, user.id, user.id]);
                callback(Object.fromEntries(friends.filter(friend => ids.includes(friend.id)).map(friend => [friend.id, connections.has(friend.id)])));
            } catch { callback({}); }
        });
        socket.on('disconnect', () => {
            clearTimeout(expiry);
            sockets.delete(socket.id);
            if (!sockets.size) { connections.delete(user.id); void broadcast(user.id, 'offline'); }
        });
    });
}
