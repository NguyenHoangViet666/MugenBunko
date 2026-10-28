import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { paymentSchema } from '../paymentSchema.js';
import { assertPaymentSchemaReady as assertLatestSchemaReady, migratePaymentSchema as migrateLatestSchema, paymentMigrationLockName } from '../paymentSchemaMigration.js';
import {
    PAYMENT_MIGRATION_CHECKSUM, PAYMENT_MIGRATION_NAME, paymentMigrationTableSchema,
} from '../payments/schemaVersion.js';
import { inspectCoinBalances } from '../payments/preflight.js';
import { createPaymentFixture } from './paymentFixture.js';

type Fixture = Awaited<ReturnType<typeof createPaymentFixture>>;
// Keep DB01 regression coverage on immutable v1; production always uses latest.
const assertPaymentSchemaReady = (connection: Fixture['connection']) => assertLatestSchemaReady(connection, 1);
const migratePaymentSchema = (connection: Fixture['connection'], options: { lockTimeoutSeconds?: number } = {}) =>
    migrateLatestSchema(connection, { ...options, targetVersion: 1 });
const code = (expected: string) => (error: unknown) => (error as { code?: string }).code === expected;
const withDatabase = async (work: (fixture: Fixture) => Promise<void>, bootstrap = true) => {
    const fixture = await createPaymentFixture({ bootstrap, legacyCoins: true });
    try { await work(fixture); } finally { await fixture.close(); }
};
const history = async (fixture: Fixture) => (await fixture.connection.query<RowDataPacket[]>(
    'SELECT version,name,checksum,status,started_at,applied_at FROM payment_schema_migrations ORDER BY version'))[0];
