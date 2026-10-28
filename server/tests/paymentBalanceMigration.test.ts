import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPaymentFixture } from './paymentFixture.js';
import { migratePaymentSchema, assertPaymentSchemaReady, paymentMigrationLockName } from '../paymentSchemaMigration.js';
import { prepareBalanceMigration } from '../payments/balanceMigration.js';
import { inspectWalletLedger, recordNewUserOpening } from '../payments/walletOpening.js';
import { inspectCoinBalances } from '../payments/preflight.js';

type Fixture = Awaited<ReturnType<typeof createPaymentFixture>>;
const code = (expected: string) => (error: unknown) => (error as { code?: string }).code === expected;
async function withDatabase(work: (fixture: Fixture) => Promise<void>) {
    const fixture = await createPaymentFixture({ legacyCoins: true });
    try { await migratePaymentSchema(fixture.connection, { targetVersion: 1 }); await work(fixture); }
    finally { await fixture.close(); }
}
async function seed(fixture: Fixture, balances: (number | null)[] = [0, 100, 200, 300, 400]) {
    for (const [index, coins] of balances.entries()) await fixture.connection.execute(
        "INSERT INTO users (id,username,password,displayname,coins) VALUES (?,?,'fixture-only','Balance fixture',?)", [index + 1, `balance_${index + 1}`, coins]);
}
const progress = async (f: Fixture) => (await f.connection.query<RowDataPacket[]>('SELECT * FROM payment_balance_migration WHERE version=2'))[0][0];
const entries = async (f: Fixture) => (await f.connection.query<RowDataPacket[]>('SELECT * FROM wallet_entries ORDER BY user_id'))[0];
const second = (f: Fixture) => mysql.createConnection({ ...f.options, database: f.database });

