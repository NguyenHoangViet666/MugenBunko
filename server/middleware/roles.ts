import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mugenbunko-super-secret-key-12345';

const ROLE_HIERARCHY: Record<string, number> = {
    'reader': 1,
    'author': 2,
    'moderator': 3,
    'admin': 4
};

export function checkRole(requiredRole: 'reader' | 'author' | 'moderator' | 'admin') {
    return async (req: any, res: Response, next: NextFunction) => {
        let userPayload = req.user;

        // Inline verification fallback if req.user is not yet populated but Auth header is present
        if (!userPayload) {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (token) {
                try {
                    userPayload = jwt.verify(token, JWT_SECRET);
                    req.user = userPayload;
                } catch (e) {
                    return res.status(403).json({ error: "Token xác thực không hợp lệ hoặc đã hết hạn!" });
                }
            }
        }

        const userId = userPayload ? userPayload.id : (req.headers['x-user-id'] || req.body.userId);
        if (!userId) {
            return res.status(401).json({ error: "Yêu cầu xác thực tài khoản!" });
        }
        try {
            const roles = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
            const userRoles = roles.map(r => r.role);
            
            const maxUserLevel = Math.max(...userRoles.map(r => ROLE_HIERARCHY[r] || 0), 0);
            const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
            
            if (maxUserLevel < requiredLevel) {
                return res.status(403).json({ error: `Bạn không có quyền thực hiện hành động này (Yêu cầu vai trò tối thiểu: ${requiredRole})!` });
            }
            next();
        } catch (err) {
            res.status(500).json({ error: "Lỗi kiểm tra quyền hạn." });
        }
    };
}
