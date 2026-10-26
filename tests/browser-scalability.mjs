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
const requests = [];
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
        if (data.method === 'Network.requestWillBeSent' && data.params.request.url.includes('/api/')) requests.push(data.params.request.url);
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
        await send('Page.bringToFront', {}, sessionId);
        await send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId);
        return sessionId;
    };
    const closePage = async sid => {
        await send('Target.disposeBrowserContext', { browserContextId: pageContexts.get(sid) });
        pageSockets.get(sid)?.close(); pageSockets.delete(sid); pageContexts.delete(sid);
    };

    for (let index = 0; index < 125; index++) {
        const id = 100 + index;
        await fixture.db.query('INSERT INTO novels (id,title,author_id,genre,summary,type,status,\u0060reads\u0060) VALUES (?,?,?,?,?,?,?,?)',
            [id, 'Scale story ' + index, 2, index === 124 ? 'Romance' : 'Fantasy', 'A story in the library.', 'series', 'ongoing', index]);
        const chapters = index === 124 ? 30 : 3;
        for (let chapter = 0; chapter < chapters; chapter++) await fixture.db.query("INSERT INTO chapters (novel_id,volume_name,title,content,status,sort_order) VALUES (?,'Volume',?,'<p>A chapter for reading.</p>','published',?)", [id, 'Chapter ' + (chapter + 1), chapter]);
    }
    for (let index = 0; index < 45; index++) await fixture.db.query("INSERT INTO forum_posts (title,content,author_id,category) VALUES (?, 'Discussion content',2,'general')", ['Scale discussion ' + index]);
    await fixture.db.query("INSERT INTO friends (user_id_1,user_id_2,status) VALUES (2,3,'accepted')");
    const page = await newPage('#/', false);
    await waitSelector(page, '.featured-banner');
    await until(() => evaluate(page, '!document.getElementById("startup-preloader")'), 'Startup did not finish');
    assert.ok(requests.some(url => url.includes('/novels/home')), 'Home did not use its bounded feed');
    assert.equal(requests.filter(url => /\/api\/novels\?/.test(url)).length, 0, 'Home exhausted the legacy catalog');
    const navigate = async hash => { await evaluate(page, 'location.hash=' + JSON.stringify(hash) + ';true'); };
    await navigate('#/explore');
    await until(() => evaluate(page, 'document.querySelectorAll(".novel-card-v2").length===12'), 'Explore did not render 12 cards');
    const first = await evaluate(page, '[...document.querySelectorAll(".novel-card-title-v2")].map(e=>e.textContent)');
    await evaluate(page, '[...document.querySelectorAll(".explore-pagination-bar button")].find(b=>b.textContent.trim()==="2").click();true');
    await until(async () => {
        const next = await evaluate(page, '[...document.querySelectorAll(".novel-card-title-v2")].map(e=>e.textContent)');
        return next.length === 12 && next.every(title => !first.includes(title));
    }, 'Explore page 2 was not distinct');
    await evaluate(page, '(()=>{const s=[...document.querySelectorAll(".explore-filter-bar select")].find(s=>[...s.options].some(o=>o.value==="Romance"));s.value="Romance";s.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
    await until(() => evaluate(page, 'document.querySelectorAll(".novel-card-v2").length===1 && document.querySelector(".novel-card-title-v2")?.textContent.includes("Scale story 124")'), 'Genre filtering missed a title outside the first legacy page');
    await evaluate(page, 'document.querySelector(".novel-card-v2").click();true');
    await waitSelector(page, '.detail-actions');
    assert.ok(requests.some(url => url.includes('/novels/224')), 'Details did not load full metadata');
    assert.equal((await (await fetch(fixture.url + '/api/novels/224')).json()).chapters.length, 30);
    await navigate('#/forum');
    await until(() => evaluate(page, 'document.querySelectorAll(".social-posts-stream .social-post-title").length===20'), 'Forum did not render a 20-item feed');
    await evaluate(page, '[...document.querySelectorAll(".forum-feed-pagination button")].find(b=>b.textContent.includes("Trang sau")).click();true');
    await until(() => evaluate(page, 'document.querySelector(".forum-feed-pagination")?.textContent.includes("Trang 2") && document.querySelectorAll(".social-posts-stream .social-post-title").length===20'), 'Forum page 2 failed');
    console.log('PASS: bounded Home, 12-card catalog, global genre filter, full details and 20-post forum pagination');
    const directory = path.join(fixture.root, 'artifacts/scalability'); await fs.mkdir(directory, { recursive: true });
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, page);
    await sleep(300);
    assert.ok(await evaluate(page, 'document.documentElement.scrollWidth <= innerWidth+1'), 'Narrow forum overflow');
    const shot = await send('Page.captureScreenshot', { format: 'png' }, page);
    await fs.writeFile(path.join(directory, 'forum-390.png'), Buffer.from(shot.data, 'base64'));
    await closePage(page);
    const detailForResume = await (await fetch(fixture.url + '/api/novels/224')).json();
    const storedProgress = await fetch(fixture.url + '/api/reader/progress/224', { method: 'PUT', headers: { Authorization: 'Bearer ' + fixture.token(2), 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: detailForResume.chapters[7].id, scrollRatio: .5, paragraphIndex: 0, paragraphOffset: 0, updatedAt: Date.now() }) });
    assert.equal(storedProgress.status, 200);
    const chat = await newPage('#/', true);
    await waitSelector(chat, '.chat-bubble-btn');
    await until(() => evaluate(chat, '!document.getElementById("startup-preloader")'), 'Chat startup did not finish');
    await until(() => evaluate(chat, 'document.querySelector(".header-resume")?.getAttribute("href")==="#/novel/224/reader/7"'), 'Cross-device middle-chapter resume was not restored');
    await sleep(1500);
    const count = requests.filter(url => url.includes('/messages/unread-count')).length;
    await sleep(11000);
    assert.equal(requests.filter(url => url.includes('/messages/unread-count')).length, count, 'Healthy chat continued polling unread');
    const sent = await fetch(fixture.url + '/api/social/messages/send', { method: 'POST', headers: { Authorization: 'Bearer ' + fixture.token(3), 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: 2, messageText: 'Pushed without polling' }) });
    assert.equal(sent.status, 200);
    await until(() => evaluate(chat, 'document.querySelector(".chat-badge")?.textContent==="1"'), 'Incoming message was not pushed');
    await evaluate(chat, 'document.querySelector(".chat-bubble-btn").click();true');
    await waitSelector(chat, '.chat-friend-item');
    await evaluate(chat, 'document.querySelector(".chat-friend-item").click();true');
    await until(() => evaluate(chat, 'document.querySelector(".chat-messages-container")?.textContent.includes("Pushed without polling")'), 'Conversation history missing');
    await until(() => evaluate(chat, '!document.querySelector(".chat-badge")'), 'Unread state was not reconciled');
    await evaluate(chat, '(()=>{const s=document.querySelector(".chat-textarea");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(s,"Keep my draft");s.dispatchEvent(new Event("input",{bubbles:true}));return true;})()');
    await send('Network.setBlockedURLs', { urls: ['*/api/social/messages/send'] }, chat);
    await evaluate(chat, 'document.querySelector(".chat-send-btn").click();true');
    await waitSelector(chat, '.chat-box [role="alert"]');
    assert.equal(await evaluate(chat, 'document.querySelector(".chat-textarea").value'), 'Keep my draft');
    await send('Network.setBlockedURLs', { urls: [] }, chat);
    console.log('PASS: no 5-second unread polling, instant delivery, read reconciliation and preserved failed draft');

    await evaluate(chat, 'location.hash="#/profile/upgrade_reader";true');
    await waitSelector(chat, '.profile-tab-btn');
    await evaluate(chat, '[...document.querySelectorAll(".profile-tab-btn")].find(b=>b.textContent.includes("Bài viết diễn đàn")).click();true');
    await until(() => evaluate(chat, 'document.querySelectorAll(".public-profile-post-card").length===20'), 'Profile posts were limited to the Home sample');
    const beforeProfile = requests.filter(url => url.includes('/forum/posts?author=')).length;
    await sleep(1200);
    assert.equal(requests.filter(url => url.includes('/forum/posts?author=')).length, beforeProfile, 'Profile request rendered a fetch loop');
    await evaluate(chat, '[...document.querySelectorAll("nav[aria-label=\\"Trang bài viết cá nhân\\"] button")].find(b=>b.textContent.includes("Trang sau")).click();true');
    await until(() => evaluate(chat, 'document.querySelector("nav[aria-label=\\"Trang bài viết cá nhân\\"]")?.textContent.includes("2 / 3") && document.querySelectorAll(".public-profile-post-card").length===20'), 'Profile next page failed');
    const collection = await fetch(fixture.url + '/api/library/collections', { method: 'POST', headers: { Authorization: 'Bearer ' + fixture.token(2), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Scale collection', description: '', isPublic: false, coverNovelId: null }) });
    assert.equal(collection.status, 201);
    await evaluate(chat, 'location.hash="#/library";true');
    await waitSelector(chat, '.collection-select-button');
    await evaluate(chat, 'document.querySelector(".collection-select-button").click();true');
    await waitSelector(chat, '.collection-add-form');
    await evaluate(chat, '(()=>{const s=document.querySelector("input[aria-label=\\"Tìm tác phẩm để thêm\\"]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(s,"Scale story 124");s.dispatchEvent(new Event("input",{bubbles:true}));return true;})()');
    await until(() => evaluate(chat, 'document.querySelector("select[aria-label=\\"Tác phẩm cần thêm\\"] option[value=\\"224\\"]") && !document.querySelector("select[aria-label=\\"Tác phẩm cần thêm\\"]").disabled'), 'Collection search did not reach the global catalog');
    await evaluate(chat, '(()=>{const s=document.querySelector("select[aria-label=\\"Tác phẩm cần thêm\\"]");s.value="224";s.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
    await evaluate(chat, 'document.querySelector(".collection-add-form button").click();true');
    await until(() => evaluate(chat, 'document.querySelector(".selected-collection-panel .shelf-card-grid")?.textContent.includes("Scale story 124")'), 'New collection member did not render');
    console.log('PASS: paginated profile without fetch loops and global collection search/add');

    await closePage(chat);
    assert.deepEqual(exceptions, [], 'Scalability runtime exceptions');

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
