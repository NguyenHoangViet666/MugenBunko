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
        await send('Page.bringToFront', {}, sessionId);
        await send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId);
        return sessionId;
    };
    const closePage = async sid => {
        await send('Target.disposeBrowserContext', { browserContextId: pageContexts.get(sid) });
        pageSockets.get(sid)?.close(); pageSockets.delete(sid); pageContexts.delete(sid);
    };
    await fixture.db.query("UPDATE chapters SET status = 'published' WHERE id = 3");
    for (const width of [1440, 390]) {
        const page = await newPage('#/', false, width);
        await waitSelector(page, '.home-page .featured-banner');
        await evaluate(page, 'document.fonts.ready.then(() => true)');
        assert.equal(await evaluate(page, 'history.scrollRestoration'), 'manual');
        const scrollDown = async () => {
            await evaluate(page, 'window.scrollTo({top:700,behavior:"instant"});true');
            await until(() => evaluate(page, 'scrollY > 100'), 'Page did not scroll before navigation');
        };
        const expectTop = async label => {
            await until(() => evaluate(page, 'scrollY === 0'), `${label} did not reset scroll`);
            await sleep(300);
            assert.equal(await evaluate(page, 'scrollY'), 0, `${label} restored the previous scroll later`);
        };
        const navigate = async (hash, selector) => {
            await evaluate(page, `location.hash=${JSON.stringify(hash)};true`);
            await until(() => evaluate(page, `location.hash===${JSON.stringify(hash)}`), `Missing route ${hash}`);
            await waitSelector(page, selector);
        };

        await scrollDown();
        const beforeTheme = await evaluate(page, 'scrollY');
        await evaluate(page, 'document.querySelector(".theme-toggle-btn").click();true');
        await sleep(400);
        assert.equal(await evaluate(page, 'scrollY'), beforeTheme, 'A theme change reset the current page');
        await evaluate(page, '[...document.querySelectorAll(".app-footer span")].find(e=>e.textContent==="Về MugenBunko").click();true');
        await waitSelector(page, '.about-story');
        await expectTop('State-driven footer navigation');

        await scrollDown();
        await evaluate(page, '[...document.querySelectorAll(".app-footer a")].find(e=>e.hash==="#/rules").click();true');
        await waitSelector(page, '#rule-25');
        await expectTop('Hash link to the rules page');

        await scrollDown();
        await navigate('#/novel/1', '.detail-actions');
        await expectTop('Novel detail');
        await scrollDown();
        await navigate('#/novel/2', '.detail-actions');
        await expectTop('Another novel in the same view');
        await scrollDown();
        await evaluate(page, 'history.back();true');
        await until(() => evaluate(page, 'location.hash==="#/novel/1"'), 'Back did not change novel');
        await expectTop('Browser Back');
        await scrollDown();
        await evaluate(page, 'history.forward();true');
        await until(() => evaluate(page, 'location.hash==="#/novel/2"'), 'Forward did not change novel');
        await expectTop('Browser Forward');
        console.log(`PASS: ${width}px state/hash navigation, same-view novels, Back/Forward and theme changes`);

        await evaluate(page, `localStorage.setItem('mugen_readprogress_guest_1',JSON.stringify({version:2,novelId:1,chapterId:1,chapterIndex:0,scrollRatio:.4,paragraphIndex:22,paragraphOffset:.2,completedChapterIds:[],updatedAt:Date.now()}));true`);
        await navigate('#/novel/1/reader/0', '.reader-content-body p');
        await until(() => evaluate(page, 'scrollY > 1000'), 'Saved reader position was not restored');
        await sleep(400);
        assert.ok(await evaluate(page, 'scrollY > 1000'), 'Navigation reset the restored reader position');
        await evaluate(page, 'document.querySelector(".reader-back-link").click();true');
        await waitSelector(page, '.detail-actions');
        await expectTop('Leaving the reader');
        const saved = await evaluate(page, 'JSON.parse(localStorage.getItem("mugen_readprogress_guest_1"))');
        assert.ok(saved.paragraphIndex >= 20, 'Leaving the reader overwrote the reading position');

        await navigate('#/rules?section=3', '#rule-3 h2');
        await until(() => evaluate(page, 'document.activeElement===document.querySelector("#rule-3 h2") && scrollY > 100'), 'Rule deep link lost its scroll target');
        await sleep(300);
        assert.ok(await evaluate(page, 'scrollY > 100'), 'Navigation reset a rule deep link');
        await navigate('#/rules?section=5', '#rule-5 h2');
        await until(() => evaluate(page, 'document.activeElement===document.querySelector("#rule-5 h2")'), 'Same-page rule navigation failed');
        console.log(`PASS: ${width}px reading progress survives navigation and rule links reach their targets`);
        await closePage(page);
    }
    assert.deepEqual(exceptions, [], 'Navigation runtime exceptions');
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
