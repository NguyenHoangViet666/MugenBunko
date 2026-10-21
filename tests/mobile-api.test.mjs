import test from 'node:test';
import assert from 'node:assert/strict';
import { startFixture } from '../server/dist/tests/fixture.js';

test('mobile payloads support profiles, forum discussions and novel feedback', async () => {
  const fixture = await startFixture();
  try {
    const request = async (path, method = 'GET', body) => {
      const response = await fetch(`${fixture.url}/api${path}`, {
        method,
        headers: { Authorization: `Bearer ${fixture.token(2)}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json();
      assert.equal(response.ok, true, JSON.stringify(data));
      return data;
    };
    const profile = await request('/auth/update-profile', 'POST', { displayname: 'Mobile Reader', bio: 'Reading on mobile', avatarSeed: 'reader' });
    assert.equal(profile.user.displayname, 'Mobile Reader');
    const created = await request('/forum/posts', 'POST', { title: 'Mobile discussion', content: 'A new discussion', category: 'Thảo luận' });
    assert.ok(created.postId);
    const liked = await request(`/forum/posts/${created.postId}/like`, 'POST', {});
    assert.equal(liked.liked, true);
    await request(`/forum/posts/${created.postId}/comments`, 'POST', { text: 'A mobile comment' });
    const post = await request(`/forum/posts/${created.postId}`);
    assert.equal(post.comments[0].text, 'A mobile comment');
    assert.equal(Number(post.likes_count), 1);
    const catalog = await request('/forum/posts?comments=none&limit=20');
    assert.ok(catalog.some(p => p.id === created.postId));
    await fixture.db.query("UPDATE novels SET type = 'oneshot' WHERE id = 1");
    await fixture.db.query('INSERT INTO chapter_reads (user_id, chapter_id) VALUES (2, 1)');
    await request('/reviews/1', 'POST', { stars: 4, text: 'Mobile review' });
    assert.ok((await request('/reviews/1')).some(r => Number(r.stars) === 4));
    await request('/comments/1', 'POST', { text: 'Novel comment' });
    const comments = await request('/comments/1');
    const root = comments.find(c => c.text === 'Novel comment');
    assert.ok(root);
    await request('/comments/1', 'POST', { text: 'A reply', parentId: root.id, replyToUserId: root.user_id });
    assert.ok((await request('/comments/1')).some(c => c.parent_id === root.id));
    // Account boundaries and server-authoritative bookmark state.
    const bookmarks = await request('/novels/1/bookmark', 'POST', {});
    assert.ok(!bookmarks.user.bookmarks.includes(1));
    await request('/novels/1/bookmark', 'POST', {});
    assert.ok((await request('/auth/refresh/2')).user.bookmarks.includes(1));
    const shelf = await request('/library/collections', 'POST', { name: 'Mobile shelf', description: 'Synced collection', isPublic: true, coverNovelId: 1 });
    await request(`/library/collections/${shelf.id}/novels/1`, 'PUT', {});
    const collection = (await request('/library/collections')).find(c => c.id === shelf.id);
    assert.deepEqual(collection.novelIds, [1]);
    assert.equal((await request(`/library/public/${collection.shareId}`)).novels.length, 1);
    const foreign = await fetch(`${fixture.url}/api/library/collections/${shelf.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${fixture.token(3)}` } });
    assert.equal(foreign.status, 404);
    const now = Date.now();
    await request('/reader/progress/1', 'PUT', { chapterId: 1, scrollRatio: 0.7, paragraphIndex: 30, paragraphOffset: 0.4, updatedAt: now });
    await request('/reader/progress/1', 'PUT', { chapterId: 1, scrollRatio: 0.1, paragraphIndex: 1, paragraphOffset: 0, updatedAt: now - 1000 });
    assert.equal((await request('/reader/progress'))[0].paragraphIndex, 30);
    // Studio creates drafts, submits for review and retains version history.
    const novel = await request('/novels', 'POST', { title: 'Mobile author story', genre: 'Fantasy', summary: 'Created in Studio', type: 'series', status: 'ongoing' });
    const draft = { novelId: novel.novelId, title: 'Mobile chapter', volumeName: 'Volume 1', content: '<p>First draft</p>', status: 'draft' };
    const chapter = await request('/chapters', 'POST', draft);
    assert.equal(chapter.status, 'draft');
    const submitted = await request('/chapters', 'POST', { ...draft, id: chapter.chapterId, content: '<p>Edited draft</p>', status: 'published' });
    assert.equal(submitted.status, 'pending');
    assert.equal((await request(`/chapters/${chapter.chapterId}`)).status, 'pending');
    const versions = await request(`/chapters/${chapter.chapterId}/versions`);
    assert.ok(versions.length >= 2);
    const restored = await request(`/chapters/${chapter.chapterId}/versions/${versions.at(-1).id}/restore`, 'POST', { currentDraft: { title: draft.title, volumeName: draft.volumeName, content: '<p>Unsaved mobile text</p>' } });
    assert.equal(restored.status, 'draft');
    assert.match(restored.content, /First draft/);
    const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const scheduled = await request('/chapters', 'POST', { ...draft, title: 'Scheduled mobile chapter', status: 'scheduled', scheduledRelease: scheduledAt });
    assert.equal(scheduled.status, 'pending');
    assert.ok((await request(`/chapters/${scheduled.chapterId}`)).scheduled_release);
    const denied = await fetch(`${fixture.url}/api/mod/dashboard`, { headers: { Authorization: `Bearer ${fixture.token(2)}` } });
    assert.equal(denied.status, 403);
    await fixture.db.query("INSERT INTO user_roles (user_id, role) VALUES (2, 'admin')");
    await request('/chapters', 'POST', { ...draft, id: chapter.chapterId, status: 'pending' });
    assert.ok((await request('/mod/dashboard')).pendingChapters.some(c => c.id === chapter.chapterId));
    await request(`/mod/chapters/${chapter.chapterId}/action`, 'POST', { action: 'approve' });
    assert.equal((await request(`/chapters/${chapter.chapterId}`)).status, 'published');
    await request('/comments/' + root.id + '/report', 'POST', { reason: 'Mobile report' });
    const report = (await request('/mod/dashboard')).reportedComments.find(r => r.commentId === root.id);
    await request(`/mod/reports/${report.reportId}/action`, 'POST', { action: 'dismiss', commentId: root.id });
    await request('/admin/rules', 'POST', { title: 'Mobile policy', content: 'Be kind', orderIndex: 1 });
    assert.ok((await request('/policies')).some(r => r.title === 'Mobile policy'));
    await request('/events', 'POST', { title: 'Mobile event', description: 'Community event', content: '<p>Welcome</p>', status: 'published' });
    assert.ok((await request('/events')).some(e => e.title === 'Mobile event'));
    // A friend request must be accepted before messaging.
    const forbiddenMessage = await fetch(`${fixture.url}/api/social/messages/send`, { method: 'POST', headers: { Authorization: `Bearer ${fixture.token(2)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: 3, messageText: 'Not yet friends' }) });
    assert.equal(forbiddenMessage.status, 403);
    await request('/social/friends/request', 'POST', { friendId: 3 });
    const accepted = await fetch(`${fixture.url}/api/social/friends/accept`, { method: 'POST', headers: { Authorization: `Bearer ${fixture.token(3)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ friendId: 2 }) });
    assert.equal(accepted.ok, true);
    await request('/social/messages/send', 'POST', { receiverId: 3, messageText: 'Hello from mobile' });
    assert.ok((await request('/social/messages/chat/3')).some(m => m.message_text === 'Hello from mobile'));

  } finally { await fixture.close(); }
});
