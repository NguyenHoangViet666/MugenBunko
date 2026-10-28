import type { Connection, RowDataPacket } from 'mysql2/promise';
import { inspectCoinBalances } from './preflight.js';
import { inspectWalletLedger } from './walletOpening.js';
import { balanceFreezeTriggers, PAYMENT_V2_ALTER, PAYMENT_V2_PROGRESS_SCHEMA } from './schemaV2.js';

export class BalanceMigrationError extends Error {
    constructor(readonly code: string, message: string) { super(message); this.name = 'BalanceMigrationError'; }
}
export interface BalanceMigrationOptions {
    batchSize?: number;
    allowBalanceMigration?: boolean;
    onBatchCommitted?: (progress: { completedBatches: number; userCount: number }) => Promise<void>;
}
const normalize = (sql: string) => sql.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

export async function prepareBalanceMigration(connection: Connection, lock: string, resuming: boolean) {
    const report = await inspectCoinBalances(connection);
    if (!report.readyForOpeningBalance) throw new BalanceMigrationError('PAYMENT_BALANCE_INVALID', 'Legacy balances contain NULL, negative or excessive values; no automatic repair was made.');
    if (!/^int(?:\(11\))?(?: unsigned)?$/.test(report.coinColumn.type)) throw new BalanceMigrationError('PAYMENT_BALANCE_COLUMN', 'Review the unexpected legacy coin column type before conversion.');
    const [activity] = await connection.query<RowDataPacket[]>("SELECT 1 FROM wallet_entries WHERE entry_type <> 'opening_balance' LIMIT 1");
    if (activity.length) throw new BalanceMigrationError('PAYMENT_LEDGER_ACTIVITY', 'Cannot establish opening balances over existing topup activity.');
    const [installed] = await connection.query<RowDataPacket[]>(`SELECT TRIGGER_NAME AS name, EVENT_MANIPULATION AS event,
        ACTION_STATEMENT AS body, ACTION_TIMING AS timing, EVENT_OBJECT_TABLE AS table_name
        FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME LIKE 'payment_balance_freeze_%'`);
    for (const trigger of balanceFreezeTriggers(lock)) {
        const existing = installed.find(row => row.name === trigger.name);
        if (existing && (existing.event !== trigger.event || existing.timing !== 'BEFORE' || existing.table_name !== 'users' || normalize(existing.body) !== normalize(trigger.body))) {
            throw new BalanceMigrationError('PAYMENT_FREEZE_DRIFT', 'A balance freeze trigger has unexpected contents.');
        }
        if (!existing) {
            if (resuming) throw new BalanceMigrationError('PAYMENT_FREEZE_MISSING', 'An in-progress migration lost its freeze trigger; review the data before repairing.');
            await connection.query(trigger.sql);
        }
    }
    await connection.query(PAYMENT_V2_PROGRESS_SCHEMA);
}

