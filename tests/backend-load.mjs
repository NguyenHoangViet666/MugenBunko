import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { startFixture } from '../server/dist/tests/fixture.js';

// This runner only targets its own disposable database and loopback HTTP server.
const levels = (process.env.LOAD_CONCURRENCY || '10,50,100').split(',').map(Number);
const seconds = Number(process.env.LOAD_SECONDS || 10);
if (levels.some(n => !Number.isSafeInteger(n) || n < 1 || n > 200) || !Number.isFinite(seconds) || seconds < 1 || seconds > 60) throw new Error('Use concurrency 1..200 and duration 1..60 seconds.');
const fixture = await startFixture();
try {
    for (let index = 0; index < Math.max(...levels); index++) {
        await fixture.db.query("INSERT INTO users (id,username,password,displayname,status) VALUES (?,?,'load-test-only',?,'active')", [20 + index, 'load_reader_' + index, 'Load reader ' + index]);
        await fixture.db.query("INSERT INTO user_roles (user_id,role) VALUES (?,'reader')", [20 + index]);
    }
    for (let index = 0; index < 100; index++) {
        const novel = await fixture.db.query("INSERT INTO novels (title,author_id,genre,status,type) VALUES (?,2,'Fantasy','ongoing','series')", ['Load story ' + index]);
        await fixture.db.query("INSERT INTO chapters (novel_id,volume_name,title,content,status) VALUES (?,'Volume','Chapter','<p>Reading content</p>','published')", [novel.insertId]);
        await fixture.db.query("INSERT INTO forum_posts (title,content,author_id,category) VALUES (?,'A discussion',2,'general')", ['Load discussion ' + index]);
    }
    const reports = [];
    for (const concurrency of levels) {
        const start = performance.now(), deadline = start + seconds * 1000;
        const samples = [], errors = {}, routes = {};
        await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
            const token = fixture.token(20 + worker); let iteration = 0;
            while (performance.now() < deadline) {
                const slot = (worker + iteration++) % 10;
                const endpoint = slot < 5 ? '/novels/catalog?limit=12&page=' + (iteration % 5 + 1) : slot < 7 ? '/chapters/1' : slot < 9 ? '/forum/posts?comments=none&limit=20' : '/reader/progress/1';
                const began = performance.now();
                try {
                    const response = await fetch(fixture.url + '/api' + endpoint, { signal: AbortSignal.timeout(15000),
                        ...(slot === 9 ? { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chapterId: 1, scrollRatio: .5, paragraphIndex: 4, paragraphOffset: .1, updatedAt: Date.now() }) } : {}) });
                    await response.arrayBuffer(); samples.push(performance.now() - began);
                    routes[endpoint.split('?')[0]] = (routes[endpoint.split('?')[0]] || 0) + 1;
                    if (!response.ok) errors[response.status] = (errors[response.status] || 0) + 1;
                } catch { errors.network = (errors.network || 0) + 1; }
                await new Promise(resolve => setTimeout(resolve, 25 + Math.random() * 25));
            }
        }));
        samples.sort((a, b) => a - b);
        const failed = Object.values(errors).reduce((sum, n) => sum + n, 0);
        const elapsed = performance.now() - start;
        const report = { concurrency, seconds, requests: samples.length, requestsPerSecond: +(samples.length / elapsed * 1000).toFixed(1),
            p50Ms: Math.round(samples[Math.floor(samples.length * .5)] || 0), p95Ms: Math.round(samples[Math.floor(samples.length * .95)] || 0),
            p99Ms: Math.round(samples[Math.floor(samples.length * .99)] || 0), failed, errors, routes };
        reports.push(report); console.log(JSON.stringify(report));
        if (failed) process.exitCode = 1;
    }
    const directory = path.join(fixture.root, 'artifacts/performance'); await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'mixed-load.json'), JSON.stringify({ generatedAt: new Date().toISOString(), node: process.version,
        note: 'Loopback test, warm cache, 100 small titles, 25-50ms think time. Concurrent workers are not concurrent real users.', reports }, null, 2));
} finally { await fixture.close(); }
