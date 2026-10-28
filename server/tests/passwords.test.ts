import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mysql, { type Connection } from 'mysql2/promise';
import nodemailer from 'nodemailer';
import { io as connectSocket } from 'socket.io-client';
import { startFixture, seedFixtureUser } from './fixture.js';
import { issueOtp, verifyOtp } from '../utils/otp.js';
import { JWT_SECRET } from '../config.js';

describe('Password recovery and authenticated password changes', () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>, connection: Connection;
    const initialPassword = 'InitialPassword123!';
    let recoveryCode = '';
    const request = async (route: string, body?: unknown, token?: string, extraHeaders: Record<string, string> = {}) => {
        const response = await fetch(fixture.url + '/api/auth/' + route, { method: body === undefined ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        return { status: response.status, data: await response.json(), response };
    };
    const login = (id: number, password = initialPassword) => request('login', { username: `password_reader_${id}`, password });
    const reset = (email: string, otp: string, newPassword = 'RecoveredPassword123!') => request('reset-password', { email, otp, newPassword });
    before(async () => {
        fixture = await startFixture({ legacyOtpSchema: true });
        connection = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
        const hash = await bcrypt.hash(initialPassword, 12);
        for (const id of [10, 11, 12, 13, 14, 15, 16, 17, 18]) {
            await seedFixtureUser(fixture.db, "INSERT INTO users (id, username, displayname, password, email, status, coins) VALUES (?, ?, 'Độc giả kiểm tra mật khẩu', ?, ?, ?, 0)",
                [id, `password_reader_${id}`, hash, id === 12 ? null : `password-${id}@example.test`, id === 13 ? 'suspended' : 'active'], id);
            await fixture.db.query("INSERT INTO user_roles (user_id, role) VALUES (?, 'reader')", [id]);
        }
    });
    after(async () => { await connection?.end(); await fixture?.close(); });

    it('adds OTP purposes without invalidating an existing hashed registration code', async () => {
        await connection.query('ALTER TABLE email_otps DROP PRIMARY KEY, DROP COLUMN purpose, ADD PRIMARY KEY (email)');
        const sentAt = Date.now();
        const codeHash = createHmac('sha256', JWT_SECRET).update('password-10@example.test:654321').digest('hex');
        await fixture.db.query('INSERT INTO email_otps (email, code_hash, expires_at, sent_at, attempts) VALUES (?, ?, ?, ?, 0)', ['password-10@example.test', codeHash, sentAt + 300000, sentAt]);
        await fixture.db.closeDbConnection(); await fixture.db.initializeDbConnection();
        assert.equal(await verifyOtp('password-10@example.test', '654321'), true);
        const stored = (await fixture.db.query<any[]>('SELECT purpose, sent_at FROM email_otps WHERE email = ?', ['password-10@example.test']))[0];
        assert.equal(stored.purpose, 'registration'); assert.equal(Number(stored.sent_at), sentAt);
    });

    it('returns the same public recovery response for active, missing, suspended and repeated addresses', async () => {
        const known = await request('forgot-password', { email: ' PASSWORD-10@EXAMPLE.TEST ' });
        assert.equal(known.status, 200); assert.match(known.data.devOtp, /^\d{6}$/); recoveryCode = known.data.devOtp;
        for (const email of ['missing@example.test', 'password-13@example.test', 'password-10@example.test']) {
            const result = await request('forgot-password', { email });
            assert.equal(result.status, 200); assert.equal(result.data.message, known.data.message); assert.equal(result.data.devOtp, undefined);
        }
        const stored = await fixture.db.query<any[]>('SELECT purpose, code_hash FROM email_otps WHERE email = ?', ['password-10@example.test']);
        assert.equal(stored.length, 2);
        assert.ok(stored.every(row => row.code_hash.length === 64));
    });

    it('rejects registration codes as recovery codes and preserves the registration challenge', async () => {
        const code = await issueOtp('password-14@example.test'); assert.ok(code);
        assert.equal((await reset('password-14@example.test', code)).status, 400);
        assert.equal(await verifyOtp('password-14@example.test', code), true);
        assert.equal((await login(14)).status, 200);
    });

    it('enforces expiration and five attempts without changing the password', async () => {
        const email = 'password-15@example.test';
        const code = await issueOtp(email, 'password_reset'); assert.ok(code);
        for (let i = 0; i < 5; i++) assert.equal((await reset(email, '000000')).status, 400);
        assert.equal((await reset(email, code)).status, 400);
        assert.equal((await login(15)).status, 200);
        const expired = await issueOtp('password-16@example.test', 'password_reset'); assert.ok(expired);
        await fixture.db.query('UPDATE email_otps SET expires_at = ? WHERE email = ? AND purpose = ?', [Date.now() - 1, 'password-16@example.test', 'password_reset']);
        assert.equal((await reset('password-16@example.test', expired)).status, 400);
    });

    it('validates strength, byte limits and a different password without consuming a valid code', async () => {
        for (const password of ['short', 'A1!' + '界'.repeat(24), initialPassword]) assert.equal((await reset('password-10@example.test', recoveryCode, password)).status, 400);
        assert.equal(await verifyOtp('password-10@example.test', recoveryCode, false, 'password_reset'), true);
    });

    it('allows one concurrent reset, rejects replay and revokes both tokens and an idle socket', async () => {
        const first = await login(10), second = await login(10);
        const socket = connectSocket(fixture.url, { auth: { token: first.data.token }, transports: ['websocket'], reconnection: false });
        try {
            await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
            const disconnected = new Promise<void>(resolve => socket.once('disconnect', () => resolve()));
            const results = await Promise.all(['RecoveredFirst123!', 'RecoveredSecond123!'].map(password => reset('password-10@example.test', recoveryCode, password)));
            assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
            await Promise.race([disconnected, new Promise((_, reject) => setTimeout(() => reject(new Error('Idle socket remained authenticated')), 2500))]);
            const password = results[0].status === 200 ? 'RecoveredFirst123!' : 'RecoveredSecond123!';
            const successful = results.find(result => result.status === 200)!;
            assert.equal(successful.data.token, undefined); assert.match(successful.response.headers.get('set-cookie')!, /Max-Age=0|Expires=Thu, 01 Jan 1970/i);
            for (const token of [first.data.token, second.data.token]) assert.equal((await request('refresh/10', undefined, token)).status, 401);
            const oldCookie = first.response.headers.get('set-cookie')!.split(';')[0];
            assert.equal((await request('refresh/10', undefined, undefined, { Cookie: oldCookie })).status, 401);
            assert.equal((await login(10)).status, 401);
            assert.equal((await login(10, password)).status, 200);
            assert.equal((await reset('password-10@example.test', recoveryCode)).status, 400);
            assert.equal((await fixture.db.query<any[]>('SELECT auth_version FROM users WHERE id = 10'))[0].auth_version, 1);
        } finally { socket.disconnect(); }
    });

    it('rolls back the password and code together if the database write fails', async () => {
        const email = 'password-17@example.test', code = await issueOtp(email, 'password_reset'); assert.ok(code);
        await connection.query("CREATE TRIGGER reject_password_update BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NEW.id = 17 AND NEW.password <> OLD.password THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fixture rejects password update'; END IF; END");
        try { assert.equal((await reset(email, code)).status, 503); }
        finally { await connection.query('DROP TRIGGER reject_password_update'); }
        assert.equal(await verifyOtp(email, code, false, 'password_reset'), true);
        assert.equal((await login(17)).status, 200);
        assert.equal((await reset(email, code)).status, 200);
    });

    it('requires the current password, allows only one concurrent change and clears pending recovery', async () => {
        const first = await login(11), second = await login(11);
        assert.equal((await request('change-password', { currentPassword: initialPassword, newPassword: 'ChangedPassword123!' })).status, 401);
        assert.equal((await request('change-password', { currentPassword: 'wrong', newPassword: 'ChangedPassword123!' }, first.data.token)).status, 400);
        assert.equal((await request('change-password', { currentPassword: initialPassword, newPassword: initialPassword }, first.data.token)).status, 400);
        assert.equal((await request('change-password', { currentPassword: initialPassword, newPassword: 'short' }, first.data.token)).status, 400);
        const code = await issueOtp('password-11@example.test', 'password_reset'); assert.ok(code);
        const results = await Promise.all(['ChangedFirst123!', 'ChangedSecond123!'].map(newPassword => request('change-password', { currentPassword: initialPassword, newPassword }, first.data.token)));
        assert.deepEqual(results.map(result => result.status).sort(), [200, 401]);
        for (const token of [first.data.token, second.data.token]) assert.equal((await request('refresh/11', undefined, token)).status, 401);
        assert.equal(await verifyOtp('password-11@example.test', code, false, 'password_reset'), false);
        const newPassword = results[0].status === 200 ? 'ChangedFirst123!' : 'ChangedSecond123!';
        const fresh = await login(11, newPassword); assert.equal(fresh.status, 200);
        let limited = await request('change-password', { currentPassword: 'wrong', newPassword: 'ChangedAgain123!' }, fresh.data.token);
        if (limited.status === 400) limited = await request('change-password', { currentPassword: 'wrong', newPassword: 'ChangedAgain123!' }, fresh.data.token);
        assert.equal(limited.status, 429); assert.match(limited.data.error, /15 phút/);
    });

    it('enforces cookie CSRF, prevents cross-account changes and supports accounts without email', async () => {
        const session = await login(12), cookie = session.response.headers.get('set-cookie')!.split(';')[0];
        const body = { currentPassword: initialPassword, newPassword: 'ChangedNoEmail123!' };
        assert.equal((await request('change-password', body, undefined, { Cookie: cookie })).status, 403);
        assert.equal((await request('change-password', { ...body, userId: 14 }, session.data.token)).status, 403);
        assert.equal((await request('change-password', body, undefined, { Cookie: cookie, Origin: fixture.url })).status, 200);
        assert.equal((await login(12, body.newPassword)).status, 200);
        assert.equal((await login(14)).status, 200);
    });

    it('sends branded recovery and change notifications without returning a code or emailing the password', async context => {
        const saved = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
        const messages: Array<{ subject: string; text: string; html: string; to: string }> = [];
        const stub = context.mock.method(nodemailer, 'createTransport', (() => ({ async sendMail(message: typeof messages[number]) { messages.push(message); }, close() {} })) as typeof nodemailer.createTransport);
        try {
            process.env.SMTP_USER = 'sender@example.test'; process.env.SMTP_PASS = 'test-only';
            const sent = await request('forgot-password', { email: 'password-18@example.test' });
            assert.equal(sent.status, 200); assert.equal(sent.data.devOtp, undefined);
            assert.match(messages[0].subject, /khôi phục/);
            const code = messages[0].text.match(/\b\d{6}\b/)?.[0]; assert.ok(code);
            const missing = await request('forgot-password', { email: 'unknown-smtp@example.test' });
            assert.deepEqual(missing.data, sent.data); assert.equal(messages.length, 1);
            assert.equal((await reset('password-18@example.test', code, 'PrivateNewPassword123!')).status, 200);
            assert.equal(messages.length, 2); assert.match(messages[1].subject, /đã được thay đổi/);
            assert.ok(!JSON.stringify(messages[1]).includes('PrivateNewPassword123!'));
            assert.ok(!JSON.stringify(messages[1]).includes(code));
        } finally {
            stub.mock.restore(); process.env.SMTP_USER = saved.user || ''; process.env.SMTP_PASS = saved.pass || '';
        }
    });
});
