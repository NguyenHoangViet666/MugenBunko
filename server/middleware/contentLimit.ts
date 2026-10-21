import rateLimit from 'express-rate-limit';
import type { AuthenticatedRequest } from './auth.js';

// Applied after authentication: changing IPs must not bypass a user's write limit.
export const contentLimit = rateLimit({
    windowMs: 60000,
    limit: 30,
    keyGenerator: req => 'user:' + (req as AuthenticatedRequest).user!.id,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Bạn đăng nội dung quá nhanh. Vui lòng chờ một phút.' },
});
