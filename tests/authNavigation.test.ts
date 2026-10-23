import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authHref, parseAuthHash, safeAuthReturn } from '../src/utils/authNavigation.ts';

describe('Authentication return navigation', () => {
    it('retains the requested library, reader, forum thread and public profile', () => {
        for (const target of ['#/library', '#/studio', '#/novel/12/reader/3', '#/forum?post=42', '#/profile/nguy%E1%BB%85n', '#/rules', '#/rules?section=3']) {
            assert.deepEqual(parseAuthHash(authHref('login', target)), { mode: 'login', returnTo: target });
            assert.equal(parseAuthHash(authHref('register', target))?.returnTo, target);
            assert.equal(parseAuthHash(authHref('forgot-password', target))?.returnTo, target);
        }
    });
    it('rejects external URLs, authentication loops and malformed route data', () => {
        for (const target of ['https://example.com', '//example.com', '#//example.com', '#/login', '#/forgot-password', '#/register?returnTo=%23%2Flogin', '#/profile/%zz', '#/novel/1/reader/-2']) {
            assert.equal(safeAuthReturn(target), '#/');
        }
        assert.equal(parseAuthHash('#/login?returnTo=https%3A%2F%2Fexample.com')?.returnTo, '#/');
    });
    it('supports direct links and distinguishes public content from auth screens', () => {
        assert.deepEqual(parseAuthHash('#/login'), { mode: 'login', returnTo: '#/' });
        assert.deepEqual(parseAuthHash('#/register'), { mode: 'register', returnTo: '#/' });
        assert.deepEqual(parseAuthHash('#/forgot-password'), { mode: 'forgot-password', returnTo: '#/' });
        assert.equal(parseAuthHash('#/novel/1'), null);
    });
});
