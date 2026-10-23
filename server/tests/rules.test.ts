import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import mysql, { type Connection } from 'mysql2/promise';
import { communityRules, type CommunityRule } from '../communityRules.js';
import { initializeCommunityRules } from '../communityRulesMigration.js';
import { startFixture } from './fixture.js';

describe('Community rules publishing', () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>;
    let migrationConnection: Connection;
    const storedRules = () => fixture.db.query<Array<CommunityRule & { id: number }>>('SELECT id, title, content, order_index FROM `rules` ORDER BY order_index, id');
    const restoreLegacy = async () => {
        const legacy: CommunityRule[] = JSON.parse(fs.readFileSync(path.join(fixture.root, 'server/tests/fixtures/community-rules-v1.json'), 'utf8'));
        await fixture.db.query('DELETE FROM `rules`');
        for (const [index, rule] of legacy.entries()) {
            await fixture.db.query('INSERT INTO `rules` (id, title, content, order_index) VALUES (?, ?, ?, ?)', [101 + index, rule.title, rule.content, rule.order_index]);
        }
        return storedRules();
    };
    const request = async (route: string, method = 'GET', body?: unknown, userId?: number) => {
        const response = await fetch(`${fixture.url}/api${route}`, { method, headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(userId ? { Authorization: `Bearer ${fixture.token(userId)}` } : {})
        }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { response, status: response.status, data: await response.json() };
    };
    const payload = { title: 'Điều khoản thử nghiệm', content: 'Đoạn một.\nDòng kế tiếp.\n\nĐoạn hai.', orderIndex: 15 };
    before(async () => {
        fixture = await startFixture();
        migrationConnection = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
        await fixture.db.query("INSERT INTO user_roles (user_id, role) VALUES (2, 'admin')");
    });
    after(async () => { await migrationConnection?.end(); await fixture?.close(); });

    it('publishes all 25 default articles with complete Vietnamese content on a fresh installation', async () => {
        const rules = (await request('/policies')).data;
        assert.equal(rules.length, 25);
        assert.deepEqual(rules.map(({ title, content, order_index }: CommunityRule) => ({ title, content, order_index })), communityRules);
        assert.equal(await initializeCommunityRules(migrationConnection), 'unchanged');
        assert.deepEqual((await request('/policies')).data, rules);
    });

    it('is public to read, admin-only to publish, and validates types and storage limits', async () => {
        const publicRules = await request('/policies');
        assert.equal(publicRules.status, 200); assert.ok(publicRules.data.length > 0);
        assert.equal(publicRules.response.headers.get('cache-control'), 'no-store');
        assert.ok(publicRules.data[0].updated_at);
        assert.equal((await request('/admin/rules', 'POST', payload)).status, 401);
        assert.equal((await request('/admin/rules', 'POST', payload, 3)).status, 403);
        for (const invalid of [{ title: [] }, { title: '   ' }, { title: 'a'.repeat(256) }, { content: {} }, { content: 'あ'.repeat(20001) }, { orderIndex: 1.5 }, { orderIndex: -1 }, { orderIndex: '10' }]) {
            assert.equal((await request('/admin/rules', 'POST', { ...payload, ...invalid }, 2)).status, 400);
        }
        const created = await request('/admin/rules', 'POST', { ...payload, title: `  ${payload.title}  ` }, 2);
        assert.equal(created.status, 201); assert.equal(created.data.rule.title, payload.title);
        const rules = (await request('/policies')).data;
        const index = rules.findIndex((rule: any) => rule.id === created.data.rule.id);
        assert.equal(rules[index].content, payload.content);
        assert.ok(rules[index - 1].order_index <= 15 && rules[index + 1].order_index >= 15);
    });
    it('publishes one concurrent edit, rejects stale updates and deletes, and reports removed records', async () => {
        const original = (await request('/admin/rules', 'POST', payload, 2)).data.rule;
        assert.equal((await request(`/admin/rules/${original.id}`, 'PUT', payload, 2)).status, 400);
        const results = await Promise.all(['Bản thứ nhất', 'Bản thứ hai'].map(content => request(`/admin/rules/${original.id}`, 'PUT', { ...payload, content, baseRule: original }, 2)));
        assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
        const published = results.find(result => result.status === 200)!.data.rule;
        assert.equal(results.find(result => result.status === 409)!.data.rule.content, published.content);
        assert.equal((await request(`/admin/rules/${original.id}`, 'DELETE', { baseRule: original }, 2)).status, 409);
        assert.equal((await request(`/admin/rules/${original.id}`, 'DELETE', { baseRule: published }, 2)).status, 200);
        assert.equal((await request(`/admin/rules/${original.id}`, 'DELETE', { baseRule: published }, 2)).status, 404);
        assert.equal((await request(`/admin/rules/${original.id}`, 'PUT', { ...payload, baseRule: published }, 2)).status, 404);
        assert.ok(!(await request('/policies')).data.some((rule: any) => rule.id === original.id));
    });
    it('upgrades the exact five-rule legacy document once and preserves existing section IDs', async () => {
        const original = await restoreLegacy();
        assert.equal(await initializeCommunityRules(migrationConnection), 'upgraded');
        const upgraded = await storedRules();
        assert.equal(upgraded.length, 25);
        assert.deepEqual(upgraded.slice(0, 5).map(rule => rule.id), original.map(rule => rule.id));
        assert.deepEqual(upgraded.map(({ title, content, order_index }) => ({ title, content, order_index })), communityRules);
        assert.equal(await initializeCommunityRules(migrationConnection), 'unchanged');
        assert.deepEqual(await storedRules(), upgraded);
        await fixture.db.query('DELETE FROM `rules` WHERE id = ?', [upgraded[24].id]);
        assert.equal(await initializeCommunityRules(migrationConnection), 'unchanged');
        assert.equal((await storedRules()).length, 24);
    });
    it('preserves admin changes, additions and deletions in legacy documents', async () => {
        for (const mutation of [
            "UPDATE `rules` SET content = CONCAT(content, ' Bản riêng của admin.') WHERE id = 101",
            "UPDATE `rules` SET order_index = 11 WHERE id = 101",
            "INSERT INTO `rules` (title, content, order_index) VALUES ('Quy định riêng', 'Nội dung riêng', 60)",
            'DELETE FROM `rules` WHERE id = 105'
        ]) {
            await restoreLegacy();
            await fixture.db.query(mutation);
            const original = await storedRules();
            assert.equal(await initializeCommunityRules(migrationConnection), 'unchanged');
            assert.deepEqual(await storedRules(), original);
        }
    });
    it('rolls back updates and additions together if publishing the catalog fails', async () => {
        const original = await restoreLegacy();
        await migrationConnection.query("CREATE TRIGGER reject_rules_upgrade BEFORE INSERT ON `rules` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fixture rejects catalog insert'");
        try {
            await assert.rejects(initializeCommunityRules(migrationConnection), /Fixture rejects catalog insert/);
            assert.deepEqual(await storedRules(), original);
        } finally {
            await migrationConnection.query('DROP TRIGGER reject_rules_upgrade');
        }
        assert.equal(await initializeCommunityRules(migrationConnection), 'upgraded');
    });
    it('keeps an intentionally empty document empty after restarting database initialization', async () => {
        await fixture.db.query('DELETE FROM `rules`');
        await fixture.db.closeDbConnection();
        await fixture.db.initializeDbConnection();
        assert.deepEqual((await request('/policies')).data, []);
    });
});
