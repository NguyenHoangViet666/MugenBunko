import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { recordHttp } from '../metrics.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = performance.now();
    const supplied = req.get('x-request-id');
    const requestId = supplied && /^[a-zA-Z0-9-]{1,80}$/.test(supplied) ? supplied : randomUUID();
    res.set('X-Request-Id', requestId);
    res.on('finish', () => {
        const duration = performance.now() - start;
        recordHttp(req.method, req.originalUrl, res.statusCode, duration);
        const logAll = process.env.LOG_LEVEL === 'info' || (process.env.NODE_ENV !== 'production' && process.env.LOG_LEVEL !== 'warn');
        if (logAll || res.statusCode >= 500 || duration >= 1000) console.log(JSON.stringify({ requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(duration) }));
    });
    next();
}
