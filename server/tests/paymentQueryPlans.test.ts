import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { paymentSchema } from '../paymentSchema.js';
import { createPaymentFixture } from './paymentFixture.js';
import { explainPaymentQuery, paymentHistoryQuery, reconcileCandidatesQuery, walletHistoryQuery,
    type PaymentHistoryCursor, type PaymentQuery } from '../payments/queryPlans.js';

const at = '2026-11-16 08:00:00.123';
const now = '2026-11-16 09:00:00.123';
const scope = { environment: 'sandbox' as const, merchantCode: 'DB03_TEST' };
const orderId = (id: number) => `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`;
const largeId = 9007199254740993n;

describe('Payment DB03 real query contracts and optimizer plans', () => {
    let fixture: Awaited<ReturnType<typeof createPaymentFixture>>;
    const run = async (query: PaymentQuery) => (await fixture.connection.execute<RowDataPacket[]>(query.sql, query.values))[0];
    const expectedDue: string[] = [];

    before(async () => {
        fixture = await createPaymentFixture();
        await fixture.connection.query(paymentSchema);
        await fixture.connection.query("INSERT INTO coin_packages (id,code,name,amount_vnd,coin_amount) VALUES (1,'db03','Query fixture',10000,100)");
        const users = Array.from({ length: 64 }, (_, i) => [i + 1, `query_${i + 1}`, 'fixture-only', 'Query fixture', 0]);
        await fixture.connection.query('INSERT INTO users (id,username,password,displayname,coins) VALUES ?', [users]);
        const orders: (string | number | null)[][] = [];
        const entries: (string | number | null)[][] = [];
        for (let i = 0; i < 64; i++) entries.push([i === 0 ? '1' : (largeId + BigInt(i)).toString(), i + 1, null, 'opening_balance', 0, 0, `opening:v1:${i + 1}`, at]);
        for (let i = 1; i <= 4096; i++) {
            const userId = ((i - 1) % 64) + 1;
            // Sparse pending rows exercise due, future, active-lease and merchant exclusions.
            const candidate = i % 64 === 0;
            const kind = Math.floor(i / 64) % 4;
            const pending = candidate;
            const due = pending ? (kind === 1 ? '2026-11-17 08:00:00.123' : at) : null;
            const leased = pending && kind === 2;
            const merchant = pending && kind === 3 ? 'OTHER_MERCHANT' : scope.merchantCode;
            const id = orderId(i);
            orders.push([id, userId, 1, 'vnpay', 'sandbox', merchant, `ref_${i}`, 'db03', 10000, 100, 'VND',
                pending ? 'pending' : 'paid', pending ? 'pending' : 'credited', pending ? null : at,
                `key_${i}`, 'a'.repeat(64), 'web', '{}', at, '2026-11-16 08:15:00.123', due,
                leased ? 'other_worker' : null, leased ? '2026-11-16 10:00:00.123' : null]);
            if (pending && kind === 0) expectedDue.push(id);
            const mixedLengthId = ({ 1: '9', 65: '10', 129: '100' } as Record<number, string>)[i];
            if (!pending) entries.push([mixedLengthId ?? (largeId + 64n + BigInt(i)).toString(), userId, id, 'topup', 100, 100, null, at]);
        }
        for (let start = 0; start < orders.length; start += 256) await fixture.connection.query(`INSERT INTO payment_orders
            (id,user_id,package_id,provider,environment,merchant_code,provider_txn_ref,package_code,amount_vnd,coin_amount,currency,
             status,fulfillment_status,credited_at,idempotency_key,request_fingerprint,client,checkout_snapshot,created_at,expires_at,
             reconcile_after,lease_owner,lease_until) VALUES ?`, [orders.slice(start, start + 256)]);
        for (let start = 0; start < entries.length; start += 256) await fixture.connection.query(`INSERT INTO wallet_entries
            (id,user_id,payment_order_id,entry_type,delta_coins,balance_after,migration_key,created_at,reason)
            VALUES ?`, [entries.slice(start, start + 256).map(row => [...row, 'Query fixture'])]);
        await fixture.connection.query('ANALYZE TABLE payment_orders,wallet_entries');
    });
    after(async () => { await fixture?.close(); });

    const assertIndexed = async (query: PaymentQuery, table: string, key: string, maxEstimate: number) => {
        const plan = await explainPaymentQuery(fixture.connection, query);
        const access = plan.tables.find(item => item.table === table);
        assert.ok(access, 'EXPLAIN must report the target table');
        assert.equal(access.key, key);
        assert.ok(['ref', 'range'].includes(access.accessType), JSON.stringify(access));
        assert.ok(access.estimatedRowsExamined !== null && access.estimatedRowsExamined <= maxEstimate, JSON.stringify(access));
        assert.equal(plan.filesort, false, 'History and candidate ordering should use the existing index');
    };

    it('uses user/id history index for first and subsequent wallet pages', async () => {
        await assertIndexed(walletHistoryQuery(1, 20), 'wallet_entries', 'idx_wallet_history', 256);
        await assertIndexed(walletHistoryQuery(1, 20, (largeId + 2000n).toString()), 'wallet_entries', 'idx_wallet_history', 256);
    });
    it('uses user/time/id index for both order history pages', async () => {
        await assertIndexed(paymentHistoryQuery(1, 20), 'payment_orders', 'idx_payment_history', 256);
        await assertIndexed(paymentHistoryQuery(1, 20, { createdAt: at, id: orderId(2000) }), 'payment_orders', 'idx_payment_history', 256);
    });
    it('uses the status/due/lease index for scoped due work without forcing an index', async () => {
        await assertIndexed(reconcileCandidatesQuery(scope, 'pending', now, 20), 'payment_orders', 'idx_payment_reconcile', 256);
    });
    it('paginates tied order timestamps without duplicates, omissions or another user', async () => {
        const seen: string[] = [];
        let cursor: PaymentHistoryCursor | undefined;
        for (;;) {
            const rows = await run(paymentHistoryQuery(1, 7, cursor));
            if (!rows.length) break;
            seen.push(...rows.map(row => String(row.id)));
            const last = rows.at(-1)!;
            cursor = { createdAt: (last.created_at as Date).toISOString().replace('T', ' ').replace('Z', ''), id: last.id };
        }
        const expected = Array.from({ length: 64 }, (_, i) => orderId(1 + 64 * i)).reverse();
        assert.deepEqual(seen, expected);
    });
    it('round trips BIGINT wallet cursors even with normal driver number conversion', async () => {
        const connection = await mysql.createConnection({ ...fixture.options, database: fixture.database,
            supportBigNumbers: false, bigNumberStrings: false });
        try {
            const seen: string[] = [];
            let cursor: string | undefined;
            for (;;) {
                const query = walletHistoryQuery(1, 7, cursor);
                const [rows] = await connection.execute<RowDataPacket[]>(query.sql, query.values);
                if (!rows.length) break;
                assert.ok(rows.every(row => typeof row.id === 'string'));
                seen.push(...rows.map(row => row.id)); cursor = rows.at(-1)!.id;
            }
            // Independent numeric expectation catches CAST-alias lexical ordering
            // and the omissions it would cause when combined with numeric id<?.
            const expectedIds = [1n, 9n, 10n, 100n, ...Array.from({ length: 61 }, (_, i) =>
                largeId + 64n + BigInt(193 + 64 * i))];
            expectedIds.sort((left, right) => left > right ? -1 : left < right ? 1 : 0);
            assert.deepEqual(seen, expectedIds.map(String));
            assert.equal(new Set(seen).size, 65);
            assert.deepEqual(seen.slice(-4), ['100', '10', '9', '1']);
            assert.ok(seen.some(id => BigInt(id) > BigInt(Number.MAX_SAFE_INTEGER)));
        } finally { await connection.end(); }
    });
    it('selects only due uncredited work with an available lease in its merchant scope', async () => {
        await fixture.connection.beginTransaction();
        try {
            // A crashed worker's expired lease must be reclaimable as well as NULL leases.
            await fixture.connection.execute('UPDATE payment_orders SET lease_owner=?,lease_until=? WHERE id=?',
                ['expired_worker', at, expectedDue[0]]);
            const rows = await run(reconcileCandidatesQuery(scope, 'pending', now, 100));
            assert.deepEqual(rows.map(row => row.id).sort(), [...expectedDue].sort());
            assert.equal(rows.at(-1)!.id, expectedDue[0], 'Same due time sorts NULL leases before the expired lease');
        } finally { await fixture.connection.rollback(); }
    });
    it('rejects unsafe limits and malformed cursors before building a query', () => {
        for (const limit of [0, 101, 1.5]) assert.throws(() => walletHistoryQuery(1, limit));
        for (const cursor of ['0', '-1', '18446744073709551616', "1' OR 1=1"]) assert.throws(() => walletHistoryQuery(1, 20, cursor));
        assert.throws(() => paymentHistoryQuery(1, 20, { createdAt: '2026-02-30 08:00:00.000', id: orderId(1) }));
        assert.throws(() => reconcileCandidatesQuery(scope, 'pending', '2026-11-16T09:00:00Z', 20));
    });
});
