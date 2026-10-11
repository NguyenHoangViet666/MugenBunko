import { Request } from 'express';
export function pagination(req: Request, defaultLimit = 50) {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? defaultLimit : Number(req.query.limit);
    if ((req.query.page !== undefined && typeof req.query.page !== 'string') || (req.query.limit !== undefined && typeof req.query.limit !== 'string') ||
        !Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) return null;
    return { page, limit, offset: (page - 1) * limit };
}
