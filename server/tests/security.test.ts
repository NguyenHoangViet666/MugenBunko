import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { io as connectSocket } from 'socket.io-client';
import nodemailer from 'nodemailer';
import { getSmtpOptions } from '../utils/mailer.js';
import { startFixture } from './fixture.js';

describe('Production security regressions', () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>;
    const request = async (path: string, method = 'GET', body?: unknown, userId: number | null = 2) => {
        const response = await fetch(`${fixture.url}/api${path}`, { method,
            headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: `Bearer ${fixture.token(userId)}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, data: await response.json(), response };
    };
    before(async () => { fixture = await startFixture({ legacyOtpSchema: true }); });
    after(async () => { if (fixture) await fixture.close(); });

    it('rejects unauthenticated mutations, forged requester IDs and cross-account profile changes', async () => {
        assert.equal((await request('/auth/update-roles', 'POST', { requesterId: 1, userId: 3, roles: ['reader', 'admin'] }, null)).status, 401);
        assert.equal((await request('/auth/update-roles', 'POST', { requesterId: 1, userId: 2, roles: ['reader', 'admin'] })).status, 403);
        assert.equal((await request('/auth/update-profile', 'POST', { userId: 3, displayname: 'hacked' })).status, 403);
        assert.equal((await request('/auth/update-profile', 'POST', { userId: 2, displayname: 'Updated reader', bio: 'Hello' })).status, 200);
        assert.equal((await request('/events', 'POST', { title: 'hacked', description: 'test' }, null)).status, 401);
        assert.equal((await request('/events', 'POST', { title: 'hacked', description: 'test' })).status, 403);
        assert.equal((await request('/announcements', 'POST', { novelId: 1, text: 'hacked', authorId: 2 }, 3)).status, 403);
        assert.equal((await request('/auth/refresh/3')).status, 403);
        const publicProfile = (await request('/auth/user/upgrade_reader', 'GET', undefined, null)).data.user;
        assert.equal(publicProfile.email, undefined); assert.equal(publicProfile.password, undefined);
    });
    it('uses current account status and roles, preserves the last admin, and fails closed on DB errors', async () => {
        assert.equal((await request('/auth/refresh/99999', 'GET', undefined, 99999)).status, 403);
        await fixture.db.query("UPDATE users SET status = 'suspended' WHERE id = 3");
        assert.equal((await request('/auth/refresh/3', 'GET', undefined, 3)).status, 403);
        await fixture.db.query("UPDATE users SET status = 'active' WHERE id = 3");
        assert.equal((await request('/auth/update-roles', 'POST', { userId: 1, roles: ['reader'] }, 1)).status, 409);
        await fixture.db.query("INSERT INTO user_roles (user_id, role) VALUES (3, 'admin')");
        assert.equal((await request('/events', 'POST', { title: 'Allowed', description: 'test', status: 'draft' }, 3)).status, 200);
        await fixture.db.query("DELETE FROM user_roles WHERE user_id = 3 AND role = 'admin'");
        assert.equal((await request('/events', 'POST', { title: 'Revoked', description: 'test' }, 3)).status, 403);
        const original = fixture.db.query;
        fixture.db.query = async () => { throw new Error('Simulated database failure'); };
        try { assert.equal((await request('/auth/refresh/2')).status, 503); }
        finally { fixture.db.query = original; }
    });
    it('hides drafts and suspended novels, and prevents an owner from unlocking moderation', async () => {
        assert.equal((await request('/chapters/3', 'GET', undefined, null)).status, 404);
        assert.equal((await request('/chapters/3')).status, 404);
        assert.equal((await request('/chapters/3', 'GET', undefined, 3)).status, 200);
        const guest = await request('/novels?limit=1', 'GET', undefined, null);
        assert.deepEqual(guest.data.map((n: any) => n.id), [1]);
        const own = await request('/novels?limit=1', 'GET', undefined, 3);
        assert.equal(own.response.headers.get('X-Next-Page'), '2');
        assert.deepEqual((await request('/novels?page=2&limit=1', 'GET', undefined, 3)).data.map((n: any) => n.id), [2]);
        assert.equal((await request('/novels?limit=100000', 'GET', undefined, null)).status, 400);
        await fixture.db.query("UPDATE novels SET status = 'suspended' WHERE id = 1");
        assert.equal((await request('/chapters/1', 'GET', undefined, null)).status, 404);
        assert.equal((await request('/novels/1', 'PUT', { title: 'Unlock', genre: 'Fantasy', status: 'active' })).status, 403);
        await fixture.db.query("UPDATE novels SET status = 'ongoing' WHERE id = 1");
        const before = (await fixture.db.query<any[]>('SELECT COUNT(*) AS count FROM novels'))[0].count;
        assert.equal((await request('/novels', 'POST', { title: 'Forbidden', genre: 'Fantasy', status: 'suspended' })).status, 403);
        assert.equal((await fixture.db.query<any[]>('SELECT COUNT(*) AS count FROM novels'))[0].count, before);
    });
    it('counts concurrent reads once and ignores spoofed forwarded IP headers', async () => {
        const before = (await fixture.db.query<any[]>('SELECT `reads` FROM novels WHERE id = 1'))[0].reads;
        const responses = await Promise.all(Array.from({ length: 10 }, () => request('/novels/1/read-increment', 'POST', undefined, null)));
        assert.ok(responses.every(r => r.status === 200));
        assert.equal(responses.filter(r => !r.data.cooldown).length, 1);
        const spoofed = await fetch(fixture.url + '/api/novels/1/read-increment', { method: 'POST', headers: { 'X-Forwarded-For': '203.0.113.123' } });
        assert.equal((await spoofed.json()).cooldown, true);
        assert.equal((await fixture.db.query<any[]>('SELECT `reads` FROM novels WHERE id = 1'))[0].reads, before + 1);
        assert.equal((await request('/novels/2/read-increment', 'POST', undefined, null)).status, 404);
    });
    it('paginates forum posts and keeps nested comments with their own post', async () => {
        const ids: number[] = [];
        for (let i = 0; i < 3; i++) {
            const row = await fixture.db.query<any>('INSERT INTO forum_posts (title, content, author_id, category) VALUES (?, ?, 2, ?)', ['Post ' + i, 'Content', 'general']);
            ids.push(row.insertId);
        }
        const root = await fixture.db.query<any>('INSERT INTO forum_comments (post_id, user_id, text) VALUES (?, 2, ?)', [ids[2], 'Root']);
        await fixture.db.query('INSERT INTO forum_comments (post_id, user_id, parent_id, text) VALUES (?, 3, ?, ?)', [ids[2], root.insertId, 'Reply']);
        const page = await request('/forum/posts?limit=1', 'GET', undefined, null);
        assert.equal(page.response.headers.get('X-Next-Page'), '2'); assert.equal(page.data.length, 1);
        assert.equal(page.data[0].id, ids[2]); assert.equal(page.data[0].comments[0].replies[0].text, 'Reply');
        const second = (await request('/forum/posts?limit=1&page=2', 'GET', undefined, null)).data;
        assert.equal(second[0].id, ids[1]); assert.deepEqual(second[0].comments, []);
    });
    it('sanitizes executable HTML while preserving reader formatting and event publication', async () => {
        const html = '<p style="text-align:center">Safe <strong>text</strong></p><script>alert(1)</script><img src="https://example.com/a.png" onerror="alert(2)"><a href="javascript:alert(3)">link</a>';
        await request('/events', 'POST', { title: 'Security event', description: 'test', content: html, status: 'active' }, 1);
        const events = (await request('/events', 'GET', undefined, null)).data;
        assert.equal(events.length, 1); assert.match(events[0].content, /<strong>text<\/strong>/);
        assert.doesNotMatch(events[0].content, /script|onerror|javascript:/i);
        await fixture.db.query('UPDATE chapters SET content = ? WHERE id = 1', [html]);
        const chapter = (await request('/chapters/1', 'GET', undefined, null)).data;
        assert.match(chapter.content, /<strong>text<\/strong>/); assert.doesNotMatch(chapter.content, /script|onerror|javascript:/i);
    });
    it('stores hashed OTPs, applies cooldown and attempt limits, and prevents replay', async () => {
        const sent = await request('/auth/send-otp', 'POST', { email: 'otp-test@example.test' }, null);
        assert.equal(sent.status, 200); const code = sent.data.devOtp;
        assert.match(code, /^\d{6}$/);
        const row = (await fixture.db.query<any[]>('SELECT * FROM email_otps WHERE email = ?', ['otp-test@example.test']))[0];
        assert.equal(row.code_hash.length, 64); assert.notEqual(row.code_hash, code);
        assert.equal((await request('/auth/send-otp', 'POST', { email: 'otp-test@example.test' }, null)).status, 429);
        const { verifyOtp, issueOtp } = await import('../utils/otp.js');
        for (let i = 0; i < 5; i++) assert.equal(await verifyOtp('otp-test@example.test', '000000'), false);
        assert.equal(await verifyOtp('otp-test@example.test', code), false);
        const fresh = await issueOtp('replay@example.test'); assert.ok(fresh);
        assert.equal(await verifyOtp('replay@example.test', fresh!, true), true);
        assert.equal(await verifyOtp('replay@example.test', fresh!, true), false);
        process.env.DEV_OTP = 'false';
        try {
            const unavailable = await request('/auth/send-otp', 'POST', { email: 'no-smtp@example.test' }, null);
            assert.equal(unavailable.status, 503); assert.equal(unavailable.data.devOtp, undefined);
        } finally { process.env.DEV_OTP = 'true'; }
    });
    it('validates SMTP settings and sends OTPs without exposing them or contacting a real mail service', async context => {
        assert.equal(getSmtpOptions({}), null);
        assert.throws(() => getSmtpOptions({ SMTP_USER: 'test@example.test' }), /SMTP_USER.*SMTP_PASS/);
        const credentials = { SMTP_USER: 'sender@example.test', SMTP_PASS: 'test-only' };
        assert.equal(getSmtpOptions({ ...credentials, SMTP_PORT: '465' })?.secure, true);
        assert.throws(() => getSmtpOptions({ ...credentials, SMTP_PORT: '465', SMTP_SECURE: 'false' }), /SMTP_SECURE=true/);
        assert.throws(() => getSmtpOptions({ ...credentials, SMTP_PORT: 'not-a-port' }), /SMTP_PORT/);
        assert.throws(() => getSmtpOptions({ ...credentials, SMTP_SECURE: 'yes' }), /SMTP_SECURE/);
        assert.throws(() => getSmtpOptions({ ...credentials, SMTP_HOST: 'https://smtp.example.test' }), /SMTP_HOST/);

        const keys = ['SMTP_USER', 'SMTP_PASS', 'SMTP_PORT', 'SMTP_SECURE', 'DEV_OTP'] as const;
        const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
        type OtpMessage = { text: string; html: string; subject: string; from: { name: string; address: string }; to: string };
        const messages: OtpMessage[] = [];
        let failDelivery = false, closed = 0;
        const stub = context.mock.method(nodemailer, 'createTransport', (() => ({
            async sendMail(message: OtpMessage) {
                messages.push(message);
                if (failDelivery) throw new Error('Simulated SMTP rejection');
                return {};
            },
            close() { closed++; }
        })) as typeof nodemailer.createTransport);
        try {
            Object.assign(process.env, credentials, { SMTP_PORT: '587', SMTP_SECURE: 'false', DEV_OTP: 'true' });
            const sent = await request('/auth/send-otp', 'POST', { email: 'smtp-success@example.test' }, null);
            assert.equal(sent.status, 200);
            assert.equal(sent.data.devOtp, undefined);
            assert.equal(messages[0].to, 'smtp-success@example.test');
            assert.deepEqual(messages[0].from, { name: 'MugenBunko', address: credentials.SMTP_USER });
            assert.match(messages[0].subject, /MugenBunko/);
            const code = messages[0].text.match(/\b\d{6}\b/)?.[0];
            assert.ok(code);
            assert.ok(messages[0].html.includes(code), 'The HTML and plain-text versions must contain the same OTP');
            assert.match(messages[0].html, /lang="vi"/);
            assert.doesNotMatch(messages[0].html, /<script\b|<img\b|<iframe\b|<link\b|<form\b/i);
            assert.ok(!JSON.stringify(sent.data).includes(code));
            assert.equal(closed, 1);

            failDelivery = true;
            const failed = await request('/auth/send-otp', 'POST', { email: 'smtp-failure@example.test' }, null);
            assert.equal(failed.status, 503);
            assert.equal(failed.data.devOtp, undefined);
            assert.deepEqual(await fixture.db.query('SELECT email FROM email_otps WHERE email = ?', ['smtp-failure@example.test']), []);
            assert.equal(closed, 2);

            process.env.SMTP_PASS = '';
            assert.equal((await request('/auth/send-otp', 'POST', { email: 'smtp-partial@example.test' }, null)).status, 503);
            assert.equal(messages.length, 2);
        } finally {
            stub.mock.restore();
            for (const key of keys) {
                if (original[key] === undefined) delete process.env[key];
                else process.env[key] = original[key];
            }
        }
    });
    it('requires upload auth and rejects traversal, spoofed image bytes and oversized requests', async () => {
        const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1cAAAAASUVORK5CYII=';
        assert.equal((await request('/upload', 'POST', { image }, null)).status, 401);
        assert.equal((await request('/upload', 'POST', { image, type: '../../escape' })).status, 400);
        assert.equal((await request('/upload', 'POST', { image: 'data:image/png;base64,' + Buffer.from('<script>bad</script>').toString('base64') })).status, 400);
        const uploaded = await request('/upload', 'POST', { image, type: 'cover' });
        assert.equal(uploaded.status, 200); assert.match(uploaded.data.url, /\/uploads\/[a-f0-9-]{36}\.png$/);
        assert.equal(fs.readdirSync(fixture.uploadDirectory).length, 1);
        assert.equal((await request('/auth/update-profile', 'POST', { displayname: 'x'.repeat(1100000) })).status, 413);
        const denied = await fetch(fixture.url + '/api/novels', { headers: { Origin: 'https://untrusted.example' } });
        assert.equal(denied.status, 403); assert.equal(uploaded.response.headers.has('X-Powered-By'), false);
    });
    it('enforces friendship for REST and socket messages and returns the newest chat page', async () => {
        assert.equal((await request('/social/messages/send', 'POST', { receiverId: 3, messageText: 'Blocked' })).status, 403);
        const socket = connectSocket(fixture.url, { auth: { token: fixture.token(2) }, transports: ['websocket'], reconnection: false });
        try {
            await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
            const denied = await socket.timeout(3000).emitWithAck('send_message', { receiverId: 3, messageText: 'Blocked' });
            assert.equal(denied.success, false);
            await fixture.db.query("INSERT INTO friends (user_id_1, user_id_2, status) VALUES (2, 3, 'accepted')");
            const allowed = await socket.timeout(3000).emitWithAck('send_message', { receiverId: 3, messageText: 'Hello friend' });
            assert.equal(allowed.success, true);
            await fixture.db.query("UPDATE users SET status = 'suspended' WHERE id = 3");
            assert.equal((await request('/social/messages/send', 'POST', { receiverId: 3, messageText: 'Blocked recipient' })).status, 403);
            await fixture.db.query("UPDATE users SET status = 'active' WHERE id = 3");
            for (let i = 0; i < 105; i++) await fixture.db.query("INSERT INTO messages (sender_id, receiver_id, message_text, created_at) VALUES (2, 3, ?, CURRENT_TIMESTAMP - INTERVAL 2 MINUTE)", ['Message ' + i]);
            const latest = (await request('/social/messages/chat/3')).data;
            assert.equal(latest.length, 100); assert.equal(latest.at(-1).message_text, 'Message 104');
            const older = (await request('/social/messages/chat/3?before=' + latest[0].id)).data;
            assert.equal(older.length, 6); assert.ok(older.at(-1).id < latest[0].id);
            await fixture.db.query("UPDATE users SET status = 'suspended' WHERE id = 2");
            const disconnected = new Promise<void>(resolve => socket.once('disconnect', () => resolve()));
            socket.emit('check_online_status', [3], () => {});
            await Promise.race([disconnected, new Promise((_, reject) => setTimeout(() => reject(new Error('Suspended socket stayed connected')), 3000))]);
            await fixture.db.query("UPDATE users SET status = 'active' WHERE id = 2");
        } finally { socket.disconnect(); }
    });
    it('rejects insecure production configuration before startup', () => {
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./server/dist/config.js')"], {
            cwd: fixture.root, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'short', PUBLIC_URL: 'https://example.test', FRONTEND_URL: 'https://example.test' } });
        assert.notEqual(result.status, 0); assert.match(result.stderr, /strong JWT_SECRET/);
    });
    it('bootstraps production without seed data and starts using a DML-only DB account', async () => {
        const suffix = randomBytes(8).toString('hex');
        const database = 'mugenbunko_test_' + suffix;
        const account = 'mugen_test_' + suffix;
        const password = randomBytes(24).toString('hex');
        const env = { ...process.env, NODE_ENV: 'production', DB_NAME: database, DB_APP_USER: '',
            JWT_SECRET: randomBytes(48).toString('hex'), PUBLIC_URL: 'https://example.test', FRONTEND_URL: 'https://example.test', TRUST_PROXY: '' };
        try {
            const migration = spawnSync(process.execPath, ['server/dist/migrateProduction.js'], { cwd: fixture.root, env, encoding: 'utf8', timeout: 30000 });
            assert.equal(migration.status, 0, migration.stderr);
            assert.equal((await fixture.db.query<any[]>(`SELECT COUNT(*) AS count FROM \`${database}\`.users`))[0].count, 0);
            assert.equal((await fixture.db.query<any[]>('SELECT COUNT(*) AS count FROM users'))[0].count, 3);
            await fixture.db.query(`CREATE USER '${account}'@'%' IDENTIFIED BY '${password}'`);
            await fixture.db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${database}\`.* TO '${account}'@'%'`);
            const script = `
                import assert from 'node:assert/strict';
                import { createServer } from 'node:http';
                const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
                process.env.PORT = String(probe.address().port); await new Promise(resolve => probe.close(resolve));
                await import('./server/dist/server.js');
                let response;
                for (let i = 0; i < 50; i++) {
                    try { response = await fetch('http://127.0.0.1:' + process.env.PORT + '/healthz'); break; }
                    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
                }
                assert.equal(response?.status, 200);
                assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
                const unavailable = await fetch('http://127.0.0.1:' + process.env.PORT + '/api/auth/send-otp', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({email:'production@example.test'}) });
                assert.equal(unavailable.status, 503); assert.equal((await unavailable.json()).devOtp, undefined);
                const {default: db} = await import('./server/dist/db.js');
                await assert.rejects(db.query('CREATE TABLE forbidden (id INT)'));
                console.log('RESTRICTED_STARTUP_OK'); process.emit('SIGTERM');
            `;
            const runtime = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
                cwd: fixture.root, env: { ...env, DB_USER: account, DB_PASSWORD: password, DEV_OTP: 'true' }, encoding: 'utf8', timeout: 15000 });
            assert.equal(runtime.status, 0, runtime.stderr + runtime.stdout); assert.match(runtime.stdout, /RESTRICTED_STARTUP_OK/);
        } finally {
            if (!/^mugenbunko_test_[a-f0-9]{16}$/.test(database) || !/^mugen_test_[a-f0-9]{16}$/.test(account)) throw new Error('Unsafe production test cleanup');
            await fixture.db.query(`DROP USER IF EXISTS '${account}'@'%'`);
            await fixture.db.query(`DROP DATABASE IF EXISTS \`${database}\``);
        }
    });
});
