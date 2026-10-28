/** Subprocess used by paymentMigration.test.ts with an owned random database. */
import db from '../db.js';

if (!['migrate', 'probe'].includes(process.argv[2])) throw new Error('Expected migrate or probe.');
try {
    await db.initializeDbConnection({ migrate: process.argv[2] === 'migrate' });
    console.log(JSON.stringify({ paymentStartup: 'ready' }));
} catch (error) {
    let poolClosed = false;
    try { await db.query('SELECT 1'); } catch { poolClosed = true; }
    console.error(JSON.stringify({
        paymentStartup: 'failed', code: (error as { code?: string }).code,
        message: (error as Error).message, poolClosed,
    }));
    process.exitCode = 1;
} finally { await db.closeDbConnection(); }
