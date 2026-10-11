import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

const hierarchy: Record<string, number> = { reader: 1, author: 2, moderator: 3, admin: 4 };
export function checkRole(required: 'reader' | 'author' | 'moderator' | 'admin') {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: 'Yêu cầu đăng nhập.' });
        if (!req.user.roles.some(role => (hierarchy[role] || 0) >= hierarchy[required])) return res.status(403).json({ error: 'Không có quyền thực hiện thao tác.' });
        next();
    };
}
