import { EventEmitter } from 'node:events';

// Only committed changes are published. Realtime forwards them to the user's rooms.
export const messageEvents = new EventEmitter();
export function messagesRead(userId: number, friendId: number) {
    messageEvents.emit('read', { userId, friendId });
}
