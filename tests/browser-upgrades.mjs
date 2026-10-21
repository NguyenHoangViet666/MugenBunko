import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { startFixture } from '../server/dist/tests/fixture.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(work, message, timeout = 20000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const value = await work(); if (value) return value; await sleep(150); }
    throw new Error(message);
}
const fixture = await startFixture();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'mugenbunko-browser-'));
let browser;
let socket;
const pending = new Map();
const exceptions = [];
const pageSockets = new Map();
const pageContexts = new Map();
let nextId = 0;
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    (pageSockets.get(sessionId) || socket).send(JSON.stringify({ id, method, params }));
});
const evaluate = async (sessionId, expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + (result.exceptionDetails.exception?.description || ''));
    return result.result.value;
};
const waitSelector = async (sid, selector) => {
    try { await until(() => evaluate(sid, `Boolean(document.querySelector(${JSON.stringify(selector)}))`), `Missing ${selector}`); }
    catch (error) {
        const body = await evaluate(sid, "document.body.innerText.slice(0,1200)").catch(() => 'Page unresponsive');
        throw new Error(`${error.message}\nPage content: ${body}\nRuntime exceptions: ${JSON.stringify(exceptions)}`, { cause: error });
    }
};
const clickText = (sid, text) => evaluate(sid, `(() => { const button = [...document.querySelectorAll('button')].find(b => b.getClientRects().length > 0 && b.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw Error('Missing button: ' + ${JSON.stringify(text)}); button.click(); return true; })()`);
const setValue = (sid, selector, value) => evaluate(sid, `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw Error('Missing field'); const proto = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); return true; })()`);