export async function assertCoinColumnReady(connection: Connection) {
    const [columns] = await connection.query<RowDataPacket[]>(`SELECT COLUMN_TYPE AS type,IS_NULLABLE AS nullable,
        COLUMN_DEFAULT AS default_value FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='coins'`);
    const [checks] = await connection.query<RowDataPacket[]>(`SELECT c.CHECK_CLAUSE AS clause,t.ENFORCED AS enforced
        FROM information_schema.TABLE_CONSTRAINTS t JOIN information_schema.CHECK_CONSTRAINTS c
          ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME
        WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME='users' AND t.CONSTRAINT_NAME='chk_users_coin_balance'`);
    const clause = String(checks[0]?.clause ?? '').replace(/[`\s()]/g, '').toLowerCase();
    if (columns.length !== 1 || columns[0].type !== 'int' || columns[0].nullable !== 'NO' || String(columns[0].default_value) !== '0' ||
        checks.length !== 1 || checks[0].enforced !== 'YES' || clause !== 'coinsbetween0and2000000000') {
        throw new BalanceMigrationError('PAYMENT_COIN_SCHEMA_DRIFT', 'users.coins does not match the v2 balance contract.');
    }
}

export async function backfillOpeningBalances(connection: Connection, options: BalanceMigrationOptions) {
    const batchSize = options.batchSize ?? 250;
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new Error('Invalid opening balance batch size.');
    // All guards were installed before the applying row was committed. Their
    // locking reads fence legacy transactions and keep writers frozen on crash.
    const report = await inspectCoinBalances(connection);
    if (!report.readyForOpeningBalance) throw new BalanceMigrationError('PAYMENT_BALANCE_INVALID', 'Balances changed to invalid values before the freeze completed.');
    if (report.userCount > 0 && options.allowBalanceMigration === false) {
        throw new BalanceMigrationError('PAYMENT_BALANCE_EXPLICIT', 'Users appeared while freezing the new database; resume through the explicit migration command.');
    }
    await connection.execute(`INSERT INTO payment_balance_migration
        (version,expected_user_count,expected_total_coins) VALUES (2,?,?) ON DUPLICATE KEY UPDATE version=version`, [report.userCount, report.totalCoins]);
    const [constraints] = await connection.query<RowDataPacket[]>(`SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='users' AND CONSTRAINT_NAME='chk_users_coin_balance'`);
    if (!constraints.length) await connection.query(PAYMENT_V2_ALTER);
    await assertCoinColumnReady(connection);
    for (;;) {
        let count = 0;
        let completedBatches = 0;
        await connection.beginTransaction();
        try {
            const [progress] = await connection.query<RowDataPacket[]>('SELECT last_user_id,completed_batches FROM payment_balance_migration WHERE version=2 FOR UPDATE');
            const after = progress[0].last_user_id;
            const [users] = await connection.execute<RowDataPacket[]>(
                'SELECT id,coins FROM users WHERE (? IS NULL OR id>?) ORDER BY id LIMIT ? FOR UPDATE', [after, after, batchSize]);
            for (const user of users) {
                const key = `opening:v1:${user.id}`;
                const [existing] = await connection.execute<RowDataPacket[]>(
                    "SELECT delta_coins,balance_after,migration_key FROM wallet_entries WHERE user_id=? AND entry_type='opening_balance'", [user.id]);
                if (existing.length) {
                    if (existing.length !== 1 || existing[0].migration_key !== key || existing[0].delta_coins !== user.coins || existing[0].balance_after !== user.coins) {
                        throw new BalanceMigrationError('PAYMENT_OPENING_CONFLICT', 'An existing opening balance conflicts with its user balance or migration key.');
                    }
                } else await connection.execute(`INSERT INTO wallet_entries
                    (user_id,entry_type,delta_coins,balance_after,reason,migration_key)
                    VALUES (?,'opening_balance',?,?,'Opening balance migrated v2',?)`, [user.id, user.coins, user.coins, key]);
            }
            count = users.length;
            completedBatches = Number(progress[0].completed_batches) + (count ? 1 : 0);
            if (count) await connection.execute(`UPDATE payment_balance_migration
                SET last_user_id=?,completed_batches=? WHERE version=2`, [users.at(-1)!.id, completedBatches]);
            await connection.commit();
        } catch (error) { await connection.rollback(); throw error; }
        if (!count) break;
        await options.onBatchCommitted?.({ completedBatches, userCount: count });
    }
    const result = await inspectWalletLedger(connection);
    const [snapshots] = await connection.query<RowDataPacket[]>('SELECT expected_user_count,expected_total_coins FROM payment_balance_migration WHERE version=2');
    if (!result.valid || result.userCount !== Number(snapshots[0].expected_user_count) || result.totalCoins !== String(snapshots[0].expected_total_coins)) {
        throw new BalanceMigrationError('PAYMENT_LEDGER_MISMATCH', 'Opening ledger or migration snapshot does not match current balances.');
    }
}

export async function removeBalanceFreeze(connection: Connection, lock: string) {
    for (const trigger of balanceFreezeTriggers(lock)) await connection.query(`DROP TRIGGER IF EXISTS ${trigger.name}`);
}
