import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET } from '../config.js';

export interface AuthenticatedRequest extends Request {
    user?: { id: number; username: string; roles: string[] };
}

export async function resolveUser(token: string) {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !Number.isSafeInteger(decoded.id) || decoded.id <= 0) throw new Error('Invalid token subject');
    const users = await db.query<any[]>(`SELECT u.id, u.username, u.status, r.role FROM users u
        LEFT JOIN user_roles r ON r.user_id = u.id WHERE u.id = ?`, [decoded.id]);
    if (!users.length || users[0].status !== 'active') return null;
    return { id: users[0].id as number, username: users[0].username as string, roles: users.flatMap(row => row.role ? [row.role as string] : []) };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const header = req.get('authorization');
    const token = header?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Yêu cầu đăng nhập.', code: 'TOKEN_REQUIRED' });
    try {
        const user = await resolveUser(token);
        if (!user) return res.status(403).json({ error: 'Tài khoản không còn hoạt động.', code: 'ACCOUNT_SUSPENDED' });
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || (error instanceof Error && error.message === 'Invalid token subject')) {
            return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.', code: 'TOKEN_EXPIRED' });
        }
        console.error('Authentication database unavailable');
        return res.status(503).json({ error: 'Không thể xác thực lúc này. Vui lòng thử lại.' });
    }
}

export function optionalAuthentication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (req.get('authorization')) return authenticateToken(req, res, next);
    next();
}