const seedApplying = async (fixture: Fixture) => {
    await fixture.connection.query(paymentMigrationTableSchema);
    await fixture.connection.execute('INSERT INTO payment_schema_migrations (version,name,checksum,status) VALUES (1,?,?,\'applying\')',
        [PAYMENT_MIGRATION_NAME, PAYMENT_MIGRATION_CHECKSUM]);
};
const startup = async (fixture: Fixture, mode: 'migrate' | 'probe', credentials?: { user: string; password: string }) => {
    try {
        const result = await promisify(execFile)(process.execPath,
            [fileURLToPath(new URL('./paymentStartupWorker.js', import.meta.url)), mode], {
                timeout: 30000, windowsHide: true, env: {
                    ...process.env, NODE_ENV: credentials ? 'production' : 'development',
                    DB_NAME: fixture.database, DB_HOST: String(fixture.options.host), DB_PORT: String(fixture.options.port),
                    DB_USER: credentials?.user ?? String(fixture.options.user),
                    DB_PASSWORD: credentials?.password ?? String(fixture.options.password),
                    JWT_SECRET: 'test-' + randomBytes(32).toString('hex'), PUBLIC_URL: 'https://app.example.test',
                    FRONTEND_URL: 'https://app.example.test', API_REPLICAS: '1', REDIS_URL: '', SMTP_USER: '', SMTP_PASS: '',
                },
            });
        return { exitCode: 0, ...result };
    } catch (error) {
        const failure = error as { code?: number; stdout?: string; stderr?: string };
        return { exitCode: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
    }
};

describe('Payment DB01 versioned migration and startup', () => {
    it('upgrades a legacy database without changing balances/default or creating opening entries', () => withDatabase(async fixture => {
        await fixture.connection.query(`INSERT INTO users (username,password,displayname,coins) VALUES
            ('legacy_reader','fixture-only','Legacy',1250),('legacy_zero','fixture-only','Zero',0)`);
        const before = await inspectCoinBalances(fixture.connection);
        assert.deepEqual(await migratePaymentSchema(fixture.connection), { currentVersion: 1, applied: [1] });
        await assertPaymentSchemaReady(fixture.connection);
        assert.deepEqual(await inspectCoinBalances(fixture.connection), before);
        assert.equal((await history(fixture)).length, 1);
        assert.equal((await history(fixture))[0].status, 'applied');
        const [wallet] = await fixture.connection.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM wallet_entries');
        assert.equal(Number(wallet[0].count), 0);
        const [packages] = await fixture.connection.query<RowDataPacket[]>('SELECT code,amount_vnd,coin_amount FROM coin_packages ORDER BY id');
        assert.deepEqual(packages.map(row => [row.code, row.amount_vnd, row.coin_amount]),
            [['xu_100', 10000, 100], ['xu_500', 50000, 500], ['xu_1000', 100000, 1000]]);
    }));

    it('reruns without changing version timestamps or restoring edited, disabled or removed packages', () => withDatabase(async fixture => {
        await migratePaymentSchema(fixture.connection);
        const original = await history(fixture);
        await fixture.connection.query("UPDATE coin_packages SET amount_vnd=9900,active=0 WHERE code='xu_100'");
        await fixture.connection.query("DELETE FROM coin_packages WHERE code='xu_500'");
        assert.deepEqual(await migratePaymentSchema(fixture.connection), { currentVersion: 1, applied: [] });
        assert.deepEqual(await history(fixture), original);
        const [packages] = await fixture.connection.query<RowDataPacket[]>('SELECT code,amount_vnd,active FROM coin_packages ORDER BY id');
        assert.deepEqual(packages.map(row => [row.code, row.amount_vnd, row.active]), [['xu_100', 9900, 0], ['xu_1000', 100000, 1]]);
    }));

    it('adopts an exact unversioned T01 schema while preserving existing package prices', () => withDatabase(async fixture => {
        await fixture.connection.query(paymentSchema);
        await fixture.connection.query("INSERT INTO coin_packages (code,name,amount_vnd,coin_amount) VALUES ('xu_100','Edited',9500,100)");
        await assert.rejects(assertPaymentSchemaReady(fixture.connection), code('PAYMENT_SCHEMA_MISSING'));
        await migratePaymentSchema(fixture.connection);
        await assertPaymentSchemaReady(fixture.connection);
        const [packages] = await fixture.connection.query<RowDataPacket[]>("SELECT name,amount_vnd FROM coin_packages WHERE code='xu_100'");
        assert.equal(packages[0].name, 'Edited');
        assert.equal(packages[0].amount_vnd, 9500);
    }));

    it('resumes persisted applying state after partial DDL using a new connection', () => withDatabase(async fixture => {
        await seedApplying(fixture);
        for (const statement of paymentSchema.split(';').map(sql => sql.trim()).filter(Boolean).slice(0, 2)) {
            await fixture.connection.query(statement);
        }
        await assert.rejects(assertPaymentSchemaReady(fixture.connection), code('PAYMENT_SCHEMA_MISSING'));
        const connection = await mysql.createConnection({ ...fixture.options, database: fixture.database });
        try { await migratePaymentSchema(connection); await assertPaymentSchemaReady(connection); }
        finally { await connection.end(); }
        assert.equal((await history(fixture))[0].status, 'applied');
    }));

    it('serializes two migration processes into one recorded version and one catalog seed', () => withDatabase(async fixture => {
        const other = await mysql.createConnection({ ...fixture.options, database: fixture.database });
        try {
            const results = await Promise.all([migratePaymentSchema(fixture.connection), migratePaymentSchema(other)]);
            assert.deepEqual(results.map(result => result.applied.length).sort(), [0, 1]);
            assert.equal((await history(fixture)).length, 1);
            const [rows] = await fixture.connection.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM coin_packages');
            assert.equal(Number(rows[0].count), 3);
        } finally { await other.end(); }
    }));

    it('fails on lock contention before DDL and succeeds after the owner releases the lock', () => withDatabase(async fixture => {
        const lock = paymentMigrationLockName(fixture.database);
        await fixture.connection.query('SELECT GET_LOCK(?,0)', [lock]);
        const other = await mysql.createConnection({ ...fixture.options, database: fixture.database });
        try {
            await assert.rejects(migratePaymentSchema(other, { lockTimeoutSeconds: 0 }), code('PAYMENT_SCHEMA_LOCKED'));
            const [tables] = await fixture.connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'payment_schema_migrations'");
            assert.equal(tables.length, 0);
            await fixture.connection.query('SELECT RELEASE_LOCK(?)', [lock]);
            await migratePaymentSchema(other);
        } finally { await fixture.connection.query('SELECT RELEASE_LOCK(?)', [lock]); await other.end(); }
    }));

    it('refuses malformed unversioned tables before creating a migration history', () => withDatabase(async fixture => {
        await fixture.connection.query('CREATE TABLE coin_packages (id INT PRIMARY KEY) ENGINE=InnoDB');
        await assert.rejects(migratePaymentSchema(fixture.connection), code('PAYMENT_SCHEMA_DRIFT'));
        const [tables] = await fixture.connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'payment_schema_migrations'");
        assert.equal(tables.length, 0);
    }));

    it('does not recreate a dropped table after a completed migration', () => withDatabase(async fixture => {
        await migratePaymentSchema(fixture.connection);
        await fixture.connection.query('DROP TABLE payment_audit');
        await assert.rejects(assertPaymentSchemaReady(fixture.connection), code('PAYMENT_SCHEMA_MISSING'));
        await assert.rejects(migratePaymentSchema(fixture.connection), code('PAYMENT_SCHEMA_MISSING'));
        const [tables] = await fixture.connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'payment_audit'");
        assert.equal(tables.length, 0);
    }));

    const driftCases = [
        ['a missing column', 'ALTER TABLE payment_events DROP COLUMN verification_result'],
        ['nullable checkout data', 'ALTER TABLE payment_orders MODIFY checkout_snapshot JSON NULL'],
        ['a unique index weakened to a plain index', `ALTER TABLE payment_orders DROP INDEX uq_payment_idempotency,
            ADD INDEX uq_payment_idempotency (user_id,idempotency_key)`],
        ['a cascading financial foreign key', `ALTER TABLE payment_events DROP FOREIGN KEY fk_payment_event_order;
            ALTER TABLE payment_events ADD CONSTRAINT fk_payment_event_order FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE`],
        ['a disabled CHECK', 'ALTER TABLE payment_orders ALTER CHECK chk_payment_amount NOT ENFORCED'],
        ['a changed CHECK under the same name', `ALTER TABLE payment_orders DROP CHECK chk_payment_amount,
            ADD CONSTRAINT chk_payment_amount CHECK (amount_vnd BETWEEN 1 AND 999999)`],
    ];
    for (const [name, ddl] of driftCases) it('detects ' + name + ' without silently repairing it', () => withDatabase(async fixture => {
        await migratePaymentSchema(fixture.connection);
        for (const statement of ddl.split(';')) await fixture.connection.query(statement);
        await assert.rejects(assertPaymentSchemaReady(fixture.connection), code('PAYMENT_SCHEMA_DRIFT'));
        await assert.rejects(migratePaymentSchema(fixture.connection), code('PAYMENT_SCHEMA_DRIFT'));
    }));

    for (const [name, sql] of [
        ['edited checksum', "UPDATE payment_schema_migrations SET checksum=REPEAT('0',64)"],
        ['unknown future version', 'UPDATE payment_schema_migrations SET version=2'],
        ['edited migration name', "UPDATE payment_schema_migrations SET name='unreviewed'"],
    ]) it('rejects ' + name + ' in readiness and migration', () => withDatabase(async fixture => {
        await migratePaymentSchema(fixture.connection);
        await fixture.connection.query(sql);
        await assert.rejects(assertPaymentSchemaReady(fixture.connection), code('PAYMENT_SCHEMA_VERSION'));
        await assert.rejects(migratePaymentSchema(fixture.connection), code('PAYMENT_SCHEMA_VERSION'));
    }));

    it('rejects an unfinished version in readiness and finishes it only through migration', () => withDatabase(async fixture => {
        await fixture.connection.query(paymentSchema);
        await seedApplying(fixture);
        await assert.rejects(assertPaymentSchemaReady(fixture.connection), code('PAYMENT_SCHEMA_PENDING'));
        await migratePaymentSchema(fixture.connection);
        await assertPaymentSchemaReady(fixture.connection);
    }));

    it('performs readiness in a READ ONLY transaction and rejects non-autocommit migration', () => withDatabase(async fixture => {
        await migratePaymentSchema(fixture.connection);
        await fixture.connection.query('START TRANSACTION READ ONLY');
        try { await assertPaymentSchemaReady(fixture.connection); }
        finally { await fixture.connection.rollback(); }
        await fixture.connection.query('SET autocommit=0');
        try { await assert.rejects(migratePaymentSchema(fixture.connection), code('PAYMENT_SCHEMA_CONNECTION')); }
        finally { await fixture.connection.query('SET autocommit=1'); }
    }));

    it('bootstraps an empty database through db.ts and probes production using a DML-only account', () => withDatabase(async fixture => {
        const result = await startup(fixture, 'migrate');
        assert.equal(result.exitCode, 0, result.stderr);
        assert.match(result.stdout, /"paymentStartup":"ready"/);
        await assertLatestSchemaReady(fixture.connection);
        const [users] = await fixture.connection.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM users');
        assert.equal(Number(users[0].count), 0, 'bootstrap must not load sample admin or seed users');

        const user = 'mb_paytest_' + randomBytes(8).toString('hex');
        const password = randomBytes(32).toString('hex');
        let owned = false;
        try {
            await fixture.connection.query("CREATE USER ?@'%' IDENTIFIED BY ?", [user, password]);
            owned = true;
            await fixture.connection.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON \`${fixture.database}\`.* TO ?@'%'`, [user]);
            const restricted = await mysql.createConnection({ ...fixture.options, database: fixture.database, user, password });
            try {
                await assert.rejects(restricted.query('CREATE TABLE forbidden_ddl (id INT)'), code('ER_TABLEACCESS_DENIED_ERROR'));
            } finally { await restricted.end(); }
            const ready = await startup(fixture, 'probe', { user, password });
            assert.equal(ready.exitCode, 0, ready.stderr);
            assert.match(ready.stdout, /"paymentStartup":"ready"/);

            await fixture.connection.query('ALTER TABLE payment_events DROP COLUMN verification_result');
            const failed = await startup(fixture, 'probe', { user, password });
            assert.notEqual(failed.exitCode, 0);
            assert.match(failed.stderr, /PAYMENT_SCHEMA_DRIFT/);
            assert.match(failed.stderr, /"poolClosed":true/);
            const [columns] = await fixture.connection.query<RowDataPacket[]>("SHOW COLUMNS FROM payment_events LIKE 'verification_result'");
            assert.equal(columns.length, 0, 'readiness must not repair the missing column');
        } finally {
            if (owned && /^mb_paytest_[a-f0-9]{16}$/.test(user)) await fixture.connection.query("DROP USER ?@'%'", [user]);
        }
    }, false));
});
