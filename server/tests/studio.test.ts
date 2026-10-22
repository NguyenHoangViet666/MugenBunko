import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startFixture } from './fixture.js';

describe('Studio draft safety, publishing and organization', () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>;
    const request = async (path: string, body?: unknown, userId: number | null = 2) => {
        const response = await fetch(`${fixture.url}/api${path}`, { method: body === undefined ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: `Bearer ${fixture.token(userId)}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, data: await response.json() };
    };
    const fields = (chapter: any) => ({ title: chapter.title, volumeName: chapter.volume_name, content: chapter.content });
    before(async () => { fixture = await startFixture(); });
    after(async () => { if (fixture) await fixture.close(); });

    it('allows empty drafts and rejects empty publication and schedules in the past', async () => {
        const body = { novelId: 1, volumeName: 'Tập mới', title: 'Chương trống', content: '', status: 'draft' };
        const created = await request('/chapters', body); assert.equal(created.status, 200);
        assert.equal((await request('/chapters', { ...body, id: created.data.chapterId, status: 'published' })).status, 400);
        assert.equal((await request('/chapters', { ...body, content: '<p> </p>', status: 'published' })).status, 400);
        assert.equal((await request('/chapters', { ...body, content: '<p>Có nội dung</p>', status: 'scheduled', scheduledRelease: new Date(Date.now() - 60000).toISOString() })).status, 400);
        assert.equal((await request('/chapters', body, 3)).status, 403);
    });
    it('keeps approved schedules intact when a stale autosave arrives', async () => {
        const release = new Date(Date.now() + 3600000).toISOString();
        const created = await request('/chapters', { novelId: 1, volumeName: 'Tập mới', title: 'Có lịch đăng', content: '<p>Nội dung hẹn giờ</p>', status: 'scheduled', scheduledRelease: release });
        assert.equal(created.data.status, 'pending'); const id = created.data.chapterId;
        await fixture.db.query("UPDATE chapters SET status = 'scheduled' WHERE id = ?", [id]);
        const beforeSave = (await request(`/chapters/${id}`)).data;
        const stale = await request('/chapters', { id, novelId: 1, ...fields(beforeSave), status: 'draft', source: 'autosave' });
        assert.equal(stale.status, 409);
        const saved = await request('/chapters', { id, novelId: 1, ...fields(beforeSave), content: '<p>Sửa trước khi đăng</p>', status: 'scheduled', preserveStatus: true, baseDraft: fields(beforeSave) });
        assert.equal(saved.status, 200); assert.equal(saved.data.status, 'scheduled');
        assert.equal(Date.parse(saved.data.scheduled_release), Date.parse(beforeSave.scheduled_release));
        const afterSave = (await request(`/chapters/${id}`)).data;
        assert.equal(afterSave.status, 'scheduled'); assert.match(afterSave.content, /Sửa trước/);
        assert.equal((await request(`/chapters/${id}`, undefined, null)).status, 404);
    });
    it('updates an already published chapter without returning it to pending', async () => {
        const original = (await request('/chapters/1')).data;
        const saved = await request('/chapters', { id: 1, novelId: 1, ...fields(original), title: 'Chương đã sửa', content: '<p>Nội dung cập nhật công khai</p>', status: 'published', baseDraft: fields(original) });
        assert.equal(saved.status, 200); assert.equal(saved.data.status, 'published');
        const publicChapter = await request('/chapters/1', undefined, null);
        assert.equal(publicChapter.status, 200); assert.match(publicChapter.data.content, /công khai/);
    });
    it('rejects stale edits from another tab instead of overwriting newer text', async () => {
        const original = (await request('/chapters/2')).data;
        const body = { id: 2, novelId: 1, ...fields(original), status: 'published', baseDraft: fields(original) };
        assert.equal((await request('/chapters', { ...body, content: '<p>Được lưu trước</p>' })).status, 200);
        assert.equal((await request('/chapters', { ...body, content: '<p>Bản cũ ghi đè</p>' })).status, 409);
        assert.match((await request('/chapters/2')).data.content, /Được lưu trước/);
        assert.equal((await request('/chapters', { ...body, baseDraft: { title: 1 } })).status, 400);
    });
    it('persists chapter order and volume moves atomically, with ownership and complete-list checks', async () => {
        const own = (await request('/novels')).data.find((n: any) => n.id === 1);
        const chapters = own.chapters.slice().reverse().map((c: any) => ({ id: c.id, volumeName: c.id === 1 ? 'Tập đổi tên' : c.volume_name }));
        assert.equal((await request('/chapters/organize', { novelId: 1, chapters }, 3)).status, 403);
        assert.equal((await request('/chapters/organize', { novelId: 1, chapters: [chapters[0], chapters[0]] })).status, 400);
        assert.equal((await request('/chapters/organize', { novelId: 1, chapters: chapters.slice(1) })).status, 409);
        const scheduled = own.chapters.find((c: any) => c.status === 'scheduled');
        assert.equal((await request('/chapters/organize', { novelId: 1, chapters })).status, 200);
        const saved = (await request('/novels')).data.find((n: any) => n.id === 1);
        assert.deepEqual(saved.chapters.map((c: any) => c.id), chapters.map((c: any) => c.id));
        assert.equal(saved.chapters.find((c: any) => c.id === 1).volume_name, 'Tập đổi tên');
        const afterSchedule = saved.chapters.find((c: any) => c.id === scheduled.id);
        assert.equal(afterSchedule.status, 'scheduled'); assert.equal(afterSchedule.scheduled_release, scheduled.scheduled_release);
        const publicNovel = (await request('/novels', undefined, null)).data.find((n: any) => n.id === 1);
        assert.deepEqual(publicNovel.chapters.map((c: any) => c.id), chapters.filter((c: any) => [1, 2].includes(c.id)).map((c: any) => c.id));
    });
});
