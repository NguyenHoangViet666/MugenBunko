import { Router } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import { limitStore } from '../middleware/limits.js';
import db from '../db.js';
import { production } from '../config.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { issueOtp, verifyOtpOnConnection, discardOtp } from '../utils/otp.js';
import { getSmtpOptions } from '../utils/mailer.js';
import { logOtpFailure } from '../utils/otpDiagnostics.js';
import { validPassword, passwordPolicyMessage } from '../utils/passwordPolicy.js';
import { clearSessionCookie, sessionEvents } from '../utils/sessions.js';
import { passwordResetOtpEmail, passwordChangedEmail } from '../emails/registrationOtp.js';

const router = Router();
const requestLimiter = rateLimit({ windowMs: 15 * 60000, limit: 20, store: limitStore('password-request'), standardHeaders: true, legacyHeaders: false,
    message: { error: 'Bạn đã gửi quá nhiều yêu cầu khôi phục. Vui lòng thử lại sau 15 phút.' } });
const resetLimiter = rateLimit({ windowMs: 15 * 60000, limit: 20, store: limitStore('password-reset'), standardHeaders: true, legacyHeaders: false,
    message: { error: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' } });
const changeLimiter = rateLimit({ windowMs: 15 * 60000, limit: 5, store: limitStore('password-change'), standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => String((req as AuthenticatedRequest).user!.id),
    message: { error: 'Bạn đã thử đổi mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.' } });
const emailValue = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = (value: string) => value.length <= 150 && /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(value);
const resetMessage = 'Nếu email này gắn với tài khoản đang hoạt động, bạn sẽ nhận được mã khôi phục có hiệu lực trong 5 phút. Hãy kiểm tra cả thư mục spam.';
const invalidCode = 'Mã khôi phục không đúng, đã hết hạn hoặc đã vượt số lần thử.';

async function deliver(to: string, message: ReturnType<typeof passwordChangedEmail>) {
    const smtp = getSmtpOptions();
    if (!smtp) return;
    const transport = nodemailer.createTransport(smtp);
    try { await transport.sendMail({ from: { name: 'MugenBunko', address: smtp.auth.user }, to, ...message }); }
    finally { transport.close(); }
}

function notifyPasswordChanged(email: string | null) {
    if (email) void deliver(email, passwordChangedEmail()).catch(error => logOtpFailure('smtp_delivery', error));
}

router.post('/forgot-password', requestLimiter, async (req, res) => {
    const email = emailValue(req.body.email);
    if (!validEmail(email)) return res.status(400).json({ error: 'Email không hợp lệ.' });
    const respondAt = Date.now() + 200;
    try {
        const smtp = getSmtpOptions();
        const development = !production && process.env.DEV_OTP === 'true' && !smtp;
        if (!smtp && !development) return res.status(503).json({ error: 'Dịch vụ gửi email chưa được cấu hình.' });
        const users = await db.query<any[]>('SELECT id FROM users WHERE email = ? AND status = ? LIMIT 1', [email, 'active']);
        // Do the same storage/cooldown work for unknown addresses, without sending
        // mail or exposing account existence. SMTP latency never delays this reply.
        const code = await issueOtp(email, 'password_reset');
        if (users.length && code && smtp) {
            void deliver(email, passwordResetOtpEmail(code)).catch(async error => {
                logOtpFailure('smtp_delivery', error);
                try { await discardOtp(email, code, 'password_reset'); }
                catch (cleanupError) { logOtpFailure('otp_cleanup', cleanupError); }
            });
        }
        await new Promise(resolve => setTimeout(resolve, Math.max(0, respondAt - Date.now())));
        res.json({ success: true, message: resetMessage, ...(development && users.length && code ? { devOtp: code } : {}) });
    } catch (error) {
        logOtpFailure('otp_storage', error);
        res.status(503).json({ error: 'Chưa thể tiếp nhận yêu cầu khôi phục. Vui lòng thử lại.' });
    }
});

router.post('/reset-password', resetLimiter, async (req, res) => {
    const email = emailValue(req.body.email);
    const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    const password = req.body.newPassword;
    if (!validEmail(email) || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Email hoặc mã khôi phục không hợp lệ.' });
    if (!validPassword(password)) return res.status(400).json({ error: passwordPolicyMessage });
    try {
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await db.transaction(async connection => {
            const [users] = await connection.execute<any[]>('SELECT id, password, status FROM users WHERE email = ? FOR UPDATE', [email]);
            const user = users[0];
            if (!user || user.status !== 'active' || !await verifyOtpOnConnection(connection, email, otp, false, 'password_reset')) return { error: invalidCode };
            if (await bcrypt.compare(password, user.password)) return { error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' };
            await connection.execute('UPDATE users SET password = ?, auth_version = auth_version + 1 WHERE id = ?', [passwordHash, user.id]);
            await connection.execute('DELETE FROM email_otps WHERE email = ? AND purpose = ?', [email, 'password_reset']);
            return { id: user.id as number };
        });
        if (result.error) return res.status(400).json({ error: result.error });
        sessionEvents.emit('user-revoked', result.id);
        clearSessionCookie(res);
        notifyPasswordChanged(email);
        res.json({ success: true, message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' });
    } catch (error) {
        logOtpFailure('verification', error);
        res.status(503).json({ error: 'Chưa đặt lại được mật khẩu. Nội dung đã nhập được giữ lại, bạn có thể thử lại.' });
    }
});

router.post('/change-password', authenticateToken, changeLimiter, async (req: AuthenticatedRequest, res) => {
    if (req.body.userId !== undefined && Number(req.body.userId) !== req.user!.id) return res.status(403).json({ error: 'Không thể đổi mật khẩu của tài khoản khác.' });
    const current = req.body.currentPassword, password = req.body.newPassword;
    if (typeof current !== 'string' || !current || current.length > 200) return res.status(400).json({ error: 'Nhập mật khẩu hiện tại.' });
    if (!validPassword(password)) return res.status(400).json({ error: passwordPolicyMessage });
    try {
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await db.transaction(async connection => {
            const [users] = await connection.execute<any[]>('SELECT password, email, status, auth_version FROM users WHERE id = ? FOR UPDATE', [req.user!.id]);
            const user = users[0];
            if (!user || user.status !== 'active' || Number(user.auth_version) !== req.user!.authVersion) return { expired: true };
            if (!await bcrypt.compare(current, user.password)) return { error: 'Mật khẩu hiện tại chưa đúng.' };
            if (current === password || await bcrypt.compare(password, user.password)) return { error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' };
            await connection.execute('UPDATE users SET password = ?, auth_version = auth_version + 1 WHERE id = ?', [passwordHash, req.user!.id]);
            if (user.email) await connection.execute('DELETE FROM email_otps WHERE email = ? AND purpose = ?', [user.email, 'password_reset']);
            return { email: user.email as string | null };
        });
        if (result.expired) return res.status(401).json({ error: 'Phiên đăng nhập đã hết hiệu lực.', code: 'TOKEN_EXPIRED' });
        if (result.error) return res.status(400).json({ error: result.error });
        sessionEvents.emit('user-revoked', req.user!.id);
        clearSessionCookie(res);
        notifyPasswordChanged(result.email ?? null);
        res.json({ success: true, message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.' });
    } catch (error) {
        logOtpFailure('verification', error);
        res.status(503).json({ error: 'Chưa đổi được mật khẩu. Vui lòng thử lại.' });
    }
});

export default router;
