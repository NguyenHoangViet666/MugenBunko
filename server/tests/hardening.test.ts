import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { io as connectSocket } from 'socket.io-client';
import { startFixture } from './fixture.js';
import { JWT_SECRET } from '../config.js';

describe('Feedback privacy, session revocation and abuse regressions', () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>;
    const request = async (path: string, method = 'GET', body?: unknown, userId: number | null = 2) => {
        const response = await fetch(fixture.url + '/api' + path, { method,
            headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: 'Bearer ' + fixture.token(userId) } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body) });
        return { response, status: response.status, data: await response.json() };
    };
    before(async () => { fixture = await startFixture(); });
    after(async () => { if (fixture) await fixture.close(); });

    it('hides private feedback and announcements from guests and other accounts', async () => {
        await fixture.db.query("INSERT INTO reviews (novel_id, user_id, stars, text) VALUES (2, 3, 5, 'Legacy private review')");
        await fixture.db.query("INSERT INTO comments (novel_id, user_id, text) VALUES (2, 3, 'Legacy private comment')");
        await fixture.db.query("INSERT INTO announcements (novel_id, text) VALUES (2, 'Private announcement')");
        for (const path of ['/reviews/2', '/comments/2']) {
            assert.equal((await request(path, 'GET', undefined, null)).status, 404);
            assert.equal((await request(path)).status, 404);
            assert.equal((await request(path, 'GET', undefined, 3)).status, 200);
        }
        for (const path of ['/reviews/global/latest', '/comments/global/latest', '/announcements']) {
            const list = (await request(path, 'GET', undefined, null)).data;
            assert.ok(!list.some((row: any) => Number(row.novelId || row.novel_id) === 2));
        }
        assert.equal((await request('/reviews/2', 'POST', { stars: 5, text: 'Forbidden' })).status, 404);
        assert.equal((await request('/comments/2', 'POST', { text: 'Forbidden' })).status, 404);
    });

    it('enforces server-side reading requirements and rewards concurrent reviews only once', async () => {
        assert.equal((await request('/reviews/1', 'POST', { stars: 5, text: 'Not read' })).status, 403);
        await fixture.db.query('INSERT INTO chapter_reads (user_id, chapter_id) VALUES (2, 1), (2, 2)');
        assert.equal((await request('/reviews/1', 'POST', { stars: 5, text: 'Only two chapters' })).status, 403);
        const novel = await fixture.db.query<any>("INSERT INTO novels (title, author_id, genre, type, status) VALUES ('Security oneshot', 3, 'Fantasy', 'oneshot', 'ongoing')");
        const chapter = await fixture.db.query<any>("INSERT INTO chapters (novel_id, volume_name, title, content, status) VALUES (?, 'One', 'Published', '<p>Read</p>', 'published')", [novel.insertId]);
        await fixture.db.query('INSERT INTO chapter_reads (user_id, chapter_id) VALUES (2, ?)', [chapter.insertId]);
        const before = Number((await fixture.db.query<any[]>('SELECT xp FROM users WHERE id = 2'))[0].xp);
        const results = await Promise.all(Array.from({ length: 4 }, () => request('/reviews/' + novel.insertId, 'POST', { stars: 4, text: 'A completed oneshot' })));
        assert.deepEqual(results.map(result => result.status), [200, 200, 200, 200]);
        assert.equal(Number((await fixture.db.query<any[]>('SELECT xp FROM users WHERE id = 2'))[0].xp), before + 50);
        assert.equal(Number((await fixture.db.query<any[]>('SELECT COUNT(*) AS count FROM reviews WHERE novel_id = ?', [novel.insertId]))[0].count), 1);
        assert.equal((await request('/reviews/' + novel.insertId, 'POST', { stars: 5, text: 'Edited review' })).status, 200);
        assert.equal(Number((await fixture.db.query<any[]>('SELECT xp FROM users WHERE id = 2'))[0].xp), before + 50);
    });

    it('rejects malformed input and cross-novel comment threads without notifying unrelated users', async () => {
        for (const body of [{ stars: 6, text: 'x' }, { stars: 1.5, text: 'x' }, { stars: 5, text: {} }, { stars: 5, text: ' ' }, []]) {
            assert.equal((await request('/reviews/1', 'POST', body)).status, 400);
        }
        for (const body of [{}, { text: {} }, { text: ' ' }, { text: 'x'.repeat(5001) }]) {
            assert.equal((await request('/comments/1', 'POST', body)).status, 400);
        }
        const hidden = (await fixture.db.query<any[]>('SELECT id FROM comments WHERE novel_id = 2 LIMIT 1'))[0];
        assert.equal((await request('/comments/1', 'POST', { text: 'Cross novel', parentId: hidden.id })).status, 400);
        const root = await request('/comments/1', 'POST', { text: 'Public root' });
        assert.equal(root.status, 200);
        const before = Number((await fixture.db.query<any[]>('SELECT COUNT(*) AS count FROM notifications WHERE user_id = 3'))[0].count);
        assert.equal((await request('/comments/1', 'POST', { text: 'Forged notification', parentId: root.data.commentId, replyToUserId: 3 })).status, 400);
        assert.equal(Number((await fixture.db.query<any[]>('SELECT COUNT(*) AS count FROM notifications WHERE user_id = 3'))[0].count), before);
        assert.equal((await request('/comments/' + root.data.commentId + '/report', 'POST', {})).status, 400);
        assert.equal((await request('/comments/0')).status, 400);
        assert.equal((await request('/novels', 'GET', undefined, null)).status, 200);
    });

    it('blocks announcement impersonation and cross-post replies in the forum', async () => {
        assert.equal((await request('/forum/posts', 'POST', { title: 'Fake system notice', content: 'x', category: 'Thông báo' }, 3)).status, 403);
        assert.equal((await request('/forum/posts', 'POST', { title: {}, content: 'x', category: 'general' })).status, 400);
        const first = await request('/forum/posts', 'POST', { title: 'First', content: 'x', category: 'general' });
        const second = await request('/forum/posts', 'POST', { title: 'Second', content: 'x', category: 'general' });
        const root = await request(`/forum/posts/${first.data.postId}/comments`, 'POST', { text: 'Root' });
        assert.equal(root.status, 200);
        assert.equal((await request(`/forum/posts/${second.data.postId}/comments`, 'POST', { text: 'Cross post', parentId: root.data.comment.id })).status, 400);
        assert.equal((await request(`/forum/posts/${first.data.postId}/comments`, 'POST', { text: 'Forged recipient', parentId: root.data.comment.id, replyToUserId: 3 })).status, 400);
        assert.equal((await request('/forum/posts', 'POST', { title: 'Real notice', content: 'x', category: 'announcement' }, 1)).status, 200);
    });

    it('enforces author roles and prevents private covers leaking through public collections', async () => {
        assert.equal((await request('/novels', 'POST', { title: 'Reader bypass', genre: 'Fantasy' }, 3)).status, 403);
        assert.equal((await request('/chapters', 'POST', { novelId: 2, title: 'Reader bypass', volumeName: 'One', content: '<p>x</p>', status: 'draft' }, 3)).status, 403);
        assert.equal((await request('/library/collections', 'POST', { name: 'Hidden cover', description: '', isPublic: true, coverNovelId: 2 })).status, 400);
        const shareId = randomBytes(16).toString('hex');
        await fixture.db.query("UPDATE novels SET cover = 'https://example.test/private-cover.png' WHERE id = 2");
        await fixture.db.query('INSERT INTO library_collections (user_id, name, cover_novel_id, is_public, share_id) VALUES (2, ?, 2, 1, ?)', ['Legacy shelf', shareId]);
        const shared = await request('/library/public/' + shareId, 'GET', undefined, null);
        assert.equal(shared.status, 200);
        assert.equal(shared.data.cover, null);
        assert.deepEqual(shared.data.novels, []);
    });

    it('uses HttpOnly cookies, blocks cookie CSRF and revokes both HTTP and live socket sessions on logout', async () => {
        const password = 'SecurityTestPassword123!';
        await fixture.db.query('UPDATE users SET password = ? WHERE id = 2', [await bcrypt.hash(password, 4)]);
        const login = await request('/auth/login', 'POST', { username: 'upgrade_reader', password }, null);
        assert.equal(login.status, 200);
        const setCookie = login.response.headers.get('set-cookie')!;
        assert.match(setCookie, /HttpOnly/i);
        assert.match(setCookie, /SameSite=Strict/i);
        assert.match(login.response.headers.get('cache-control')!, /no-store/);
        const cookie = setCookie.split(';')[0];
        assert.equal((await fetch(fixture.url + '/api/auth/refresh/2', { headers: { Cookie: cookie } })).status, 200);
        assert.equal((await fetch(fixture.url + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } })).status, 403);
        assert.equal((await fetch(fixture.url + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://evil.example' } })).status, 403);
        const socket = connectSocket(fixture.url, { auth: { token: login.data.token }, transports: ['websocket'], reconnection: false });
        try {
            await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
            const disconnected = new Promise<void>(resolve => socket.once('disconnect', () => resolve()));
            const logout = await fetch(fixture.url + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: fixture.url } });
            assert.equal(logout.status, 200);
            await Promise.race([disconnected, new Promise((_, reject) => setTimeout(() => reject(new Error('Revoked socket stayed connected')), 3000))]);
            assert.equal((await fetch(fixture.url + '/api/auth/refresh/2', { headers: { Authorization: 'Bearer ' + login.data.token } })).status, 401);
            assert.equal((await fetch(fixture.url + '/api/auth/refresh/2', { headers: { Cookie: cookie } })).status, 401);
            const next = await request('/auth/login', 'POST', { username: 'upgrade_reader', password }, null);
            assert.equal(next.status, 200);
            assert.notEqual(next.data.token, login.data.token);
            assert.equal((await fetch(fixture.url + '/api/auth/refresh/2', { headers: { Authorization: 'Bearer ' + next.data.token } })).status, 200);
            const native = await fetch(fixture.url + '/api/auth/login', { method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Mugen-Client': 'native' },
                body: JSON.stringify({ username: 'upgrade_reader', password }) });
            assert.equal(native.status, 200);
            assert.equal(native.headers.get('set-cookie'), null, 'Native login must not create a second cookie session');
            const nativeToken = (await native.json()).token;
            const nativeRefresh = await fetch(fixture.url + '/api/auth/refresh/2', {
                headers: { Authorization: 'Bearer ' + nativeToken, 'X-Mugen-Client': 'native' } });
            assert.equal(nativeRefresh.status, 200);
            assert.equal(nativeRefresh.headers.get('set-cookie'), null);
        } finally { socket.disconnect(); }
    });

    it('does not expose private titles and removal reasons through legacy tombstones', async () => {
        await fixture.db.query("INSERT INTO deleted_novels (id, title, reason) VALUES (999999, 'Private unpublished title', 'Private removal reason')");
        const guest = await request('/novels/deleted/999999', 'GET', undefined, null);
        assert.equal(guest.status, 200);
        assert.notEqual(guest.data.title, 'Private unpublished title');
        assert.notEqual(guest.data.reason, 'Private removal reason');
        const staff = await request('/novels/deleted/999999', 'GET', undefined, 1);
        assert.equal(staff.data.title, 'Private unpublished title');
        assert.equal((await request('/novels/2', 'DELETE', { reason: {} }, 3)).status, 400);
    });

    it('disconnects idle sockets when their token expires', async () => {
        const token = jwt.sign({ id: 2 }, JWT_SECRET, { expiresIn: 2, jwtid: randomBytes(8).toString('hex') });
        const socket = connectSocket(fixture.url, { auth: { token }, transports: ['websocket'], reconnection: false });
        try {
            await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
            await Promise.race([
                new Promise<void>(resolve => socket.once('disconnect', () => resolve())),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Expired idle socket stayed connected')), 4000)),
            ]);
        } finally { socket.disconnect(); }
    });

    it('limits repeated content writes per account', async () => {
        let blocked = false;
        for (let i = 0; i < 31; i++) {
            const result = await request('/comments/1', 'POST', { text: 'Rate limit fixture ' + i }, 3);
            if (result.status === 429) { blocked = true; break; }
            assert.equal(result.status, 200);
        }
        assert.ok(blocked, 'Repeated writes were not rate limited');
    });
});
