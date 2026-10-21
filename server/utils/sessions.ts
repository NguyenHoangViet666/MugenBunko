import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import db from '../db.js';
import { production } from '../config.js';

const cookieName = production ? '__Host-mugen_auth' : 'mugen_auth';
const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict' as const, path: '/' };
export const sessionEvents = new EventEmitter();
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export function cookieToken(header?: string): string | undefined {
    const value = header?.split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!value) return undefined;
    try { return decodeURIComponent(value); } catch { return undefined; }
}

export function setSessionCookie(res: Response, token: string, expiresAt: number) {
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: Math.max(0, expiresAt - Date.now()) });
}

export function clearSessionCookie(res: Response) { res.clearCookie(cookieName, cookieOptions); }

export async function revokeSession(hash: string, userId: number, expiresAt: number) {
    await db.query('INSERT IGNORE INTO revoked_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [hash, userId, expiresAt]);
    sessionEvents.emit('revoked', hash);
    await db.query('DELETE FROM revoked_tokens WHERE expires_at < ? LIMIT 100', [Date.now()]);
}
