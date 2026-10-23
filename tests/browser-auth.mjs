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
        const directory = path.join(fixture.root, 'artifacts/auth'); await fs.mkdir(directory, { recursive: true });
        const { data } = await send('Page.captureScreenshot', { format: 'png' }, sid);
        await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(data, 'base64'));
    };

    const page = await newPage('#/login?returnTo=%23%2Fnovel%2F1', false);
    await waitSelector(page, '.auth-login');
    assert.equal(await evaluate(page, "Boolean(document.querySelector('.modal-overlay, .app-header'))"), false);
    await setValue(page, '#login-username', 'missing_reader'); await setValue(page, '#login-password', 'WrongPassword1!');
    await evaluate(page, "document.querySelector('.auth-form').requestSubmit();true");
    await waitSelector(page, '.auth-error');
    assert.equal(await evaluate(page, "document.querySelector('#login-username').value"), 'missing_reader');
    assert.equal(await evaluate(page, "document.querySelector('#login-password').value"), 'WrongPassword1!');
    await clickText(page, 'Hiện'); assert.equal(await evaluate(page, "document.querySelector('#login-password').type"), 'text');
    await evaluate(page, "document.querySelector('.auth-switch a').click();true"); await waitSelector(page, '.auth-register');
    assert.ok(await evaluate(page, "location.hash.startsWith('#/register?returnTo=')"));
    await evaluate(page, 'history.back();true'); await waitSelector(page, '.auth-login');
    assert.equal(await evaluate(page, "document.querySelector('#login-username').value"), 'missing_reader');
    await evaluate(page, 'history.forward();true'); await waitSelector(page, '.auth-register');
    console.log('PASS: login/register have separate routes, preserve entered fields across mode switches, and support Back/Forward');

    await setValue(page, '#register-username', 'auth_page_reader');
    await setValue(page, '#register-displayname', 'Độc giả trang mới');
    await setValue(page, '#register-email', 'auth-page-reader@example.test');
    await setValue(page, '#register-password', 'SecurePassword123!');
    await setValue(page, '#register-confirm-password', 'DifferentPassword1!');
    await clickText(page, 'Gửi mã xác thực');
    await until(() => evaluate(page, "document.querySelector('#register-otp').value.length === 6"), 'Development OTP not filled');
    assert.match(await evaluate(page, "document.querySelector('#auth-otp-notice').textContent"), /Chưa gửi email thật/);
    assert.ok(await evaluate(page, "[...document.querySelectorAll('button')].some(b => b.disabled && b.textContent.includes('Gửi lại sau'))"));
    await evaluate(page, "document.querySelector('.auth-form').requestSubmit();true"); await waitSelector(page, '.auth-error');
    assert.match(await evaluate(page, "document.querySelector('.auth-error').textContent"), /chưa khớp/);
    await setValue(page, '#register-confirm-password', 'SecurePassword123!');
    await evaluate(page, "window.authRequestCount=0;window.authOriginalFetch=window.fetch;window.fetch=async(...args)=>{if(String(args[0]).endsWith('/auth/register')){window.authRequestCount++;await new Promise(resolve=>setTimeout(resolve,500));}return window.authOriginalFetch(...args);};true");
    await evaluate(page, "document.querySelector('.auth-form').requestSubmit();document.querySelector('.auth-form').requestSubmit();true");
    await until(() => evaluate(page, "JSON.parse(localStorage.getItem('mugen_session')||'null')?.username==='auth_page_reader'"), 'Registration did not sign in');
    await waitSelector(page, '.detail-actions');
    assert.equal(await evaluate(page, 'location.hash'), '#/novel/1');
    assert.equal(await evaluate(page, 'window.authRequestCount'), 1);
    assert.equal(await evaluate(page, "localStorage.getItem('mugen_token')"), null);
    assert.equal(await evaluate(page, "document.cookie.includes('mugen_auth')"), false);
    assert.equal(await evaluate(page, "Object.values(localStorage).some(value=>value.includes('SecurePassword123!'))"), false);
    await evaluate(page, 'window.fetch=window.authOriginalFetch;true');
    console.log('PASS: email OTP, password confirmation and duplicate-submit guard create a cookie session and return to the originating novel');

    const logout = async () => {
        await evaluate(page, "document.querySelector('.app-header button[title=\"Đăng xuất\"]').click();true");
        await until(() => evaluate(page, "localStorage.getItem('mugen_session')===null"), 'Logout did not complete');
    };
    let activePassword = 'SecurePassword123!';
    const login = async () => {
        await setValue(page, '#login-username', 'auth-page-reader@example.test');
        await setValue(page, '#login-password', activePassword);
        await evaluate(page, "document.querySelector('.auth-form').requestSubmit();true");
    };
    await logout();
    await evaluate(page, "window.location.hash='#/library';true"); await waitSelector(page, '.auth-login');
    assert.equal(await evaluate(page, 'location.hash'), '#/login?returnTo=%23%2Flibrary');
    await send('Page.reload', {}, page); await waitSelector(page, '.auth-login');
    await login(); await waitSelector(page, '.personal-library'); assert.equal(await evaluate(page, 'location.hash'), '#/library');
    await evaluate(page, "window.location.hash='#/register';true"); await waitSelector(page, '.app-header');
    await until(() => evaluate(page, "location.hash==='#/'"), 'Signed-in account stayed on registration');
    console.log('PASS: protected routes retain their destination across reload, email login resumes the library and signed-in visits leave auth pages');

    // Session expiry on a protected route should retain that route for the next login.
    await evaluate(page, "window.location.hash='#/library';true"); await waitSelector(page, '.personal-library');
    const id = await evaluate(page, "JSON.parse(localStorage.getItem('mugen_session')).id");
    await evaluate(page, "fetch('/api/auth/logout',{method:'POST'}).then(()=>true)");
    await send('Page.reload', {}, page); await waitSelector(page, '.auth-login');
    assert.equal(await evaluate(page, 'location.hash'), '#/login?returnTo=%23%2Flibrary');
    await login(); await waitSelector(page, '.personal-library');
    assert.equal(await evaluate(page, `fetch('/api/auth/refresh/${id}').then(r=>r.status)`), 200);
    await logout();
    await evaluate(page, "window.location.hash='#/login?returnTo=https%3A%2F%2Fexample.com';true"); await waitSelector(page, '.auth-login');
    await login(); await waitSelector(page, '.app-header');
    assert.equal(await evaluate(page, 'location.hash'), '#/');
    assert.equal(new URL(await evaluate(page, 'location.href')).origin, new URL(fixture.url).origin);
    console.log('PASS: expired sessions resume the protected route and external return URLs cannot redirect the browser');

    await logout();
    await evaluate(page, "window.location.hash='#/login';true"); await waitSelector(page, '.auth-login');
    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/auth/login'] }, page);
    await login(); await waitSelector(page, '.auth-error');
    assert.equal(await evaluate(page, "document.querySelector('#login-password').value"), 'SecurePassword123!');
    await send('Network.setBlockedURLs', { urls: [] }, page);
    console.log('PASS: connection errors appear inline and retain the entered credentials for retry');
    await send('Page.reload', {}, page); await waitSelector(page, '.auth-login');

    await evaluate(page, "location.hash='#/login?returnTo=%23%2Flibrary';true"); await waitSelector(page, '.auth-login');
    await evaluate(page, "document.querySelector('.auth-forgot-link a').click();true"); await waitSelector(page, '.auth-forgot-password');
    assert.equal(await evaluate(page, 'location.hash'), '#/forgot-password?returnTo=%23%2Flibrary');
    await send('Page.reload', {}, page); await waitSelector(page, '.password-recovery-form');
    await setValue(page, '#recovery-email', 'auth-page-reader@example.test');
    await evaluate(page, "document.querySelector('.password-recovery-form').requestSubmit();true");
    await waitSelector(page, '#recovery-otp');
    await until(() => evaluate(page, "document.querySelector('#recovery-otp').value.length===6"), 'Recovery OTP was not filled');
    await setValue(page, '#recovery-password', 'RecoveredInBrowser123!');
    await setValue(page, '#recovery-confirm-password', 'NotTheSame123!');
    await evaluate(page, "document.querySelector('.password-recovery-form').requestSubmit();true"); await waitSelector(page, '.auth-error');
    assert.match(await evaluate(page, 'document.querySelector(".auth-error").textContent'), /chưa khớp/);
    await setValue(page, '#recovery-confirm-password', 'RecoveredInBrowser123!');
    await send('Network.setBlockedURLs', { urls: [fixture.url + '/api/auth/reset-password'] }, page);
    await evaluate(page, "document.querySelector('.password-recovery-form').requestSubmit();true");
    await until(() => evaluate(page, "!document.querySelector('.password-recovery-form fieldset').disabled"), 'Recovery failed to release busy state');
    assert.match(await evaluate(page, 'document.querySelector(".auth-error").textContent'), /Không thể kết nối/);
    assert.equal(await evaluate(page, "document.querySelector('#recovery-password').value"), 'RecoveredInBrowser123!');
    await send('Network.setBlockedURLs', { urls: [] }, page);
    for (const width of [1440, 390, 320]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 1050, deviceScaleFactor: 1, mobile: width <= 768 }, page);
        await sleep(120);
        assert.ok(await evaluate(page, 'document.documentElement.scrollWidth<=innerWidth'), `Recovery form overflow at ${width}`);
        if (width !== 320) await screenshot(page, `recovery-step-two-${width}`);
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false }, page);
    await evaluate(page, "window.passwordRequestCount=0;window.passwordOriginalFetch=window.fetch;window.fetch=async(...args)=>{if(String(args[0]).endsWith('/auth/reset-password')){window.passwordRequestCount++;await new Promise(resolve=>setTimeout(resolve,300));}return window.passwordOriginalFetch(...args);};document.querySelector('.password-recovery-form').requestSubmit();document.querySelector('.password-recovery-form').requestSubmit();true");
    await waitSelector(page, '.auth-success');
    assert.equal(await evaluate(page, 'window.passwordRequestCount'), 1);
    assert.equal(await evaluate(page, "localStorage.getItem('mugen_session')"), null);
    await evaluate(page, "window.fetch=window.passwordOriginalFetch;document.querySelector('.auth-success a').click();true"); await waitSelector(page, '.auth-login');
    assert.equal(await evaluate(page, "document.querySelector('#login-password').value"), '');
    activePassword = 'RecoveredInBrowser123!';
    await login(); await waitSelector(page, '.personal-library');
    assert.equal(await evaluate(page, 'location.hash'), '#/library');
    console.log('PASS: recovery deep link/reload, email OTP, confirmation, failed-request preservation, one-use submit and login with the new password');

    await evaluate(page, "location.hash='#/profile';true"); await waitSelector(page, '.change-password-form');
    await setValue(page, '#change-current-password', 'WrongCurrent123!');
    await setValue(page, '#change-password', 'ChangedInBrowser123!');
    await setValue(page, '#change-confirm-password', 'ChangedInBrowser123!');
    await evaluate(page, "document.querySelector('.change-password-form').requestSubmit();true"); await waitSelector(page, '.password-security .auth-error');
    assert.match(await evaluate(page, 'document.querySelector(".password-security .auth-error").textContent'), /hiện tại chưa đúng/);
    assert.equal(await evaluate(page, "JSON.parse(localStorage.getItem('mugen_session')).username"), 'auth_page_reader');
    await setValue(page, '#change-current-password', activePassword);
    for (const width of [1440, 390, 320]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 1050, deviceScaleFactor: 1, mobile: width <= 768 }, page);
        await sleep(120);
        const clipped = await evaluate(page, "[...document.querySelectorAll('.password-security input,.password-security button')].filter(e=>e.getClientRects().length).filter(e=>e.getBoundingClientRect().left<0||e.getBoundingClientRect().right>innerWidth).map(e=>e.id||e.textContent)");
        assert.deepEqual(clipped, [], `Password change controls at ${width}`);
        if (width !== 320) { await evaluate(page, "document.querySelector('.password-security').scrollIntoView({block:'start'});true"); await screenshot(page, `change-password-${width}`); }
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false }, page);
    await evaluate(page, "document.querySelector('.change-password-form').requestSubmit();document.querySelector('.change-password-form').requestSubmit();true");
    await waitSelector(page, '.auth-login');
    assert.match(await evaluate(page, 'document.querySelector(".auth-recovery-notice").textContent'), /Đã đổi mật khẩu/);
    assert.equal(await evaluate(page, "localStorage.getItem('mugen_session')"), null);
    assert.equal(await evaluate(page, 'location.hash'), '#/login?returnTo=%23%2Fprofile');
    activePassword = 'ChangedInBrowser123!';
    await login(); await waitSelector(page, '.change-password-form');
    assert.equal(await evaluate(page, "Object.values(localStorage).some(value=>value.includes('RecoveredInBrowser123!')||value.includes('ChangedInBrowser123!'))"), false);
    await logout();
    console.log('PASS: profile password change, wrong-current-password feedback, mobile form, sign-out and reauthentication');

    for (const mode of ['login', 'register', 'forgot-password']) {
        await evaluate(page, `window.location.hash='#/${mode}';true`); await waitSelector(page, `.auth-${mode}`);
        for (const theme of ['washi', 'sepia', 'charcoal']) {
            for (let step = 0; step < 3; step++) {
                if (await evaluate(page, `document.body.classList.contains('theme-${theme}')`)) break;
                await evaluate(page, "document.querySelector('.auth-theme-button').click();true"); await sleep(100);
            }
            assert.equal(await evaluate(page, `document.body.classList.contains('theme-${theme}')`), true);
            for (const width of [1440, 768, 390, 320]) {
                await send('Emulation.setDeviceMetricsOverride', { width, height: 1050, deviceScaleFactor: 1, mobile: width <= 768 }, page);
                await sleep(200);
                const clipped = await evaluate(page, `(() => [...document.querySelectorAll('.auth-page input, .auth-page button, .auth-header a, .auth-switch a')]
                    .filter(e=>e.getClientRects().length).map(e=>({text:e.id||e.textContent,rect:e.getBoundingClientRect()})).filter(e=>e.rect.left<-.5||e.rect.right>${width}+.5).map(e=>e.text))()`);
                assert.deepEqual(clipped, [], `${mode} ${theme} at ${width}px`);
                if (width === 1440 || width === 390) await screenshot(page, `${mode}-${theme}-${width}`);
            }
        }
    }
    const gate = await newPage('#/login', false, 390, false); await waitSelector(gate, '.mobile-standalone-gate');
    await evaluate(gate, "document.querySelector('.mobile-gate-bypass-link').click();true"); await waitSelector(gate, '.auth-login'); await closePage(gate);
    assert.deepEqual(exceptions, [], 'Browser runtime exceptions');
    await closePage(page);
    console.log('PASS: login, registration and recovery fit 320–1440px in all three themes, preserve the mobile gate and have no runtime exceptions');
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
