import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        username: string;
        roles: string[];
    };
}

const JWT_SECRET = process.env.JWT_SECRET || 'mugenbunko-super-secret-key-12345';

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Yêu cầu xác thực tài khoản qua Token!" });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded: any) => {
        if (err) {
            return res.status(403).json({ error: "Token xác thực không hợp lệ hoặc đã hết hạn!" });
        }
        try {
            const users = await db.query<any[]>("SELECT status FROM users WHERE id = ?", [decoded.id]);
            if (users.length > 0 && users[0].status === 'suspended') {
                if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
                    return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa do vi phạm tiêu chuẩn cộng đồng wibu! Bạn chỉ có quyền đọc nội dung." });
                }
            }
        } catch (dbErr) {
            console.error("Auth middleware DB query error:", dbErr);
        }
        req.user = decoded;
        next();
    });
}
