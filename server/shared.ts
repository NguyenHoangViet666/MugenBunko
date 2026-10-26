import './config.js';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server } from 'socket.io';
import { invalidatePublicReads, setCacheBroadcaster } from './utils/readCache.js';

type Client = ReturnType<typeof createClient>;
let client: Client | null = null;
let connecting: Promise<Client | null> | null = null;
const subscribers = new Set<Client>();
export function sharedPrefix() {
    const prefix = process.env.REDIS_PREFIX || 'mugenbunko:' + (process.env.DB_NAME || 'mugenbunko');
    if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(prefix)) throw new Error('Invalid REDIS_PREFIX');
    return prefix;
}
export function sharedReady() { return !process.env.REDIS_URL || Boolean(client?.isReady && [...subscribers].every(sub => sub.isReady)); }
export async function connectShared(): Promise<Client | null> {
    if (!process.env.REDIS_URL) return null;
    if (connecting) return connecting;
    if (client) return client;
    client = createClient({ url: process.env.REDIS_URL, disableOfflineQueue: true,
        socket: { connectTimeout: 5000, reconnectStrategy: retries => retries > 5 ? new Error('Redis retry limit reached') : Math.min(250 * 2 ** retries, 3000) } });
    client.on('error', () => { /* Health checks expose the outage without logging credentials. */ });
    client.on('ready', () => invalidatePublicReads(false));
    const current = client;
    connecting = current.connect().then(() => current).catch(error => { if (current.isOpen) current.destroy(); client = null; throw error; }).finally(() => { connecting = null; });
    return connecting;
}

export async function attachSharedAdapter(io: Server) {
    const pub = await connectShared();
    if (!pub) return false;
    const sub = pub.duplicate(); sub.on('error', () => {}); subscribers.add(sub);
    await sub.connect();
    const prefix = sharedPrefix();
    io.adapter(createAdapter(pub, sub, { key: prefix + ':socket', requestsTimeout: 5000 }));
    await sub.subscribe(prefix + ':invalidate', () => invalidatePublicReads(false));
    setCacheBroadcaster(() => { if (pub.isReady) void pub.publish(prefix + ':invalidate', '1').catch(() => {}); });
    // If cross-node revocations cannot be delivered, re-authenticate every socket.
    const disconnect = () => { invalidatePublicReads(false); io.local.disconnectSockets(true); };
    pub.on('reconnecting', disconnect); sub.on('reconnecting', disconnect);
    io.httpServer?.once('close', () => {
        pub.off('reconnecting', disconnect); sub.off('reconnecting', disconnect);
        subscribers.delete(sub); if (sub.isOpen) sub.destroy();
    });
    return true;
}

export async function presenceAdd(userId: number, socketId: string) {
    const redis = await connectShared();
    if (!redis) return null;
    return Number(await redis.eval(`local k=KEYS[1]; redis.call('ZREMRANGEBYSCORE',k,'-inf',ARGV[1]); local n=redis.call('ZCARD',k);
        redis.call('ZADD',k,ARGV[2],ARGV[3]); redis.call('PEXPIRE',k,90000); return n`,
    { keys: [sharedPrefix() + ':presence:' + userId], arguments: [String(Date.now()), String(Date.now() + 75000), socketId] }));
}
export async function presenceRemove(userId: number, socketId: string) {
    const redis = await connectShared();
    if (!redis) return null;
    const key = sharedPrefix() + ':presence:' + userId;
    const result = await redis.multi().zRem(key, socketId).zRemRangeByScore(key, '-inf', Date.now()).zCard(key).exec();
    return Number(result[2]);
}
export async function presenceStatuses(ids: number[]) {
    const redis = await connectShared();
    if (!redis) return null;
    const batch = redis.multi();
    for (const id of ids) { const key = sharedPrefix() + ':presence:' + id; batch.zRemRangeByScore(key, '-inf', Date.now()).zCard(key); }
    const result = await batch.exec();
    return Object.fromEntries(ids.map((id, index) => [id, Number(result[index * 2 + 1]) > 0]));
}
export async function presenceHeartbeat(connections: Map<number, Set<string>>) {
    if (!client?.isReady) return;
    const batch = client.multi();
    for (const [userId, sockets] of connections) {
        if (!sockets.size) continue;
        const key = sharedPrefix() + ':presence:' + userId;
        batch.zAdd(key, [...sockets].map(value => ({ score: Date.now() + 75000, value }))).pExpire(key, 90000);
    }
    if (connections.size) await batch.exec();
}
export async function schedulerTick() {
    const redis = await connectShared();
    if (!redis) return true;
    return (await redis.set(sharedPrefix() + ':scheduler:' + Math.floor(Date.now() / 30000), '1', { NX: true, PX: 90000 })) === 'OK';
}
export async function closeShared() {
    setCacheBroadcaster(() => {});
    for (const sub of subscribers) if (sub.isOpen) sub.destroy();
    subscribers.clear();
    if (client?.isOpen) client.destroy();
    client = null; connecting = null;
}
import './config.js';
