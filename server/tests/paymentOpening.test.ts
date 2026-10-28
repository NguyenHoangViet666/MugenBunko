import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mysql, { type Connection } from 'mysql2/promise';
import { startFixture } from './fixture.js';
import { inspectWalletLedger, recordNewUserOpening } from '../payments/walletOpening.js';

describe('Payment DB02 account writers', () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>;
    let connection: Connection;
    before(async () => {
        fixture = await startFixture();
        connection = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
    });
    after(async () => { await connection?.end(); await fixture?.close(); });
    const register = async (username: string) => {
        const response = await fetch(fixture.url + '/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, displayname: 'Độc giả kiểm tra ví', password: 'BalanceWriter#2026', coins: 99999 }),
        });
        return { status: response.status, data: await response.json() };
    };
    const admin = async (username: string) => {
        try {
            const result = await promisify(execFile)(process.execPath,
                [fileURLToPath(new URL('../createAdmin.js', import.meta.url))], {
                    timeout: 30000, windowsHide: true,
                    env: { ...process.env, ADMIN_USERNAME: username, ADMIN_PASSWORD: 'Admin#' + randomBytes(20).toString('hex') },
                });
            return { status: 0, stderr: result.stderr };
        } catch (error) { return { status: 1, stderr: (error as { stderr?: string }).stderr ?? '' }; }
    };

    it('registers a zero-coin account with one zero opening and ignores client-supplied coins', async () => {
        const result = await register('db02_registration');
        assert.equal(result.status, 200);
        assert.equal(result.data.user.coins, 0);
        const rows = await fixture.db.query<any[]>('SELECT delta_coins,balance_after,migration_key FROM wallet_entries WHERE user_id=?', [result.data.user.id]);
        assert.deepEqual(rows.map(row => [row.delta_coins, row.balance_after, row.migration_key]), [[0, 0, `opening:v1:${result.data.user.id}`]]);
    });

    it('rolls back account creation when the opening insert fails', async () => {
        await connection.query(`CREATE TRIGGER payment_test_writer_failure BEFORE INSERT ON wallet_entries FOR EACH ROW
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fixture opening failure'`);
        try {
            assert.equal((await register('db02_failed_opening')).status, 503);
            assert.equal((await fixture.db.query<any[]>("SELECT id FROM users WHERE username='db02_failed_opening'")).length, 0);
        } finally { await connection.query('DROP TRIGGER payment_test_writer_failure'); }
    });

    it('rolls back a new user if opening is attempted twice in the same transaction', async () => {
        await assert.rejects(fixture.db.transaction(async connection => {
            const [insert] = await connection.execute<any>("INSERT INTO users (username,password,displayname,coins) VALUES ('db02_twice','fixture','Twice',0)");
            await recordNewUserOpening(connection, insert.insertId);
            await recordNewUserOpening(connection, insert.insertId);
        }), (error: unknown) => (error as { code?: string }).code === 'ER_DUP_ENTRY');
        assert.equal((await fixture.db.query<any[]>("SELECT id FROM users WHERE username='db02_twice'")).length, 0);
    });

    it('rejects a new account seeded with a nonzero balance instead of silently minting coins', async () => {
        await assert.rejects(fixture.db.transaction(async connection => {
            const [insert] = await connection.execute<any>("INSERT INTO users (username,password,displayname,coins) VALUES ('db02_nonzero','fixture','Nonzero',1)");
            await recordNewUserOpening(connection, insert.insertId);
        }), /start at zero/);
        assert.equal((await fixture.db.query<any[]>("SELECT id FROM users WHERE username='db02_nonzero'")).length, 0);
    });

    it('writes new opening timestamps in UTC even when the caller session uses another timezone', async () => {
        await connection.query("SET time_zone='+07:00'");
        await connection.beginTransaction();
        try {
            const [insert] = await connection.execute<any>("INSERT INTO users (username,password,displayname,coins) VALUES ('db02_utc','fixture','UTC',0)");
            await recordNewUserOpening(connection, insert.insertId);
            const [rows] = await connection.execute<any[]>('SELECT ABS(TIMESTAMPDIFF(SECOND,created_at,UTC_TIMESTAMP(3))) AS difference FROM wallet_entries WHERE user_id=?', [insert.insertId]);
            assert.ok(Number(rows[0].difference) <= 3);
            await connection.commit();
        } catch (error) { await connection.rollback(); throw error; }
        finally { await connection.query("SET time_zone='+00:00'"); }
    });

    it('fails registration closed if balance migration is not applied', async () => {
        await fixture.db.query("UPDATE payment_schema_migrations SET status='applying',applied_at=NULL WHERE version=2");
        try {
            assert.equal((await register('db02_not_ready')).status, 503);
            assert.equal((await fixture.db.query<any[]>("SELECT id FROM users WHERE username='db02_not_ready'")).length, 0);
        } finally { await fixture.db.query("UPDATE payment_schema_migrations SET status='applied',applied_at=CURRENT_TIMESTAMP(3) WHERE version=2"); }
    });

    it('creates an administrator with zero coins and a transactional opening via the actual CLI', async () => {
        const result = await admin('db02_admin');
        assert.equal(result.status, 0, result.stderr);
        const rows = await fixture.db.query<any[]>(`SELECT u.coins,w.delta_coins,w.balance_after,r.role
            FROM users u JOIN wallet_entries w ON w.user_id=u.id JOIN user_roles r ON r.user_id=u.id
            WHERE u.username='db02_admin' AND r.role='admin'`);
        assert.equal(rows.length, 1);
        assert.deepEqual([rows[0].coins, rows[0].delta_coins, rows[0].balance_after], [0, 0, 0]);
    });

    it('does not promote or overwrite an existing reader through the administrator CLI', async () => {
        const result = await admin('db02_registration');
        assert.equal(result.status, 1);
        const rows = await fixture.db.query<any[]>(`SELECT r.role FROM users u JOIN user_roles r ON r.user_id=u.id
            WHERE u.username='db02_registration' AND r.role='admin'`);
        assert.equal(rows.length, 0);
    });

    it('keeps all fixture and newly created accounts reconciled after writer failures', async () => {
        const report = await fixture.db.transaction(connection => inspectWalletLedger(connection));
        assert.equal(report.valid, true);
        assert.equal(report.totalCoins, '0');
    });
});
