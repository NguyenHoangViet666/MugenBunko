import { Server } from 'socket.io';
import { resolveUser } from './middleware/auth.js';
import { sendMessage } from './utils/messages.js';
import db from './db.js';
import { cookieToken, sessionEvents } from './utils/sessions.js';
import { messageEvents, messagesRead } from './utils/messageEvents.js';
import { attachSharedAdapter, presenceAdd, presenceRemove, presenceHeartbeat, presenceStatuses } from './shared.js';

export async function registerRealtime(io: Server) {
    const shared = await attachSharedAdapter(io);
    const onSaved = (message: { sender_id: number; receiver_id: number }) => io.to(['user:' + message.sender_id, 'user:' + message.receiver_id]).emit('receive_message', message);
    const onRead = (data: { userId: number; friendId: number }) => io.to(['user:' + data.userId, 'user:' + data.friendId]).emit('messages_read', data);
    messageEvents.on('saved', onSaved); messageEvents.on('read', onRead);
    const connections = new Map<number, Set<string>>();
    const disconnectRevoked = (hash: string) => {
        for (const socket of io.of('/').sockets.values()) {
            if (socket.data.user.tokenHash === hash) socket.disconnect(true);
        }
    };
    const revokeEverywhere = (hash: string) => { disconnectRevoked(hash); if (shared) io.serverSideEmit('session:revoked', hash); };
    sessionEvents.on('revoked', revokeEverywhere);
    io.on('session:revoked', disconnectRevoked);
    const disconnectUser = (userId: number) => {
        for (const socket of io.of('/').sockets.values()) {
            if (socket.data.user.id === userId) socket.disconnect(true);
        }
    };
    const revokeUserEverywhere = (id: number) => { disconnectUser(id); if (shared) io.serverSideEmit('session:user-revoked', id); };
    sessionEvents.on('user-revoked', revokeUserEverywhere);
    io.on('session:user-revoked', disconnectUser);
    const heartbeat = shared ? setInterval(() => { void presenceHeartbeat(connections).catch(() => {}); }, 25000) : null;
    heartbeat?.unref();
    io.httpServer?.once('close', () => {
        if (heartbeat) clearInterval(heartbeat);
        sessionEvents.off('revoked', revokeEverywhere); sessionEvents.off('user-revoked', revokeUserEverywhere);
        messageEvents.off('saved', onSaved); messageEvents.off('read', onRead);
    });
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
        if (shared) {
            void presenceAdd(user.id, socket.id).then(previous => {
                if (!socket.connected) return presenceRemove(user.id, socket.id);
                if (previous === 0) void broadcast(user.id, 'online');
                return null;
            }).catch(() => socket.disconnect(true));
        } else if (wasOffline) void broadcast(user.id, 'online');
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
                reply({ success: true, message: result.message });
            } catch { reply({ success: false, error: 'Không thể gửi tin nhắn lúc này.' }); }
        });
        socket.on('read_messages', async (data) => {
            const friendId = data?.friendId;
            if (!Number.isSafeInteger(friendId) || friendId < 1) return;
            try {
                const result = await db.query<any>('UPDATE messages SET is_read=TRUE WHERE sender_id=? AND receiver_id=? AND is_read=FALSE', [friendId, user.id]);
                if (result.affectedRows) messagesRead(user.id, friendId);
            } catch { /* The next history read reconciles unread state. */ }
        });
        socket.on('check_online_status', async (ids, callback) => {
            if (typeof callback !== 'function') return;
            if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => !Number.isSafeInteger(id))) return callback({});
            try {
                const friends = await db.query<any[]>("SELECT IF(user_id_1 = ?, user_id_2, user_id_1) AS id FROM friends WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'", [user.id, user.id, user.id]);
                const allowed = friends.filter(friend => ids.includes(friend.id)).map(friend => Number(friend.id));
                const statuses = shared ? await presenceStatuses(allowed) : null;
                callback(statuses || Object.fromEntries(allowed.map(id => [id, connections.has(id)])));
            } catch { callback({}); }
        });
        socket.on('disconnect', () => {
            clearTimeout(expiry);
            sockets.delete(socket.id);
            if (!sockets.size) connections.delete(user.id);
            if (shared) void presenceRemove(user.id, socket.id).then(remaining => { if (remaining === 0) void broadcast(user.id, 'offline'); }).catch(() => {});
            else if (!sockets.size) void broadcast(user.id, 'offline');
        });
    });
}
