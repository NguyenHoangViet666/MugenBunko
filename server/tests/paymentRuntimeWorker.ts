/** Runs only against the random database owned by paymentRuntime.test.ts. */
import assert from 'node:assert/strict';
import db from '../db.js';

const instant = new Date('2026-11-16T03:04:05.678Z');
try {
    await db.initializeDbConnection({ migrate: true });
    const first = await db.transaction(async connection => {
        await connection.execute('INSERT INTO payment_runtime_dates (datetime_value,timestamp_value) VALUES (?,?)', [instant, instant]);
        const [rows] = await connection.query<any[]>(`SELECT @@session.time_zone AS zone,CONNECTION_ID() AS connectionId,
            datetime_value,timestamp_value,ABS(TIMESTAMPDIFF(SECOND,NOW(3),UTC_TIMESTAMP(3))) AS clockDifference
            FROM payment_runtime_dates`);
        assert.equal(rows[0].zone, '+00:00');
        assert.equal(rows[0].clockDifference, 0);
        assert.equal(rows[0].datetime_value.toISOString(), instant.toISOString());
        assert.equal(rows[0].timestamp_value.toISOString(), instant.toISOString());
        // Simulate a caller changing a session before returning it to the pool.
        await connection.query("SET SESSION time_zone='+07:00'");
        return rows[0];
    });
    const [reused] = await db.query<any[]>('SELECT @@session.time_zone AS zone,CONNECTION_ID() AS connectionId');
    assert.equal(reused.zone, '+00:00');
    assert.equal(reused.connectionId, first.connectionId);
    const concurrent = await Promise.all(Array.from({ length: 3 }, () => db.transaction(async connection => {
        const [rows] = await connection.query<any[]>('SELECT @@session.time_zone AS zone,CONNECTION_ID() AS connectionId,SLEEP(0.05) AS wait');
        assert.equal(rows[0].zone, '+00:00');
        await connection.query("SET SESSION time_zone='-05:00'");
        return rows[0].connectionId;
    })));
    assert.equal(new Set(concurrent).size, 3);
    const reset = await Promise.all(Array.from({ length: 3 }, () => db.transaction(async connection => {
        const [rows] = await connection.query<any[]>('SELECT @@session.time_zone AS zone,SLEEP(0.05) AS wait');
        assert.equal(rows[0].zone, '+00:00');
        return rows[0].zone;
    })));
    console.log(JSON.stringify({ runtimeUtc: 'ready', timezone: process.env.TZ, first, reused, reset }));
} finally { await db.closeDbConnection(); }
