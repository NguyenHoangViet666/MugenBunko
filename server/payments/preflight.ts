import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { pathToFileURL } from 'node:url';
import { PAYMENT_LIMITS } from './contracts.js';
import { configuredDatabaseName, localDatabaseOptions, readLocalEnvironment } from './localDatabase.js';

export async function inspectCoinBalances(connection: Connection) {
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT
        COUNT(*) AS user_count,
        COALESCE(SUM(coins IS NULL), 0) AS null_count,
        COALESCE(SUM(coins < 0), 0) AS negative_count,
        COALESCE(SUM(coins > ?), 0) AS above_limit_count,
        CAST(COALESCE(SUM(coins), 0) AS CHAR) AS total_coins,
        MIN(coins) AS minimum_coins, MAX(coins) AS maximum_coins
        FROM users`, [PAYMENT_LIMITS.maxBalanceCoins]);
    const [columns] = await connection.query<RowDataPacket[]>(`SELECT COLUMN_DEFAULT AS default_value,
        IS_NULLABLE AS is_nullable, COLUMN_TYPE AS column_type FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'coins'`);
    if (columns.length !== 1) throw new Error('users.coins metadata is unavailable.');
    const count = (value: unknown) => {
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 0) throw new Error('Unsafe preflight count.');
        return number;
    };
    const row = rows[0];
    const invalid = {
        nullCount: count(row.null_count), negativeCount: count(row.negative_count), aboveLimitCount: count(row.above_limit_count),
    };
    const defaultValue = columns[0].default_value === null ? null : String(columns[0].default_value);
    const nullable = columns[0].is_nullable === 'YES';
    return {
        userCount: count(row.user_count), totalCoins: String(row.total_coins),
        minimumCoins: row.minimum_coins === null ? null : Number(row.minimum_coins),
        maximumCoins: row.maximum_coins === null ? null : Number(row.maximum_coins),
        invalid, readyForOpeningBalance: Object.values(invalid).every(value => value === 0),
        coinColumn: { type: String(columns[0].column_type), defaultValue, nullable },
        coinColumnNeedsMigration: defaultValue !== '0' || nullable,
    };
}

export async function runPaymentPreflight() {
    const env = readLocalEnvironment();
    const connection = await mysql.createConnection({
        ...localDatabaseOptions(env, 'preflight'), database: configuredDatabaseName(env),
    });
    try {
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.query('START TRANSACTION READ ONLY');
        const coins = await inspectCoinBalances(connection);
        const [versions] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
        await connection.rollback();
        const hasValue = (name: string) => Boolean(env[name]?.trim());
        return {
            mode: 'read-only', checkedAt: new Date().toISOString(), databaseVersion: String(versions[0].version), coins,
            sandboxSettingsPresent: {
                tmnCode: hasValue('VNPAY_TMN_CODE'), hashSecret: hasValue('VNPAY_HASH_SECRET'),
                publicCallbackBase: hasValue('PAYMENT_PUBLIC_BASE_URL'),
            },
            note: 'Presence checks do not verify merchant access. No balances or schema were changed.',
        };
    } finally { await connection.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const report = await runPaymentPreflight();
        console.log(JSON.stringify(report, null, 2));
        if (!report.coins.readyForOpeningBalance) process.exitCode = 2;
    } catch (error) {
        // Driver messages may contain SQL, hostnames or credentials. Log only the code.
        const code = (error as { code?: unknown })?.code;
        console.error('Payment preflight failed.', typeof code === 'string' ? code : 'CHECK_DATABASE_CONFIGURATION');
        process.exitCode = 1;
    }
}
