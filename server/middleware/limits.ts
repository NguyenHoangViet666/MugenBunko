import { createHash } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { connectShared, sharedPrefix } from '../shared.js';

function configuredLimit(name: string, fallback: number) {
    const value = Number(process.env[name] || fallback);
    if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid ' + name);
    return value;
}
export function limitStore(name: string) {
    return process.env.REDIS_URL ? new RedisStore({ prefix: sharedPrefix() + ':limit:' + name + ':', sendCommand: async (...args: string[]) => {
        const client = await connectShared();
        if (!client) throw new Error('Shared limiter unavailable');
        return client.sendCommand(args) as any;
    } }) : undefined;
}
export function createApiLimiter() {
    // A coarse IP envelope protects infrastructure without treating a shared Wi-Fi
    // network as one reader. Authenticated accounts get their own separate budget.
    return rateLimit({ windowMs: 15 * 60000, limit: configuredLimit('API_RATE_LIMIT', 30000), store: limitStore('api-ip'), standardHeaders: true, legacyHeaders: false });
}
export function createAuthLimiters() {
    return [
        rateLimit({ windowMs: 5 * 60000, limit: configuredLimit('AUTH_IP_RATE_LIMIT', 3000), store: limitStore('auth-ip'), standardHeaders: true, legacyHeaders: false }),
        rateLimit({ windowMs: 5 * 60000, limit: configuredLimit('AUTH_ACCOUNT_RATE_LIMIT', 15), store: limitStore('auth-account'),
            keyGenerator: req => createHash('sha256').update(String(req.body?.identifier || req.body?.username || req.body?.email || '').trim().toLowerCase()).digest('hex'), standardHeaders: true, legacyHeaders: false }),
    ];
}
export const accountLimiter = rateLimit({ windowMs: 15 * 60000, limit: configuredLimit('ACCOUNT_RATE_LIMIT', 1200), store: limitStore('account'),
    keyGenerator: req => String((req as any).user.id), standardHeaders: true, legacyHeaders: false });
