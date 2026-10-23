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
    const newPage = async (hash, authenticated = true, width = 1440, bypassMobile = true, reducedMotion = false) => {
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
        await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] }, sessionId);
        await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__aboutRafCalls=0;const originalRaf=window.requestAnimationFrame;window.requestAnimationFrame=function(callback){window.__aboutRafCalls++;return originalRaf.call(window,callback)};` }, sessionId);
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
        const directory = path.join(fixture.root, 'artifacts/about'); await fs.mkdir(directory, { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png' }, sid);
        await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(data, 'base64'));
    };

    const page = await newPage('#/about', false);
    await waitSelector(page, '.about-story--motion-ready');
    await until(() => evaluate(page, 'document.querySelector(".about-story__closing").classList.contains("about-reveal-pending")'), 'Below-fold content did not prepare for reveal');
    assert.equal(await evaluate(page, 'document.querySelector(".about-story").classList.contains("about-story--parallax-enabled")'), true);
    await sleep(1100);
    const titleFrames = await evaluate(page, `document.querySelector('#about-title').getAnimations().find(a=>a.animationName==='about-story-enter')?.effect.getKeyframes().map(f=>f.transform)`);
    assert.ok(titleFrames?.includes('translateY(18px)'), `Unexpected title entry: ${JSON.stringify(titleFrames)}`);
    const bookBefore = await evaluate(page, 'getComputedStyle(document.querySelector(".about-story__book--main")).translate');
    await sleep(250);
    assert.notEqual(await evaluate(page, 'getComputedStyle(document.querySelector(".about-story__book--main")).translate'), bookBefore);
    assert.equal(await evaluate(page, 'document.querySelectorAll(".about-story__kanji-field > span").length'), 14);
    const glyphBefore = await evaluate(page, 'getComputedStyle(document.querySelector(".about-story__kanji-field > span")).transform');
    await sleep(300);
    assert.notEqual(await evaluate(page, 'getComputedStyle(document.querySelector(".about-story__kanji-field > span")).transform'), glyphBefore, 'Kanji stopped floating');
    const textTop = await evaluate(page, 'document.querySelector("#about-title").getBoundingClientRect().top+scrollY');
    const pageHeight = await evaluate(page, 'document.documentElement.scrollHeight');
    const backgroundBefore = await evaluate(page, 'parseFloat(document.querySelector(".about-story__kanji-field").style.getPropertyValue("--about-parallax-y"))');
    await evaluate(page, 'window.scrollTo({top:100,behavior:"instant"});true');
    await sleep(200);
    const backgroundAfter = await evaluate(page, 'parseFloat(document.querySelector(".about-story__kanji-field").style.getPropertyValue("--about-parallax-y"))');
    assert.ok(backgroundAfter > backgroundBefore && backgroundAfter - backgroundBefore < 8, `Parallax too strong or static: ${backgroundBefore} -> ${backgroundAfter}`);
    assert.ok(Math.abs((await evaluate(page, 'document.querySelector("#about-title").getBoundingClientRect().top+scrollY')) - textTop) < 1, 'Parallax moved the title');
    assert.equal(await evaluate(page, 'document.documentElement.scrollHeight'), pageHeight, 'Motion changed page layout');
    assert.equal(await evaluate(page, '(() => {const start=window.__aboutRafCalls;for(let i=0;i<20;i++)window.dispatchEvent(new Event("scroll"));return window.__aboutRafCalls-start})()'), 1, 'Scroll events did not share one animation frame');
    await sleep(200);
    const idleFrames = await evaluate(page, 'window.__aboutRafCalls');
    await sleep(250);
    assert.equal(await evaluate(page, 'window.__aboutRafCalls'), idleFrames, 'A JavaScript animation loop is still running while idle');
    console.log('PASS: 18px hero entry, subtle book motion, bounded desktop parallax, stable layout and no idle frame loop');

    // Focusing content below the fold must reveal it immediately, including without scrolling.
    await evaluate(page, 'document.querySelector(".about-story__closing button").focus({preventScroll:true});true');
    assert.equal(await evaluate(page, 'getComputedStyle(document.querySelector(".about-story__closing")).opacity'), '1');
    await evaluate(page, 'document.activeElement.blur();true');
    const sections = ['manifesto', 'reading', 'paths', 'faq', 'closing'];
    for (const section of sections) {
        await evaluate(page, `window.scrollTo({top:document.querySelector('.about-story__${section}').getBoundingClientRect().top+scrollY-160,behavior:'instant'});true`);
        await until(() => evaluate(page, `document.querySelector('.about-story__${section}').classList.contains('about-reveal-visible') && Number(getComputedStyle(document.querySelector('.about-story__${section}')).opacity)>.999`), `Section ${section} did not reveal`);
    }
    await until(() => evaluate(page, 'getComputedStyle(document.querySelector(".about-story__book--main")).animationPlayState==="paused"'), 'Offscreen books kept animating');
    assert.equal(await evaluate(page, 'getComputedStyle(document.querySelector(".about-story__kanji-field > span")).animationPlayState'), 'paused');
    await evaluate(page, 'window.scrollTo({top:0,behavior:"instant"});true');
    assert.equal(await evaluate(page, 'document.querySelectorAll(".about-reveal-pending").length'), 0, 'Revealed content was hidden again');
    await evaluate(page, `document.querySelector('.about-story__actions .about-story__text-button').click();true`);
    await until(() => evaluate(page, 'document.activeElement.id==="about-reading-guide" && scrollY>400'), 'Reading guide shortcut lost focus or scroll');
    await evaluate(page, `document.querySelector('.about-story__paper-button[data-swatch="charcoal"]').click();document.querySelector('[aria-label="Tăng cỡ chữ"]').click();true`);
    await until(() => evaluate(page, 'document.querySelector(".about-story__reader").dataset.paper==="charcoal" && getComputedStyle(document.querySelector(".about-story__reader-excerpt")).fontSize==="20px"'), 'Reader preview controls stopped working');
    await evaluate(page, 'document.querySelector(".about-story__questions summary").click();true');
    assert.equal(await evaluate(page, 'document.querySelector(".about-story__questions details").open'), true);
    console.log('PASS: one-time section reveals, keyboard focus, reading-guide jump, reader controls and FAQ');

    for (const theme of ['washi', 'sepia', 'charcoal']) {
        await evaluate(page, `document.body.className='theme-${theme}';window.scrollTo({top:0,behavior:'instant'});true`);
        for (const width of [1440, 1024, 992, 768, 390, 320]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 768 }, page);
            await sleep(150);
            const viewport = await evaluate(page, '({layout:innerWidth,visual:visualViewport.width,scroll:document.documentElement.scrollWidth})');
            assert.ok(viewport.layout<=width+1&&viewport.visual<=width+1&&viewport.scroll<=width+1, `${theme} overflow at ${width}: ${JSON.stringify(viewport)}`);
            const clipped = await evaluate(page, `(() => [...document.querySelectorAll('.about-story button,.about-story summary')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>${width}+.5}).map(e=>e.textContent))()`);
            assert.deepEqual(clipped, [], `${theme} clipped controls at ${width}`);
            if (width < 1024) {
                assert.equal(await evaluate(page, 'document.querySelector(".about-story").classList.contains("about-story--parallax-enabled")'), false);
                assert.equal(await evaluate(page, 'getComputedStyle(document.querySelector(".about-story__kanji-field")).translate'), 'none');
            }
            if ([1440, 390].includes(width)) await screenshot(page, `${theme}-hero-${width}`);
        }
    }
    console.log('PASS: three themes at 320–1440px, no clipping/viewport zoom and no parallax on narrow screens');

    const mobile = await newPage('#/about', false, 390);
    await waitSelector(mobile, '.about-story--motion-ready');
    await sleep(200);
    const mobileFrames = await evaluate(mobile, 'window.__aboutRafCalls');
    await evaluate(mobile, 'window.scrollTo({top:600,behavior:"instant"});true');
    await sleep(200);
    assert.equal(await evaluate(mobile, 'window.__aboutRafCalls'), mobileFrames, 'Mobile scrolling scheduled parallax frames');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, mobile);
    await until(() => evaluate(mobile, '!document.querySelector(".about-story--motion-ready") && !document.querySelector(".about-reveal-pending")'), 'Live reduced-motion change left content hidden');
    assert.equal(await evaluate(mobile, 'document.querySelector(".about-story").getAnimations({subtree:true}).filter(a=>a.playState==="running").length'), 0);
    assert.equal(await evaluate(mobile, 'document.querySelector(".about-story__questions details").open'), false);
    const reduced = await newPage('#/about', false, 1440, true, true);
    await waitSelector(reduced, '.about-story');
    assert.equal(await evaluate(reduced, 'document.querySelectorAll(".about-reveal-pending").length'), 0);
    assert.equal(await evaluate(reduced, 'document.querySelector(".about-story").getAnimations({subtree:true}).filter(a=>a.playState==="running").length'), 0);
    await screenshot(reduced, 'reduced-motion');
    const gated = await newPage('#/about', false, 390, false);
    await waitSelector(gated, '.mobile-gate-container');
    console.log('PASS: no mobile scroll frame loop, reduced motion on load/live and mobile gate');

    await evaluate(page, 'window.__oldAbout=document.querySelector(".about-story");document.querySelector(".about-story__closing button").click();true');
    await until(() => evaluate(page, 'location.hash==="#/explore" && !document.querySelector(".about-story")'), 'Closing CTA navigation failed');
    assert.equal(await evaluate(page, 'window.__oldAbout.classList.contains("about-story--motion-ready")'), false);
    assert.equal(await evaluate(page, '[...window.__oldAbout.querySelectorAll("[data-about-parallax]")].every(e=>!e.style.getPropertyValue("--about-parallax-y"))'), true);
    assert.deepEqual(exceptions, [], 'Browser runtime exceptions');
    console.log('PASS: navigation and animation cleanup');
    await closePage(page); await closePage(mobile); await closePage(reduced); await closePage(gated);
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
