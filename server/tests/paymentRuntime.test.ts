import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mysql, { type Pool } from 'mysql2/promise';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createPaymentFixture } from './paymentFixture.js';
import { acquireUtcConnection, databaseTimeOptions } from '../databaseTime.js';

describe('Payment DB03 runtime UTC', () => {
    it('destroys the session and rejects checkout if SQL timezone setup fails', async () => {
        const failure = new Error('Simulated disconnected session');
        let destroyed = false;
        const pool = { getConnection: async () => ({
            query: async () => { throw failure; },
            destroy: () => { destroyed = true; },
        }) } as unknown as Pool;
        await assert.rejects(acquireUtcConnection(pool), error => error === failure);
        assert.equal(destroyed, true);
    });

    it('resets a reused SQL session and preserves Date parameters independently of server defaults', async () => {
        const fixture = await createPaymentFixture();
        const pool = mysql.createPool({ ...fixture.options, ...databaseTimeOptions, database: fixture.database, connectionLimit: 1 });
        try {
            const poisoned = await pool.getConnection();
            const [identity] = await poisoned.query<any[]>('SELECT CONNECTION_ID() AS id');
            await poisoned.query("SET SESSION time_zone='+09:00'");
            poisoned.release();
            const connection = await acquireUtcConnection(pool);
            try {
                const value = new Date('2026-11-16T03:04:05.678Z');
                const [rows] = await connection.execute<any[]>(`SELECT @@session.time_zone AS zone,CONNECTION_ID() AS id,
                    CAST(? AS DATETIME(3)) AS instant,NOW(3)=UTC_TIMESTAMP(3) AS clockMatches`, [value]);
                assert.equal(rows[0].id, identity[0].id);
                assert.equal(rows[0].zone, '+00:00');
                assert.equal(Number(rows[0].clockMatches), 1);
                assert.equal(JSON.parse(JSON.stringify(rows[0])).instant, value.toISOString());
            } finally { connection.release(); }
        } finally { await pool.end(); await fixture.close(); }
    });

    for (const timezone of ['Asia/Saigon', 'America/New_York']) {
        it(`uses UTC through actual db.query/transaction with host timezone ${timezone}`, async () => {
            const fixture = await createPaymentFixture();
            try {
                await fixture.connection.query(`CREATE TABLE payment_runtime_dates (
                    datetime_value DATETIME(3) NOT NULL,timestamp_value TIMESTAMP(3) NOT NULL) ENGINE=InnoDB`);
                const result = await promisify(execFile)(process.execPath,
                    [fileURLToPath(new URL('./paymentRuntimeWorker.js', import.meta.url))], {
                        timeout: 45000, windowsHide: true, env: {
                            ...process.env, TZ: timezone, NODE_ENV: 'development',
                            DB_NAME: fixture.database, DB_HOST: String(fixture.options.host), DB_PORT: String(fixture.options.port),
                            DB_USER: String(fixture.options.user), DB_PASSWORD: String(fixture.options.password),
                            DB_POOL_SIZE: '3', REDIS_URL: '', API_REPLICAS: '1', SMTP_USER: '', SMTP_PASS: '',
                        },
                    });
                const output = result.stdout.trim().split(/\r?\n/).find(line => line.startsWith('{"runtimeUtc":'));
                assert.ok(output, result.stdout);
                const report = JSON.parse(output);
                assert.equal(report.runtimeUtc, 'ready');
                assert.equal(report.timezone, timezone);
                assert.equal(report.first.datetime_value, '2026-11-16T03:04:05.678Z');
                assert.equal(report.first.timestamp_value, '2026-11-16T03:04:05.678Z');
            } finally { await fixture.close(); }
        });
    }
});
