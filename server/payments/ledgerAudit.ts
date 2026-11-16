import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { assertPaymentSchemaReady } from '../paymentSchemaMigration.js';
import { PAYMENT_SCHEMA_VERSION } from './schemaVersion.js';
import { configuredDatabaseName, localDatabaseOptions, readLocalEnvironment } from './localDatabase.js';

const count = (value: unknown): number => {
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < 0) throw new Error('Unsafe audit count.');
    return result;
};

/**
 * Pass a dedicated idle connection. SET TRANSACTION rejects an active transaction
 * before START TRANSACTION could implicitly commit the caller's work. All audit
 * reads share one repeatable-read snapshot; no repair, DML, DDL or locking reads.
 */
export async function auditWalletLedger(connection: Connection) {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    try {
        await assertPaymentSchemaReady(connection);
        const [server] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
        const [users] = await connection.query<RowDataPacket[]>(`SELECT /* DB03 audit: user balances */
            CAST(COUNT(*) AS CHAR) AS user_count,
            CAST(COALESCE(SUM(u.coins),0) AS CHAR) AS coins,
            COALESCE(SUM(COALESCE(w.opening_count,0) <> 1),0) AS invalid_openings,
            COALESCE(SUM(w.delta_total IS NULL OR w.delta_total <> u.coins),0) AS mismatched_users
            FROM users u LEFT JOIN (
                SELECT user_id,SUM(delta_coins) AS delta_total,SUM(entry_type='opening_balance') AS opening_count
                FROM wallet_entries GROUP BY user_id
            ) w ON w.user_id=u.id`);
        const [entries] = await connection.query<RowDataPacket[]>(`SELECT
            CAST(COUNT(*) AS CHAR) AS entry_count,
            CAST(COALESCE(SUM(w.delta_coins),0) AS CHAR) AS ledger,
            COALESCE(SUM(u.id IS NULL),0) AS orphan_entries,
            COALESCE(SUM(w.entry_type='opening_balance' AND
                BINARY w.migration_key <> BINARY CONCAT('opening:v1:',w.user_id)),0) AS invalid_opening_keys
            FROM wallet_entries w LEFT JOIN users u ON u.id=w.user_id`);
        const [balances] = await connection.query<RowDataPacket[]>(`SELECT
            COALESCE(SUM(balance_after <> running_balance OR
                (entry_type='opening_balance' AND sequence_number <> 1)),0) AS invalid_running_balances
            FROM (
                SELECT balance_after,entry_type,
                    SUM(delta_coins) OVER (PARTITION BY user_id ORDER BY id ROWS UNBOUNDED PRECEDING) AS running_balance,
                    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id) AS sequence_number
                FROM wallet_entries
            ) balances`);
        const [orders] = await connection.query<RowDataPacket[]>(`SELECT
            CAST(COUNT(*) AS CHAR) AS order_count,
            COALESCE(SUM(o.fulfillment_status='credited' AND w.id IS NULL),0) AS credited_orders_without_entry
            FROM payment_orders o LEFT JOIN wallet_entries w ON w.payment_order_id=o.id AND w.entry_type='topup'`);
        const [topups] = await connection.query<RowDataPacket[]>(`SELECT
            COALESCE(SUM(o.id IS NULL OR o.user_id <> w.user_id OR o.status <> 'paid' OR
                o.fulfillment_status <> 'credited' OR o.credited_at IS NULL),0) AS unexpected_topups,
            COALESCE(SUM(o.id IS NOT NULL AND w.delta_coins <> o.coin_amount),0) AS incorrect_topup_amounts
            FROM wallet_entries w LEFT JOIN payment_orders o ON o.id=w.payment_order_id WHERE w.entry_type='topup'`);
        const violations = {
            invalidOpenings: count(users[0].invalid_openings), mismatchedUsers: count(users[0].mismatched_users),
            orphanEntries: count(entries[0].orphan_entries), invalidOpeningKeys: count(entries[0].invalid_opening_keys),
            invalidRunningBalances: count(balances[0].invalid_running_balances),
            creditedOrdersWithoutEntry: count(orders[0].credited_orders_without_entry),
            unexpectedTopups: count(topups[0].unexpected_topups), incorrectTopupAmounts: count(topups[0].incorrect_topup_amounts),
        };
        const totals = { users: String(users[0].user_count), orders: String(orders[0].order_count),
            entries: String(entries[0].entry_count), coins: String(users[0].coins), ledger: String(entries[0].ledger) };
        return { mode: 'read-only' as const, checkedAt: new Date().toISOString(), databaseVersion: String(server[0].version),
            schemaVersion: PAYMENT_SCHEMA_VERSION, totals, violations,
            valid: Object.values(violations).every(value => value === 0) && totals.coins === totals.ledger };
    } finally { await connection.rollback(); }
}

export async function runPaymentLedgerAudit() {
    const env = readLocalEnvironment();
    const connection = await mysql.createConnection({ ...localDatabaseOptions(env, 'preflight'), database: configuredDatabaseName(env) });
    try {
        await connection.query("SET time_zone = '+00:00'");
        return await auditWalletLedger(connection);
    } finally { await connection.end(); }
}
