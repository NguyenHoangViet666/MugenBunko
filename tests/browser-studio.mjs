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
const clickText = (sid, text) => evaluate(sid, `(() => { const scope = document.querySelector('[role=dialog]') || document; const button = [...scope.querySelectorAll('button')].find(b => b.getClientRects().length > 0 && b.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw Error('Missing button: ' + ${JSON.stringify(text)}); button.click(); return true; })()`);
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
        const directory = path.join(fixture.root, 'artifacts/studio'); await fs.mkdir(directory, { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png' }, sid);
        await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(data, 'base64'));
    };

    await fixture.db.query(`INSERT INTO chapters (id, novel_id, volume_name, title, content, status, scheduled_release, sort_order) VALUES
        (4, 1, 'Tập 02', 'Chương nháp Studio', '<p>Bản nháp ban đầu</p>', 'draft', NULL, 4),
        (5, 1, 'Tập 02', 'Chương có lịch Studio', '<p>Bản đã được duyệt</p>', 'scheduled', CURRENT_TIMESTAMP + INTERVAL 1 DAY, 5)`);
    const studio = await newPage('#/studio');
    const openChapter = async text => {
        await evaluate(studio, `(() => { const button = [...document.querySelectorAll('.studio-chapter-select')].find(b => b.textContent.includes(${JSON.stringify(text)})); if (!button) throw Error('Missing chapter'); button.click(); return true; })()`);
        await until(() => evaluate(studio, "document.querySelector('.studio-content')?.contentEditable === 'true' && !document.querySelector('.studio-content')?.getAttribute('aria-busy')?.includes('true')"), 'Chapter did not become editable');
    };
    const typeContent = content => evaluate(studio, `(() => { const editor = document.querySelector('.studio-content'); editor.innerHTML = ${JSON.stringify(content)}; editor.dispatchEvent(new Event('input', {bubbles:true})); return true; })()`);
    const ctrlS = () => evaluate(studio, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}));true");
    await waitSelector(studio, '.studio-novel-select');
    await evaluate(studio, "document.querySelector('.studio-novel-select').click();true");
    await waitSelector(studio, '.studio-chapter-select');
    await openChapter('Một lá thư');
    await typeContent('<p>Bản sửa đang viết chưa công khai.</p>');
    await evaluate(studio, `window.originalStudioEditor = document.querySelector('.studio-content');
        window.originalStudioEditor.focus(); const range = document.createRange(); range.setStart(window.originalStudioEditor.firstChild.firstChild, 3); range.setEnd(window.originalStudioEditor.firstChild.firstChild, 6);
        window.getSelection().removeAllRanges(); window.getSelection().addRange(range); window.originalStudioSelection = window.getSelection().toString(); true`);
    await clickText(studio, 'Xem trước'); await waitSelector(studio, '.studio-reader-preview');
    assert.match(await evaluate(studio, "document.querySelector('.studio-reader-preview').textContent"), /chưa công khai/);
    await clickText(studio, 'Tiếp tục viết');
    assert.equal(await evaluate(studio, 'window.originalStudioEditor === document.querySelector(".studio-content")'), true);
    await until(() => evaluate(studio, 'window.getSelection().toString() === window.originalStudioSelection'), 'Preview did not restore text selection');
    await ctrlS();
    assert.doesNotMatch((await fixture.db.query('SELECT content FROM chapters WHERE id=1'))[0].content, /chưa công khai/);
    await openChapter('Khu vườn'); await openChapter('Một lá thư');
    assert.match(await evaluate(studio, "document.querySelector('.studio-content').textContent"), /chưa công khai/);
    console.log('PASS: preview preserves the editor; published edits stay local and survive chapter switches');

    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/chapters'] }, studio);
    await clickText(studio, 'Cập nhật chương'); await waitSelector(studio, '.studio-error');
    assert.match(await evaluate(studio, "document.querySelector('.studio-content').textContent"), /chưa công khai/);
    assert.ok(await evaluate(studio, "localStorage.getItem('mugen_studio_draft_2_1')"));
    await send('Network.setBlockedURLs', { urls: [] }, studio);
    await clickText(studio, 'Cập nhật chương');
    await until(async () => (await fixture.db.query('SELECT content FROM chapters WHERE id=1'))[0].content.includes('chưa công khai'), 'Published update did not persist');
    assert.equal((await fixture.db.query('SELECT status FROM chapters WHERE id=1'))[0].status, 'published');
    await until(() => evaluate(studio, "!document.querySelector('.studio-error')"), 'Successful save did not clear error');
    console.log('PASS: failed publication keeps input and backup; retry updates the live chapter without hiding it');

    await openChapter('Chương nháp Studio');
    await typeContent('<p>Nội dung lưu bằng bàn phím.</p>'); await ctrlS();
    await until(async () => (await fixture.db.query('SELECT content FROM chapters WHERE id=4'))[0].content.includes('bàn phím'), 'Ctrl+S did not save draft');
    await until(() => evaluate(studio, "!document.querySelector('.studio-unsaved')"), 'Draft did not show saved status');
    await typeContent('<p>Bản trên máy trước khi tải lại.</p>');
    await evaluate(studio, "window.dispatchEvent(new Event('pagehide'));true");
    await send('Page.reload', {}, studio);
    await waitSelector(studio, '.studio-editor-empty');
    await clickText(studio, 'Tiếp tục bản thảo gần nhất');
    await until(() => evaluate(studio, "document.querySelector('.studio-content')?.textContent.includes('trước khi tải lại')"), 'Reload did not restore local draft');
    await evaluate(studio, "document.querySelector('.studio-content').focus();document.execCommand('insertText',false,' Phần còn lại.');true");
    console.log('PASS: keyboard save persists to MySQL and a reload recovers the unsaved local draft');

    // A second tab/device changes the server while this editor keeps its original baseline.
    await fixture.db.query("UPDATE chapters SET content='<p>Thay đổi từ tab khác</p>' WHERE id=4");
    await clickText(studio, 'Lưu nháp'); await waitSelector(studio, '.studio-error');
    assert.match((await fixture.db.query('SELECT content FROM chapters WHERE id=4'))[0].content, /tab khác/);
    await clickText(studio, 'Tải lại để đối chiếu'); await waitSelector(studio, '.studio-recovery');
    await clickText(studio, 'Tiếp tục bản trên máy'); await clickText(studio, 'Lưu nháp');
    await until(async () => (await fixture.db.query('SELECT content FROM chapters WHERE id=4'))[0].content.includes('trước khi tải lại'), 'Conflict resolution did not preserve chosen draft');
    await until(() => evaluate(studio, "!document.querySelector('.studio-unsaved')"), 'Resolved draft not saved');
    console.log('PASS: stale writes are rejected and the author can explicitly continue the recovered local draft');

    await evaluate(studio, `window.originalStudioFetch = window.fetch; window.fetch = async (...args) => {
        if (String(args[0]).endsWith('/api/chapters') && args[1]?.method === 'POST') await new Promise(resolve => setTimeout(resolve, 650));
        return window.originalStudioFetch(...args);
    };true`);
    await typeContent('<p>Bản gửi đi trước.</p>'); await ctrlS();
    await typeContent('<p>Phần gõ thêm trong khi đang lưu.</p>');
    await until(async () => (await fixture.db.query('SELECT content FROM chapters WHERE id=4'))[0].content.includes('gửi đi trước'), 'Delayed save did not arrive');
    await until(() => evaluate(studio, "!document.querySelector('.studio-editor-footer .primary-btn').disabled"), 'Delayed save did not finish');
    assert.match(await evaluate(studio, "document.querySelector('.studio-content').textContent"), /gõ thêm/);
    assert.match(await evaluate(studio, "JSON.parse(localStorage.getItem('mugen_studio_draft_2_4')).content"), /gõ thêm/);
    await evaluate(studio, 'window.fetch = window.originalStudioFetch;true');
    await ctrlS();
    await until(async () => (await fixture.db.query('SELECT content FROM chapters WHERE id=4'))[0].content.includes('gõ thêm'), 'Newer typing did not save');
    await until(() => evaluate(studio, "!document.querySelector('.studio-unsaved')"), 'Newer typing stayed dirty');

    await typeContent('<p>Bản có thể mở khi mất mạng.</p>');
    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/chapters/4'] }, studio);
    await openChapter('Một lá thư'); await openChapter('Chương nháp Studio');
    assert.match(await evaluate(studio, "document.querySelector('.studio-content').textContent"), /mất mạng/);
    await send('Network.setBlockedURLs', { urls: [] }, studio);
    await clickText(studio, 'Tải lại để đối chiếu');
    await until(() => evaluate(studio, "!document.querySelector('.studio-error')"), 'Chapter did not reconnect');
    await ctrlS();
    await until(async () => (await fixture.db.query('SELECT content FROM chapters WHERE id=4'))[0].content.includes('mất mạng'), 'Offline draft did not save after reconnecting');
    await until(() => evaluate(studio, "!document.querySelector('.studio-unsaved')"), 'Offline draft stayed dirty');
    console.log('PASS: typing during a save stays in the editor and local backup; a chapter can reopen offline from its backup');

    await clickText(studio, 'Hẹn giờ đăng'); await waitSelector(studio, 'input[type=datetime-local]');
    await setValue(studio, 'input[type=datetime-local]', '2020-01-01T12:00');
    await clickText(studio, 'Gửi duyệt kèm lịch đăng');
    assert.match(await evaluate(studio, "document.querySelector('.studio-dialog').textContent"), /tương lai/);
    const future = new Date(Date.now() + 86400000); const datetime = new Date(future.getTime() - future.getTimezoneOffset()*60000).toISOString().slice(0,16);
    await setValue(studio, 'input[type=datetime-local]', datetime); await clickText(studio, 'Gửi duyệt kèm lịch đăng');
    await until(() => evaluate(studio, "!document.querySelector('.studio-dialog')"), 'Schedule dialog did not close');
    const pendingChapter = (await fixture.db.query('SELECT status,scheduled_release FROM chapters WHERE id=4'))[0];
    assert.equal(pendingChapter.status, 'pending'); assert.ok(pendingChapter.scheduled_release);
    await openChapter('Chương có lịch Studio'); await typeContent('<p>Chỉnh sửa trên máy, lịch vẫn còn.</p>');
    const scheduledBefore = (await fixture.db.query('SELECT scheduled_release FROM chapters WHERE id=5'))[0].scheduled_release;
    await sleep(31000);
    const scheduledAfter = (await fixture.db.query('SELECT status,scheduled_release,content FROM chapters WHERE id=5'))[0];
    assert.equal(scheduledAfter.status, 'scheduled'); assert.equal(+scheduledAfter.scheduled_release, +scheduledBefore);
    assert.doesNotMatch(scheduledAfter.content, /lịch vẫn còn/);
    await clickText(studio, 'Lưu thay đổi');
    await until(async () => (await fixture.db.query('SELECT content FROM chapters WHERE id=5'))[0].content.includes('lịch vẫn còn'), 'Scheduled edit did not save');
    assert.equal((await fixture.db.query('SELECT status FROM chapters WHERE id=5'))[0].status, 'scheduled');
    console.log('PASS: scheduling validates future times, requires approval, and a full autosave interval preserves approved schedules');

    await evaluate(studio, "document.querySelector('button[aria-label=\"Đổi tên Tập 02\"]').click();true");
    await waitSelector(studio, '.studio-dialog input'); await setValue(studio, '.studio-dialog input', 'Tập 02: Hành trình');
    await clickText(studio, 'Lưu thay đổi'); await until(() => evaluate(studio, "!document.querySelector('.studio-dialog')"), 'Volume rename did not finish');
    assert.equal((await fixture.db.query('SELECT volume_name FROM chapters WHERE id=5'))[0].volume_name, 'Tập 02: Hành trình');
    await evaluate(studio, "document.querySelector('input[aria-label=\"Chọn Chương nháp Studio\"]').click();true");
    await clickText(studio, 'Chuyển 1 chương'); await waitSelector(studio, '.studio-dialog input');
    await setValue(studio, '.studio-dialog input', 'Tập 03'); await clickText(studio, 'Lưu thay đổi');
    await until(async () => (await fixture.db.query('SELECT volume_name FROM chapters WHERE id=4'))[0].volume_name === 'Tập 03', 'Bulk move did not persist');
    await until(() => evaluate(studio, "!document.querySelector('.studio-dialog')"), 'Move dialog did not close');
    await evaluate(studio, "document.querySelector('button[aria-label=\"Đưa Chương có lịch Studio lên\"]').click();true");
    await until(async () => (await fixture.db.query('SELECT id FROM chapters WHERE novel_id=1 ORDER BY sort_order,id'))[1]?.id === 5, 'Chapter reorder did not persist');
    await setValue(studio, 'input[type=search]', 'Không có chương này'); await waitSelector(studio, '.studio-tree-empty');
    await clickText(studio, 'Xóa bộ lọc'); await waitSelector(studio, '.studio-chapter-select');
    console.log('PASS: volume rename, bulk move, chapter ordering and empty search all use persisted data');

    for (const theme of ['washi', 'sepia', 'charcoal']) {
        await evaluate(studio, `document.body.className = 'theme-${theme}';true`);
        for (const width of [1440, 390]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 }, studio);
            await sleep(200);
            assert.ok(await evaluate(studio, `(() => { const panel = document.querySelector('.studio-editor-panel').getBoundingClientRect(); return panel.left >= 0 && panel.right <= ${width}+.5; })()`), `Studio clipped at ${width} in ${theme}`);
            await screenshot(studio, `studio-${theme}-${width}`);
            if (width === 390) {
                await evaluate(studio, "document.querySelector('.studio-editor-panel').scrollIntoView({block:'start'});true");
                await screenshot(studio, `studio-${theme}-mobile-editor`);
                await evaluate(studio, "window.scrollTo({top:0,behavior:'instant'});true");
            }
        }
    }
    await clickText(studio, 'Tập trung viết');
    assert.equal(await evaluate(studio, "getComputedStyle(document.querySelector('.studio-sidebar')).display"), 'none');
    await clickText(studio, 'Thoát tập trung');
    assert.equal(exceptions.length, 0, exceptions.join('\n'));
    await closePage(studio);
    console.log('PASS: Studio renders in all three themes at desktop/mobile widths, with focus mode and no runtime exceptions');
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
