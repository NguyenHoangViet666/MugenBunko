import { createHash } from 'node:crypto';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import { paymentSchema } from './paymentSchema.js';
import { readPaymentLayout, type PaymentLayout } from './payments/schemaMetadata.js';
import { paymentSchemaV1Contract } from './payments/schemaV1Contract.js';
import { paymentSchemaV2Contract } from './payments/schemaV2Contract.js';
import { PAYMENT_V2_CHECKSUM, PAYMENT_V2_NAME } from './payments/schemaV2.js';
import { assertCoinColumnReady, backfillOpeningBalances, prepareBalanceMigration, removeBalanceFreeze,
    type BalanceMigrationOptions } from './payments/balanceMigration.js';
import {
    PAYMENT_SCHEMA_VERSION, PAYMENT_MIGRATION_NAME, PAYMENT_MIGRATION_CHECKSUM,
    PAYMENT_V1_PACKAGES, paymentMigrationTableSchema,
} from './payments/schemaVersion.js';

export class PaymentSchemaError extends Error {
    constructor(readonly code: string, detail: string) {
        super(`${detail} Run the reviewed database migration before starting the application.`);
        this.name = 'PaymentSchemaError';
    }
}

async function assertSupportedServer(connection: Connection) {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
    const version = String(rows[0].version);
    const parts = /^(\d+)\.(\d+)\./.exec(version);
    if (!parts || /mariadb/i.test(version) || Number(parts[1]) < 8 || (Number(parts[1]) === 8 && Number(parts[2]) < 4)) {
        throw new PaymentSchemaError('PAYMENT_SCHEMA_SERVER', 'Payment schema requires MySQL 8.4 or later.');
    }
}

function verifyLayout(actual: PaymentLayout, allowMissing: boolean, version = 1) {
    for (const [table, expected] of Object.entries(version === 1 ? paymentSchemaV1Contract : paymentSchemaV2Contract)) {
        if (!actual[table]) {
            if (allowMissing) continue;
            throw new PaymentSchemaError('PAYMENT_SCHEMA_MISSING', `Payment table ${table} is missing.`);
        }
        for (const part of ['table', 'columns', 'indexes', 'foreignKeys', 'checks'] as const) {
            if (JSON.stringify(actual[table][part]) !== JSON.stringify(expected[part])) {
                throw new PaymentSchemaError('PAYMENT_SCHEMA_DRIFT', `Payment schema drift in ${table}.${part}.`);
            }
        }
    }
}

async function readHistory(connection: Connection, layout: PaymentLayout, targetVersion: number) {
    if (!layout.payment_schema_migrations) return [];
    const [history] = await connection.query<RowDataPacket[]>(
        'SELECT version, name, checksum, status, applied_at FROM payment_schema_migrations ORDER BY version');
    const registered = [
        { name: PAYMENT_MIGRATION_NAME, checksum: PAYMENT_MIGRATION_CHECKSUM },
        { name: PAYMENT_V2_NAME, checksum: PAYMENT_V2_CHECKSUM },
    ];
    if (history.length > targetVersion || history.some((row, index) => Number(row.version) !== index + 1 ||
        row.name !== registered[index]?.name || row.checksum !== registered[index]?.checksum ||
        (index > 0 && history[index - 1].status !== 'applied') ||
        !['applying', 'applied'].includes(row.status) ||
        (row.status === 'applied') !== (row.applied_at !== null))) {
        throw new PaymentSchemaError('PAYMENT_SCHEMA_VERSION', 'Payment migration version/checksum/state is incompatible.');
    }
    return history;
}

/** No writes, locks, DDL or seed. Called on ONE connection before opening HTTP. */
export async function assertPaymentSchemaReady(connection: Connection, requiredVersion = PAYMENT_SCHEMA_VERSION): Promise<void> {
    await assertSupportedServer(connection);
    const layout = await readPaymentLayout(connection);
    verifyLayout(layout, false, requiredVersion);
    const history = await readHistory(connection, layout, requiredVersion);
    if (history.length !== requiredVersion || history.some(row => row.status !== 'applied')) {
        throw new PaymentSchemaError('PAYMENT_SCHEMA_PENDING', `Payment migration v${requiredVersion} has not finished.`);
    }
    if (requiredVersion >= 2) {
        await assertCoinColumnReady(connection);
        const [progress] = await connection.query<RowDataPacket[]>('SELECT version FROM payment_balance_migration WHERE version=2');
        if (progress.length !== 1) throw new PaymentSchemaError('PAYMENT_SCHEMA_PENDING', 'Opening balance checkpoint is missing.');
    }
}

export function paymentMigrationLockName(database: string) {
    return 'mugen_pay:' + createHash('sha256').update(database).digest('hex').slice(0, 48);
}

