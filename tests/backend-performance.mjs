import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { startFixture } from '../server/dist/tests/fixture.js';

const label = process.argv[2] || 'current';
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid report label');
const fixture = await startFixture();
try {
    const bulk = async (sql, rows) => {
        for (let offset = 0; offset < rows.length; offset += 250) {
            const chunk = rows.slice(offset, offset + 250);
            await fixture.db.query(sql + chunk.map(row => '(' + row.map(() => '?').join(',') + ')').join(','), chunk.flat());
        }
    };
    await bulk('INSERT INTO novels (id,title,author_id,genre,`reads`) VALUES ', Array.from({ length: 100 }, (_, i) => [100 + i, 'Benchmark novel ' + i, 2, 'Fantasy', 1000 + i]));
    await bulk('INSERT INTO chapters (novel_id,volume_name,title,content,status) VALUES ', Array.from({ length: 5000 }, (_, i) => [100 + Math.floor(i / 50), 'Volume', 'Chapter ' + i, '<p>Benchmark content</p>', 'published']));
    await bulk('INSERT INTO forum_posts (id,title,content,author_id,category) VALUES ', Array.from({ length: 100 }, (_, i) => [100 + i, 'Benchmark post ' + i, 'A short discussion.', 2, 'general']));
    await bulk('INSERT INTO forum_comments (post_id,user_id,text) VALUES ', Array.from({ length: 5000 }, (_, i) => [100 + Math.floor(i / 50), 3, 'Benchmark comment ' + i]));
    await fixture.db.query('UPDATE chapters SET content = ? WHERE id = 1', ['<p>' + 'A long chapter with safe formatting. '.repeat(4000) + '</p>']);
    const original = fixture.db.query; let queryCount = 0;
    fixture.db.query = async (...args) => { queryCount++; return original(...args); };
    const request = async endpoint => {
        const start = performance.now();
        const response = await fetch(fixture.url + '/api' + endpoint, { headers: { Authorization: 'Bearer ' + fixture.token(2) } });
        const body = await response.arrayBuffer();
        if (!response.ok) throw new Error('Benchmark request failed: ' + response.status);
        return { ms: performance.now() - start, bytes: body.byteLength };
    };
    const endpoints = [
        ['/novels?limit=100', 'catalog'], ['/forum/posts?limit=100', 'forum-full'],
        ['/forum/posts?limit=100&comments=none', 'forum-feed'], ['/chapters/1', 'chapter'], ['/auth/refresh/2', 'session'],
    ];
    const results = [];
    for (const [endpoint, name] of endpoints) {
        for (let i = 0; i < 3; i++) await request(endpoint);
        queryCount = 0; const samples = [];
        const start = performance.now();
        for (let i = 0; i < 4; i++) samples.push(...await Promise.all(Array.from({ length: 5 }, () => request(endpoint))));
        const elapsed = performance.now() - start;
        const sorted = samples.map(s => s.ms).sort((a, b) => a - b);
        results.push({ name, requests: samples.length, concurrency: 5, p50Ms: Math.round(sorted[9]), p95Ms: Math.round(sorted[18]),
            requestsPerSecond: +(samples.length * 1000 / elapsed).toFixed(1), bytes: samples[0].bytes, sqlPerRequest: queryCount / samples.length });
    }
    const report = { label, node: process.version, dataset: { novels: 100, chaptersPerNovel: 50, forumPosts: 100, commentsPerPost: 50 }, results };
    const directory = path.join(fixture.root, 'artifacts/performance'); await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, label + '.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
} finally { await fixture.close(); }