describe('Payment DB02 opening balance migration', () => {
    it('preserves legacy balances including zero and the maximum, with exactly one opening per user', () => withDatabase(async f => {
        await seed(f, [0, 1250, 2000000000]);
        const before = await inspectCoinBalances(f.connection);
        const [oldVersion] = await f.connection.query<RowDataPacket[]>('SELECT * FROM payment_schema_migrations WHERE version=1');
        assert.deepEqual(await migratePaymentSchema(f.connection, { batchSize: 2 }), { currentVersion: 2, applied: [2] });
        await assertPaymentSchemaReady(f.connection);
        const after = await inspectCoinBalances(f.connection);
        assert.equal(after.totalCoins, before.totalCoins);
        assert.deepEqual(after.coinColumn, { type: 'int', defaultValue: '0', nullable: false });
        assert.deepEqual((await entries(f)).map(row => [row.user_id, row.delta_coins, row.balance_after, row.migration_key]),
            [[1, 0, 0, 'opening:v1:1'], [2, 1250, 1250, 'opening:v1:2'], [3, 2000000000, 2000000000, 'opening:v1:3']]);
        assert.equal((await inspectWalletLedger(f.connection)).valid, true);
        const [unchanged] = await f.connection.query<RowDataPacket[]>('SELECT * FROM payment_schema_migrations WHERE version=1');
        assert.deepEqual(unchanged, oldVersion, 'v1 journal/checksum must not be rewritten');
    }));

    it('includes negative legacy user IDs without skipping users', () => withDatabase(async f => {
        await f.connection.query("INSERT INTO users (id,username,password,displayname,coins) VALUES (-3,'negative_id','fixture','Negative id',20)");
        await migratePaymentSchema(f.connection, { batchSize: 1 });
        assert.equal((await entries(f))[0].user_id, -3);
        assert.equal((await inspectWalletLedger(f.connection)).valid, true);
    }));

    it('reruns without changing entry IDs, timestamps, checkpoint or migration records', () => withDatabase(async f => {
        await seed(f);
        await migratePaymentSchema(f.connection, { batchSize: 2 });
        const original = { entries: await entries(f), progress: await progress(f), history: (await f.connection.query('SELECT * FROM payment_schema_migrations ORDER BY version'))[0] };
        assert.deepEqual(await migratePaymentSchema(f.connection), { currentVersion: 2, applied: [] });
        assert.deepEqual({ entries: await entries(f), progress: await progress(f), history: (await f.connection.query('SELECT * FROM payment_schema_migrations ORDER BY version'))[0] }, original);
    }));

    it('rejects NULL, negative and excessive balances before changing the coin column or starting v2', () => withDatabase(async f => {
        await seed(f, [null, -1, 2000000001]);
        await assert.rejects(migratePaymentSchema(f.connection), code('PAYMENT_BALANCE_INVALID'));
        assert.equal((await inspectCoinBalances(f.connection)).coinColumn.defaultValue, '1000');
        assert.equal((await entries(f)).length, 0);
        const [rows] = await f.connection.query<RowDataPacket[]>('SELECT version FROM payment_schema_migrations WHERE version=2');
        assert.equal(rows.length, 0);
    }));

    it('refuses an unexpected fractional legacy coin type without rounding balances', () => withDatabase(async f => {
        await f.connection.query('ALTER TABLE users MODIFY coins DECIMAL(12,2) NULL DEFAULT 1000');
        await f.connection.query("INSERT INTO users (username,password,displayname,coins) VALUES ('fractional','fixture','Fractional',1.50)");
        await assert.rejects(migratePaymentSchema(f.connection), code('PAYMENT_BALANCE_COLUMN'));
        const [rows] = await f.connection.query<RowDataPacket[]>('SELECT coins FROM users');
        assert.equal(rows[0].coins, '1.50');
    }));

    it('resumes committed batches on a new connection and retains all existing entry IDs', () => withDatabase(async f => {
        await seed(f);
        await assert.rejects(migratePaymentSchema(f.connection, {
            batchSize: 2, onBatchCommitted: async () => { throw new Error('Simulated interruption after committed batch'); },
        }), /Simulated interruption/);
        const first = await entries(f);
        assert.equal(first.length, 2);
        assert.equal((await progress(f)).last_user_id, 2);
        const connection = await second(f);
        try { await migratePaymentSchema(connection, { batchSize: 2 }); await assertPaymentSchemaReady(connection); }
        finally { await connection.end(); }
        assert.deepEqual((await entries(f)).slice(0, 2), first);
        assert.equal((await entries(f)).length, 5);
        assert.equal(Number((await progress(f)).completed_batches), 3);
        assert.equal((await inspectWalletLedger(f.connection)).valid, true);
    }));

    it('leaves coin inserts, updates and deletes frozen after the migration connection releases its lock', () => withDatabase(async f => {
        await seed(f);
        await assert.rejects(migratePaymentSchema(f.connection, { batchSize: 1, onBatchCommitted: async () => { throw new Error('Interrupted'); } }), /Interrupted/);
        const other = await second(f);
        try {
            for (const sql of [
                "INSERT INTO users (username,password,displayname,coins) VALUES ('blocked','fixture','Blocked',0)",
                'UPDATE users SET coins=900 WHERE id=3', 'DELETE FROM users WHERE id=5',
            ]) await assert.rejects(other.query(sql), code('ER_SIGNAL_EXCEPTION'));
            await other.query("UPDATE users SET bio='Profile writes remain available' WHERE id=3");
        } finally { await other.end(); }
        await migratePaymentSchema(f.connection);
    }));

    it('blocks a writer with an old REPEATABLE READ snapshot while allowing the migration to finish', () => withDatabase(async f => {
        await seed(f, [0, 100]);
        const other = await second(f);
        try {
            await other.beginTransaction();
            await other.query('SELECT * FROM payment_schema_migrations'); // snapshot before v2 exists
            let checked = false;
            await migratePaymentSchema(f.connection, { batchSize: 1, onBatchCommitted: async () => {
                if (checked) return;
                checked = true;
                const [stale] = await other.query<RowDataPacket[]>('SELECT version FROM payment_schema_migrations WHERE version=2');
                assert.equal(stale.length, 0);
                await assert.rejects(other.query("INSERT INTO users (username,password,displayname,coins) VALUES ('stale','fixture','Stale',50)"), code('ER_SIGNAL_EXCEPTION'));
                await other.rollback();
            } });
            assert.equal(checked, true);
            assert.equal((await inspectWalletLedger(f.connection)).valid, true);
        } finally { await other.rollback(); await other.end(); }
    }));

    it('waits for a legacy transaction that passed the guards before freezing and includes its committed coins', () => withDatabase(async f => {
        await seed(f, [100]);
        await prepareBalanceMigration(f.connection, paymentMigrationLockName(f.database), false);
        const other = await second(f);
        try {
            await other.beginTransaction();
            await other.query("INSERT INTO users (id,username,password,displayname,coins) VALUES (10,'inflight','fixture','Inflight',700)");
            let completed = false;
            const migration = migratePaymentSchema(f.connection).then(result => { completed = true; return result; });
            await new Promise(resolve => setTimeout(resolve, 150));
            assert.equal(completed, false);
            await other.commit();
            await migration;
            const report = await inspectWalletLedger(f.connection);
            assert.equal(report.totalCoins, '800');
            assert.equal(report.valid, true);
        } finally { await other.rollback(); await other.end(); }
    }));

    it('rolls back an entire failed batch and its checkpoint before resuming', () => withDatabase(async f => {
        await seed(f, [10, 20, 30]);
        await f.connection.query(`CREATE TRIGGER payment_test_fail_opening BEFORE INSERT ON wallet_entries FOR EACH ROW
            BEGIN IF NEW.user_id=2 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fixture failure'; END IF; END`);
        await assert.rejects(migratePaymentSchema(f.connection, { batchSize: 3 }), code('ER_SIGNAL_EXCEPTION'));
        assert.equal((await entries(f)).length, 0);
        assert.equal((await progress(f)).last_user_id, null);
        assert.equal((await progress(f)).completed_batches, 0);
        await f.connection.query('DROP TRIGGER payment_test_fail_opening');
        await migratePaymentSchema(f.connection);
        assert.equal((await inspectWalletLedger(f.connection)).valid, true);
    }));

    it('does not auto-backfill a legacy user committed after the empty-database startup check', () => withDatabase(async f => {
        await prepareBalanceMigration(f.connection, paymentMigrationLockName(f.database), false);
        const other = await second(f);
        try {
            await other.beginTransaction();
            await other.query("INSERT INTO users (username,password,displayname,coins) VALUES ('late_user','fixture','Late user',700)");
            const migration = migratePaymentSchema(f.connection, { allowBalanceMigration: false });
            const rejected = assert.rejects(migration, code('PAYMENT_BALANCE_EXPLICIT'));
            await new Promise(resolve => setTimeout(resolve, 150));
            await other.commit();
            await rejected;
            assert.equal((await entries(f)).length, 0);
            assert.equal((await inspectCoinBalances(f.connection)).coinColumn.defaultValue, '1000');
            await migratePaymentSchema(f.connection);
            assert.equal((await inspectWalletLedger(f.connection)).totalCoins, '700');
        } finally { await other.rollback(); await other.end(); }
    }));

    it('refuses conflicting existing openings without overwriting them', () => withDatabase(async f => {
        await seed(f, [100]);
        await f.connection.query(`INSERT INTO wallet_entries (user_id,entry_type,delta_coins,balance_after,reason,migration_key)
            VALUES (1,'opening_balance',50,50,'Existing conflicting record','opening:v1:1')`);
        await assert.rejects(migratePaymentSchema(f.connection), code('PAYMENT_OPENING_CONFLICT'));
        assert.equal((await entries(f))[0].delta_coins, 50);
        assert.equal((await inspectCoinBalances(f.connection)).totalCoins, '100');
    }));

    it('refuses to establish openings over existing topup ledger activity', () => withDatabase(async f => {
        await seed(f, [100]);
        const id = randomUUID();
        await f.connection.execute(`INSERT INTO payment_orders
            (id,user_id,package_id,provider,environment,merchant_code,provider_txn_ref,package_code,amount_vnd,coin_amount,
             currency,status,fulfillment_status,idempotency_key,request_fingerprint,client,checkout_snapshot,expires_at,credited_at)
            SELECT ?,1,id,'vnpay','sandbox','TEST',?,'xu_100',10000,100,'VND','paid','credited',?,?,'web','{}',
            CURRENT_TIMESTAMP(3)+INTERVAL 15 MINUTE,CURRENT_TIMESTAMP(3) FROM coin_packages WHERE code='xu_100'`, [id, id, id, 'a'.repeat(64)]);
        await f.connection.execute(`INSERT INTO wallet_entries (user_id,payment_order_id,entry_type,delta_coins,balance_after,reason)
            VALUES (1,?,'topup',100,100,'Existing activity')`, [id]);
        await assert.rejects(migratePaymentSchema(f.connection), code('PAYMENT_LEDGER_ACTIVITY'));
    }));

    it('fails closed if a freeze trigger is missing when resuming', () => withDatabase(async f => {
        await seed(f);
        await assert.rejects(migratePaymentSchema(f.connection, { batchSize: 1, onBatchCommitted: async () => { throw new Error('Interrupted'); } }), /Interrupted/);
        await f.connection.query('DROP TRIGGER payment_balance_freeze_delete');
        await assert.rejects(migratePaymentSchema(f.connection), code('PAYMENT_FREEZE_MISSING'));
    }));

    for (const [name, sql] of [
        ['a disabled user balance CHECK', 'ALTER TABLE users ALTER CHECK chk_users_coin_balance NOT ENFORCED'],
        ['a wrong coin default', 'ALTER TABLE users ALTER COLUMN coins SET DEFAULT 1000'],
        ['a missing progress column', 'ALTER TABLE payment_balance_migration DROP COLUMN last_user_id'],
    ]) it('rejects ' + name + ' at startup', () => withDatabase(async f => {
        await migratePaymentSchema(f.connection);
        await f.connection.query(sql);
        await assert.rejects(assertPaymentSchemaReady(f.connection));
    }));

    it('rejects edited v2 checksums and future versions without rewriting journal rows', () => withDatabase(async f => {
        await migratePaymentSchema(f.connection);
        const [original] = await f.connection.query<RowDataPacket[]>('SELECT checksum FROM payment_schema_migrations WHERE version=2');
        await f.connection.query("UPDATE payment_schema_migrations SET checksum=REPEAT('0',64) WHERE version=2");
        await assert.rejects(assertPaymentSchemaReady(f.connection), code('PAYMENT_SCHEMA_VERSION'));
        await assert.rejects(migratePaymentSchema(f.connection), code('PAYMENT_SCHEMA_VERSION'));
        await f.connection.execute('UPDATE payment_schema_migrations SET checksum=?,version=3 WHERE version=2', [original[0].checksum]);
        await assert.rejects(assertPaymentSchemaReady(f.connection), code('PAYMENT_SCHEMA_VERSION'));
        await assert.rejects(migratePaymentSchema(f.connection), code('PAYMENT_SCHEMA_VERSION'));
    }));

    it('requires an explicit balance migration for populated databases and never backfills on normal startup', () => withDatabase(async f => {
        await seed(f, [0, 1250]);
        const env = { ...process.env, NODE_ENV: 'development', DB_NAME: f.database, DB_HOST: String(f.options.host),
            DB_PORT: String(f.options.port), DB_USER: String(f.options.user), DB_PASSWORD: String(f.options.password),
            API_REPLICAS: '1', REDIS_URL: '', SMTP_USER: '', SMTP_PASS: '' };
        const worker = fileURLToPath(new URL('./paymentStartupWorker.js', import.meta.url));
        await assert.rejects(promisify(execFile)(process.execPath, [worker, 'migrate'], { env, timeout: 30000, windowsHide: true }),
            (error: unknown) => /PAYMENT_BALANCE_EXPLICIT/.test((error as { stderr?: string }).stderr ?? ''));
        assert.equal((await entries(f)).length, 0);
        assert.equal((await inspectCoinBalances(f.connection)).coinColumn.defaultValue, '1000');
        await promisify(execFile)(process.execPath, [worker, 'migrate-balances'], { env, timeout: 30000, windowsHide: true });
        await assertPaymentSchemaReady(f.connection);
        assert.equal((await inspectWalletLedger(f.connection)).valid, true);
    }));

    it('keeps current writers and reset scripts on opposite sides of the migration boundary', () => withDatabase(async f => {
        const { acquireDemoWriteGuard } = await import(new URL('../../paymentResetGuard.js', import.meta.url).href);
        const demo = await second(f);
        try {
            await acquireDemoWriteGuard(demo);
            await assert.rejects(migratePaymentSchema(f.connection, { lockTimeoutSeconds: 0 }), code('PAYMENT_SCHEMA_LOCKED'));
        } finally { await demo.end(); }
        await migratePaymentSchema(f.connection);
        const guarded = await second(f);
        try { await assert.rejects(acquireDemoWriteGuard(guarded), /forbidden after balance migration/); }
        finally { await guarded.end(); }
        await f.connection.beginTransaction();
        try {
            const [insert] = await f.connection.execute<any>("INSERT INTO users (username,password,displayname,coins) VALUES ('new','fixture','New',0)");
            await recordNewUserOpening(f.connection, insert.insertId);
            await f.connection.commit();
        } catch (error) { await f.connection.rollback(); throw error; }
        assert.equal((await inspectWalletLedger(f.connection)).valid, true);
    }));

    it('rejects demo/reset even on v1 when payment history exists', () => withDatabase(async f => {
        await seed(f, [0]);
        await f.connection.query(`INSERT INTO wallet_entries (user_id,entry_type,delta_coins,balance_after,reason,migration_key)
            VALUES (1,'opening_balance',0,0,'Existing history','opening:v1:1')`);
        const { acquireDemoWriteGuard } = await import(new URL('../../paymentResetGuard.js', import.meta.url).href);
        await assert.rejects(acquireDemoWriteGuard(f.connection), /with payment history/);
    }));

    it('backs up a v1 fixture with mysqldump and restores its balances into a different empty database', () => withDatabase(async f => {
        await seed(f, [0, 1250, 1500]);
        const restored = await createPaymentFixture({ bootstrap: false });
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mugen-payment-backup-test-'));
        const config = path.join(directory, 'client.cnf');
        const quote = (value: unknown) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        const mysqlRoot = path.join(process.env.ProgramFiles || 'C:/Program Files', 'MySQL');
        const candidates = process.platform === 'win32' && fs.existsSync(mysqlRoot) ? fs.readdirSync(mysqlRoot)
            .filter(name => name.startsWith('MySQL Server')).sort().reverse().map(name => path.join(mysqlRoot, name, 'bin/mysqldump.exe')) : [];
        const binary = process.env.MYSQLDUMP_PATH || candidates.find(file => fs.existsSync(file)) || 'mysqldump';
        try {
            fs.writeFileSync(config, `[client]\nhost="${quote(f.options.host)}"\nport=${f.options.port}\nuser="${quote(f.options.user)}"\npassword="${quote(f.options.password)}"\n`, { mode: 0o600 });
            const { stdout } = await promisify(execFile)(binary, [`--defaults-extra-file=${config}`, '--single-transaction', '--skip-lock-tables',
                '--set-gtid-purged=OFF', '--no-tablespaces', '--skip-add-drop-table', f.database], { timeout: 30000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
            assert.ok(!/^\s*(CREATE DATABASE|USE\s)/im.test(stdout), 'restore must stay inside its generated destination database');
            await restored.connection.query(stdout);
            await assertPaymentSchemaReady(restored.connection, 1);
            const before = await inspectCoinBalances(f.connection);
            assert.deepEqual(await inspectCoinBalances(restored.connection), before);
            await migratePaymentSchema(f.connection);
            assert.equal((await inspectWalletLedger(f.connection)).totalCoins, before.totalCoins);
            assert.equal((await inspectCoinBalances(restored.connection)).coinColumn.defaultValue, '1000');
        } finally {
            if (fs.existsSync(config)) fs.unlinkSync(config);
            fs.rmdirSync(directory); // only this empty directory, never recursive deletion
            await restored.close();
        }
    }));
});