/**
 * Dedicated autocommit connection only; never call inside a business transaction.
 * MySQL DDL commits implicitly. An applying row survives partial DDL; rerunning
 * completes missing tables only when every existing table matches the contract.
 */
export async function migratePaymentSchema(connection: Connection, options: BalanceMigrationOptions & { lockTimeoutSeconds?: number; targetVersion?: 1 | 2 } = {}) {
    const timeout = options.lockTimeoutSeconds ?? 10;
    const targetVersion = options.targetVersion ?? PAYMENT_SCHEMA_VERSION;
    if (!Number.isInteger(timeout) || timeout < 0 || timeout > 30) throw new Error('Invalid payment migration lock timeout.');
    if (targetVersion !== 1 && targetVersion !== 2) throw new Error('Invalid payment migration target.');
    if (options.batchSize !== undefined && (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 1000)) throw new Error('Invalid opening balance batch size.');
    await assertSupportedServer(connection);
    const [settings] = await connection.query<RowDataPacket[]>(
        'SELECT DATABASE() AS database_name, @@session.autocommit AS autocommit');
    if (!settings[0].database_name || Number(settings[0].autocommit) !== 1) {
        throw new PaymentSchemaError('PAYMENT_SCHEMA_CONNECTION', 'Payment migration requires a selected database and autocommit.');
    }
    const lock = paymentMigrationLockName(String(settings[0].database_name));
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS acquired', [lock, timeout]);
    if (Number(locks[0].acquired) !== 1) throw new PaymentSchemaError('PAYMENT_SCHEMA_LOCKED', 'Another payment migration holds the database lock.');
    try {
        if (targetVersion === 2) await connection.query("SET time_zone = '+00:00'");
        const before = await readPaymentLayout(connection);
        verifyLayout(before, true);
        const history = await readHistory(connection, before, targetVersion);
        const applied: number[] = [];
        if (history[0]?.status === 'applied') {
            // A dropped table after a completed migration may mean data loss.
            // Fail rather than recreate an empty table or reseed edited packages.
            verifyLayout(before, false);
        } else {
            if (!before.payment_schema_migrations) await connection.query(paymentMigrationTableSchema);
            if (!history.length) await connection.execute(
                "INSERT INTO payment_schema_migrations (version,name,checksum,status) VALUES (?,?,?,'applying')",
                [1, PAYMENT_MIGRATION_NAME, PAYMENT_MIGRATION_CHECKSUM]);
            // These are fixed, reviewed CREATE statements, not user supplied SQL.
            for (const statement of paymentSchema.split(';').map(sql => sql.trim()).filter(Boolean)) await connection.query(statement);
            verifyLayout(await readPaymentLayout(connection), false);
            await connection.beginTransaction();
            try {
                for (const item of PAYMENT_V1_PACKAGES) await connection.execute(
                    `INSERT INTO coin_packages (code,name,amount_vnd,coin_amount) VALUES (?,?,?,?)
                     ON DUPLICATE KEY UPDATE code = code`, [item.code, item.name, item.amountVnd, item.coinAmount]);
                await connection.execute(`UPDATE payment_schema_migrations SET status='applied', applied_at=CURRENT_TIMESTAMP(3)
                    WHERE version=1 AND status='applying'`);
                await connection.commit();
            } catch (error) { await connection.rollback(); throw error; }
            applied.push(1);
        }
        if (targetVersion === 2) {
            if (history[1]?.status === 'applied') {
                await assertPaymentSchemaReady(connection);
            } else {
                if (options.allowBalanceMigration === false) {
                    const [users] = await connection.query<RowDataPacket[]>('SELECT id FROM users LIMIT 1');
                    if (users.length) throw new PaymentSchemaError('PAYMENT_BALANCE_EXPLICIT', 'Existing users require explicit balance migration through migrate:production after backup and restore rehearsal.');
                }
                await prepareBalanceMigration(connection, lock, Boolean(history[1]));
                verifyLayout(await readPaymentLayout(connection), false, 2);
                if (!history[1]) await connection.execute(`INSERT INTO payment_schema_migrations
                    (version,name,checksum,status) VALUES (2,?,?,'applying')`, [PAYMENT_V2_NAME, PAYMENT_V2_CHECKSUM]);
                await backfillOpeningBalances(connection, options);
                await connection.execute("UPDATE payment_schema_migrations SET status='applied',applied_at=CURRENT_TIMESTAMP(3) WHERE version=2 AND status='applying'");
                applied.push(2);
            }
            await removeBalanceFreeze(connection, lock);
        }
        return { currentVersion: targetVersion, applied };
    } finally { await connection.query('SELECT RELEASE_LOCK(?)', [lock]); }
}
