import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startFixture } from './fixture.js';

describe('Reader, collections and chapter version integration', () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>;
    const request = async (path: string, method = 'GET', body?: unknown, userId: number | null = 2) => {
        const response = await fetch(`${fixture.url}/api${path}`, { method,
            headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: `Bearer ${fixture.token(userId)}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, data: await response.json() };
    };
    before(async () => { fixture = await startFixture(); });
    after(async () => { if (fixture) await fixture.close(); });

    it('requires authentication and rejects malformed progress', async () => {
        assert.equal((await request('/reader/progress', 'GET', undefined, null)).status, 401);
        assert.equal((await request('/reader/progress/1', 'PUT', { chapterId: 1, scrollRatio: 2 })).status, 400);
        assert.equal((await request('/reader/progress/2', 'PUT', { chapterId: 1, scrollRatio: .4, paragraphIndex: 2, paragraphOffset: .5, updatedAt: Date.now() })).status, 404);
    });
    it('persists paragraph anchors per account and prevents stale overwrites', async () => {
        const newer = Date.now();
        const position = { chapterId: 1, scrollRatio: .55, paragraphIndex: 22, paragraphOffset: .3, updatedAt: newer, userId: 3 };
        assert.equal((await request('/reader/progress/1', 'PUT', position)).status, 200);
        const stale = await request('/reader/progress/1', 'PUT', { ...position, paragraphIndex: 2, updatedAt: newer - 1000 });
        assert.equal(stale.data.paragraphIndex, 22);
        assert.equal((await request('/reader/progress')).data[0].paragraphOffset, .3);
        assert.deepEqual((await request('/reader/progress', 'GET', undefined, 3)).data, []);
    });
    it('rejects premature completion and awards fixed XP only once under concurrent requests', async () => {
        const { data: session } = await request('/reader/sessions', 'POST', { chapterId: 1 });
        const body = { chapterId: 1, sessionId: session.sessionId, scrollRatio: .95, xp: 50000 };
        assert.equal((await request('/reader/complete', 'POST', body)).status, 409);
        await fixture.db.query('UPDATE reading_sessions SET started_at = CURRENT_TIMESTAMP - INTERVAL 20 SECOND WHERE user_id = 2 AND chapter_id = 1');
        assert.equal((await request('/reader/complete', 'POST', { ...body, scrollRatio: .2 })).status, 400);
        const results = await Promise.all([request('/reader/complete', 'POST', body), request('/reader/complete', 'POST', body)]);
        assert.deepEqual(results.map(r => r.status), [200, 200]);
        assert.equal(results.reduce((sum, r) => sum + r.data.xpAwarded, 0), 50);
        const users = await fixture.db.query<any[]>('SELECT xp FROM users WHERE id = 2'); assert.equal(users[0].xp, 50);
        assert.deepEqual((await request('/reader/progress')).data[0].completedChapterIds, [1]);
        assert.equal((await request('/auth/add-xp', 'POST', { userId: 2, xp: 50000 })).status, 410);
    });
    it('keeps private collections hidden and enforces owner-only mutations', async () => {
        const body = { name: 'Để dành cuối tuần', description: 'Những câu chuyện yên bình', isPublic: false, coverNovelId: 1 };
        const created = await request('/library/collections', 'POST', body); assert.equal(created.status, 201);
        const id = created.data.id;
        assert.equal((await request(`/library/collections/${id}/novels/1`, 'PUT')).status, 200);
        assert.equal((await request(`/library/collections/${id}/novels/2`, 'PUT')).status, 404);
        assert.equal((await request(`/library/collections/${id}`, 'PUT', body, 3)).status, 404);
        assert.equal((await request(`/library/collections/${id}/novels/1`, 'DELETE', undefined, 3)).status, 404);
        const collection = (await request('/library/collections')).data[0]; assert.deepEqual(collection.novelIds, [1]);
        assert.equal((await request(`/library/public/${collection.shareId}`, 'GET', undefined, null)).status, 404);
        assert.equal((await request(`/library/collections/${id}`, 'PUT', { ...body, isPublic: true })).status, 200);
        const shared = await request(`/library/public/${collection.shareId}`, 'GET', undefined, null);
        assert.equal(shared.status, 200); assert.equal(shared.data.novels[0].id, 1);
        await request(`/library/collections/${id}`, 'PUT', body);
        assert.equal((await request(`/library/public/${collection.shareId}`, 'GET', undefined, null)).status, 404);
        assert.equal((await request(`/library/collections/${id}`, 'DELETE')).status, 200);
    });
    it('preserves baseline versions, deduplicates autosaves and protects chapter ownership', async () => {
        const body = { id: 1, novelId: 1, volumeName: 'Tập 01', title: 'Bản chỉnh sửa', content: '<p>Nội dung mới</p>', status: 'draft', source: 'save' };
        assert.equal((await request('/chapters', 'POST', body)).status, 200);
        const first = await request('/chapters/1/versions'); assert.equal(first.data.length, 2);
        await request('/chapters', 'POST', { ...body, source: 'autosave' });
        assert.equal((await request('/chapters/1/versions')).data.length, 2);
        assert.equal((await request('/chapters/1/versions', 'GET', undefined, 3)).status, 404);
        assert.equal((await request('/chapters', 'POST', { ...body, id: 3 })).status, 404);
        const original = first.data.find((v: { source: string }) => v.source === 'initial');
        const restored = await request(`/chapters/1/versions/${original.id}/restore`, 'POST', {
            currentDraft: { title: 'Chưa bấm lưu', volumeName: 'Tập 01', content: '<p>Đoạn chưa lưu phải được giữ lại</p>' }
        });
        assert.equal(restored.status, 200); assert.equal(restored.data.status, 'draft');
        assert.match(restored.data.content, /Đoạn 1/);
        const versions = await request('/chapters/1/versions'); assert.equal(versions.data.length, 5);
        const unsaved = versions.data.find((v: { title: string }) => v.title === 'Chưa bấm lưu'); assert.ok(unsaved);
        const preview = await request(`/chapters/1/versions/${unsaved.id}`); assert.match(preview.data.content, /Đoạn chưa lưu/);
    });
});
