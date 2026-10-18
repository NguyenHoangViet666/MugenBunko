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
const fixture = await startFixture({ webRoot: path.resolve('mobile/dist') });
await fixture.db.query("INSERT INTO user_roles (user_id, role) VALUES (2, 'admin')");
fixture.user.roles.push('admin');
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'mugenbunko-browser-'));
let browser;
let socket;
const pending = new Map();
const exceptions = [];
const networkRequests = new Map();
const networkFailures = [];
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
        throw new Error(`${error.message}\nPage content: ${body}`, { cause: error });
    }
};
const clickText = (sid, text) => evaluate(sid, `(() => { const button = [...document.querySelectorAll('button,[role=button]')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw Error('Missing button: ' + ${JSON.stringify(text)}); button.click(); return true; })()`);
const setValue = async (sid, selector, value) => { await evaluate(sid, `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw Error('Missing field'); const proto = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); return true; })()`); await sleep(150); };

try {
    await new Promise((resolve, reject) => {
        const build = spawn(process.execPath, ['node_modules/expo/bin/cli', 'export', '--platform', 'web', '--max-workers', '2', '--clear'], { cwd: path.resolve('mobile'), env: { ...process.env, EXPO_PUBLIC_API_URL: fixture.url }, windowsHide: true, stdio: 'inherit' });
        build.on('error', reject); build.on('exit', code => code === 0 ? resolve() : reject(new Error(`Expo export failed: ${code}`)));
    });
    const bundleDirectory = path.resolve('mobile/dist/_expo/static/js/web');
    const bundles = await fs.readdir(bundleDirectory);
    assert.ok((await Promise.all(bundles.filter(name => name.endsWith('.js')).map(name => fs.readFile(path.join(bundleDirectory, name), 'utf8')))).some(bundle => bundle.includes(fixture.url)), 'Export did not embed the current test API URL');
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
        if (data.method === 'Network.requestWillBeSent') networkRequests.set(data.params.requestId, data.params.request.url);
        if (data.method === 'Network.loadingFailed') networkFailures.push({ url: networkRequests.get(data.params.requestId), error: data.params.errorText });
        if (data.method === 'Network.responseReceived' && data.params.response.status >= 400) networkFailures.push({ url: data.params.response.url, status: data.params.response.status });
        if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
        const task = pending.get(data.id); if (!task) return;
        clearTimeout(task.timer); pending.delete(data.id);
        if (data.error) task.reject(new Error(data.error.message)); else task.resolve(data.result);
    };
    socket.addEventListener('message', onMessage);
    const newPage = async (hash, authenticated = true, width = 390) => {
        const { browserContextId } = await send('Target.createBrowserContext');
        const { targetId } = await send('Target.createTarget', { url: fixture.url, browserContextId });
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
        await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
        if (authenticated) await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(window.top===window){localStorage.setItem('mugen_session',${JSON.stringify(JSON.stringify(fixture.user))});localStorage.setItem('mugen_mobile_token',${JSON.stringify(fixture.token(2))});}` }, sessionId);
        // A query change forces a new document so the account seeding script runs.
        await send('Page.navigate', { url: fixture.url + hash + (hash.includes('?') ? '&' : '?') + 'smoke=' + targetId }, sessionId);
        return sessionId;
    };
    const closePage = async sid => {
        await send('Target.disposeBrowserContext', { browserContextId: pageContexts.get(sid) });
        pageSockets.get(sid)?.close(); pageSockets.delete(sid); pageContexts.delete(sid);
    };
    const screenshot = async (sid, name) => {
        if (name === 'library') { await evaluate(sid, "window.scrollTo({top:0,behavior:'instant'});true"); await sleep(150); }
        const directory = path.join(fixture.root, 'artifacts/mobile'); await fs.mkdir(directory, { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png' }, sid);
        await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(data, 'base64'));
    };

    const waitText = (sid, text) => until(() => evaluate(sid, `(document.body?.innerText || "").includes(${JSON.stringify(text)})`), `Missing text: ${text}`, 45000);
    const go = async (sid, route, text) => { await send('Page.navigate', { url: fixture.url + route }, sid); await waitText(sid, text); };
    let phone = await newPage('/profile');
    await waitText(phone, 'Studio tác giả');
    await screenshot(phone, 'profile');
    assert.ok(await evaluate(phone, 'document.documentElement.scrollWidth <= 392'), 'Profile overflows phone width');
    await go(phone, '/collections', '+ Tạo kệ sách');
    await clickText(phone, '+ Tạo kệ sách');
    await setValue(phone, '[aria-label="Tên kệ"]', 'Mobile UI shelf');
    await clickText(phone, 'Lưu kệ');
    await until(async () => (await fixture.db.query("SELECT id FROM library_collections WHERE name = 'Mobile UI shelf'")).length === 1, 'Collection was not saved');
    await screenshot(phone, 'collections');
    await go(phone, '/studio', '+ Tác phẩm mới');
    await clickText(phone, '+ Tác phẩm mới');
    await setValue(phone, '[aria-label="Tên tác phẩm"]', 'Mobile UI novel');
    await clickText(phone, 'Tạo tác phẩm');
    await waitText(phone, '+ Viết chương');
    await clickText(phone, '+ Viết chương');
    await waitSelector(phone, '[aria-label="Tiêu đề chương"]');
    await setValue(phone, '[aria-label="Tiêu đề chương"]', 'Mobile UI chapter');
    await waitSelector(phone, 'iframe[title="Nội dung chương"]');
    await sleep(500);
    await evaluate(phone, `document.querySelector('iframe[title="Nội dung chương"]').contentWindow.postMessage({type:'focus'},'*');true`);
    await sleep(300);
    await send('Input.insertText', { text: 'A chapter written from the mobile user interface.' }, phone);
    await sleep(300);
    await clickText(phone, 'Lưu nháp');
    await until(async () => (await fixture.db.query("SELECT id FROM chapters WHERE title = 'Mobile UI chapter'")).length === 1, 'Chapter was not saved');
    await screenshot(phone, 'studio-editor');
    await go(phone, '/community', 'Viết bài');
    await clickText(phone, 'Viết bài');
    await setValue(phone, '[aria-label="Tiêu đề"]', 'Mobile UI post');
    await setValue(phone, '[aria-label="Nội dung"]', 'A post from a phone viewport.');
    await clickText(phone, 'Đăng bài');
    await until(async () => (await fixture.db.query("SELECT id FROM forum_posts WHERE title = 'Mobile UI post'")).length === 1, 'Forum post was not saved');
    await screenshot(phone, 'community');
    await fixture.db.query("INSERT INTO friends (user_id_1, user_id_2, status) VALUES (2, 3, 'accepted')");
    await go(phone, '/chat/3?name=Test%20friend', 'Tin nhắn');
    await setValue(phone, '[aria-label="Tin nhắn"]', 'Hello from mobile UI');
    await clickText(phone, 'Gửi');
    await until(async () => (await fixture.db.query("SELECT id FROM messages WHERE message_text = 'Hello from mobile UI'")).length === 1, 'Chat message was not sent');
    await screenshot(phone, 'chat');
    await go(phone, '/moderation', 'Quản trị hệ thống');
    await clickText(phone, 'Người dùng');
    await waitText(phone, '@upgrade_reader');
    await screenshot(phone, 'moderation');
    await go(phone, '/reader/1/0', 'Một lá thư mùa xuân');
    await until(() => evaluate(phone, "Boolean(localStorage.getItem('mugen_progress_2'))"), 'Reader not initialized', 45000);
    await sleep(1200);
    await evaluate(phone, `(() => { const scroller = [...document.querySelectorAll('div')].find(e => e.scrollHeight > e.clientHeight + 2000 && ['auto','scroll'].includes(getComputedStyle(e).overflowY)); if (!scroller) throw Error('No reader scroller'); scroller.scrollTop = scroller.scrollHeight * 0.5; return true; })()`);
    await until(async () => (await fixture.db.query('SELECT paragraph_index FROM reading_progress WHERE user_id = 2 AND novel_id = 1'))[0]?.paragraph_index > 10, 'Reader progress not synced', 45000);
    await screenshot(phone, 'reader');
    const position = (await fixture.db.query('SELECT paragraph_index FROM reading_progress WHERE user_id = 2 AND novel_id = 1'))[0].paragraph_index;
    await closePage(phone);
    const secondPhone = await newPage('/reader/1/0');
    await waitText(secondPhone, 'Một lá thư mùa xuân');
    await until(() => evaluate(secondPhone, "JSON.parse(localStorage.getItem('mugen_progress_2') || '[]')[0]?.paragraphIndex > 10"), 'Second phone did not restore synced progress', 45000);
    const resumed = await evaluate(secondPhone, "JSON.parse(localStorage.getItem('mugen_progress_2'))[0]");
    assert.ok(Math.abs(resumed.paragraphIndex - position) <= 1, 'Different-device paragraph restoration drifted');
    await closePage(secondPhone);
    phone = await newPage('/library');
    await waitText(phone, 'TỦ SÁCH CỦA TÔI');
    await evaluate(phone, `(() => { const item = [...document.querySelectorAll('div')].find(e => e.childElementCount === 0 && e.textContent.startsWith('Yêu thích (')); if (!item) throw Error('Bookmark tab missing'); item.click(); return true; })()`);
    await waitText(phone, 'Những ngày dưới tán anh đào');
    await screenshot(phone, 'library');
    await go(phone, '/explore', 'Mọi trạng thái');
    await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: true }, phone);
    await sleep(500);
    assert.ok(await evaluate(phone, 'document.documentElement.scrollWidth <= 770'), 'Tablet grid overflows');
    await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 1, mobile: true }, phone);
    await sleep(500);
    assert.ok(await evaluate(phone, 'document.documentElement.scrollWidth <= 322'), 'Small-phone grid overflows');
    await screenshot(phone, 'explore-small');

    assert.deepEqual(exceptions, [], 'Mobile browser runtime exceptions');
    console.log('PASS: mobile profile, collections, Studio draft, forum posting, chat, administration and reader sync. Screenshots: artifacts/mobile/');
} catch (error) {
    console.error('NETWORK DEBUG:', networkFailures);
    for (const sid of pageSockets.keys()) console.error('PAGE DEBUG:', await evaluate(sid, "document.body?.innerText?.slice(0, 2500)").catch(() => 'unavailable'));
    throw error;
} finally {
    for (const browserContextId of pageContexts.values()) await send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
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
