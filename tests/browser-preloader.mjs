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
const pausedRequests = new Set();
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
        if (data.method === 'Fetch.requestPaused') { pausedRequests.add(data.params.requestId); return; }
        if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
        const task = pending.get(data.id); if (!task) return;
        clearTimeout(task.timer); pending.delete(data.id);
        if (data.error) task.reject(new Error(data.error.message)); else task.resolve(data.result);
    };
    socket.addEventListener('message', onMessage);
    const newPage = async (hash, authenticated = true, width = 1440, bypassMobile = true, options = {}) => {
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
        await send('Emulation.setDeviceMetricsOverride', { width, height: options.height || 1000, deviceScaleFactor: 1, mobile: width <= 768 }, sessionId);
        if (bypassMobile) await send('Page.addScriptToEvaluateOnNewDocument', { source: "sessionStorage.setItem('mugen_mobile_bypass','true');" }, sessionId);
        if (authenticated) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('mugen_session',${JSON.stringify(JSON.stringify(fixture.user))});localStorage.setItem('mugen_token',${JSON.stringify(fixture.token(2))});` }, sessionId);
        if (options.theme) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('mugen_theme',${JSON.stringify(options.theme)});` }, sessionId);
        if (options.reduced) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
        if (options.hold) await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/novels*', requestStage: 'Request' }] }, sessionId);
        if (options.progress) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('mugen_readprogress_guest_1',JSON.stringify({version:2,novelId:1,chapterId:1,chapterIndex:0,scrollRatio:.4,paragraphIndex:22,paragraphOffset:.2,completedChapterIds:[],updatedAt:Date.now()}));` }, sessionId);
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
    const screenshot = async (page, name) => {
        await sleep(900);
        await fs.mkdir(path.join(fixture.root, 'artifacts/preloader'), { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png' }, page);
        await fs.writeFile(path.join(fixture.root, 'artifacts/preloader', `${name}.png`), Buffer.from(data, 'base64'));
    };
    const releaseRequests = async page => {
        for (const requestId of pausedRequests) await send('Fetch.continueRequest', { requestId }, page);
        pausedRequests.clear();
        await send('Fetch.disable', {}, page);
    };
    const waitRevealed = async page => {
        await until(() => evaluate(page, '!document.querySelector("#startup-preloader")'), 'Opening did not finish', 10000);
        assert.equal(await evaluate(page, 'document.querySelector("#root").inert'), false);
        assert.equal(await evaluate(page, 'document.querySelector("#root").hasAttribute("aria-hidden")'), false);
    };
    for (const options of [
        { theme: 'washi', width: 1440, height: 1000, hold: true },
        { theme: 'sepia', width: 320, height: 740, hold: true },
        { theme: 'charcoal', width: 390, height: 844, hold: true, reduced: true },
        { theme: 'washi', width: 740, height: 390, hold: true },
        { theme: 'washi', width: 320, height: 568, hold: true },
    ]) {
        const page = await newPage('#/', false, options.width, true, options);
        await waitSelector(page, '#startup-preloader');
        assert.equal(await evaluate(page, 'document.querySelector("#root").inert'), true);
        await until(() => evaluate(page, `document.body.classList.contains('theme-${options.theme}')`), 'Opening ignored saved theme');
        const clipped = await evaluate(page, `(() => [...document.querySelectorAll('.startup-preloader__wordmark,.startup-preloader__edition,.startup-preloader__title,.startup-preloader__status,#startup-preloader-skip')]
            .filter(e=>e.getClientRects().length).map(e=>({name:e.className,r:e.getBoundingClientRect()}))
            .filter(e=>e.r.left<0||e.r.right>${options.width}||e.r.top<0||e.r.bottom>${options.height}).map(e=>e.name))()`);
        assert.deepEqual(clipped, [], 'Opening text or skip control is clipped');
        if (options.reduced) {
            assert.equal(await evaluate(page, 'document.querySelector("#startup-preloader").getAnimations({subtree:true}).filter(a=>a.playState==="running").length'), 0, 'Reduced motion still animates');
        }
        await screenshot(page, `${options.theme}-${options.width}`);
        if (options.theme === 'washi' && options.width === 1440) {
            await releaseRequests(page);
            await waitRevealed(page);
            await waitSelector(page, '.home-page');
            for (const route of ['#/about', '#/explore', '#/']) {
                await evaluate(page, `location.hash=${JSON.stringify(route)};true`);
                await until(() => evaluate(page, `location.hash===${JSON.stringify(route)}`), 'Navigation failed');
                await sleep(250);
                assert.equal(await evaluate(page, 'document.querySelector("#startup-preloader")'), null, 'Opening replayed during navigation');
            }
            await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/novels*', requestStage: 'Request' }] }, page);
            await send('Page.reload', { ignoreCache: true }, page);
            await waitSelector(page, '#startup-preloader');
            await evaluate(page, 'document.querySelector("#startup-preloader-skip").click();true');
            await waitRevealed(page);
            await releaseRequests(page);
            console.log('PASS: entrance reveals on readiness, stays absent during navigation and returns on a fresh load');
        } else if (options.theme === 'charcoal') {
            // Keep the real novels request pending: the watchdog must release the page.
            await waitRevealed(page);
            await releaseRequests(page);
            console.log('PASS: bounded waiting on a stalled API, with reduced motion');
        } else {
            await evaluate(page, 'document.querySelector("#startup-preloader-skip").focus();true');
            await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' }, page);
            await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, page);
            await waitRevealed(page);
            assert.ok(await evaluate(page, 'document.querySelector("#root").contains(document.activeElement)'), 'Skip lost keyboard focus');
            await releaseRequests(page);
        }
        pausedRequests.clear();
        await closePage(page);
        console.log(`PASS: ${options.theme} opening at ${options.width}x${options.height}`);
    }
    const reader = await newPage('#/novel/1/reader/0', false, 1200, true, { progress: true });
    await waitSelector(reader, '.reader-content-body p');
    await waitRevealed(reader);
    await until(() => evaluate(reader, 'scrollY > 1000'), 'Entrance reset the restored reading position');
    await closePage(reader);
    const rules = await newPage('#/rules?section=3', false);
    await waitSelector(rules, '#rule-3 h2');
    await waitRevealed(rules);
    assert.equal(await evaluate(rules, 'document.activeElement===document.querySelector("#rule-3 h2")'), true, 'Rule focus was not restored after the entrance');
    assert.ok(await evaluate(rules, 'scrollY > 100'), 'Entrance reset the rule deep link');
    await closePage(rules);
    assert.deepEqual(exceptions, [], 'Opening runtime exceptions');
    console.log('PASS: entrance preserves reader position and rule deep links');
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
