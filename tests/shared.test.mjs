import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { io } from 'socket.io-client';
import { startFixture } from '../server/dist/tests/fixture.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const event = (socket, name) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, done); reject(new Error('Timed out waiting for ' + name)); }, 10000);
    function done(data) { clearTimeout(timer); resolve(data); }
    socket.once(name, done);
});
test('two separate APIs share messages, presence, cache invalidation, rate limits and revocations',
    { skip: !process.env.TEST_REDIS_URL, timeout: 90000 }, async () => {
    process.env.REDIS_URL = process.env.TEST_REDIS_URL;
    process.env.REDIS_PREFIX = 'mugenbunko:test:' + randomBytes(8).toString('hex');
    const fixture = await startFixture();
    const { JWT_SECRET } = await import('../server/dist/config.js');
    const tokens = { 2: fixture.token(2), 3: fixture.token(3) };
    const shared = await import('../server/dist/shared.js');
    const redis = await shared.connectShared();
    let child, sender, receiver;
    const request = (url, endpoint, user, init = {}) => fetch(url + '/api' + endpoint, { ...init, headers: { Authorization: 'Bearer ' + tokens[user], 'Content-Type': 'application/json', ...init.headers } });
    try {
        await fixture.db.query("INSERT INTO friends (user_id_1,user_id_2,status) VALUES (2,3,'accepted')");
        child = spawn(process.execPath, ['--input-type=module', '-e', "\nimport express from 'express';\nimport { Server } from 'socket.io';\nimport db from './server/dist/db.js';\nimport { configureSecurity, apiErrorHandler } from './server/dist/middleware/security.js';\nimport { registerRealtime } from './server/dist/realtime.js';\nimport { closeShared } from './server/dist/shared.js';\nimport social from './server/dist/routes/social.js';\nimport novels from './server/dist/routes/novels.js';\nimport auth from './server/dist/routes/auth.js';\nawait db.initializeDbConnection();\nconst app=express();configureSecurity(app);\napp.use('/api/social',social);app.use('/api/novels',novels);app.use('/api/auth',auth);app.use(apiErrorHandler);\nconst server=app.listen(0,'127.0.0.1');\nawait new Promise(resolve=>server.once('listening',resolve));\nconst io=new Server(server);await registerRealtime(io);\nprocess.send({url:'http://127.0.0.1:'+server.address().port});\nprocess.on('message',async message=>{\n    if(message!=='stop')return;\n    await new Promise(resolve=>io.close(resolve));\n    await db.closeDbConnection();await closeShared();\n    process.exit(0);\n});\n"], { cwd: fixture.root, env: { ...process.env, JWT_SECRET }, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
        let stderr = ''; child.stderr.on('data', data => { stderr = (stderr + data).slice(-2000); });
        const peer = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Second API startup timeout: ' + stderr)), 30000);
            child.once('message', message => { clearTimeout(timer); resolve(message.url); });
            child.once('exit', code => { clearTimeout(timer); reject(new Error('Second API exited: ' + code + ' ' + stderr)); });
        });
        sender = io(fixture.url, { auth: { token: tokens[2] }, transports: ['websocket'], reconnection: false });
        receiver = io(peer, { auth: { token: tokens[3] }, transports: ['websocket'], reconnection: false });
        await Promise.all([event(sender, 'connect'), event(receiver, 'connect')]);
        // Presence registration is asynchronous after the socket handshake.
        let statuses;
        for (let attempt = 0; attempt < 30; attempt++) {
            statuses = await sender.timeout(5000).emitWithAck('check_online_status', [3]);
            if (statuses[3]) break;
            await sleep(100);
        }
        assert.equal(statuses[3], true);
        const incoming = event(receiver, 'receive_message');
        assert.equal((await request(fixture.url, '/social/messages/send', 2, { method: 'POST', body: JSON.stringify({ receiverId: 3, messageText: 'Across API processes' }) })).status, 200);
        assert.equal((await incoming).message_text, 'Across API processes');
        const read = event(sender, 'messages_read');
        await request(peer, '/social/messages/chat/2/read', 3, { method: 'POST', body: '{}' });
        assert.equal((await read).userId, 3);
        await request(peer, '/novels/catalog?q=Renamed%20shared%20title', 2);
        await request(fixture.url, '/novels/1', 2, { method: 'PUT', body: JSON.stringify({ title: 'Renamed shared title', genre: 'Fantasy', tags: [], type: 'series', status: 'ongoing', summary: 'Updated' }) });
        let total = 0;
        for (let attempt = 0; attempt < 30; attempt++) {
            total = (await (await request(peer, '/novels/catalog?q=Renamed%20shared%20title', 2)).json()).total;
            if (total === 1) break; await sleep(100);
        }
        assert.equal(total, 1, 'Peer retained a stale catalog');
        const keys = await redis.keys(shared.sharedPrefix() + ':limit:api-ip:*');
        assert.equal(keys.length, 1, 'IP limiter did not use one shared counter');
        const before = Number(await redis.get(keys[0]));
        await request(fixture.url, '/novels/catalog', 2); await request(peer, '/novels/catalog', 2);
        assert.equal(Number(await redis.get(keys[0])), before + 2);
        const revoked = event(receiver, 'disconnect');
        assert.equal((await request(fixture.url, '/auth/logout', 3, { method: 'POST', body: '{}' })).status, 200);
        await revoked;
        assert.equal((await request(peer, '/social/messages/unread-count', 3)).status, 401);
    } finally {
        sender?.disconnect(); receiver?.disconnect();
        if (child && child.exitCode === null) {
            child.send('stop');
            await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5000)]);
            if (child.exitCode === null) child.kill();
        }
        await fixture.close();
        const prefix = shared.sharedPrefix();
        assert.match(prefix, /^mugenbunko:test:[a-f0-9]{16}$/);
        const keys = await redis.keys(prefix + ':*'); if (keys.length) await redis.del(keys);
        await shared.closeShared();
    }
});
