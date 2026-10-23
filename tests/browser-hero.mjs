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
        const directory = path.join(fixture.root, 'artifacts/hero'); await fs.mkdir(directory, { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png' }, sid);
        await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(data, 'base64'));
    };

    await fixture.db.query("UPDATE novels SET cover = '/assets/default_novel_cover.png' WHERE id IN (1, 2)");
    await fixture.db.query("UPDATE chapters SET status = 'published' WHERE id = 3");
    await fixture.db.query(`INSERT INTO novels (id, title, author_id, genre, summary, status, type, \`reads\`, cover) VALUES
        (3, 'Một ngày mùa thu ở thư viện của những câu chuyện chưa kể', 2, 'Fantasy', 'Một lá thư và một cuộc hẹn giữa những trang sách.', 'ongoing', 'series', 20, '/assets/default_novel_cover.png'),
        (4, 'Lời hẹn dưới tán hoa anh đào', 2, 'Fantasy', 'Gặp lại nhau trong những trang sách còn dang dở.', 'ongoing', 'series', 15, '/assets/default_novel_cover.png'),
        (5, 'Chuyến tàu về phía bình minh', 2, 'Fantasy', 'Một hành trình qua miền ký ức.', 'ongoing', 'series', 10, '/assets/default_novel_cover.png')`);
    await fixture.db.query(`INSERT INTO chapters (novel_id, volume_name, title, content, status, word_count) VALUES
        (3, 'Tập 01', 'Mở đầu', '<p>Chương đầu tiên.</p>', 'published', 1000),
        (4, 'Tập 01', 'Mở đầu', '<p>Chương đầu tiên.</p>', 'published', 1000),
        (5, 'Tập 01', 'Mở đầu', '<p>Chương đầu tiên.</p>', 'published', 1000)`);
    const page = await newPage('#/', false);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }, page);
    await waitSelector(page, '.hero-motion-toggle');
    await until(() => evaluate(page, 'document.querySelectorAll(".hero-thumb-item").length===5'), 'Missing featured novels');
    const activeTitle = () => evaluate(page, 'document.querySelector(".featured-info h1").textContent');
    const animationTime = () => evaluate(page, 'document.querySelector(".hero-progress-bar-fill").getAnimations()[0]?.currentTime');
    const waitPaused = () => until(() => evaluate(page, 'document.querySelector(".featured-banner").classList.contains("hero-motion-paused")'), 'Motion did not pause');
    const waitRunning = () => until(() => evaluate(page, '!document.querySelector(".featured-banner").classList.contains("hero-motion-paused")'), 'Motion did not resume');

    const initialTitle = await activeTitle();
    await until(async () => (await activeTitle()) !== initialTitle, 'Automatic slide advance failed', 10000);
    const heroBox = await evaluate(page, '(() => { const r=document.querySelector(".featured-banner").getBoundingClientRect();return {x:r.left+24,y:r.top+24};})()');
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...heroBox }, page);
    await waitPaused(); await sleep(100);
    const pausedTime = await animationTime();
    await evaluate(page, 'window.__heroProgress=document.querySelector(".hero-progress-bar-fill");true');
    await sleep(650);
    assert.ok(Math.abs((await animationTime()) - pausedTime) < 2, 'Hover did not freeze progress');
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 }, page);
    await waitRunning();
    const resumedTime = await animationTime();
    assert.ok(resumedTime >= pausedTime - 2, `Progress reset on mouse leave: ${pausedTime} -> ${resumedTime}`);
    await until(async () => (await animationTime()) > pausedTime + 20, 'Progress did not resume after mouse leave', 3000);
    assert.equal(await evaluate(page, 'window.__heroProgress===document.querySelector(".hero-progress-bar-fill")'), true);

    await evaluate(page, 'document.querySelector(".hero-motion-toggle").click();true');
    await waitPaused();
    assert.equal(await evaluate(page, 'document.querySelector(".hero-motion-toggle").getAttribute("aria-pressed")'), 'true');
    await evaluate(page, 'document.querySelector(".hero-motion-toggle").click();true');
    await waitRunning();
    await evaluate(page, 'document.querySelector(".hero-primary-cta-btn").focus();true');
    await waitPaused();
    await evaluate(page, 'document.activeElement.blur();true'); await waitRunning();
    const beforeOffscreen = await activeTitle();
    await evaluate(page, 'window.scrollTo({top:document.querySelector(".featured-banner").getBoundingClientRect().bottom+scrollY+60,behavior:"instant"});true');
    await waitPaused(); await sleep(300);
    assert.equal(await activeTitle(), beforeOffscreen);
    await evaluate(page, 'window.scrollTo({top:0,behavior:"instant"});true'); await waitRunning();
    const floatBefore = await evaluate(page, 'getComputedStyle(document.querySelector(".hero-book-float")).transform');
    await sleep(250);
    assert.notEqual(await evaluate(page, 'getComputedStyle(document.querySelector(".hero-book-float")).transform'), floatBefore);
    console.log('PASS: real automatic advance, hover/focus/manual/offscreen pauses, continuous progress and floating cover');

    // Freeze the carousel while inspecting layout, keeping the current animation frame.
    await evaluate(page, 'document.querySelector(".hero-motion-toggle").click();true'); await waitPaused();
    for (const theme of ['washi', 'sepia', 'charcoal']) {
        await evaluate(page, `document.body.className='theme-${theme}';true`);
        for (const width of [1440, 992, 768, 390, 320]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 768 }, page);
            await sleep(150);
            const viewport = await evaluate(page, '({layout:innerWidth,visual:visualViewport.width,scroll:document.documentElement.scrollWidth})');
            assert.ok(viewport.layout <= width + 1 && viewport.visual <= width + 1, `${theme} viewport zoomed out at ${width}: ${JSON.stringify(viewport)}`);
            const layout = await evaluate(page, `(() => {
                const hero=document.querySelector('.featured-banner').getBoundingClientRect();
                return [...document.querySelectorAll('.featured-actions-row button,.featured-cover-showcase,.hero-carousel-controls button')]
                    .filter(e=>e.getClientRects().length).map(e=>({name:e.getAttribute('title')||e.className,r:e.getBoundingClientRect()}))
                    .filter(e=>e.r.left<-.5||e.r.right>${width}+.5||e.r.top<hero.top-.5||e.r.bottom>hero.bottom+.5).map(e=>e.name);
            })()`);
            assert.deepEqual(layout, [], `${theme} clipped hero controls at ${width}`);
            assert.ok(await evaluate(page, 'document.querySelector(".hero-motion-toggle").getClientRects().length>0'), 'Pause control hidden on narrow layout');
            if (width <= 768) assert.ok(await evaluate(page, 'document.querySelector(".hero-motion-toggle").getBoundingClientRect().width >= 44'), 'Narrow pause target is too small');
            if ([1440, 390].includes(width)) await screenshot(page, `${theme}-${width}`);
        }
    }
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, page);
    await until(() => evaluate(page, 'document.querySelector(".hero-motion-toggle")===null'), 'Reduced motion preference ignored');
    const activeAnimations = await evaluate(page, 'document.querySelector(".featured-banner").getAnimations({subtree:true}).filter(a=>a.playState==="running").length');
    assert.equal(activeAnimations, 0, 'Motion remains active with reduced motion enabled');
    const reducedTitle = await activeTitle();
    await evaluate(page, `document.querySelector('.hero-arrow-btn[title="Tác phẩm tiếp theo"]').click();true`);
    await until(async () => (await activeTitle()) !== reducedTitle, 'Manual navigation stopped with reduced motion');
    await screenshot(page, 'reduced-motion-320');
    console.log('PASS: three themes at 320–1440px, visible pause control and reduced-motion manual navigation');

    const coverHref = await evaluate(page, 'document.querySelector(".featured-cover-showcase").getAttribute("href")');
    await evaluate(page, 'document.querySelector(".featured-cover-showcase").focus();true');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, page);
    await until(() => evaluate(page, `location.hash===${JSON.stringify(coverHref)}`), 'Cover link is not keyboard accessible');
    await fixture.db.query("UPDATE chapters SET status = 'draft' WHERE novel_id <> 1");
    const single = await newPage('#/', false, 390);
    await waitSelector(single, '.hero-motion-toggle');
    assert.equal(await evaluate(single, 'document.querySelector(".hero-progress-bar-track")'), null);
    await evaluate(single, 'document.querySelector(".hero-motion-toggle").click();true');
    assert.equal(await evaluate(single, 'document.querySelector(".hero-motion-toggle").getAttribute("aria-pressed")'), 'true');
    await screenshot(single, 'single-novel-390');
    const gated = await newPage('#/', false, 390, false);
    await waitSelector(gated, '.mobile-gate-container');
    console.log('PASS: keyboard cover navigation and animation controls for a single featured novel');
    assert.deepEqual(exceptions, [], 'Browser runtime exceptions');
    await closePage(page); await closePage(single); await closePage(gated);
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
