import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { paymentSchema } from '../paymentSchema.js';
import { INITIAL_COIN_PACKAGES, PAYMENT_LIMITS } from '../payments/contracts.js';
import { localDatabaseOptions } from '../payments/localDatabase.js';
import { inspectCoinBalances } from '../payments/preflight.js';
import { createPaymentFixture } from './paymentFixture.js';

const code = (expected: string) => (error: unknown) => (error as { code?: string }).code === expected;
const checkViolation = code('ER_CHECK_CONSTRAINT_VIOLATED');

describe('Payment T01 schema and isolated migration environment', () => {
    let fixture: Awaited<ReturnType<typeof createPaymentFixture>>;
    let packageId: number;
    before(async () => {
        fixture = await createPaymentFixture();
        await fixture.connection.query(`INSERT INTO users (id,username,password,displayname,coins) VALUES
            (2,'payment_reader','fixture-only','Payment reader',0),
            (3,'payment_other','fixture-only','Payment other',1250)`);
        await fixture.connection.query(paymentSchema);
        for (const item of INITIAL_COIN_PACKAGES) {
            await fixture.connection.execute('INSERT INTO coin_packages (code,name,amount_vnd,coin_amount) VALUES (?,?,?,?)',
                [item.code, item.name, item.amountVnd, item.coinAmount]);
        }
        const [rows] = await fixture.connection.query<RowDataPacket[]>("SELECT id FROM coin_packages WHERE code='xu_100'");
        packageId = rows[0].id;
    });
    after(async () => { await fixture?.close(); });

    const rollbackCase = async (work: () => Promise<void>) => {
        await fixture.connection.beginTransaction();
        try { await work(); } finally { await fixture.connection.rollback(); }
    };

    const order = async (overrides: Record<string, string | number | null> = {}) => {
        const record = {
            id: randomUUID(), user_id: 2, package_id: packageId, provider: 'vnpay', environment: 'sandbox',
            merchant_code: 'TEST_MERCHANT', provider_txn_ref: randomBytes(10).toString('hex'), package_code: 'xu_100',
            amount_vnd: 10000, coin_amount: 100, currency: 'VND', status: 'pending', fulfillment_status: 'pending',
            idempotency_key: randomUUID(), request_fingerprint: 'a'.repeat(64), client: 'web', checkout_snapshot: '{}',
            created_at: '2026-10-28 05:00:00.123', expires_at: '2026-10-28 05:15:00.123', ...overrides,
        };
        const fields = Object.keys(record);
        // Only this private fixture supplies identifiers. Values stay parameterized.
        await fixture.connection.execute(`INSERT INTO payment_orders (${fields.map(field => `\`${field}\``).join(',')})
            VALUES (${fields.map(() => '?').join(',')})`, Object.values(record));
        return record;
    };
    const paidOrder = (overrides: Record<string, string | number | null> = {}) => order({
        status: 'paid', fulfillment_status: 'credited', credited_at: '2026-10-28 05:03:00.123', ...overrides,
    });
    const topup = (orderId: string, userId = 2, balanceAfter = 100) => fixture.connection.execute(
        `INSERT INTO wallet_entries (user_id,payment_order_id,entry_type,delta_coins,balance_after,reason)
        VALUES (?,?,'topup',100,?,'Fixture topup')`, [userId, orderId, balanceAfter]);

    it('owns a random test database, loads no sample admin and leaves app configuration alone', async () => {
        assert.match(fixture.database, /^mugenbunko_payment_test_[a-f0-9]{16}$/);
        const [rows] = await fixture.connection.query<RowDataPacket[]>('SELECT DATABASE() AS database_name');
        assert.equal(rows[0].database_name, fixture.database);
        assert.notEqual(process.env.DB_NAME, fixture.database);
        const [users] = await fixture.connection.query<RowDataPacket[]>('SELECT id,coins FROM users ORDER BY id');
        assert.deepEqual(users.map(user => [user.id, user.coins]), [[2, 0], [3, 1250]]);
    });

    it('bootstraps all five tables repeatedly without backfilling, reseeding or changing legacy balances', async () => {
        await fixture.connection.query(paymentSchema);
        const [tables] = await fixture.connection.query<RowDataPacket[]>(`SELECT TABLE_NAME AS name FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('coin_packages','payment_orders','wallet_entries','payment_events','payment_audit')`);
        assert.equal(tables.length, 5);
        const report = await inspectCoinBalances(fixture.connection);
        assert.equal(report.totalCoins, '1250');
        assert.equal(report.coinColumn.defaultValue, '1000');
        assert.equal(report.coinColumn.nullable, true);
        const [packages] = await fixture.connection.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM coin_packages');
        assert.equal(Number(packages[0].count), 3);
    });

    it('enforces package and order amount, currency and coin limits in MySQL', () => rollbackCase(async () => {
        await assert.rejects(fixture.connection.execute(
            "INSERT INTO coin_packages (code,name,amount_vnd,coin_amount) VALUES ('bad','Bad',0,100)"), checkViolation);
        await assert.rejects(order({ amount_vnd: PAYMENT_LIMITS.maxAmountVnd + 1 }), checkViolation);
        await assert.rejects(order({ coin_amount: PAYMENT_LIMITS.maxBalanceCoins + 1 }), checkViolation);
        await assert.rejects(order({ currency: 'USD' }), checkViolation);
        await assert.rejects(order({ client: 'arbitrary_url' }), checkViolation);
    }));

    it('scopes idempotency to the user with case-sensitive keys', () => rollbackCase(async () => {
        await order({ idempotency_key: 'Intent-A' });
        await assert.rejects(order({ idempotency_key: 'Intent-A' }), code('ER_DUP_ENTRY'));
        await order({ idempotency_key: 'intent-a' });
        await order({ user_id: 3, idempotency_key: 'Intent-A' });
        await assert.rejects(order({ idempotency_key: '' }), checkViolation);
    }));

    it('scopes provider references and successful transaction IDs to merchant and environment', () => rollbackCase(async () => {
        await order({ provider_txn_ref: 'reference-a', provider_transaction_id: '1234' });
        await assert.rejects(order({ provider_txn_ref: 'reference-a' }), code('ER_DUP_ENTRY'));
        await assert.rejects(order({ provider_transaction_id: '1234' }), code('ER_DUP_ENTRY'));
        await order({ environment: 'live', provider_txn_ref: 'reference-a', provider_transaction_id: '1234' });
        await order({ merchant_code: 'ANOTHER_TEST_MERCHANT', provider_txn_ref: 'reference-a', provider_transaction_id: '1234' });
        await order(); await order(); // Several NULL transaction IDs are allowed.
        await assert.rejects(order({ provider_transaction_id: '0' }), checkViolation);
    }));

    it('requires consistent money, fulfillment, review and credit-time states', () => rollbackCase(async () => {
        await assert.rejects(order({ fulfillment_status: 'credited' }), checkViolation);
        await assert.rejects(order({ status: 'paid' }), checkViolation);
        await assert.rejects(order({ status: 'paid', fulfillment_status: 'needs_review' }), checkViolation);
        await assert.rejects(paidOrder({ review_reason: 'unexpected' }), checkViolation);
        await paidOrder();
        await order({ status: 'paid', fulfillment_status: 'needs_review', review_reason: 'BALANCE_LIMIT' });
    }));

    it('rejects impossible expiry, partial leases and non-object checkout snapshots', () => rollbackCase(async () => {
        await assert.rejects(order({ expires_at: '2026-10-28 04:59:00.000' }), checkViolation);
        await assert.rejects(order({ lease_owner: 'worker-a' }), checkViolation);
        await assert.rejects(order({ checkout_snapshot: '[]' }), checkViolation);
        await order({ lease_owner: 'worker-a', lease_until: '2026-10-28 05:01:00.000' });
    }));

    it('protects order ownership and prevents a second topup for the same order', () => rollbackCase(async () => {
        const saved = await paidOrder();
        await assert.rejects(topup(saved.id, 3), code('ER_NO_REFERENCED_ROW_2'));
        await topup(saved.id);
        await assert.rejects(topup(saved.id), code('ER_DUP_ENTRY'));
        await assert.rejects(fixture.connection.execute('DELETE FROM users WHERE id=2'), code('ER_ROW_IS_REFERENCED_2'));
        await assert.rejects(fixture.connection.execute('DELETE FROM coin_packages WHERE id=?', [packageId]), code('ER_ROW_IS_REFERENCED_2'));
    }));

    it('keeps one opening per user even with a different migration key and rejects malformed ledger rows', () => rollbackCase(async () => {
        const insert = (balance: number, delta: number, key: string) => fixture.connection.execute(
            `INSERT INTO wallet_entries (user_id,entry_type,delta_coins,balance_after,reason,migration_key)
            VALUES (2,'opening_balance',?,?,'Fixture opening',?)`, [delta, balance, key]);
        await assert.rejects(insert(-1, -1, 'negative'), checkViolation);
        await assert.rejects(insert(PAYMENT_LIMITS.maxBalanceCoins + 1, 0, 'overflow'), checkViolation);
        await assert.rejects(insert(50, 40, 'mismatched'), checkViolation);
        await insert(0, 0, 'opening:v1:2');
        await assert.rejects(insert(0, 0, 'opening:v1:2'), code('ER_DUP_ENTRY'));
        await assert.rejects(insert(0, 0, 'different-key-same-user'), code('ER_DUP_ENTRY'));
        const saved = await paidOrder();
        await assert.rejects(topup(saved.id, 2, 99), checkViolation);
    }));

    it('keeps order price snapshots independent of later package changes and preserves milliseconds', () => rollbackCase(async () => {
        const saved = await order();
        await fixture.connection.execute('UPDATE coin_packages SET amount_vnd=20000 WHERE id=?', [packageId]);
        const [rows] = await fixture.connection.execute<RowDataPacket[]>(
            "SELECT amount_vnd,coin_amount,DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s.%f') AS created FROM payment_orders WHERE id=?", [saved.id]);
        assert.equal(rows[0].amount_vnd, 10000);
        assert.equal(rows[0].coin_amount, 100);
        assert.equal(rows[0].created, '2026-10-28 05:00:00.123000');
    }));

    it('retains event attempts and audit when an actor account is removed, and serializes BIGINT IDs safely', () => rollbackCase(async () => {
        await fixture.connection.execute(`INSERT INTO payment_events
            (provider,environment,merchant_code,source,event_fingerprint,verification_result,processing_result,safe_payload)
            VALUES ('vnpay','sandbox','TEST_MERCHANT','ipn',?,'invalid','rejected','{}'),
                   ('vnpay','sandbox','TEST_MERCHANT','ipn',?,'invalid','rejected','{}')`, ['b'.repeat(64), 'b'.repeat(64)]);
        await fixture.connection.execute(`INSERT INTO payment_audit (id,actor_user_id,action,reason,request_id)
            VALUES ('9007199254740993',3,'test_action','Fixture audit','test-request')`);
        await fixture.connection.execute('DELETE FROM users WHERE id=3');
        const [rows] = await fixture.connection.query<RowDataPacket[]>('SELECT id,actor_user_id FROM payment_audit');
        assert.equal(rows[0].id, '9007199254740993');
        assert.equal(rows[0].actor_user_id, null);
    }));

    it('preflights legacy NULL, negative and excessive balances without repairing them', () => rollbackCase(async () => {
        await fixture.connection.execute(`INSERT INTO users (username,password,displayname,coins) VALUES
            ('legacy_null','fixture-only','Null',NULL),('legacy_negative','fixture-only','Negative',-5),
            ('legacy_overflow','fixture-only','Overflow',?)`, [PAYMENT_LIMITS.maxBalanceCoins + 1]);
        const report = await inspectCoinBalances(fixture.connection);
        assert.deepEqual(report.invalid, { nullCount: 1, negativeCount: 1, aboveLimitCount: 1 });
        assert.equal(report.readyForOpeningBalance, false);
        assert.equal(report.coinColumnNeedsMigration, true);
        const [rows] = await fixture.connection.query<RowDataPacket[]>("SELECT coins FROM users WHERE username='legacy_negative'");
        assert.equal(rows[0].coins, -5);
    }));

    it('can inspect a READ ONLY transaction while MySQL blocks accidental writes', async () => {
        await fixture.connection.query('START TRANSACTION READ ONLY');
        try {
            const report = await inspectCoinBalances(fixture.connection);
            assert.equal(report.readyForOpeningBalance, true);
            assert.equal(report.totalCoins, '1250');
            await assert.rejects(fixture.connection.execute('UPDATE users SET coins=999 WHERE id=2'), code('ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION'));
        } finally { await fixture.connection.rollback(); }
    });

    it('requires an explicit test host for remote DBs, accepts a separate empty test password, and never selects DB_NAME', () => {
        assert.throws(() => localDatabaseOptions({ DB_HOST: 'production.example.test' }, 'test'), /TEST_DB_HOST/);
        const options = localDatabaseOptions({
            DB_NAME: 'do_not_touch', DB_HOST: 'production.example.test', DB_PASSWORD: 'not-used',
            TEST_DB_HOST: '127.0.0.1', TEST_DB_USER: 'payment_test', TEST_DB_PASSWORD: '',
        }, 'test');
        assert.equal(options.host, '127.0.0.1');
        assert.equal(options.user, 'payment_test');
        assert.equal(options.password, '');
        assert.equal(options.database, undefined);
        const emptyOptions = localDatabaseOptions({ DB_HOST: '', DB_PORT: '', DB_USER: '', DB_PASSWORD: '' }, 'test');
        assert.equal(emptyOptions.host, 'localhost');
        assert.equal(emptyOptions.port, 3306);
        assert.equal(emptyOptions.user, 'root');
        assert.equal(emptyOptions.password, '');
        assert.throws(() => localDatabaseOptions({ DB_PORT: '3306oops' }, 'test'), /port/);
    });
});
