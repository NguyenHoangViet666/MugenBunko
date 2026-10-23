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
        await evaluate(sid, "window.scrollTo({top:0,behavior:'instant'});true");
        await sleep(450);
        const directory = path.join(fixture.root, 'artifacts/header'); await fs.mkdir(directory, { recursive: true });
        const clip = await evaluate(sid, "({x:0,y:0,width:window.innerWidth,height:Math.ceil(document.querySelector('.app-header').getBoundingClientRect().height+(document.querySelector('.top-meta-bar')?.getBoundingClientRect().height||0)),scale:1})");
        const { data } = await send('Page.captureScreenshot', { format: 'png', clip }, sid);
        await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(data, 'base64'));
    };

    const checkLayout = async (sid, label) => {
        for (const width of [1920, 1440, 1200, 992, 900, 768, 390, 320]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 768 }, sid);
            await sleep(120);
            const clipped = await evaluate(sid, `(() => [...document.querySelectorAll('.app-header button, .app-header a, .app-header input')]
                .filter(e=>e.getClientRects().length).map(e=>({text:e.getAttribute('aria-label')||e.textContent,rect:e.getBoundingClientRect()}))
                .filter(e=>e.rect.left<-.5||e.rect.right>${width}+.5).map(e=>e.text))()`);
            assert.deepEqual(clipped, [], `${label} at ${width}px`);
            assert.ok(await evaluate(sid, "document.querySelector('.header-search input').getBoundingClientRect().width > 50"), `Search unavailable: ${label} at ${width}`);
            if (width === 1920 || width === 390) await screenshot(sid, `${label}-${width}`);
        }
    };
    for (const authenticated of [false, true]) {
        const sid = await newPage('#/explore', authenticated);
        const account = authenticated ? 'account' : 'guest';
        await waitSelector(sid, '.app-header'); await waitSelector(sid, '.explore-layout');
        assert.equal(await evaluate(sid, "document.querySelector('.header-nav-desktop')"), null);
        assert.equal(await evaluate(sid, "document.querySelector('.header-resume')"), null);
        await checkLayout(sid, `${account}-no-history`);
        await evaluate(sid, "document.querySelector('.category-burger-btn').focus();true");
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'k', code: 'KeyK', modifiers: 2 }, sid);
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'k', code: 'KeyK', modifiers: 2 }, sid);
        assert.equal(await evaluate(sid, "document.activeElement===document.querySelector('.header-search input')"), true);
        await setValue(sid, '.header-search input', 'anh đào');
        await evaluate(sid, "document.querySelector('.header-search form').requestSubmit();true");
        assert.equal(await evaluate(sid, 'location.hash'), '#/explore');
        await evaluate(sid, "document.querySelector('.header-search-clear').click();true");
        assert.equal(await evaluate(sid, "document.querySelector('.header-search input').value"), '');

        await evaluate(sid, "document.querySelector('.category-burger-btn').focus();document.querySelector('.category-burger-btn').click();true");
        await waitSelector(sid, '#site-navigation-drawer');
        await until(() => evaluate(sid, "document.querySelector('#site-navigation-drawer').contains(document.activeElement)"), 'Menu did not receive focus');
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', modifiers: 8 }, sid);
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', modifiers: 8 }, sid);
        assert.equal(await evaluate(sid, "document.querySelector('#site-navigation-drawer').contains(document.activeElement)"), true);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' }, sid);
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' }, sid);
        await until(() => evaluate(sid, "!document.querySelector('#site-navigation-drawer')"), 'Escape did not close menu');
        assert.equal(await evaluate(sid, "document.activeElement===document.querySelector('.category-burger-btn')"), true);
        await evaluate(sid, "document.querySelector('.category-burger-btn').click();true"); await waitSelector(sid, '#site-navigation-drawer');
        await evaluate(sid, "document.querySelector('#site-navigation-drawer a[href=\"#/library\"]').click();true");
        await waitSelector(sid, authenticated ? '.personal-library' : '.auth-login');
        assert.equal(await evaluate(sid, 'location.hash'), authenticated ? '#/library' : '#/login?returnTo=%23%2Flibrary');
        await evaluate(sid, "window.location.hash='#/explore';true"); await waitSelector(sid, '.app-header');

        const username = authenticated ? 'upgrade_reader' : 'guest';
        await evaluate(sid, `localStorage.setItem('mugen_readprogress_${username}_1',JSON.stringify({version:2,novelId:1,chapterId:2,chapterIndex:99,scrollRatio:.4,paragraphIndex:12,paragraphOffset:.2,completedChapterIds:[1],updatedAt:Date.now()}));
            window.dispatchEvent(new StorageEvent('storage',{key:'mugen_readprogress_${username}_1'}));true`);
        await waitSelector(sid, '.header-resume');
        assert.equal(await evaluate(sid, "document.querySelector('.header-resume').getAttribute('href')"), '#/novel/1/reader/1');
        assert.match(await evaluate(sid, "document.querySelector('.header-resume').textContent"), /Những ngày dưới tán anh đào/);
        await evaluate(sid, "document.querySelector('.header-resume').click();true"); await waitSelector(sid, '.reader-content-body p');
        assert.match(await evaluate(sid, "document.querySelector('.reader-chapter-heading h1').textContent"), /Khu vườn sau thư viện/);
        await evaluate(sid, "window.location.hash='#/explore';true"); await waitSelector(sid, '.header-resume');
        for (const theme of ['washi', 'sepia', 'charcoal']) {
            for (let step = 0; step < 3; step++) {
                if (await evaluate(sid, `document.body.classList.contains('theme-${theme}')`)) break;
                await evaluate(sid, "document.querySelector('.theme-toggle-btn').click();true"); await sleep(100);
            }
            await checkLayout(sid, `${account}-resume-${theme}`);
        }
        // The global shortcut must not move focus away from a manuscript or another form.
        await evaluate(sid, "const field=document.createElement('textarea');field.id='header-shortcut-editor';document.body.append(field);field.focus();true");
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'k', code: 'KeyK', modifiers: 2 }, sid);
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'k', code: 'KeyK', modifiers: 2 }, sid);
        assert.equal(await evaluate(sid, 'document.activeElement.id'), 'header-shortcut-editor');
        await evaluate(sid, "document.querySelector('#header-shortcut-editor').remove();true");
        await evaluate(sid, "document.querySelector('.category-burger-btn').click();true"); await waitSelector(sid, '#site-navigation-drawer');
        await clickText(sid, 'Về MugenBunko'); await waitSelector(sid, '.about-story');
        await closePage(sid);
        console.log(`PASS: ${account} search, keyboard navigation, library route, correct reading continuation and 320–1920px layouts in all themes`);
    }
    const gate = await newPage('#/explore', false, 390, false); await waitSelector(gate, '.mobile-standalone-gate');
    await evaluate(gate, "document.querySelector('.mobile-gate-bypass-link').click();true"); await waitSelector(gate, '.header-search input');
    await closePage(gate);
    assert.deepEqual(exceptions, [], 'Header runtime exceptions');
    console.log('PASS: mobile gate remains available and header has no runtime exceptions');
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
