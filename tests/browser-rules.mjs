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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, method === 'Page.captureScreenshot' ? 45000 : 15000);
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
        const documentState = await evaluate(sid, '({url:location.href,state:document.readyState,html:document.documentElement.outerHTML.slice(0,1600)})').catch(() => null);
        throw new Error(`${error.message}\nPage content: ${body}\nDocument: ${JSON.stringify(documentState)}\nRuntime exceptions: ${JSON.stringify(exceptions)}`, { cause: error });
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
        const directory = path.join(fixture.root, 'artifacts/rules'); await fs.mkdir(directory, { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sid);
        await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(data, 'base64'));
    };

    const api = async (route, method = 'GET', body) => {
        const response = await fetch(fixture.url + '/api' + route, { method, headers: { Authorization: `Bearer ${fixture.token(2)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, data: await response.json() };
    };
    const checkWidths = async (sid, name) => {
        for (const width of [1440, 1024, 768, 390, 320]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 768 }, sid);
            await sleep(120);
            assert.ok(await evaluate(sid, 'document.documentElement.scrollWidth <= innerWidth'), `${name} horizontal overflow at ${width}`);
            const clipped = await evaluate(sid, `(() => [...document.querySelectorAll('.rules-page button,.rules-page input,.rules-page textarea,.rules-page a')].filter(e=>e.getClientRects().length).filter(e=>e.getBoundingClientRect().left<-.5||e.getBoundingClientRect().right>innerWidth+.5).map(e=>e.textContent||e.id))()`);
            assert.deepEqual(clipped, [], `${name} clipped controls at ${width}`);
            if ([1440, 390].includes(width)) { await evaluate(sid, 'window.scrollTo(0,0);true'); await screenshot(sid, `${name}-${width}`); }
        }
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sid);
    };
    const guest = await newPage('#/rules', false);
    await waitSelector(guest, '.rule-article');
    assert.equal(await evaluate(guest, 'location.hash'), '#/rules');
    assert.equal(await evaluate(guest, `document.querySelector('a[href="#/manage-rules"]')`), null);
    const originalRules = (await api('/policies')).data;
    assert.equal(originalRules.length, 25);
    assert.equal(await evaluate(guest, "document.querySelectorAll('.rule-article').length"), originalRules.length);
    assert.equal(await evaluate(guest, "document.querySelectorAll('.rules-toc a').length"), 25);
    assert.ok(await evaluate(guest, "document.querySelectorAll('.rule-clause h3').length >= 75"));
    for (const theme of ['washi', 'sepia', 'charcoal']) {
        await evaluate(guest, `document.body.className='theme-${theme}';true`);
        await checkWidths(guest, `public-${theme}`);
    }
    await setValue(guest, '#rules-search', 'dung luong va dinh dang');
    await until(() => evaluate(guest, "document.querySelectorAll('.rule-article').length===1"), 'Accent-insensitive search failed');
    await setValue(guest, '#rules-search', 'zzzzzz-nothing');
    await waitSelector(guest, '.rules-document .rules-empty');
    await clickText(guest, 'Xóa tìm kiếm');
    await waitSelector(guest, '.rule-article');
    const sectionId = originalRules[1].id;
    await evaluate(guest, `document.querySelector('.rules-toc a[href="#/rules?section=${sectionId}"]').click();true`);
    await until(() => evaluate(guest, `document.activeElement.closest('article')?.id==='rule-${sectionId}'`), 'Section link did not focus the heading');
    await send('Page.reload', {}, guest);
    await waitSelector(guest, `#rule-${sectionId}`);
    assert.equal(await evaluate(guest, 'location.hash'), `#/rules?section=${sectionId}`);
    await evaluate(guest, "location.hash='#/';true");
    await waitSelector(guest, '.app-footer a[href="#/rules"]');
    await evaluate(guest, "document.querySelector('.app-footer a[href=\"#/rules\"]').click();true");
    await waitSelector(guest, '.rules-toc');
    assert.equal(await evaluate(guest, 'location.hash'), '#/rules');
    await send('Network.setBlockedURLs', { urls: ['*/api/policies*'] }, guest);
    await send('Page.reload', {}, guest);
    await waitSelector(guest, '.rules-page .load-error-card');
    assert.equal(await evaluate(guest, 'document.querySelector(".rules-empty")'), null);
    await send('Network.setBlockedURLs', { urls: [] }, guest);
    await clickText(guest, 'Thử lại');
    await waitSelector(guest, '.rule-article');
    console.log('PASS: public routes, footer, deep links, search, load failure/retry and three themes at 320–1440px');

    await fixture.db.query("INSERT INTO user_roles (user_id, role) VALUES (2, 'admin')");
    fixture.user.roles.push('admin');
    const admin = await newPage('#/manage-rules');
    await waitSelector(admin, '.rules-list-item');
    await clickText(admin, 'Thêm mới');
    const title = 'Điều khoản kiểm thử giao diện';
    const content = 'Đoạn đầu: tôn trọng mọi người.\nMột dòng tiếp theo.\n\nĐoạn hai. <img src=x onerror=alert(1)>';
    await setValue(admin, '#rule-title', title); await setValue(admin, '#rule-content', content); await setValue(admin, '#rule-order', '15');
    await evaluate(admin, 'window.__ruleInput=document.querySelector("#rule-content");true');
    await clickText(admin, 'Xem trước');
    assert.equal(await evaluate(admin, 'document.querySelector(".rules-preview .rule-prose").textContent'), content.replace('\n\n', ''));
    assert.equal(await evaluate(admin, 'document.querySelector(".rules-preview img")'), null);
    await screenshot(admin, 'admin-preview');
    await clickText(admin, 'Soạn thảo');
    assert.equal(await evaluate(admin, 'window.__ruleInput===document.querySelector("#rule-content")'), true);
    assert.ok(!(await api('/policies')).data.some(rule => rule.title === title), 'Local draft leaked publicly');
    await evaluate(admin, `document.querySelector('.rules-heading a[href="#/rules"]').click();true`);
    await waitSelector(admin, '.rules-toc');
    await evaluate(admin, `document.querySelector('.rules-heading a[href="#/manage-rules"]').click();true`);
    await waitSelector(admin, '#rule-content');
    assert.equal(await evaluate(admin, 'document.querySelector("#rule-content").value'), content);
    await send('Page.reload', {}, admin);
    await waitSelector(admin, '#rule-content');
    assert.equal(await evaluate(admin, 'document.querySelector("#rule-content").value'), content);
    await evaluate(admin, 'document.querySelector(".rules-list-item").click();true');
    await until(() => evaluate(admin, 'document.activeElement.closest("[role=dialog]")!==null'), 'Confirmation did not receive keyboard focus');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 }, admin);
    assert.equal(await evaluate(admin, 'document.activeElement.textContent.trim()'), 'Đồng ý');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, admin);
    await until(() => evaluate(admin, `!document.querySelector('[aria-label="Xác nhận thao tác"]')`), 'Escape did not close confirmation');
    await evaluate(admin, 'document.querySelector(".rules-list-item").click();true');
    await clickText(admin, 'Hủy bỏ');
    assert.equal(await evaluate(admin, 'document.querySelector("#rule-title").value'), title);
    await send('Network.setBlockedURLs', { urls: ['*/api/admin/rules*'] }, admin);
    await clickText(admin, 'Công bố điều khoản');
    await waitSelector(admin, '.rules-form-error');
    assert.equal(await evaluate(admin, 'document.querySelector("#rule-content").value'), content);
    await send('Network.setBlockedURLs', { urls: [] }, admin);
    await evaluate(admin, 'document.querySelector(".rules-editor form").requestSubmit();document.querySelector(".rules-editor form").requestSubmit();true');
    await until(() => evaluate(admin, 'document.querySelector(".rules-draft-status")?.textContent==="Đã công bố"'), 'Publishing failed');
    let published = (await api('/policies')).data.filter(rule => rule.title === title);
    assert.equal(published.length, 1, 'Duplicate publication');
    assert.equal(published[0].content, content);
    assert.equal(await evaluate(admin, 'localStorage.getItem("mugen_rule_draft:2")'), null);
    for (const theme of ['washi', 'charcoal']) {
        await evaluate(admin, `document.body.className='theme-${theme}';true`);
        await checkWidths(admin, `admin-${theme}`);
    }
    console.log('PASS: private draft/preview, input preservation, reload/navigation recovery, failed publication/retry and duplicate-submit guard');

    const base = published[0];
    await setValue(admin, '#rule-content', 'Bản đang soạn trên trình duyệt');
    const remote = await api(`/admin/rules/${base.id}`, 'PUT', { title: base.title, content: 'Bản mới từ quản trị viên khác', orderIndex: base.order_index, baseRule: base });
    assert.equal(remote.status, 200);
    await clickText(admin, 'Công bố thay đổi');
    await waitSelector(admin, '.rules-form-error button');
    assert.equal(await evaluate(admin, 'document.querySelector("#rule-content").value'), 'Bản đang soạn trên trình duyệt');
    await clickText(admin, 'Nạp bản mới từ máy chủ');
    await clickText(admin, 'Đồng ý');
    await until(() => evaluate(admin, `document.querySelector('#rule-content')?.value==='Bản mới từ quản trị viên khác'`), 'Conflict recovery failed');
    await clickText(admin, 'Xóa điều khoản'); await clickText(admin, 'Hủy bỏ');
    assert.ok((await api('/policies')).data.some(rule => rule.id === base.id));
    await clickText(admin, 'Xóa điều khoản'); await clickText(admin, 'Đồng ý');
    await until(() => evaluate(admin, 'document.querySelector("#rule-content")===null'), 'Delete did not close the editor');
    assert.ok(!(await api('/policies')).data.some(rule => rule.id === base.id));
    await fixture.db.query('DELETE FROM `rules`');
    await send('Page.reload', {}, guest);
    await waitSelector(guest, '.rules-empty');
    assert.match(await evaluate(guest, 'document.querySelector(".rules-empty").textContent'), /Chưa có quy định được công bố/);
    console.log('PASS: concurrent-edit conflict, explicit replacement, delete confirmation and genuine empty state');
    assert.deepEqual(exceptions, [], 'Browser runtime exceptions');
    await closePage(guest); await closePage(admin);
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
