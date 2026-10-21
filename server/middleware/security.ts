import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { isAllowedOrigin, production, allowedOrigins } from '../config.js';

export function configureSecurity(app: Express) {
    app.disable('x-powered-by');
    const proxy = process.env.TRUST_PROXY;
    if (proxy === 'true' || proxy === '*') throw new Error('TRUST_PROXY must identify the trusted proxy, not every client.');
    app.set('trust proxy', proxy && /^\d+$/.test(proxy) ? Number(proxy) : proxy ? proxy.split(',').map(value => value.trim()) : false);
    app.use(helmet({ contentSecurityPolicy: production ? { directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", ...allowedOrigins, ...(process.env.PUBLIC_URL ? [process.env.PUBLIC_URL, process.env.PUBLIC_URL.replace(/^https:/, 'wss:')] : [])],
        objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"],
    } } : false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use((req, res, next) => {
        if (!isAllowedOrigin(req.get('origin'))) return res.status(403).json({ error: 'Origin không được phép.' });
        next();
    });
    app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true,
        exposedHeaders: ['X-Next-Page', 'X-Total-Count'] }));
    app.use('/api', rateLimit({ windowMs: 15 * 60000, limit: Number(process.env.API_RATE_LIMIT || 600), standardHeaders: true, legacyHeaders: false }));
    const authLimiter = rateLimit({ windowMs: 5 * 60000, limit: 15, standardHeaders: true, legacyHeaders: false });
    app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
    app.use('/api/upload', express.json({ limit: '7mb' }));
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ limit: '64kb', extended: false }));
    app.use('/api', (req, res, next) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            if (req.body === undefined) req.body = {};
            if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
                return res.status(400).json({ error: 'Dữ liệu yêu cầu phải là một object.' });
            }
        }
        next();
    });
}

export function apiErrorHandler(error: any, _req: Request, res: Response, _next: NextFunction) {
    const status = error?.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ error: status === 413 ? 'Dữ liệu quá lớn.' : status === 400 ? 'Dữ liệu không hợp lệ.' : 'Lỗi máy chủ.' });
}
