import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { startFixture } from './fixture.js';
import { invalidatePublicReads } from '../utils/readCache.js';
import { databaseMetrics } from '../metrics.js';

describe('Bounded discovery and event-driven messages', { concurrency: false, timeout: 90000 }, () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>;
    const request = (path: string, user?: number, init: RequestInit = {}) => fetch(fixture.url + '/api' + path, {
        ...init, headers: { ...(user ? { Authorization: 'Bearer ' + fixture.token(user) } : {}), 'Content-Type': 'application/json', ...init.headers },
    });
    before(async () => {
        fixture = await startFixture();
        for (let index = 0; index < 35; index++) {
            const id = 100 + index;
            await fixture.db.query('INSERT INTO novels (id,title,author_id,genre,type,status,`reads`) VALUES (?,?,?,?,?,?,?)',
                [id, 'Catalog book ' + index, 2, index % 2 ? 'Fantasy, Romance' : 'Fantasy', index % 3 ? 'series' : 'oneshot', index % 4 ? 'ongoing' : 'completed', index]);
            for (let chapter = 0; chapter < 12; chapter++) await fixture.db.query("INSERT INTO chapters (novel_id,volume_name,title,content,status,sort_order) VALUES (?,'Volume',?,'<p>Chapter</p>','published',?)", [id, 'Chapter ' + chapter, chapter]);
        }
        await fixture.db.query("INSERT INTO novel_tags (novel_id,tag) VALUES (134,'rare-search-tag')");
        await fixture.db.query("INSERT INTO friends (user_id_1,user_id_2,status) VALUES (2,3,'accepted')");
        for (let index = 0; index < 45; index++) await fixture.db.query('INSERT INTO forum_posts (title,content,author_id,category) VALUES (?,?,2,?)', ['Discussion ' + index, 'A public conversation', index % 2 ? 'review' : 'general']);
    });
    after(async () => { await fixture?.close(); });

    it('protects operational metrics and exposes bounded database gauges', async () => {
        const original = process.env.METRICS_TOKEN;
        try {
            delete process.env.METRICS_TOKEN;
            assert.equal((await fetch(fixture.url + '/metrics')).status, 404);
            process.env.METRICS_TOKEN = 'test-metrics-secret';
            assert.equal((await fetch(fixture.url + '/metrics')).status, 403);
            const response = await fetch(fixture.url + '/metrics', { headers: { Authorization: 'Bearer test-metrics-secret' } });
            assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
            const body = await response.text(); assert.match(body, /mugen_db_active 0/); assert.match(body, /mugen_db_waiting 0/);
            assert.ok(!body.includes('test-metrics-secret'));
        } finally { if (original === undefined) delete process.env.METRICS_TOKEN; else process.env.METRICS_TOKEN = original; }
    });

    it('paginates the public catalog with two chapter previews instead of full tables of contents', async () => {
        const first = await (await request('/novels/catalog?limit=12')).json();
        const second = await (await request('/novels/catalog?limit=12&page=2')).json();
        assert.equal(first.total, 36); assert.equal(first.novels.length, 12); assert.equal(first.hasMore, true);
        assert.equal(second.novels.length, 12);
        assert.ok(first.novels.every((novel: any) => novel.chapters.length <= 2 && novel.detailsLoaded === false));
        assert.ok(first.novels.some((novel: any) => novel.chapters_count === 12));
        assert.ok(first.novels.every((novel: any) => !second.novels.some((other: any) => novel.id === other.id)));
        const detail = await (await request('/novels/134')).json();
        assert.equal(detail.chapters.length, 12); assert.equal(detail.detailsLoaded, true);
    });
    it('searches beyond the current page and validates filters without exposing drafts', async () => {
        const byTag = await (await request('/novels/catalog?q=rare-search-tag&sort=new')).json();
        assert.deepEqual(byTag.novels.map((novel: any) => novel.id), [134]);
        const filtered = await (await request('/novels/catalog?genre=Romance&type=series&status=completed')).json();
        assert.ok(filtered.novels.every((novel: any) => novel.genre.includes('Romance') && novel.type === 'series' && novel.status === 'completed'));
        assert.equal((await (await request('/novels/catalog?q=%25')).json()).total, 0);
        for (const query of ['limit=1000', 'page=-1', 'sort=invalid', 'q[]=x', 'ids=1,NaN']) assert.equal((await request('/novels/catalog?' + query)).status, 400);
        assert.equal((await request('/novels/2')).status, 404);
        assert.equal((await request('/novels/2', 3)).status, 200);
        assert.equal((await request('/novels?scope=mine')).status, 401);
        const personal = await (await request('/novels?scope=library', 2)).json();
        assert.deepEqual(personal.map((novel: any) => novel.id), [1]);
    });
    it('provides bounded Home sections with global totals and paginated forum filters', async () => {
        const home = await (await request('/novels/home')).json();
        assert.equal(home.stats.totalNovels, 36); assert.equal(home.stats.totalChapters, 422);
        assert.ok(home.novels.length <= 76); assert.equal(home.featured.length, 5);
        assert.equal(home.sections.trending.length, 10); assert.ok(home.recent.length <= 6);
        const response = await request('/forum/posts?comments=none&limit=20&category=review');
        const posts = await response.json();
        assert.equal(response.headers.get('X-Total-Count'), '22'); assert.equal(posts.length, 20); assert.ok(posts.every((post: any) => post.category === 'review'));
        const next = await (await request('/forum/posts?comments=none&limit=20&category=review&page=2')).json();
        assert.equal(next.length, 2);
        const stats = await (await request('/forum/stats')).json();
        assert.equal(stats.totalPosts, 45); assert.equal(stats.categories.review, 22);
    });
    it('coalesces concurrent public cache misses and invalidates successful edits', async () => {
        invalidatePublicReads();
        const before = databaseMetrics.queries;
        await Promise.all(Array.from({ length: 20 }, () => request('/novels/catalog?limit=12&q=Catalog')));
        const queries = databaseMetrics.queries - before;
        assert.ok(queries <= 4, 'Concurrent readers duplicated catalog SQL: ' + queries);
        const edit = await request('/novels/134', 2, { method: 'PUT', body: JSON.stringify({ title: 'Changed catalog title', genre: 'Fantasy', type: 'series', status: 'ongoing', tags: [] }) });
        assert.equal(edit.status, 200);
        const data = await (await request('/novels/catalog?q=Changed%20catalog%20title')).json();
        assert.equal(data.total, 1); assert.equal(data.novels[0].id, 134);
        assert.equal((await (await request('/novels/catalog?q=rare-search-tag')).json()).total, 0);
    });
    it('pushes committed HTTP messages once and reconciles unread state across clients', { timeout: 15000 }, async () => {
        const socket = io(fixture.url, { auth: { token: fixture.token(3) }, transports: ['websocket'], forceNew: true, reconnection: false });
        try {
            await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
            const received: any[] = [];
            const incoming = new Promise<any>(resolve => socket.once('receive_message', resolve));
            socket.on('receive_message', message => received.push(message));
            const response = await request('/social/messages/send', 2, { method: 'POST', body: JSON.stringify({ receiverId: 3, messageText: 'Realtime delivery' }) });
            assert.equal(response.status, 200);
            const message = await incoming;
            assert.equal(message.message_text, 'Realtime delivery');
            assert.equal((await (await request('/social/messages/unread-count', 3)).json()).unreadCount, 1);
            const read = new Promise<void>(resolve => socket.once('messages_read', () => resolve()));
            assert.equal((await request('/social/messages/chat/2/read', 3, { method: 'POST', body: '{}' })).status, 200);
            await read;
            assert.equal((await (await request('/social/messages/unread-count', 3)).json()).unreadCount, 0);
            await new Promise(resolve => setTimeout(resolve, 100)); assert.equal(received.length, 1);
        } finally { socket.disconnect(); }
    });
    it('does not let a warmed chapter transform bypass publication permissions', async () => {
        const chapter = await request('/chapters/1'); assert.equal(chapter.status, 200);
        await fixture.db.query("UPDATE chapters SET status='draft' WHERE id=1");
        assert.equal((await request('/chapters/1')).status, 404);
        assert.equal((await request('/chapters/1', 2)).status, 200);
    });
});
