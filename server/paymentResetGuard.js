import { createHash } from 'node:crypto';

/** Holds the same named lock as migration until the caller closes its session. */
export async function acquireDemoWriteGuard(connection) {
    const [[row]] = await connection.query('SELECT DATABASE() AS database_name');
    if (!row.database_name || !/^[a-zA-Z0-9_]{1,64}$/.test(row.database_name)) throw new Error('Select a valid demo database first.');
    const lock = 'mugen_pay:' + createHash('sha256').update(row.database_name).digest('hex').slice(0, 48);
    const [[result]] = await connection.query('SELECT GET_LOCK(?,0) AS acquired', [lock]);
    if (Number(result.acquired) !== 1) throw new Error('A payment migration is running; demo/reset is blocked.');
    const [tables] = await connection.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    const names = new Set(tables.map(table => table.name));
    if (names.has('payment_schema_migrations')) {
        const [versions] = await connection.query('SELECT version FROM payment_schema_migrations WHERE version>=2 LIMIT 1');
        if (versions.length) throw new Error('Demo/reset is forbidden after balance migration has started. Use a separate demo database.');
    }
    for (const table of ['payment_orders', 'wallet_entries', 'payment_events', 'payment_audit']) {
        if (!names.has(table)) continue;
        const [history] = await connection.query(`SELECT 1 FROM ${table} LIMIT 1`);
        if (history.length) throw new Error('Demo/reset is forbidden on a database with payment history.');
    }
}