try {
    const edge = process.env.UPGRADE_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    browser = spawn(edge, ['--headless=new', '--disable-gpu', '--disable-extensions', '--no-sandbox', '--no-first-run', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`], { windowsHide: true, stdio: 'ignore' });
    let spawnError;
    browser.on('error', error => { spawnError = error; });
    const port = await until(async () => {
        if (spawnError) throw spawnError;
        try { return (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { return null; }
    }, 'Headless browser did not start');
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    const onMessage = event => {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
        const task = pending.get(data.id); if (!task) return;
        clearTimeout(task.timer); pending.delete(data.id);
        if (data.error) task.reject(new Error(data.error.message)); else task.resolve(data.result);
    };
    socket.addEventListener('message', onMessage);
    const newPage = async (hash, authenticated = true, width = 1440, bypassMobile = true) => {
        const { browserContextId } = await send('Target.createBrowserContext');
        const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
        const target = await until(async () => {
            const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
            return targets.find(t => t.id === targetId && t.webSocketDebuggerUrl);
        }, 'Page debugging socket was not created');
        const pageSocket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { pageSocket.addEventListener('open', resolve, { once: true }); pageSocket.addEventListener('error', reject, { once: true }); });
        pageSocket.addEventListener('message', onMessage);
        const sessionId = targetId; pageSockets.set(sessionId, pageSocket);
        pageContexts.set(sessionId, browserContextId);
        await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId); await send('Network.enable', {}, sessionId);
        await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 768 }, sessionId);
        if (bypassMobile) await send('Page.addScriptToEvaluateOnNewDocument', { source: "sessionStorage.setItem('mugen_mobile_bypass','true');" }, sessionId);
        if (authenticated) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('mugen_session',${JSON.stringify(JSON.stringify(fixture.user))});localStorage.setItem('mugen_token',${JSON.stringify(fixture.token(2))});` }, sessionId);
        // A query change forces a new document so the account seeding script runs.
        await send('Page.navigate', { url: fixture.url + '/?smoke=' + targetId + hash }, sessionId);
        return sessionId;
    };
    const closePage = async sid => {
        await send('Target.disposeBrowserContext', { browserContextId: pageContexts.get(sid) });
        pageSockets.get(sid)?.close(); pageSockets.delete(sid); pageContexts.delete(sid);
    };
    const screenshot = async (sid, name) => {
        if (name === 'library') { await evaluate(sid, "window.scrollTo({top:0,behavior:'instant'});true"); await sleep(150); }
        await sleep(450);
        const directory = path.join(fixture.root, 'artifacts/upgrades'); await fs.mkdir(directory, { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png' }, sid);
        await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(data, 'base64'));
    };

    const guestReader = await newPage('#/novel/1', false);
    await waitSelector(guestReader, '.detail-actions');
    // A last-chapter position with no completed chapters must still be resumable.
    await evaluate(guestReader, `localStorage.setItem('mugen_readprogress_guest_1',JSON.stringify({version:2,novelId:1,chapterId:2,chapterIndex:1,scrollRatio:.4,paragraphIndex:15,paragraphOffset:.2,completedChapterIds:[],updatedAt:Date.now()}));true`);
    await send('Page.reload', {}, guestReader);
    await waitSelector(guestReader, '.detail-actions');
    await clickText(guestReader, 'Đọc Tiếp (Ch.2)');
    await waitSelector(guestReader, '.reader-content-body p');
    assert.equal(await evaluate(guestReader, "document.querySelector('.reader-chapter-heading h1').textContent"), 'Chương 2: Khu vườn sau thư viện');
    assert.equal(await evaluate(guestReader, 'location.hash'), '#/novel/1/reader/1');
    console.log('PASS: guest resumes the saved last chapter without requiring completed chapters');
    await closePage(guestReader);

    const reader = await newPage('#/novel/1/reader/0');
    await waitSelector(reader, '.reader-content-body p');
    await until(() => evaluate(reader, 'document.documentElement.scrollHeight > 5000'), 'Reader did not lay out');
    // Font loading can finish after the article first appears. Wait for the
    // Reader's initial position capture so its restore cannot undo our scroll.
    await until(() => evaluate(reader, "Boolean(localStorage.getItem('mugen_readprogress_upgrade_reader_1'))"), 'Reader did not finish restoring its initial position', 45000);
    await evaluate(reader, `window.scrollTo({top:window.scrollY + document.querySelectorAll('.reader-content-body p')[22].getBoundingClientRect().top - 90,behavior:'instant'});true`);
    await until(() => evaluate(reader, "JSON.parse(localStorage.getItem('mugen_readprogress_upgrade_reader_1'))?.paragraphIndex >= 20"), 'Reader did not capture the scrolled paragraph');
    await evaluate(reader, `window.location.hash='#/library';true`);
    await waitSelector(reader, '.personal-library');
    const saved = await until(async () => {
        const rows = await fixture.db.query('SELECT paragraph_index, paragraph_offset, scroll_ratio FROM reading_progress WHERE user_id = 2 AND novel_id = 1');
        return rows[0]?.paragraph_index >= 20 ? rows[0] : null;
    }, 'Reading position did not reach MySQL');

    const secondDevice = await newPage('#/novel/1/reader/0', true, 1200);
    await waitSelector(secondDevice, '.reader-content-body p'); await sleep(1500);
    const resumed = await evaluate(secondDevice, "JSON.parse(localStorage.getItem('mugen_readprogress_upgrade_reader_1'))");
    assert.ok(Math.abs(resumed.paragraphIndex - saved.paragraph_index) <= 1, 'Second device resumed a different paragraph');
    await until(() => evaluate(secondDevice, 'window.scrollY > 1000'), 'Second device did not restore scroll', 45000);
    await screenshot(secondDevice, 'reader');
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }, secondDevice);
    await evaluate(secondDevice, "window.dispatchEvent(new Event('offline'));window.scrollTo({top:window.scrollY + document.querySelectorAll('.reader-content-body p')[35].getBoundingClientRect().top - 90,behavior:'instant'});true");
    await sleep(2200);
    assert.ok(await evaluate(secondDevice, "JSON.parse(localStorage.getItem('mugen_readprogress_upgrade_reader_1')).pending"));
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, secondDevice);
    await evaluate(secondDevice, "window.dispatchEvent(new Event('online'));true");
    await until(async () => (await fixture.db.query('SELECT paragraph_index FROM reading_progress WHERE user_id = 2 AND novel_id = 1'))[0]?.paragraph_index >= 33, 'Offline position was not synchronized');
    console.log('PASS: paragraph resume across separate browser contexts and offline recovery');
    await closePage(secondDevice);

    await clickText(reader, 'Tạo kệ sách'); await waitSelector(reader, '.feature-modal input[maxlength="80"]');
    await setValue(reader, '.feature-modal input[maxlength="80"]', 'Để dành cuối tuần');
    await setValue(reader, '.feature-modal textarea', 'Những câu chuyện cho một buổi chiều yên tĩnh.');
    await evaluate(reader, "document.querySelector('.feature-modal input[type=checkbox]').click();true");
    await clickText(reader, 'Lưu kệ sách'); await waitSelector(reader, '.collection-tile');
    await evaluate(reader, "document.querySelector('.collection-select-button').click();true");
    await waitSelector(reader, '.collection-add-form'); await setValue(reader, '.collection-add-form select', '1');
    await clickText(reader, 'Thêm vào kệ'); await waitSelector(reader, '.selected-collection-panel .novel-shelf-card');
    await screenshot(reader, 'library');
    const collections = await fixture.db.query('SELECT share_id FROM library_collections WHERE user_id = 2');
    const guest = await newPage('#/collection/' + collections[0].share_id, false);
    await waitSelector(guest, '.public-collection .novel-shelf-card');
    await clickText(reader, 'Chỉnh sửa'); await waitSelector(reader, '.feature-modal');
    await evaluate(reader, "document.querySelector('.feature-modal input[type=checkbox]').click();true"); await clickText(reader, 'Lưu kệ sách');
    await until(async () => (await fixture.db.query('SELECT is_public FROM library_collections WHERE user_id = 2'))[0]?.is_public === 0, 'Privacy change did not persist');
    await send('Page.reload', {}, guest); await waitSelector(guest, '.load-error-card');
    console.log('PASS: create shelf, add novel, share publicly and revoke public access');
    await closePage(guest);

    const headers = { Authorization: 'Bearer ' + fixture.token(2), 'Content-Type': 'application/json' };
    const response = await fetch(fixture.url + '/api/chapters', { method: 'POST', headers, body: JSON.stringify({ id: 2, novelId: 1, volumeName: 'Tập 01', title: 'Bản chỉnh sửa mới', content: '<p>Nội dung đã lưu mới.</p>', status: 'draft' }) });
    assert.equal(response.status, 200);
    await evaluate(reader, "sessionStorage.clear();window.location.hash='#/studio';true");
    await send('Page.reload', {}, reader); await waitSelector(reader, '.studio-novel-item');
    await evaluate(reader, "document.querySelector('.studio-novel-item').click();true"); await waitSelector(reader, '.studio-chapter-item');
    await evaluate(reader, "[...document.querySelectorAll('.studio-chapter-item')].find(e=>e.textContent.includes('Bản chỉnh sửa mới')).click();true");
    await until(() => evaluate(reader, "document.querySelector('.editor-body-textarea')?.dataset.loadedChapterId==='2'"), 'Editor did not load');
    await evaluate(reader, "document.querySelector('.editor-body-textarea').innerHTML='<p>Đoạn đang viết chưa lưu.</p>';document.querySelector('.editor-body-textarea').dispatchEvent(new Event('input',{bubbles:true}));window.confirm=()=>true;true");
    await clickText(reader, 'Lịch sử phiên bản'); await waitSelector(reader, '.version-list-item');
    await evaluate(reader, "[...document.querySelectorAll('.version-list-item')].find(e=>e.textContent.includes('Khu vườn sau thư viện')).click();true");
    await waitSelector(reader, '.version-preview pre'); await screenshot(reader, 'studio-history');
    await clickText(reader, 'Khôi phục thành bản nháp');
    await until(() => evaluate(reader, "!document.querySelector('.version-history-modal') && document.querySelector('.editor-body-textarea')?.textContent.includes('Đoạn 1.')"), 'Version restore did not update editor');
    const preserved = await fixture.db.query("SELECT id FROM chapter_versions WHERE chapter_id = 2 AND content LIKE '%Đoạn đang viết chưa lưu%'"); assert.ok(preserved.length);
    console.log('PASS: preview and restore chapter version while preserving unsaved editor content');
    await closePage(reader);

    await fixture.db.query('INSERT INTO forum_posts (title, content, author_id, category) VALUES (?, ?, 2, ?)', ['Kiểm tra phục hồi diễn đàn', '<p>Một bài thảo luận để kiểm tra kết nối.</p>', 'general']);
    const forum = await newPage('#/explore', false);
    await waitSelector(forum, '.app-header');
    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/forum/posts*'] }, forum);
    await evaluate(forum, "window.location.hash='#/forum';true");
    await waitSelector(forum, '.load-error-card');
    assert.equal(await evaluate(forum, "Boolean(document.querySelector('.social-empty-feed-card'))"), false, 'Network errors must not appear as an empty feed');
    await screenshot(forum, 'forum-network-error');
    await send('Network.setBlockedURLs', { urls: [] }, forum);
    await clickText(forum, 'Thử lại');
    await waitSelector(forum, '.social-post-card');
    assert.equal(await evaluate(forum, "Boolean(document.querySelector('.load-error-card'))"), false);
    for (const theme of ['charcoal', 'sepia', 'washi']) {
        await evaluate(forum, "document.querySelector('.theme-toggle-btn').click();true");
        await until(() => evaluate(forum, `document.body.classList.contains('theme-${theme}')`), 'Theme did not change');
        assert.notEqual(await evaluate(forum, "getComputedStyle(document.querySelector('.social-banner-v3')).backgroundImage"), 'none', `Forum banner theme: ${theme}`);
        await screenshot(forum, 'forum-' + theme);
    }
    console.log('PASS: forum reports network failure and retry restores the feed');
    await closePage(forum);

    for (const authenticated of [false, true]) {
        const layout = await newPage('#/explore', authenticated);
        await waitSelector(layout, '.app-header');
        await evaluate(layout, 'document.fonts.ready.then(()=>true)');
        for (const width of [320, 390, 768, 992, 1200, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 768 }, layout);
            await sleep(150);
            const issues = await evaluate(layout, `(() => {
                const visible = selector => [...document.querySelectorAll(selector)].map(element => ({ element, rect: element.getBoundingClientRect() })).filter(({ rect }) => rect.width > 0 && rect.height > 0);
                const clipped = visible('.app-header button, .app-header a').filter(({ rect }) => rect.left < -.5 || rect.right > ${width} + .5).map(({ element, rect }) => ({ text: element.getAttribute('aria-label') || element.innerText || element.title, left: rect.left, right: rect.right }));
                const groups = visible('.header-left, .header-search, .header-actions');
                const overlaps = groups.flatMap((a, i) => groups.slice(i + 1).filter(b => Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left)>1 && Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top)>1).map(b => [a.element.className,b.element.className]));
                return { clipped, overlaps };
            })()`);
            assert.deepEqual(issues, { clipped: [], overlaps: [] }, `Header at ${width}px, ${authenticated ? 'signed in' : 'guest'}`);
            if (width === 390) await screenshot(layout, authenticated ? 'header-mobile-account' : 'header-mobile-guest');
        }
        if (authenticated) {
            await evaluate(layout, "document.querySelector('.user-level-badge').focus();true");
            await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, layout);
            await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, layout);
            await waitSelector(layout, '.profile-layout-container');
            await evaluate(layout, 'history.back();true');
            await waitSelector(layout, '.explore-layout');
        }
        await closePage(layout);
    }
    const gate = await newPage('#/explore', false, 390, false);
    await waitSelector(gate, '.mobile-standalone-gate');
    await evaluate(gate, "document.querySelector('.mobile-gate-bypass-link').click();true");
    await waitSelector(gate, '.app-header');
    await closePage(gate);
    console.log('PASS: guest and account headers fit 320–1440px and mobile gate bypass remains available');

    const about = await newPage('#/about', false);
    await waitSelector(about, '#about-title');
    await closePage(about);
    console.log('PASS: lazy pages support direct links and keyboard profile navigation with browser Back');

    // Shared staff scenarios use only the isolated fixture database.
    for (let i = 0; i < 12; i++) {
        await fixture.db.query("INSERT INTO users (username, password, displayname, status) VALUES (?, 'test-only', ?, 'active')", [`admin_smoke_${i}`, `Thành viên thử nghiệm ${i + 1}`]);
    }
    await fixture.db.query("INSERT INTO user_roles (user_id, role) SELECT id, 'reader' FROM users WHERE username LIKE 'admin_smoke_%'");

    await fixture.db.query("INSERT INTO user_roles (user_id, role) VALUES (2, 'moderator')");
    fixture.user.roles.push('moderator');
    const pendingIds = [];
    for (let i = 0; i < 13; i++) {
        const inserted = await fixture.db.query("INSERT INTO chapters (novel_id, volume_name, title, content, status, word_count) VALUES (1, 'Tập kiểm duyệt', ?, '<p>Nội dung dành cho kiểm duyệt.</p>', 'pending', 7)", [`Chương kiểm duyệt ${i + 1}`]);
        pendingIds.push(inserted.insertId);
    }
    const publishedItem = await fixture.db.query("INSERT INTO chapters (novel_id, volume_name, title, content, status) VALUES (1, 'Tập kiểm duyệt', 'Chương kiểm tra ẩn', '<p>Nội dung đã được xuất bản.</p>', 'published')");
    const reportIds = [];
    const commentIds = [];
    for (let i = 0; i < 12; i++) {
        const comment = await fixture.db.query("INSERT INTO comments (novel_id, user_id, text) VALUES (1, 3, ?)", [`Bình luận kiểm duyệt ${i + 1}`]);
        const report = await fixture.db.query("INSERT INTO reports (reporter_id, comment_id, reason) VALUES (2, ?, ?)", [comment.insertId, `Lý do cần xem xét ${i + 1}`]);
        commentIds.push(comment.insertId); reportIds.push(report.insertId);
    }
    const mod = await newPage('#/mod-dashboard');
    await waitSelector(mod, '.mod-workspace');
    await until(() => evaluate(mod, "!document.querySelector('.admin-refresh').disabled"), 'Mod data did not finish loading');
    assert.equal(await evaluate(mod, "document.querySelectorAll('.mod-workspace [role=tab]').length"), 5);
    assert.equal(await evaluate(mod, "document.querySelector('.mod-workspace a[href=\"#/admin-dashboard\"]')"), null, 'Pure moderators must not have admin navigation');
    const modTab = async tab => {
        await evaluate(mod, "(() => {const toggle=document.querySelector('.admin-menu-toggle');if(toggle.getClientRects().length && toggle.getAttribute('aria-expanded')==='false')toggle.click();return true})()");
        await evaluate(mod, `document.querySelector('#mod-tab-${tab}').click();true`);
        await until(() => evaluate(mod, `document.querySelector('#mod-panel-${tab}').hidden===false`), `Mod tab ${tab} did not open`);
    };
    await screenshot(mod, 'mod-overview');
    await evaluate(mod, "document.querySelector('#mod-tab-overview').focus();true");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 }, mod);
    assert.equal(await evaluate(mod, 'document.activeElement.id'), 'mod-tab-pending');
    await evaluate(mod, "document.querySelector('[aria-label=\"Trang sau chờ duyệt\"]').click();true");
    assert.ok(await evaluate(mod, "document.querySelector('#mod-panel-pending .admin-pagination').textContent.includes('Trang 2 / 2')"));
    await setValue(mod, '#mod-panel-pending input[type=search]', 'Chương kiểm duyệt 1');
    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/chapters/' + pendingIds[0]] }, mod);
    await evaluate(mod, "document.querySelector('[aria-label=\"Xem chương Chương kiểm duyệt 1\"]').click();true");
    await waitSelector(mod, '.mod-preview .admin-notice');
    assert.equal(await evaluate(mod, "document.querySelector('.mod-chapter-body')"), null);
    await send('Network.setBlockedURLs', { urls: [] }, mod);
    await clickText(mod, 'Thử lại');
    await waitSelector(mod, '.mod-chapter-body');
    assert.ok(await evaluate(mod, "document.querySelector('.mod-chapter-body').textContent.includes('Nội dung dành cho kiểm duyệt.')"));
    await screenshot(mod, 'mod-preview');
    await clickText(mod, 'Duyệt xuất bản');
    await until(async () => (await fixture.db.query('SELECT status FROM chapters WHERE id = ?', [pendingIds[0]]))[0]?.status === 'published', 'Mod approval did not persist');
    await until(() => evaluate(mod, "!document.querySelector('.mod-preview') && !document.querySelector('.admin-refresh').disabled"), 'Approval did not return to the queue');
    await setValue(mod, '#mod-panel-pending input[type=search]', 'Chương kiểm duyệt 2');
    await evaluate(mod, "window.confirm=()=>false;document.querySelector('[aria-label=\"Trả về nháp Chương kiểm duyệt 2\"]').click();true");
    assert.equal((await fixture.db.query('SELECT status FROM chapters WHERE id = ?', [pendingIds[1]]))[0].status, 'pending');
    await evaluate(mod, "window.confirm=()=>true;document.querySelector('[aria-label=\"Trả về nháp Chương kiểm duyệt 2\"]').click();true");
    await until(async () => (await fixture.db.query('SELECT status FROM chapters WHERE id = ?', [pendingIds[1]]))[0]?.status === 'draft', 'Mod rejection did not persist');
    await until(() => evaluate(mod, "!document.querySelector('.admin-refresh').disabled"), 'Rejection did not refresh');

    await modTab('reports');
    await setValue(mod, '#mod-panel-reports input[type=search]', 'Bình luận kiểm duyệt 11');
    await evaluate(mod, `document.querySelector('[aria-label="Giữ bình luận báo cáo ${reportIds[10]}"]').click();true`);
    await until(async () => (await fixture.db.query('SELECT id FROM reports WHERE id = ?', [reportIds[10]])).length === 0, 'Filtered report keep action targeted the wrong report');
    assert.equal((await fixture.db.query('SELECT id FROM comments WHERE id = ?', [commentIds[10]])).length, 1, 'Keeping a comment must preserve it');
    await until(() => evaluate(mod, "!document.querySelector('.admin-refresh').disabled"), 'Report keep did not refresh');
    await setValue(mod, '#mod-panel-reports input[type=search]', 'Bình luận kiểm duyệt 12');
    await evaluate(mod, `document.querySelector('[aria-label="Xóa bình luận báo cáo ${reportIds[11]}"]').click();true`);
    await until(async () => (await fixture.db.query('SELECT id FROM comments WHERE id = ?', [commentIds[11]])).length === 0, 'Filtered report delete targeted the wrong comment');
    await until(() => evaluate(mod, "!document.querySelector('.admin-refresh').disabled"), 'Report delete did not refresh');
    await setValue(mod, '#mod-panel-reports input[type=search]', '');
    await screenshot(mod, 'mod-reports');
    await modTab('users');
    assert.equal(await evaluate(mod, "document.querySelector('#mod-panel-users [aria-label^=\"Khóa @\"]')"), null, 'Pure moderators must not receive account suspension controls');
    await setValue(mod, '#mod-panel-users input[type=search]', 'upgrade_other');
    assert.equal(await evaluate(mod, "document.querySelectorAll('.mod-users-table tbody tr').length"), 1);
    await setValue(mod, '[aria-label="Lọc trạng thái tài khoản kiểm duyệt"]', 'suspended');
    await waitSelector(mod, '#mod-panel-users .admin-empty');
    await clickText(mod, 'Xóa bộ lọc');

    await modTab('published');
    await setValue(mod, '#mod-panel-published input[type=search]', 'Chương kiểm tra ẩn');
    await evaluate(mod, "document.querySelector('[aria-label=\"Xem chương Chương kiểm tra ẩn\"]').click();true");
    await waitSelector(mod, '.mod-chapter-body');
    await evaluate(mod, "window.confirm=()=>false;true");
    await clickText(mod, 'Ẩn chương');
    assert.equal((await fixture.db.query('SELECT status FROM chapters WHERE id = ?', [publishedItem.insertId]))[0].status, 'published');
    await evaluate(mod, "window.confirm=()=>true;true");
    await clickText(mod, 'Ẩn chương');
    await until(async () => (await fixture.db.query('SELECT status FROM chapters WHERE id = ?', [publishedItem.insertId]))[0]?.status === 'draft', 'Published chapter did not return to draft');
    await until(() => evaluate(mod, "!document.querySelector('.mod-preview') && !document.querySelector('.admin-refresh').disabled"), 'Hide did not return to the list');
    await until(() => evaluate(mod, "document.activeElement.id==='mod-tab-published'"), 'Closing the last filtered preview did not restore keyboard focus');
    await setValue(mod, '#mod-panel-published input[type=search]', '');

    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/mod/dashboard'] }, mod);
    await evaluate(mod, "document.querySelector('.admin-refresh').click();true");
    await waitSelector(mod, '.admin-notice');
    await send('Network.setBlockedURLs', { urls: [] }, mod);
    await until(() => evaluate(mod, "!document.querySelector('.admin-notice button').disabled"), 'Mod retry stayed disabled');
    await evaluate(mod, "document.querySelector('.admin-notice button').click();true");
    await until(() => evaluate(mod, "!document.querySelector('.admin-notice') && !document.querySelector('.admin-refresh').disabled"), 'Mod retry failed');
    await setValue(mod, '#mod-panel-pending input[type=search]', '');
    for (const theme of ['washi', 'sepia', 'charcoal']) {
        await evaluate(mod, `document.body.className='theme-${theme}';true`);
        for (const width of [1440, 992, 768, 390, 320]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 768 }, mod);
            for (const tab of ['pending', 'reports', 'users', 'published']) {
                await modTab(tab);
                const clipped = await evaluate(mod, `(() => {
                    const root=document.querySelector('.mod-workspace').getBoundingClientRect();
                    const controls=[...document.querySelectorAll('.mod-workspace button,.mod-workspace input,.mod-workspace select')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}).filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>${width}+.5}).map(e=>e.getAttribute('aria-label')||e.textContent.trim());
                    return {rootClipped:root.left<-.5||root.right>${width}+.5,controls};
                })()`);
                assert.deepEqual(clipped, { rootClipped: false, controls: [] }, `Mod ${tab}, ${theme}, ${width}px`);
                if ((width === 1440 || width === 390) && tab === 'pending') await screenshot(mod, `mod-pending-${theme}-${width}`);
            }
        }
    }
    await closePage(mod);
    await fixture.db.query("DELETE FROM user_roles WHERE user_id = 2 AND role = 'moderator'");
    fixture.user.roles.splice(fixture.user.roles.indexOf('moderator'), 1);
    console.log('PASS: moderator sidebar, preview/retry, chapter approval/rejection/hiding, filtered report actions, role-aware controls and responsive themes.');

    // Administration is exercised with a real staff account in the isolated fixture.
    await fixture.db.query("INSERT INTO user_roles (user_id, role) VALUES (2, 'admin')");
    fixture.user.roles.push('admin');
    await fixture.db.query("UPDATE users SET author_request = 'pending', displayname = 'Độc giả khác với tên hiển thị rất dài để kiểm tra bố cục' WHERE id = 3");
    const admin = await newPage('#/admin-dashboard');
    await waitSelector(admin, '.admin-workspace');
    await until(() => evaluate(admin, "document.querySelector('.admin-refresh') && !document.querySelector('.admin-refresh').disabled"), 'Admin data did not finish loading');
    assert.equal(await evaluate(admin, "document.querySelectorAll('.admin-nav-item').length"), 6);
    assert.equal(await evaluate(admin, "getComputedStyle(document.querySelector('.admin-workspace')).display"), 'grid');
    const adminTab = async tab => {
        await evaluate(admin, `document.querySelector('#admin-tab-${tab}').click();true`);
        await until(() => evaluate(admin, `document.querySelector('#admin-panel-${tab}').hidden === false`), `Admin tab ${tab} did not open`);
    };
    await screenshot(admin, 'admin-overview');
    await evaluate(admin, "document.querySelector('#admin-tab-overview').focus();true");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 }, admin);
    assert.equal(await evaluate(admin, 'document.activeElement.id'), 'admin-tab-users');
    assert.equal(await evaluate(admin, "document.querySelector('#admin-tab-users').getAttribute('aria-selected')"), 'true');
    await evaluate(admin, "document.querySelector('[aria-label=\"Trang sau tài khoản\"]').click();true");
    assert.ok(await evaluate(admin, "document.querySelector('#admin-panel-users .admin-pagination').textContent.includes('Trang 2 / 2')"));
    await setValue(admin, '#admin-panel-users input[type=search]', 'upgrade_other');
    assert.equal(await evaluate(admin, "document.querySelectorAll('.admin-users-table tbody tr').length"), 1);
    await setValue(admin, '#admin-panel-users input[type=search]', 'no-such-account');
    await waitSelector(admin, '#admin-panel-users .admin-empty');
    await clickText(admin, 'Xóa bộ lọc');
    await setValue(admin, '[aria-label="Lọc tài khoản"]', 'pending');
    await screenshot(admin, 'admin-users');
    await evaluate(admin, "document.querySelector('.admin-request-actions .text-action').click();true");
    await until(async () => (await fixture.db.query('SELECT author_request FROM users WHERE id = 3'))[0]?.author_request === 'approved', 'Author approval did not persist');
    await until(() => evaluate(admin, "!document.querySelector('.admin-refresh').disabled"), 'Author approval did not refresh');

    await adminTab('events');
    await setValue(admin, '#admin-event-title', 'Sự kiện quản trị thử nghiệm');
    await setValue(admin, '#admin-event-description', 'Một thông báo được lưu từ giao diện mới.');
    await setValue(admin, '#admin-event-content', '<p>Nội dung vẫn còn khi đổi tab.</p>');
    await adminTab('novels');
    await setValue(admin, '#admin-panel-novels input[type=search]', 'khong-co-tac-pham');
    await waitSelector(admin, '#admin-panel-novels .admin-empty');
    await clickText(admin, 'Xóa bộ lọc');
    await waitSelector(admin, '.admin-novels-table tbody tr');
    await screenshot(admin, 'admin-novels');
    await adminTab('events');
    assert.equal(await evaluate(admin, "document.querySelector('#admin-event-title').value"), 'Sự kiện quản trị thử nghiệm');
    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/events'] }, admin);
    await clickText(admin, 'Lưu bản nháp');
    await until(() => evaluate(admin, "document.querySelector('.toast-message').textContent.includes('Không thể lưu bản nháp')"), 'Failed event save did not report an error');
    assert.equal(await evaluate(admin, "document.querySelector('#admin-event-content').value"), '<p>Nội dung vẫn còn khi đổi tab.</p>');
    await send('Network.setBlockedURLs', { urls: [] }, admin);
    await clickText(admin, 'Lưu bản nháp');
    const savedEvent = await until(async () => (await fixture.db.query("SELECT id FROM events WHERE title = 'Sự kiện quản trị thử nghiệm'"))[0], 'Event draft was not saved');
    await until(() => evaluate(admin, "document.querySelector('.admin-event-list').textContent.includes('Sự kiện quản trị thử nghiệm')"), 'Saved event did not reach the list');
    await clickText(admin, 'Phát hành Sự kiện quản trị thử nghiệm');
    await until(async () => (await fixture.db.query('SELECT status FROM events WHERE id = ?', [savedEvent.id]))[0]?.status === 'active', 'Event did not publish');
    await waitSelector(admin, '.admin-live-event');
    await screenshot(admin, 'admin-events');
    await clickText(admin, 'Dừng hiển thị');
    await until(async () => (await fixture.db.query('SELECT status FROM events WHERE id = ?', [savedEvent.id]))[0]?.status === 'draft', 'Event did not stop');
    await until(() => evaluate(admin, "!document.querySelector('.admin-refresh').disabled"), 'Event stop did not finish');

    await adminTab('genres');
    await setValue(admin, '#admin-new-genre', 'Thể loại thử nghiệm');
    await clickText(admin, 'Thêm thể loại');
    await until(async () => (await fixture.db.query("SELECT name FROM genres WHERE name = 'Thể loại thử nghiệm'")).length === 1, 'Genre was not saved');
    await adminTab('homepage');
    await setValue(admin, '#admin-featured-novel', '1');
    assert.equal(await evaluate(admin, "localStorage.getItem('mugen_active_banner_id')"), '1');
    await waitSelector(admin, '.admin-featured-preview');

    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/mod/dashboard'] }, admin);
    await evaluate(admin, "document.querySelector('.admin-refresh').click();true");
    await waitSelector(admin, '.admin-notice');
    assert.equal(await evaluate(admin, "document.querySelector('[aria-label=\"Lọc tài khoản\"]').value"), 'pending', 'Existing filter should be retained after a network error');
    assert.equal(await evaluate(admin, "document.querySelector('#admin-panel-users .admin-empty') !== null"), false, 'A network error must not be presented as an empty list');
    await send('Network.setBlockedURLs', { urls: [] }, admin);
    await until(() => evaluate(admin, "!document.querySelector('.admin-notice button').disabled"), 'Admin retry stayed disabled');
    await evaluate(admin, "document.querySelector('.admin-notice button').click();true");
    await until(() => evaluate(admin, "!document.querySelector('.admin-notice') && !document.querySelector('.admin-refresh').disabled"), 'Admin retry failed');

    for (const theme of ['washi', 'sepia', 'charcoal']) {
        await evaluate(admin, `document.body.className='theme-${theme}';true`);
        for (const width of [1440, 992, 768, 390, 320]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 768 }, admin);
            await sleep(150);
            if (width <= 760) {
                await evaluate(admin, "document.querySelector('.admin-menu-toggle').click();true");
                await until(() => evaluate(admin, "document.querySelector('.admin-menu-toggle').getAttribute('aria-expanded')==='true'"), 'Mobile admin menu did not expand');
            }
            await adminTab('users');
            await setValue(admin, '[aria-label="Lọc tài khoản"]', 'all');
            const clipped = await evaluate(admin, `(() => {
                const root=document.querySelector('.admin-workspace').getBoundingClientRect();
                const controls=[...document.querySelectorAll('.admin-workspace button,.admin-workspace input,.admin-workspace select')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}).filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>${width}+.5}).map(e=>e.getAttribute('aria-label')||e.textContent.trim());
                return {rootClipped:root.left<-.5||root.right>${width}+.5,controls};
            })()`);
            assert.deepEqual(clipped, { rootClipped: false, controls: [] }, `Admin ${theme}, ${width}px`);
            if (width === 1440 || width === 390) await screenshot(admin, `admin-users-${theme}-${width}`);
        }
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, admin);
    await adminTab('events');
    await clickText(admin, 'Xem trước Sự kiện quản trị thử nghiệm');
    await waitSelector(admin, '.event-rich-content');
    assert.equal(await evaluate(admin, 'location.hash'), '#/event/' + savedEvent.id);
    await send('Page.reload', {}, admin);
    await waitSelector(admin, '.event-rich-content');
    assert.ok(await evaluate(admin, "document.querySelector('.event-rich-content').textContent.includes('Nội dung vẫn còn khi đổi tab.')"));
    await clickText(admin, '← Quay lại');
    await waitSelector(admin, '.admin-workspace');
    await evaluate(admin, "document.querySelector('.admin-sidebar-links a[href=\"#/manage-rules\"]').click();true");
    await waitSelector(admin, '.author-studio-container');
    assert.equal(await evaluate(admin, 'location.hash'), '#/manage-rules');
    await send('Page.reload', {}, admin);
    await waitSelector(admin, '.author-studio-container');
    await evaluate(admin, 'history.back();true');
    await waitSelector(admin, '.admin-workspace');
    await closePage(admin);
    console.log('PASS: admin sidebar, keyboard tabs, filters, pagination, author approval, event lifecycle, drafts, retry and responsive themes.');

    const signup = await newPage('#/', false);
    await waitSelector(signup, '.app-header');
    await clickText(signup, 'Đăng ký'); await waitSelector(signup, '#register-email');
    await setValue(signup, '.modal-body input[type=text]', 'browser_verified_reader');
    await setValue(signup, '.modal-body input[placeholder="Tên hiển thị..."]', 'Verified reader');
    await setValue(signup, '.modal-body input[type=password]', 'SecurePassword123!');
    await setValue(signup, '#register-email', 'browser-signup@example.test');
    await clickText(signup, 'Gửi mã xác thực');
    await until(() => evaluate(signup, "document.querySelector('#register-otp')?.value.length===6"), 'Development OTP did not reach the registration form');
    await clickText(signup, 'Đăng Ký Tài Khoản');
    await until(() => evaluate(signup, "JSON.parse(localStorage.getItem('mugen_session') || 'null')?.username==='browser_verified_reader'"), 'Verified registration did not sign in');
    const registered = await fixture.db.query('SELECT email, password FROM users WHERE username = ?', ['browser_verified_reader']);
    assert.equal(registered[0].email, 'browser-signup@example.test'); assert.notEqual(registered[0].password, 'SecurePassword123!');
    assert.equal(await evaluate(signup, "localStorage.getItem('mugen_token')"), null);
    assert.equal(await evaluate(signup, "document.cookie.includes('mugen_auth')"), false, 'Session cookie must be HttpOnly');
    const registeredId = await evaluate(signup, "JSON.parse(localStorage.getItem('mugen_session')).id");
    assert.equal(await evaluate(signup, `fetch('/api/auth/refresh/${registeredId}').then(response=>response.status)`), 200);
    await evaluate(signup, "document.querySelector('.app-header button[title=\"Đăng xuất\"]').click();true");
    await until(() => evaluate(signup, "localStorage.getItem('mugen_session')===null"), 'Logout did not clear the client session');
    assert.equal(await evaluate(signup, `fetch('/api/auth/refresh/${registeredId}').then(response=>response.status)`), 401);
    console.log('PASS: verified email registration and automatic sign-in');
    console.log('PASS: cookie authentication, no persisted browser token and server logout');
    assert.deepEqual(exceptions, [], 'Browser runtime exceptions');
    console.log('Browser smoke checks passed. Screenshots: artifacts/upgrades/');
} finally {
    if (socket?.readyState === WebSocket.OPEN) await send('Browser.close').catch(() => {});
    socket?.close();
    for (const channel of pageSockets.values()) channel.close();
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error('Browser closed')); }
    if (browser && browser.exitCode === null) { browser.kill(); await sleep(500); }
    // Only remove the temporary profile created by this test.
    if (path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith('mugenbunko-browser-')) {
        await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(() => {});
    }
    await fixture.close();
}
