import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET } from '../config.js';
import { clearSessionCookie, cookieToken, tokenHash } from '../utils/sessions.js';

export interface AuthenticatedRequest extends Request {
    user?: { id: number; username: string; roles: string[]; tokenHash: string; expiresAt: number; authVersion: number };
    authToken?: string;
}

export async function resolveUser(token: string) {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !Number.isSafeInteger(decoded.id) || decoded.id <= 0) throw new Error('Invalid token subject');
    if (!Number.isSafeInteger(decoded.exp)) throw new jwt.JsonWebTokenError('Missing token expiration');
    const authVersion = decoded.sv ?? 0;
    if (!Number.isSafeInteger(authVersion) || authVersion < 0) throw new jwt.JsonWebTokenError('Invalid session version');
    const hash = tokenHash(token);
    const users = await db.query<any[]>(`SELECT u.id, u.username, u.status, u.auth_version, r.role,
        EXISTS(SELECT 1 FROM revoked_tokens revoked WHERE revoked.token_hash = ?) AS revoked FROM users u
        LEFT JOIN user_roles r ON r.user_id = u.id AND (r.role <> 'moderator' OR NOT EXISTS (
            SELECT 1 FROM election_candidates ec WHERE ec.user_id=u.id AND ec.decision='appointed'
            AND ec.ended_at IS NULL AND ec.term_ends_at<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000
        )) WHERE u.id = ?`, [hash, decoded.id]);
    if (users[0]?.revoked) throw new jwt.JsonWebTokenError('Session revoked');
    if (users.length && Number(users[0].auth_version) !== authVersion) throw new jwt.JsonWebTokenError('Session revoked by password change');
    if (!users.length || users[0].status !== 'active') return null;
    return { id: users[0].id as number, username: users[0].username as string,
        roles: users.flatMap(row => row.role ? [row.role as string] : []), tokenHash: hash, expiresAt: decoded.exp! * 1000, authVersion };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const header = req.get('authorization');
    const token = header ? header.match(/^Bearer ([^\s]+)$/i)?.[1] : cookieToken(req.get('cookie'));
    if (!token) return res.status(401).json({ error: 'Yêu cầu đăng nhập.', code: 'TOKEN_REQUIRED' });
    // Browsers using cookies must prove the origin of state-changing requests.
    if (!header && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.get('origin')) {
        return res.status(403).json({ error: 'Yêu cầu thiếu Origin hợp lệ.' });
    }
    res.set('Cache-Control', 'private, no-store');
    try {
        const user = await resolveUser(token);
        if (!user) {
            if (!header) clearSessionCookie(res);
            return res.status(403).json({ error: 'Tài khoản không còn hoạt động.', code: 'ACCOUNT_SUSPENDED' });
        }
        req.user = user;
        req.authToken = token;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || (error instanceof Error && error.message === 'Invalid token subject')) {
            if (!header) clearSessionCookie(res);
            return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.', code: 'TOKEN_EXPIRED' });
        }
        console.error('Authentication database unavailable');
        return res.status(503).json({ error: 'Không thể xác thực lúc này. Vui lòng thử lại.' });
    }
}

export function optionalAuthentication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (req.get('authorization') || cookieToken(req.get('cookie'))) return authenticateToken(req, res, next);
    next();
}
