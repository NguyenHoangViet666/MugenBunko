import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createPaymentFixture } from './paymentFixture.js';
import { migratePaymentSchema } from '../paymentSchemaMigration.js';
import { auditWalletLedger } from '../payments/ledgerAudit.js';

type Fixture = Awaited<ReturnType<typeof createPaymentFixture>>;
async function withDatabase(balances: number[], work: (f: Fixture) => Promise<void>) {
    const fixture = await createPaymentFixture({ legacyCoins: true });
    try {
        for (const [index, coins] of balances.entries()) await fixture.connection.execute(
            "INSERT INTO users (id,username,password,displayname,coins) VALUES (?,?,'fixture','Private fixture name',?)",
            [index + 1, `private_audit_user_${index}`, coins]);
        await migratePaymentSchema(fixture.connection);
        await work(fixture);
    } finally { await fixture.close(); }
}
const second = (f: Fixture) => mysql.createConnection({ ...f.options, database: f.database });
const errorCode = (code: string) => (error: unknown) => (error as { code?: string }).code === code;
async function order(connection: Connection, overrides: Record<string, string | number | null> = {}) {
    const [packages] = await connection.query<RowDataPacket[]>("SELECT id FROM coin_packages WHERE code='xu_100'");
    const record = { id: randomUUID(), user_id: 1, package_id: packages[0].id, provider: 'vnpay', environment: 'sandbox',
        merchant_code: 'PRIVATE_MERCHANT', provider_txn_ref: randomUUID(), package_code: 'xu_100', amount_vnd: 10000,
        coin_amount: 100, currency: 'VND', status: 'paid', fulfillment_status: 'credited',
        credited_at: '2026-11-16 05:03:00.123', idempotency_key: randomUUID(), request_fingerprint: 'a'.repeat(64),
        client: 'web', checkout_snapshot: '{}', created_at: '2026-11-16 05:00:00.123', expires_at: '2026-11-16 05:15:00.123', ...overrides };
    await connection.execute(`INSERT INTO payment_orders (${Object.keys(record).map(key => `\`${key}\``).join(',')})
        VALUES (${Object.keys(record).map(() => '?').join(',')})`, Object.values(record));
    return record.id;
}
const topup = (connection: Connection, orderId: string, delta = 100, balance = 100) => connection.execute(
    `INSERT INTO wallet_entries (user_id,payment_order_id,entry_type,delta_coins,balance_after,reason)
    VALUES (1,?,'topup',?,?,'Private fixture reason')`, [orderId, delta, balance]);
async function cli(f: Fixture, overrides: NodeJS.ProcessEnv = {}) {
    const env = { ...process.env, DB_NAME: f.database, DB_HOST: String(f.options.host), DB_PORT: String(f.options.port),
        DB_USER: String(f.options.user), DB_PASSWORD: String(f.options.password ?? ''), ...overrides };
    try {
        const result = await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../payments/ledgerAuditCli.js', import.meta.url))],
            { env, windowsHide: true, timeout: 30000 });
        return { status: 0, ...result };
    } catch (error) {
        const result = error as { code: number; stdout: string; stderr: string };
        return { status: result.code, stdout: result.stdout, stderr: result.stderr };
    }
}

describe('Payment DB03 read-only operational ledger audit', () => {
    it('accepts an empty migrated database with exact string totals', () => withDatabase([], async f => {
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.valid, true);
        assert.deepEqual(report.totals, { users: '0', orders: '0', entries: '0', coins: '0', ledger: '0' });
        assert.equal(report.schemaVersion, 2);
    }));

    it('accepts zero and maximum openings and keeps large entry IDs private', () => withDatabase([0, 2000000000], async f => {
        await f.connection.query('UPDATE wallet_entries SET id=9007199254740993 WHERE user_id=2');
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.valid, true);
        assert.equal(report.totals.coins, '2000000000');
        const json = JSON.stringify(report);
        for (const privateValue of ['private_audit_user', 'Private fixture', '9007199254740993', f.database]) assert.ok(!json.includes(privateValue));
    }));

    it('accepts an atomic credited order, matching topup and wallet balance', () => withDatabase([20], async f => {
        const id = await order(f.connection);
        await topup(f.connection, id, 100, 120);
        await f.connection.query('UPDATE users SET coins=120 WHERE id=1');
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.valid, true);
        assert.deepEqual(report.totals, { users: '1', orders: '1', entries: '2', coins: '120', ledger: '120' });
    }));

    it('detects per-user balance drift even when system totals still match', () => withDatabase([100, 100], async f => {
        await f.connection.query('UPDATE users SET coins=CASE id WHEN 1 THEN 110 ELSE 90 END');
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.totals.coins, report.totals.ledger);
        assert.equal(report.violations.mismatchedUsers, 2);
        assert.equal(report.valid, false);
    }));

    it('detects missing openings and incorrect versioned opening keys', () => withDatabase([0, 0], async f => {
        await f.connection.query('DELETE FROM wallet_entries WHERE user_id=1');
        await f.connection.query("UPDATE wallet_entries SET migration_key='wrong:2' WHERE user_id=2");
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.violations.invalidOpenings, 1);
        assert.equal(report.violations.invalidOpeningKeys, 1);
        assert.equal(report.valid, false);
    }));

    it('detects an incorrect intermediate balance despite a matching final ledger sum', () => withDatabase([20], async f => {
        const id = await order(f.connection);
        await topup(f.connection, id, 100, 999);
        await f.connection.query('UPDATE users SET coins=120 WHERE id=1');
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.violations.mismatchedUsers, 0);
        assert.equal(report.violations.invalidRunningBalances, 1);
        assert.equal(report.valid, false);
    }));

    it('detects a credited order whose ledger entry was never committed', () => withDatabase([0], async f => {
        await order(f.connection);
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.violations.creditedOrdersWithoutEntry, 1);
        assert.equal(report.valid, false);
    }));

    it('accepts a paid needs_review order without minting a ledger entry', () => withDatabase([0], async f => {
        await order(f.connection, { fulfillment_status: 'needs_review', credited_at: null, review_reason: 'BALANCE_LIMIT' });
        assert.equal((await auditWalletLedger(f.connection)).valid, true);
    }));

    it('detects a topup on a pending order and a topup amount different from its snapshot', () => withDatabase([0], async f => {
        const id = await order(f.connection, { status: 'pending', fulfillment_status: 'pending', credited_at: null });
        await topup(f.connection, id, 90, 90);
        await f.connection.query('UPDATE users SET coins=90 WHERE id=1');
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.violations.unexpectedTopups, 1);
        assert.equal(report.violations.incorrectTopupAmounts, 1);
        assert.equal(report.valid, false);
    }));

    it('detects orphan entries introduced by a privileged writer bypassing FK checks', () => withDatabase([], async f => {
        await f.connection.query('SET FOREIGN_KEY_CHECKS=0');
        try { await f.connection.query(`INSERT INTO wallet_entries (user_id,entry_type,delta_coins,balance_after,reason,migration_key)
            VALUES (999999,'opening_balance',0,0,'Fixture orphan','opening:v1:999999')`); }
        finally { await f.connection.query('SET FOREIGN_KEY_CHECKS=1'); }
        const report = await auditWalletLedger(f.connection);
        assert.equal(report.violations.orphanEntries, 1);
        assert.equal(report.valid, false);
    }));

    it('keeps one consistent snapshot while another connection commits a complete topup', () => withDatabase([0], async f => {
        const writer = await second(f);
        const original = f.connection.query.bind(f.connection);
        let committed = false;
        f.connection.query = (async (...args: unknown[]) => {
            const result = await (original as (...args: unknown[]) => Promise<unknown>)(...args);
            if (typeof args[0] === 'string' && args[0].includes('DB03 audit: user balances') && !committed) {
                await writer.beginTransaction();
                try {
                    const id = await order(writer);
                    await topup(writer, id);
                    await writer.query('UPDATE users SET coins=100 WHERE id=1');
                    await writer.commit(); committed = true;
                } catch (error) { await writer.rollback(); throw error; }
            }
            return result;
        }) as typeof f.connection.query;
        try {
            const report = await auditWalletLedger(f.connection);
            assert.equal(committed, true);
            assert.equal(report.valid, true);
            assert.equal(report.totals.coins, '0');
            assert.equal(report.totals.orders, '0');
            f.connection.query = original;
            const after = await auditWalletLedger(f.connection);
            assert.equal(after.valid, true);
            assert.equal(after.totals.coins, '100');
        } finally { f.connection.query = original; await writer.end(); }
    }));

    it('rejects an existing transaction without committing or rolling back caller changes', () => withDatabase([0], async f => {
        await f.connection.beginTransaction();
        try {
            await f.connection.query('UPDATE users SET coins=10 WHERE id=1');
            await assert.rejects(auditWalletLedger(f.connection), errorCode('ER_CANT_CHANGE_TX_CHARACTERISTICS'));
            const [rows] = await f.connection.query<RowDataPacket[]>('SELECT coins FROM users WHERE id=1');
            assert.equal(rows[0].coins, 10);
        } finally { await f.connection.rollback(); }
        assert.equal((await auditWalletLedger(f.connection)).valid, true);
    }));

    it('enforces a server-side read-only transaction and releases it after inspection', () => withDatabase([0], async f => {
        const original = f.connection.query.bind(f.connection);
        let checked = false;
        f.connection.query = (async (...args: unknown[]) => {
            const result = await (original as (...args: unknown[]) => Promise<unknown>)(...args);
            if (typeof args[0] === 'string' && args[0].startsWith('START TRANSACTION')) {
                await assert.rejects(original('UPDATE users SET coins=1 WHERE id=1'),
                    errorCode('ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION'));
                checked = true;
            }
            return result;
        }) as typeof f.connection.query;
        try {
            assert.equal((await auditWalletLedger(f.connection)).valid, true);
            assert.equal(checked, true);
        } finally { f.connection.query = original; }
        // A write after the audit must not remain trapped in its read-only txn.
        await f.connection.beginTransaction();
        try { await f.connection.query('UPDATE users SET coins=1 WHERE id=1'); }
        finally { await f.connection.rollback(); }
    }));

    it('returns actual CLI exits 0 for clean data and 2 for drift without printing private fields', () => withDatabase([0], async f => {
        const success = await cli(f);
        assert.equal(success.status, 0, success.stderr);
        assert.equal(JSON.parse(success.stdout).valid, true);
        await f.connection.query('UPDATE users SET coins=1 WHERE id=1');
        const failed = await cli(f);
        assert.equal(failed.status, 2, failed.stderr);
        assert.equal(JSON.parse(failed.stdout).violations.mismatchedUsers, 1);
        for (const result of [success, failed]) {
            assert.equal(result.stderr, '');
            assert.ok(!result.stdout.includes('private_audit_user'));
            assert.ok(!result.stdout.includes('Private fixture'));
        }
    }));

    it('returns CLI exit 1 for missing schema and sanitized connection failures', async () => {
        const f = await createPaymentFixture();
        try {
            const missing = await cli(f);
            assert.equal(missing.status, 1);
            assert.equal(missing.stdout, '');
            assert.match(missing.stderr, /^Payment ledger audit failed\. PAYMENT_SCHEMA_[A-Z_]+\r?\n$/);
            const invalid = await cli(f, { DB_PORT: 'invalid', DB_PASSWORD: 'PRIVATE_SECRET_NOT_FOR_OUTPUT' });
            assert.equal(invalid.status, 1);
            assert.equal(invalid.stdout, '');
            assert.match(invalid.stderr, /CHECK_DATABASE_CONFIGURATION/);
            assert.ok(!invalid.stderr.includes('PRIVATE_SECRET'));
            assert.ok(!invalid.stderr.includes(f.database));
        } finally { await f.close(); }
    });
});
