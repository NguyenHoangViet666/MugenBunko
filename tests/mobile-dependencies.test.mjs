import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const queryStringPath = require.resolve('../mobile/node_modules/query-string');

test('Expo query-string keeps its CommonJS API with the patched ESM URI decoder', () => {
    const query = require(queryStringPath);
    const parsed = query.parse('title=M%C3%B9a%20xu%C3%A2n&tag=one&tag=two');
    assert.equal(parsed.title, 'Mùa xuân');
    assert.deepEqual(parsed.tag, ['one', 'two']);
    assert.equal(query.stringify({ title: 'Mùa xuân' }), 'title=M%C3%B9a%20xu%C3%A2n');
});

test('malformed percent-encoded input cannot stall URL query decoding', () => {
    const result = spawnSync(process.execPath, ['-e', `
        const query = require(${JSON.stringify(queryStringPath)});
        for (const value of ['%E0%A4'.repeat(2000), '%C0%AF'.repeat(2000), '%'.repeat(10000)]) {
            query.parse('value=' + value);
        }
    `], { encoding: 'utf8', timeout: 3000, windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
});
