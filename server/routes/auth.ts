import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import { limitStore } from '../middleware/limits.js';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { JWT_SECRET, production } from '../config.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';
import { issueOtp, verifyOtp, discardOtp } from '../utils/otp.js';
import { getSmtpOptions } from '../utils/mailer.js';
import { logOtpFailure } from '../utils/otpDiagnostics.js';
import { registrationOtpEmail } from '../emails/registrationOtp.js';
import { clearSessionCookie, revokeSession, setSessionCookie } from '../utils/sessions.js';
import { validPassword } from '../utils/passwordPolicy.js';
import passwordRoutes from './passwords.js';
import { recordNewUserOpening } from '../payments/walletOpening.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(passwordRoutes);
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
const emailValue = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const limitedText = (value: unknown, max: number) => typeof value === 'string' && value.length <= max;
const otpLimiter = rateLimit({ windowMs: 15 * 60000, limit: 20, store: limitStore('otp'), standardHeaders: true, legacyHeaders: false });
const tokenFor = (user: any, authVersion = 0) => jwt.sign({ id: user.id, username: user.username, sv: authVersion }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1d', jwtid: randomUUID() });

async function userSession(id: number, knownRoles?: string[]) {
    const users = await db.query<any[]>(`SELECT id, username, displayname, email, coins, level, xp, bio,
        avatar_seed AS avatarSeed, status, author_request, date_joined FROM users WHERE id = ?`, [id]);
    if (!users.length) return null;
    const [roles, bookmarks, notifications] = await Promise.all([
        knownRoles ? Promise.resolve(knownRoles.map(role => ({ role }))) : db.query<any[]>('SELECT role FROM user_roles WHERE user_id = ?', [id]),
        db.query<any[]>('SELECT novel_id FROM bookmarks WHERE user_id = ?', [id]),
        db.query<any[]>("SELECT id, text, is_read AS `read`, DATE_FORMAT(created_at, '%d/%m/%Y') AS date FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100", [id]),
    ]);
    return { ...users[0], roles: roles.map(row => row.role), bookmarks: bookmarks.map(row => row.novel_id), notifications };
}

router.post('/send-otp', otpLimiter, async (req, res) => {
    const email = emailValue(req.body.email);
    if (email.length > 150 || !emailPattern.test(email)) return res.status(400).json({ error: 'Email không hợp lệ.' });
    const developmentOtp = !production && process.env.DEV_OTP === 'true';
    let stage: Parameters<typeof logOtpFailure>[0] = 'configuration';
    try {
        const smtp = getSmtpOptions();
        if (!smtp && !developmentOtp) return res.status(503).json({ error: 'Dịch vụ gửi email chưa được cấu hình.' });
        stage = 'account_lookup';
        if ((await db.query<any[]>('SELECT id FROM users WHERE email = ?', [email])).length) return res.status(400).json({ error: 'Email đã được sử dụng.' });
        stage = 'otp_storage';
        const code = await issueOtp(email);
        if (!code) return res.status(429).json({ error: 'Vui lòng chờ 60 giây trước khi gửi lại mã.' });
        if (smtp) {
            stage = 'smtp_setup';
            const transporter = nodemailer.createTransport(smtp);
            try { await transporter.sendMail({ from: { name: 'MugenBunko', address: smtp.auth.user }, to: email, ...registrationOtpEmail(code) }); }
            catch (error) {
                logOtpFailure('smtp_delivery', error);
                stage = 'otp_cleanup';
                await discardOtp(email, code);
                return res.status(503).json({ error: 'Không thể gửi email. Vui lòng thử lại.' });
            }
            finally { transporter.close(); }
        }
        res.json({ success: true, message: smtp ? 'Mã xác thực đã được gửi.' : 'Mã thử nghiệm đã được tạo; không gửi email.', ...(!smtp && developmentOtp ? { devOtp: code } : {}) });
    } catch (error) { logOtpFailure(stage, error); res.status(503).json({ error: 'Không thể gửi mã xác thực lúc này.' }); }
});
router.post('/verify-otp', otpLimiter, async (req, res) => {
    const email = emailValue(req.body.email);
    const code = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    if (email.length > 150 || !emailPattern.test(email) || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Email hoặc mã xác thực không hợp lệ.' });
    try {
        if (!await verifyOtp(email, code)) return res.status(400).json({ error: 'Mã không đúng, hết hạn hoặc đã vượt số lần thử.' });
        res.json({ success: true, message: 'Xác thực thành công.' });
    } catch (error) { logOtpFailure('verification', error); res.status(503).json({ error: 'Không thể xác thực lúc này.' }); }
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!limitedText(username, 150) || !username.trim() || !limitedText(password, 200) || !password) return res.status(400).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
    try {
        const users = await db.query<any[]>('SELECT id, password, status, auth_version FROM users WHERE username = ? OR email = ? LIMIT 1', [username.trim(), username.trim().toLowerCase()]);
        if (!users.length || !await bcrypt.compare(password, users[0].password)) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu.' });
        if (users[0].status !== 'active') return res.status(403).json({ error: 'Tài khoản đã bị khóa.' });
        const user = await userSession(users[0].id);
        const token = tokenFor(user, Number(users[0].auth_version));
        if (req.get('X-Mugen-Client') !== 'native') setSessionCookie(res, token, Date.now() + 86400000);
        res.json({ user, token });
    } catch { res.status(503).json({ error: 'Không thể đăng nhập lúc này.' }); }
});
router.post('/register', async (req, res) => {
    const username = emailValue(req.body.username);
    const email = emailValue(req.body.email);
    const { displayname, password } = req.body;
    if (!/^[a-z0-9_]{3,50}$/.test(username) || !limitedText(displayname, 100) || !displayname.trim() ||
        !validPassword(password) ||
        (email && (email.length > 150 || !emailPattern.test(email))) || (production && !email)) return res.status(400).json({ error: 'Thông tin đăng ký không hợp lệ. Mật khẩu cần 8–72 byte, chữ hoa, số và ký tự đặc biệt.' });
    try {
        const duplicate = await db.query<any[]>('SELECT id FROM users WHERE username = ? OR (email = ? AND ? <> ?) LIMIT 1', [username, email, email, '']);
        if (duplicate.length) return res.status(409).json({ error: 'Tài khoản hoặc email đã được sử dụng.' });
        if (email && (typeof req.body.otp !== 'string' || !await verifyOtp(email, req.body.otp.trim(), true))) return res.status(400).json({ error: 'Mã xác thực không hợp lệ.' });
        const passwordHash = await bcrypt.hash(password, 12);
        const userId = await db.transaction(async connection => {
            const [insert] = await connection.execute<any>(`INSERT INTO users (username, password, displayname, email, coins, avatar_seed, author_request)
                VALUES (?, ?, ?, ?, 0, ?, ?)`, [username, passwordHash, displayname.trim(), email || null, username, req.body.role === 'author' ? 'pending' : null]);
            await recordNewUserOpening(connection, insert.insertId);
            await connection.execute("INSERT INTO user_roles (user_id, role) VALUES (?, 'reader')", [insert.insertId]);
            await connection.execute("INSERT INTO notifications (user_id, text) VALUES (?, 'Chào mừng bạn đến MugenBunko!')", [insert.insertId]);
            return insert.insertId;
        });
        const user = await userSession(userId);
        const token = tokenFor(user);
        if (req.get('X-Mugen-Client') !== 'native') setSessionCookie(res, token, Date.now() + 86400000);
        res.json({ success: true, user, token });
    } catch { res.status(503).json({ error: 'Không thể tạo tài khoản lúc này.' }); }
});
router.get('/refresh/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (Number(req.params.id) !== req.user!.id) return res.status(403).json({ error: 'Không có quyền truy cập phiên khác.' });
    try {
        if (req.get('X-Mugen-Client') !== 'native') setSessionCookie(res, req.authToken!, req.user!.expiresAt);
        res.json({ user: await userSession(req.user!.id, req.user!.roles) });
    }
    catch { res.status(503).json({ error: 'Không thể làm mới phiên.' }); }
});
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        await revokeSession(req.user!.tokenHash, req.user!.id, req.user!.expiresAt);
        clearSessionCookie(res);
        res.json({ success: true });
    } catch { res.status(503).json({ error: 'Không thể kết thúc phiên trên máy chủ. Vui lòng thử lại.' }); }
});
router.post('/update-profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { displayname, bio = '', avatarSeed = '' } = req.body;
    if (req.body.userId !== undefined && Number(req.body.userId) !== req.user!.id) return res.status(403).json({ error: 'Không thể sửa hồ sơ người khác.' });
    if (!limitedText(displayname, 100) || !displayname.trim() || !limitedText(bio, 5000) || !limitedText(avatarSeed, 100)) return res.status(400).json({ error: 'Hồ sơ không hợp lệ.' });
    try {
        await db.query('UPDATE users SET displayname = ?, bio = ?, avatar_seed = ? WHERE id = ?', [displayname.trim(), bio, avatarSeed, req.user!.id]);
        res.json({ user: await userSession(req.user!.id) });
    } catch { res.status(503).json({ error: 'Không thể cập nhật hồ sơ.' }); }
});
router.post('/update-roles', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const target = Number(req.body.userId);
    const roles = req.body.roles;
    if (!Number.isSafeInteger(target) || target <= 0 || !Array.isArray(roles) || roles.length > 4 || !roles.includes('reader') ||
        roles.some(role => !['reader', 'author', 'moderator', 'admin'].includes(role)) || new Set(roles).size !== roles.length ||
        (roles.includes('admin') && roles.includes('moderator'))) return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    try {
        const outcome = await db.transaction(async connection => {
            const [admins] = await connection.execute<any[]>("SELECT user_id FROM user_roles WHERE role = 'admin' FOR UPDATE");
            const [users] = await connection.execute<any[]>('SELECT id FROM users WHERE id = ? FOR UPDATE', [target]);
            if (!users.length) return 404;
            const [current] = await connection.execute<any[]>('SELECT role FROM user_roles WHERE user_id = ?', [target]);
            const currentRoles = current.map(row => row.role);
            const isAdmin = req.user!.roles.includes('admin');
            // A reader may relinquish their own author role, but cannot grant new roles.
            if (!isAdmin && (target !== req.user!.id || roles.some(role => !currentRoles.includes(role)) ||
                currentRoles.some(role => role !== 'author' && !roles.includes(role)))) return 403;
            if (currentRoles.includes('admin') && !roles.includes('admin') && admins.length <= 1) return 409;
            await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [target]);
            for (const role of roles) await connection.execute('INSERT INTO user_roles (user_id, role) VALUES (?, ?)', [target, role]);
            if (currentRoles.includes('moderator') && !roles.includes('moderator')) {
                const [terms] = await connection.execute<any[]>("SELECT id,election_id FROM election_candidates WHERE user_id=? AND decision='appointed' AND ended_at IS NULL", [target]);
                for (const term of terms) {
                    await connection.execute("UPDATE election_candidates SET ended_at=?,end_reason='Admin thay đổi quyền thủ công' WHERE id=?", [Date.now(), term.id]);
                    await connection.execute('INSERT INTO election_audit (election_id,actor_id,action,details) VALUES (?,?,?,?)',
                        [term.election_id,req.user!.id,'manual_role_change',JSON.stringify({candidateId:term.id,roles})]);
                }
            }
            if (roles.includes('author')) await connection.execute("UPDATE users SET author_request = 'approved' WHERE id = ?", [target]);
            return 200;
        });
        if (outcome !== 200) return res.status(outcome).json({ error: 'Không thể thay đổi vai trò này.' });
        res.json({ user: await userSession(target) });
    } catch { res.status(503).json({ error: 'Không thể cập nhật vai trò.' }); }
});
router.post('/request-author-role', authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (req.body.userId !== undefined && Number(req.body.userId) !== req.user!.id) return res.status(403).json({ error: 'Không thể gửi thay người khác.' });
    try {
        if (!req.user!.roles.includes('author')) {
            const result = await db.query<any>("UPDATE users SET author_request = 'pending' WHERE id = ? AND COALESCE(author_request, '') <> 'pending'", [req.user!.id]);
            if (result.affectedRows) await db.query("INSERT INTO notifications (user_id, text) SELECT user_id, ? FROM user_roles WHERE role = 'admin'", [`@${req.user!.username} xin cấp quyền tác giả.`]);
        }
        res.json({ user: await userSession(req.user!.id) });
    } catch { res.status(503).json({ error: 'Không thể gửi yêu cầu.' }); }
});
router.post('/reject-author-request', authenticateToken, checkRole('admin'), async (req, res) => {
    const target = Number(req.body.targetUserId);
    if (!Number.isSafeInteger(target) || target <= 0) return res.status(400).json({ error: 'Tài khoản không hợp lệ.' });
    try { await db.query("UPDATE users SET author_request = 'rejected' WHERE id = ?", [target]); res.json({ success: true }); }
    catch { res.status(503).json({ error: 'Không thể xử lý yêu cầu.' }); }
});
router.post('/notifications/read-all', authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (req.body.userId !== undefined && Number(req.body.userId) !== req.user!.id) return res.status(403).json({ error: 'Không có quyền.' });
    try { await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user!.id]); res.json({ success: true }); }
    catch { res.status(503).json({ error: 'Không thể cập nhật thông báo.' }); }
});
router.post('/follow-author', authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (req.body.followerId !== undefined && Number(req.body.followerId) !== req.user!.id) return res.status(403).json({ error: 'Không có quyền.' });
    if (!limitedText(req.body.authorUsername, 50)) return res.status(400).json({ error: 'Tác giả không hợp lệ.' });
    try {
        const authors = await db.query<any[]>('SELECT id FROM users WHERE username = ?', [req.body.authorUsername]);
        if (!authors.length) return res.status(404).json({ error: 'Không tìm thấy tác giả.' });
        await db.transaction(async connection => {
            await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.user!.id]);
            const [existing] = await connection.execute<any[]>('SELECT 1 FROM follows WHERE follower_id = ? AND author_id = ?', [req.user!.id, authors[0].id]);
            await connection.execute(existing.length ? 'DELETE FROM follows WHERE follower_id = ? AND author_id = ?' : 'INSERT INTO follows (follower_id, author_id) VALUES (?, ?)', [req.user!.id, authors[0].id]);
        });
        const followed = await db.query<any[]>('SELECT u.username FROM follows f JOIN users u ON u.id = f.author_id WHERE f.follower_id = ?', [req.user!.id]);
        res.json({ followedAuthors: followed.map(row => row.username) });
    } catch { res.status(503).json({ error: 'Không thể theo dõi tác giả.' }); }
});
router.get('/user/:username', async (req, res) => {
    try {
        const users = await db.query<any[]>("SELECT id, username, displayname, avatar_seed AS avatarSeed, bio, xp, DATE_FORMAT(date_joined, '%d/%m/%Y') AS dateJoined FROM users WHERE username = ?", [req.params.username]);
        if (!users.length) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
        const roles = await db.query<any[]>('SELECT role FROM user_roles WHERE user_id = ?', [users[0].id]);
        res.json({ user: { ...users[0], roles: roles.map(row => row.role) } });
    } catch { res.status(503).json({ error: 'Không thể tải hồ sơ.' }); }
});
router.get('/follows/:id', async (req, res) => {
    try { res.json((await db.query<any[]>('SELECT u.username FROM follows f JOIN users u ON u.id = f.author_id WHERE f.follower_id = ? LIMIT 1000', [req.params.id])).map(row => row.username)); }
    catch { res.status(503).json({ error: 'Không thể tải danh sách theo dõi.' }); }
});
router.post('/add-xp', (_req, res) => res.status(410).json({ error: 'Kinh nghiệm đọc được ghi nhận tự động khi hoàn thành chương.' }));
router.post('/deposit-coins', (_req, res) => res.status(403).json({ error: 'Chức năng nạp coin đã tắt.' }));
export default router;
